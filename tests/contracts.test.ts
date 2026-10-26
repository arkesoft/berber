import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { handlers, resetMock, advanceMockClock } from "../app/mocks/handlers";
import * as s from "../app/contracts/schemas";
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(resetMock);
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  extra: Record<string, string> = {},
) {
  const response = await fetch(`http://localhost/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": "demo-csrf-token",
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}
async function booking(key = "booking-key-123") {
  const available = s.availability.parse(
    (await call("/availability?serviceId=cut&staffId=emre&date=2026-10-27"))
      .body,
  );
  const input = {
    serviceId: "cut",
    staffId: "emre",
    slotId: available.slots[0]!.id,
    customer: {
      name: "Örnek Müşteri",
      email: "test@example.test",
      phone: "+90 555 000 00 00",
    },
    privacyAccepted: true,
  };
  const response = await call("/reservations", "POST", input, {
    "Idempotency-Key": key,
  });
  return { ...s.createdReservation.parse(response.body), input };
}
describe("contract and mock integration", () => {
  it("replays a committed reservation whose response was lost", async () => {
    const available = s.availability.parse(
      (await call("/availability?serviceId=cut&staffId=emre&date=2026-10-27"))
        .body,
    );
    const input = {
      serviceId: "cut",
      staffId: "emre",
      slotId: available.slots[0]!.id,
      customer: {
        name: "Örnek",
        email: "retry@example.test",
        phone: "5550000000",
      },
      privacyAccepted: true,
    };
    const headers = {
      "Idempotency-Key": "response-loss-key",
      "X-Mock-Scenario": "response-lost",
    };
    await expect(
      call("/reservations", "POST", input, headers),
    ).rejects.toThrow();
    const recovered = s.createdReservation.parse(
      (await call("/reservations", "POST", input, headers)).body,
    );
    expect(recovered.reservation.id).toBe("r-21");
    expect(
      s.createdReservation.parse(
        (await call("/reservations", "POST", input, headers)).body,
      ).reservation.id,
    ).toBe("r-21");
  });
  it("simulates network failures and empty data deterministically", async () => {
    await expect(
      call("/catalog", "GET", undefined, {
        "X-Mock-Scenario": "network-error",
      }),
    ).rejects.toThrow();
    expect(
      s.catalog.parse(
        (
          await call("/catalog", "GET", undefined, {
            "X-Mock-Scenario": "empty",
          })
        ).body,
      ).services,
    ).toEqual([]);
  });
  it("does not allow the registration request to assign a manager role", async () => {
    const result = await call("/customers", "POST", {
      name: "Örnek Kullanıcı",
      email: "role@example.test",
      phone: "5550000000",
      password: "Demo12345!",
      role: "manager",
    });
    expect(s.session.parse(result.body).user?.role).toBe("customer");
    expect(
      (
        await call(
          "/management",
          "PUT",
          {
            resource: "chairs",
            value: { id: "chair-x", name: "Yeni koltuk", active: true },
          },
          { "Idempotency-Key": "role-spoof-key" },
        )
      ).status,
    ).toBe(403);
  });
  it("returns catalog that conforms to the contract", async () => {
    expect(
      s.catalog.parse((await call("/catalog")).body).services,
    ).toHaveLength(3);
  });
  it("rejects missing and malformed availability input", async () => {
    expect((await call("/availability")).status).toBe(422);
    expect(
      (await call("/availability?serviceId=cut&staffId=emre&date=bad")).status,
    ).toBe(422);
  });
  it("replays creation and rejects changed payload under the same key", async () => {
    const result = await booking();
    const replay = await call("/reservations", "POST", result.input, {
      "Idempotency-Key": "booking-key-123",
      "X-Guest-Token": result.guestToken!,
    });
    expect(s.createdReservation.parse(replay.body).reservation.id).toBe(
      result.reservation.id,
    );
    expect(
      (
        await call(
          "/reservations",
          "POST",
          { ...result.input, staffId: "can" },
          { "Idempotency-Key": "booking-key-123" },
        )
      ).status,
    ).toBe(409);
  });
  it("prevents an overlapping mock reservation", async () => {
    const result = await booking();
    const second = await call("/reservations", "POST", result.input, {
      "Idempotency-Key": "another-key-123",
    });
    expect(s.apiError.parse(second.body).code).toBe("SLOT_CONFLICT");
  });
  it("validates input before storing a reservation", async () => {
    const response = await call(
      "/reservations",
      "POST",
      { serviceId: "cut" },
      { "Idempotency-Key": "bad-request-key" },
    );
    expect(response.status).toBe(422);
  });
  it("requires the guest capability to simulate payment", async () => {
    const result = await booking();
    expect(
      (
        await call(
          "/payments",
          "POST",
          { reservationId: result.reservation.id },
          { "Idempotency-Key": "payment-key-123" },
        )
      ).status,
    ).toBe(404);
  });
  it("simulates a failed payment and recovers without duplicate payment", async () => {
    const result = await booking();
    const headers = {
      "Idempotency-Key": "payment-key-123",
      "X-Guest-Token": result.guestToken!,
    };
    expect(
      s.apiError.parse(
        (
          await call(
            "/payments",
            "POST",
            { reservationId: result.reservation.id },
            { ...headers, "X-Mock-Scenario": "payment-failed" },
          )
        ).body,
      ).code,
    ).toBe("PAYMENT_FAILED");
    const paid = await call(
      "/payments",
      "POST",
      { reservationId: result.reservation.id },
      headers,
    );
    const replay = await call(
      "/payments",
      "POST",
      { reservationId: result.reservation.id },
      headers,
    );
    expect(s.paymentResult.parse(paid.body).reservation.status).toBe(
      "confirmed",
    );
    expect(replay.body).toEqual(paid.body);
  });
  it("expires holds and releases capacity", async () => {
    const result = await booking();
    advanceMockClock(301000);
    const response = await call(
      "/payments",
      "POST",
      { reservationId: result.reservation.id },
      {
        "Idempotency-Key": "payment-key-123",
        "X-Guest-Token": result.guestToken!,
      },
    );
    expect(s.apiError.parse(response.body).code).toBe("HOLD_EXPIRED");
  });
  it("denies anonymous operations and rejects missing CSRF", async () => {
    expect((await call("/operations")).status).toBe(401);
    expect(
      (
        await call(
          "/session",
          "POST",
          { email: "musteri@example.test", password: "Demo12345!" },
          { "X-CSRF-Token": "" },
        )
      ).status,
    ).toBe(403);
  });
  it("isolates customer records and hides manager operations", async () => {
    await call("/session", "POST", {
      email: "musteri@example.test",
      password: "Demo12345!",
    });
    const page = s.page.parse((await call("/reservations")).body);
    expect(page.items.every((r) => r.customerId === "customer-demo")).toBe(
      true,
    );
    expect((await call("/operations")).status).toBe(403);
    expect(
      (
        await call(
          "/reservations/r-2",
          "PATCH",
          { action: "cancel", version: 1 },
          { "Idempotency-Key": "cancel-key-123" },
        )
      ).status,
    ).toBe(404);
  });
  it("isolates staff and enforces role-specific actions", async () => {
    await call("/session", "POST", {
      email: "berber@example.test",
      password: "Demo12345!",
    });
    const work = s.operations.parse((await call("/operations")).body);
    expect(work.reservations.every((r) => r.staffId === "emre")).toBe(true);
    expect(
      (
        await call(
          "/reservations/r-1",
          "PATCH",
          { version: 1, action: "cancel" },
          { "Idempotency-Key": "cancel-key-123" },
        )
      ).status,
    ).toBe(403);
  });
  it("enforces versions and allowed transitions", async () => {
    await call("/session", "POST", {
      email: "yonetici@example.test",
      password: "Demo12345!",
    });
    expect(
      (
        await call(
          "/reservations/r-1",
          "PATCH",
          { version: 99, action: "start" },
          { "Idempotency-Key": "start-key-123" },
        )
      ).status,
    ).toBe(409);
    const started = s.reservation.parse(
      (
        await call(
          "/reservations/r-1",
          "PATCH",
          { version: 1, action: "start" },
          { "Idempotency-Key": "start-key-456" },
        )
      ).body,
    );
    expect(started.status).toBe("in_service");
    const completed = s.reservation.parse(
      (
        await call(
          "/reservations/r-1",
          "PATCH",
          { version: started.version, action: "complete" },
          { "Idempotency-Key": "complete-key-123" },
        )
      ).body,
    );
    expect(completed.allowedActions).toHaveLength(0);
  });
  it("supports registration and login in the same demo session", async () => {
    const body = {
      email: "new@example.test",
      password: "Demo12345!",
      name: "Yeni Müşteri",
      phone: "+90 555 000 00 00",
    };
    const registered = s.session.parse(
      (await call("/customers", "POST", body)).body,
    );
    await call("/session", "DELETE");
    const logged = s.session.parse((await call("/session", "POST", body)).body);
    expect(logged.user?.id).toBe(registered.user?.id);
    expect(logged.user?.role).toBe("customer");
  });
});
