import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { runner } from "node-pg-migrate";
import type { FastifyInstance } from "fastify";
import * as s from "../../app/contracts/schemas.js";
import { database, transaction } from "../src/infrastructure/database.js";
import { readConfig } from "../src/config.js";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/modules/identity/index.js";
import { updateSalon } from "../src/modules/salon/index.js";
import { OutboxWorker, enqueue } from "../src/modules/notifications/index.js";
import { notificationContent } from "../src/modules/reservations/index.js";
if (!process.env.TEST_DATABASE_URL)
  process.loadEnvFile("../.local/backend.env");
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "Dedicated TEST_DATABASE_URL ending in _test required; tests never target a production database",
  );
const pool = database(url),
  config = readConfig({ ...process.env, DATABASE_URL: url, NODE_ENV: "test" });
let app: FastifyInstance;
let time = "2026-10-26T06:00:00Z";
const customer = {
  name: "Test Müşteri",
  email: "customer@example.test",
  phone: "+905550000000",
};
const service = {
  id: "cut",
  name: "Saç kesimi",
  description: "Test hizmeti",
  durationMinutes: 30,
  price: { amount: 65000, currency: "TRY" as const },
  deposit: { amount: 15000, currency: "TRY" as const },
  active: true,
};
before(async () => {
  await runner({
    databaseUrl: url,
    dir: resolve("migrations"),
    direction: "up",
    migrationsTable: "schema_migrations",
    count: Infinity,
    log: () => {},
  });
  const hash = await hashPassword("TestPassword123!");
  // Explicit isolated-test reset; never part of application startup or production setup.
  await pool.query("TRUNCATE salon.settings CASCADE");
  await pool.query(
    "TRUNCATE identity.sessions,platform.idempotency,platform.audit,notifications.outbox",
  );
  await transaction(pool, async (sql) => {
    await sql.query(
      "INSERT INTO salon.settings(id,document,buffer_minutes) VALUES($1,$2,10)",
      [
        config.SALON_ID,
        {
          id: config.SALON_ID,
          name: "Test Salon",
          description: "Yerel test",
          address: "Örnek sokak test adresi",
          phone: "+905550000000",
          timezone: "Europe/Istanbul",
          currency: "TRY",
          bookingDays: 30,
        },
      ],
    );
    await updateSalon(sql, config.SALON_ID, {
      resource: "services",
      value: service,
    });
    for (const id of ["one", "two"])
      await updateSalon(sql, config.SALON_ID, {
        resource: "staff",
        value: {
          id,
          name: `Berber ${id}`,
          title: "Berber",
          serviceIds: ["cut"],
          active: true,
        },
      });
    await updateSalon(sql, config.SALON_ID, {
      resource: "chairs",
      value: { id: "chair", name: "Koltuk", active: true },
    });
    for (const staff of ["one", "two"])
      for (const day of ["26", "27", "28", "29", "30"])
        await updateSalon(sql, config.SALON_ID, {
          resource: "schedules",
          value: {
            id: `${staff}-${day}`,
            staffId: staff,
            date: `2026-10-${day}`,
            kind: "shift",
            startsAt: "09:00",
            endsAt: "19:00",
            note: "",
          },
        });
    await sql.query(
      "INSERT INTO identity.users(id,salon_id,email,name,password_hash,role) VALUES('manager',$1,'manager@example.test','Yönetici',$2,'manager')",
      [config.SALON_ID, hash],
    );
    await sql.query(
      "INSERT INTO identity.users(id,salon_id,email,name,password_hash,role,staff_id) VALUES('staff',$1,'staff@example.test','Berber',$2,'staff','one')",
      [config.SALON_ID, hash],
    );
  });
  app = await createApp(config, pool, () => time);
});
after(async () => {
  await app?.close();
  await pool.end();
});
class Client {
  static sequence = 1;
  ip = `127.0.0.${++Client.sequence}`;
  cookie = "";
  csrf = "";
  async call(
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    url: string,
    body?: unknown,
    extra: Record<string, string> = {},
  ) {
    const response = await app.inject({
      remoteAddress: this.ip,
      method,
      url,
      headers: {
        cookie: this.cookie,
        origin: config.PUBLIC_ORIGIN,
        "x-csrf-token": this.csrf,
        ...extra,
      },
      payload: body as Record<string, unknown>,
    });
    const cookie = response.headers["set-cookie"];
    if (cookie)
      this.cookie = (Array.isArray(cookie) ? cookie[0]! : cookie).split(
        ";",
      )[0]!;
    const data = response.json();
    if (data.csrfToken) this.csrf = data.csrfToken;
    return { status: response.statusCode, data, headers: response.headers };
  }
  async init() {
    assert.equal((await this.call("GET", "/api/v1/session")).status, 200);
    return this;
  }
  async login(email = "manager@example.test") {
    await this.init();
    assert.equal(
      (
        await this.call("POST", "/api/v1/session", {
          email,
          password: "TestPassword123!",
        })
      ).status,
      200,
    );
    return this;
  }
  async slots(staff = "one", date = "2026-10-27") {
    const r = await this.call(
      "GET",
      `/api/v1/availability?serviceId=cut&staffId=${staff}&date=${date}`,
    );
    assert.equal(r.status, 200);
    return s.availability.parse(r.data).slots;
  }
  async book(slotId: string, staffId = "one", key = randomUUID()) {
    return this.call(
      "POST",
      "/api/v1/reservations",
      { serviceId: "cut", staffId, slotId, customer, privacyAccepted: true },
      { "idempotency-key": key },
    );
  }
}
test("manager interval updates preserve bookings; busy slots stay public without PII and cannot be booked", async () => {
  const manager = await new Client().login();
  const employee = await new Client().login("staff@example.test");
  const salon = s.operations.parse(
    (await manager.call("GET", "/api/v1/operations")).data,
  ).salon;
  assert.equal(salon.slotIntervalMinutes, 15);
  const initial = await manager.slots("one", "2026-10-29");
  const booked = await manager.book(initial[1]!.id);
  assert.equal(booked.status, 200);
  const change = {
    resource: "salon",
    value: { ...salon, slotIntervalMinutes: 20 },
  };
  assert.equal(
    (
      await employee.call("PUT", "/api/v1/management", change, {
        "idempotency-key": randomUUID(),
      })
    ).status,
    403,
  );
  for (const slotIntervalMinutes of [0, 121, 7.5])
    assert.equal(
      (
        await manager.call(
          "PUT",
          "/api/v1/management",
          { ...change, value: { ...salon, slotIntervalMinutes } },
          { "idempotency-key": randomUUID() },
        )
      ).status,
      422,
    );
  assert.equal(
    (
      await manager.call("PUT", "/api/v1/management", change, {
        "idempotency-key": randomUUID(),
      })
    ).status,
    200,
  );
  const publicClient = await new Client().init();
  const view = s.availability.parse(
    (
      await publicClient.call(
        "GET",
        "/api/v1/availability?serviceId=cut&staffId=one&date=2026-10-29",
      )
    ).data,
  );
  const all = [...view.slots, ...view.unavailableSlots].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
  assert.ok(view.unavailableSlots.some((x) => x.status === "busy"));
  assert.equal(
    Date.parse(all[1]!.startsAt) - Date.parse(all[0]!.startsAt),
    20 * 60000,
  );
  assert.ok(
    view.unavailableSlots.every((x) =>
      Object.keys(x).every((key) =>
        ["id", "staffId", "startsAt", "endsAt", "status"].includes(key),
      ),
    ),
  );
  assert.equal(
    (
      await publicClient.book(
        view.unavailableSlots.find((x) => x.status === "busy")!.id,
      )
    ).data.code,
    "SLOT_CONFLICT",
  );
  assert.equal(
    (await publicClient.book(initial[3]!.id)).data.code,
    "SLOT_CONFLICT",
  );
  const other = s.availability.parse(
    (
      await publicClient.call(
        "GET",
        "/api/v1/availability?serviceId=cut&staffId=two&date=2026-10-29",
      )
    ).data,
  );
  assert.ok(other.unavailableSlots.some((x) => x.status === "busy"));
  const history = s.collections.parse(
    (
      await manager.call(
        "GET",
        `/api/v1/reservations/${booked.data.reservation.id}/collections`,
      )
    ).data,
  );
  assert.equal(history.reservation.startsAt, booked.data.reservation.startsAt);
  assert.equal(history.reservation.version, 1);
  await assert.rejects(
    pool.query(
      "UPDATE salon.settings SET document=jsonb_set(document,'{slotIntervalMinutes}','0') WHERE id=$1",
      [config.SALON_ID],
    ),
    (e: unknown) => (e as { code: string }).code === "23514",
  );
  const column = (
    await pool.query(
      "SELECT slot_interval_minutes FROM salon.settings WHERE id=$1",
      [config.SALON_ID],
    )
  ).rows[0]!;
  assert.equal(column.slot_interval_minutes, 20);
  assert.equal(
    (
      await manager.call(
        "PATCH",
        `/api/v1/reservations/${booked.data.reservation.id}`,
        { action: "cancel", version: 1 },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    200,
  );
  const released = await manager.slots("one", "2026-10-29");
  assert.ok(
    released.some(
      (x) =>
        x.id === view.unavailableSlots.find((x) => x.status === "busy")!.id,
    ),
  );
  assert.equal(
    (
      await manager.call(
        "PUT",
        "/api/v1/management",
        { resource: "salon", value: salon },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    200,
  );
});

test("collection ledger enforces amounts, replay, concurrent versions, reversal, FK and immutability", async () => {
  const manager = await new Client().login();
  const employee = await new Client().login("staff@example.test");
  const created = await manager.book(
    (await manager.slots("one", "2026-10-30"))[0]!.id,
  );
  assert.equal(created.status, 200);
  const id = created.data.reservation.id;
  const path = `/api/v1/reservations/${id}/collections`;
  const receive = {
    action: "receive",
    version: 1,
    amount: 5000,
    method: "cash",
    note: "Kapora ilk parça",
  };
  assert.equal((await employee.call("GET", path)).status, 403);
  assert.equal(
    (
      await employee.call("POST", path, receive, {
        "idempotency-key": randomUUID(),
      })
    ).status,
    403,
  );
  const anonymous = await new Client().init();
  assert.equal((await anonymous.call("GET", path)).status, 401);
  for (const amount of [0, -1, 1.5, 65001])
    assert.equal(
      (
        await manager.call(
          "POST",
          path,
          { ...receive, amount },
          { "idempotency-key": randomUUID() },
        )
      ).status,
      422,
    );
  const key = randomUUID();
  const results = await Promise.all([
    manager.call("POST", path, receive, { "idempotency-key": key }),
    manager.call("POST", path, receive, { "idempotency-key": key }),
  ]);
  assert.equal(results[0]!.status, 200);
  assert.deepEqual(results[0]!.data, results[1]!.data);
  let state = s.collections.parse(results[0]!.data);
  assert.equal(state.entries.length, 1);
  assert.equal(state.reservation.received!.amount, 5000);
  assert.equal(state.reservation.status, "pending_payment");
  assert.equal(
    (
      await manager.call(
        "POST",
        path,
        { ...receive, amount: 6000 },
        { "idempotency-key": key },
      )
    ).data.code,
    "IDEMPOTENCY_CONFLICT",
  );
  const racers = await Promise.all(
    [1, 2].map(() =>
      manager.call(
        "POST",
        path,
        { ...receive, version: 2, amount: 10000 },
        { "idempotency-key": randomUUID() },
      ),
    ),
  );
  assert.deepEqual(racers.map((x) => x.status).sort(), [200, 409]);
  state = s.collections.parse(racers.find((x) => x.status === 200)!.data);
  assert.equal(state.reservation.status, "confirmed");
  assert.equal(state.reservation.holdExpiresAt, null);
  assert.equal(state.reservation.received!.amount, 15000);
  const full = await manager.call(
    "POST",
    path,
    { ...receive, version: 3, amount: 50000, method: "bank_transfer" },
    { "idempotency-key": randomUUID() },
  );
  assert.equal(full.status, 200);
  state = s.collections.parse(full.data);
  assert.equal(state.reservation.received!.amount, 65000);
  assert.equal(state.reservation.paymentStatus, "paid");
  const entry = state.entries.find((e) => e.amount.amount === 50000)!;
  const reverse = {
    action: "reverse",
    version: 4,
    entryId: entry.id,
    note: "Yanlış tutar girildi",
  };
  const reversals = await Promise.all(
    [1, 2].map(() =>
      manager.call("POST", path, reverse, { "idempotency-key": randomUUID() }),
    ),
  );
  assert.deepEqual(reversals.map((x) => x.status).sort(), [200, 409]);
  state = s.collections.parse(reversals.find((x) => x.status === 200)!.data);
  assert.equal(state.reservation.received!.amount, 15000);
  assert.equal(state.entries.length, 4);
  assert.equal(state.reservation.status, "confirmed");
  const relation = (
    await pool.query(
      "SELECT reservation_id,actor_id FROM payments.collections WHERE id=$1",
      [entry.id],
    )
  ).rows[0]!;
  assert.equal(relation.reservation_id, id);
  assert.equal(relation.actor_id, "manager");
  for (const statement of [
    "DELETE FROM payments.collections WHERE id=$1",
    "UPDATE payments.collections SET amount=1 WHERE id=$1",
  ])
    await assert.rejects(
      pool.query(statement, [entry.id]),
      (e: unknown) => (e as { code: string }).code === "23514",
    );
  await assert.rejects(
    pool.query(
      "INSERT INTO payments.collections(id,salon_id,reservation_id,actor_id,amount,method) VALUES($1,$2,'missing','manager',1,'cash')",
      [randomUUID(), config.SALON_ID],
    ),
    (e: unknown) => (e as { code: string }).code === "23503",
  );
  await assert.rejects(
    pool.query(
      "INSERT INTO payments.collections(id,salon_id,reservation_id,actor_id,amount,method) VALUES($1,$2,$3,'missing',1,'cash')",
      [randomUUID(), config.SALON_ID, id],
    ),
    (e: unknown) => (e as { code: string }).code === "23503",
  );
  const cancel = await manager.call(
    "PATCH",
    `/api/v1/reservations/${id}`,
    { action: "cancel", version: 5 },
    { "idempotency-key": randomUUID() },
  );
  assert.equal(cancel.status, 200);
  assert.equal(cancel.data.paymentStatus, "refund_pending");
  assert.equal(
    (
      await manager.call(
        "POST",
        path,
        { ...receive, version: 6 },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    409,
  );
  const snapshot = (await manager.call("GET", path)).data;
  assert.equal(snapshot.reservation.received.amount, 15000);
  assert.equal(snapshot.entries.length, 4);
});

test("payment preferences persist independently, preserve snapshots and deny non-managers", async () => {
  const manager = await new Client().login();
  const employee = await new Client().login("staff@example.test");
  const settings = s.paymentSettings.parse(
    (await manager.call("GET", "/api/v1/payment-settings")).data,
  );
  const old = await manager.book(
    (await manager.slots("one", "2026-10-30"))[0]!.id,
  );
  const changed = {
    ...settings,
    depositEnabled: false,
    onlinePaymentVisible: true,
  };
  assert.equal(
    (
      await employee.call("PUT", "/api/v1/payment-settings", changed, {
        "idempotency-key": randomUUID(),
      })
    ).status,
    403,
  );
  const key = randomUUID();
  const first = await manager.call("PUT", "/api/v1/payment-settings", changed, {
    "idempotency-key": key,
  });
  assert.equal(first.status, 200);
  assert.deepEqual(
    (
      await manager.call("PUT", "/api/v1/payment-settings", changed, {
        "idempotency-key": key,
      })
    ).data,
    first.data,
  );
  assert.equal(
    (
      await manager.call("PUT", "/api/v1/payment-settings", changed, {
        "idempotency-key": randomUUID(),
      })
    ).data.code,
    "VERSION_CONFLICT",
  );
  const publicCatalog = s.catalog.parse(
    (await manager.call("GET", "/api/v1/catalog")).data,
  );
  assert.equal(publicCatalog.paymentSettings!.onlinePaymentVisible, true);
  assert.equal(publicCatalog.services[0]!.deposit.amount, 0);
  const created = await manager.book(
    (await manager.slots("one", "2026-10-30"))[0]!.id,
  );
  assert.equal(created.data.reservation.status, "confirmed");
  assert.equal(created.data.reservation.deposit.amount, 0);
  assert.equal(
    (
      await manager.call(
        "GET",
        `/api/v1/reservations/${old.data.reservation.id}/collections`,
      )
    ).data.reservation.deposit.amount,
    15000,
  );
  assert.equal(
    (
      await manager.call(
        "PUT",
        "/api/v1/payment-settings",
        { ...first.data, depositEnabled: true, onlinePaymentVisible: false },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    200,
  );
  for (const b of [old.data.reservation, created.data.reservation])
    assert.equal(
      (
        await manager.call(
          "PATCH",
          `/api/v1/reservations/${b.id}`,
          { action: "cancel", version: b.version },
          { "idempotency-key": randomUUID() },
        )
      ).status,
      200,
    );
});

test("late collection cannot revive a hold; partial expired payments remain visible for review", async () => {
  const manager = await new Client().login();
  const created = await manager.book(
    (await manager.slots("one", "2026-10-30"))[0]!.id,
  );
  const id = created.data.reservation.id;
  const path = `/api/v1/reservations/${id}/collections`;
  const body = {
    action: "receive",
    version: 1,
    amount: 5000,
    method: "cash",
    note: "",
  };
  assert.equal(
    (
      await manager.call("POST", path, body, {
        "idempotency-key": randomUUID(),
      })
    ).status,
    200,
  );
  const previousTime = time;
  try {
    time = "2026-10-26T06:11:00Z";
    assert.equal(
      (
        await manager.call(
          "POST",
          path,
          { ...body, version: 2 },
          { "idempotency-key": randomUUID() },
        )
      ).data.code,
      "HOLD_EXPIRED",
    );
    const history = s.collections.parse((await manager.call("GET", path)).data);
    assert.equal(history.reservation.status, "expired");
    assert.equal(history.reservation.paymentStatus, "refund_pending");
    assert.equal(history.reservation.received!.amount, 5000);
    assert.equal(history.entries.length, 1);
  } finally {
    time = previousTime;
  }
});

test("collection and cancellation serialize without losing money or resurrecting a booking", async () => {
  const manager = await new Client().login();
  const created = await manager.book(
    (await manager.slots("one", "2026-10-30"))[0]!.id,
  );
  const id = created.data.reservation.id;
  const results = await Promise.all([
    manager.call(
      "POST",
      `/api/v1/reservations/${id}/collections`,
      {
        action: "receive",
        version: 1,
        amount: 15000,
        method: "cash",
        note: "",
      },
      { "idempotency-key": randomUUID() },
    ),
    manager.call(
      "PATCH",
      `/api/v1/reservations/${id}`,
      { action: "cancel", version: 1 },
      { "idempotency-key": randomUUID() },
    ),
  ]);
  assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
  let history = s.collections.parse(
    (await manager.call("GET", `/api/v1/reservations/${id}/collections`)).data,
  );
  if (history.reservation.status !== "cancelled") {
    assert.equal(
      (
        await manager.call(
          "PATCH",
          `/api/v1/reservations/${id}`,
          { action: "cancel", version: history.reservation.version },
          { "idempotency-key": randomUUID() },
        )
      ).status,
      200,
    );
    history = s.collections.parse(
      (await manager.call("GET", `/api/v1/reservations/${id}/collections`))
        .data,
    );
  }
  assert.equal(history.reservation.status, "cancelled");
  assert.equal(
    history.reservation.received!.amount,
    history.entries.length === 1 ? 15000 : 0,
  );
  if (history.entries.length === 1)
    assert.equal(history.reservation.paymentStatus, "refund_pending");
  const customerClient = await new Client().init();
  assert.equal(
    (
      await customerClient.call("POST", "/api/v1/customers", {
        ...customer,
        email: "collection-customer@example.test",
        password: "TestPassword123!",
      })
    ).status,
    200,
  );
  assert.equal(
    (await customerClient.call("GET", `/api/v1/reservations/${id}/collections`))
      .status,
    403,
  );
  assert.equal(
    (await customerClient.call("GET", "/api/v1/payment-settings")).status,
    403,
  );
  assert.equal(
    (
      await customerClient.call(
        "POST",
        `/api/v1/reservations/${id}/collections`,
        {
          action: "receive",
          version: history.reservation.version,
          amount: 1,
          method: "cash",
          note: "",
        },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    403,
  );
});

test("chair assignment is scoped, enforced by FK and respected by availability and commit", async () => {
  const manager = await new Client().login();
  const employee = await new Client().login("staff@example.test");
  const chair = {
    id: "chair",
    name: "Koltuk",
    active: true,
    assignedStaffId: "one",
  };
  const change = (
    value:
      | typeof chair
      | { id: string; name: string; active: boolean; assignedStaffId: null },
  ) =>
    manager.call(
      "PUT",
      "/api/v1/management",
      { resource: "chairs", value },
      { "idempotency-key": randomUUID() },
    );
  assert.equal(
    (
      await employee.call(
        "PUT",
        "/api/v1/management",
        { resource: "chairs", value: chair },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    403,
  );
  assert.equal(
    (await change({ ...chair, assignedStaffId: "missing" })).status,
    422,
  );
  await assert.rejects(
    pool.query(
      "INSERT INTO salon.chairs(id,salon_id,document) VALUES($1,$2,$3)",
      [
        "invalid-chair",
        config.SALON_ID,
        { ...chair, id: "invalid-chair", assignedStaffId: "missing" },
      ],
    ),
    (error: unknown) => (error as { code: string }).code === "23503",
  );
  const availableToTwo = (await manager.slots("two"))[0]!;
  assert.equal((await change(chair)).status, 200);
  assert.equal((await manager.slots("two")).length, 0);
  assert.ok((await manager.slots("one")).length > 0);
  assert.equal((await manager.book(availableToTwo.id, "two")).status, 409);
  const chosen = (await manager.slots("one"))[0]!;
  const booked = await manager.book(chosen.id);
  assert.equal(booked.status, 200);
  assert.equal(booked.data.reservation.chairId, "chair");
  assert.equal(
    (await change({ ...chair, assignedStaffId: "two" })).status,
    409,
  );
  const snapshot = await manager.call("GET", "/api/v1/operations");
  assert.equal(snapshot.data.chairs[0].assignedStaffId, "one");
  assert.equal(
    (
      await manager.call(
        "PATCH",
        `/api/v1/reservations/${booked.data.reservation.id}`,
        { action: "cancel", version: 1 },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    200,
  );
  assert.equal((await change({ ...chair, assignedStaffId: null })).status, 200);
  assert.ok((await manager.slots("two")).length > 0);
});

test("reservation filters apply before SQL pagination with stable totals and role ownership", async () => {
  const manager = await new Client().login();
  const user = await new Client().init();
  assert.equal(
    (
      await user.call("POST", "/api/v1/customers", {
        ...customer,
        email: "paging@example.test",
        password: "TestPassword123!",
      })
    ).status,
    200,
  );
  for (let index = 0; index < 3; index++) {
    const chosen = (await user.slots())[0]!;
    assert.equal((await user.book(chosen.id)).status, 200);
  }
  const first = await user.call(
    "GET",
    "/api/v1/reservations?period=upcoming&pageSize=2&page=1",
  );
  const second = await user.call(
    "GET",
    "/api/v1/reservations?period=upcoming&pageSize=2&page=2",
  );
  assert.equal(first.data.total, 3);
  assert.equal(second.data.total, 3);
  assert.equal(first.data.items.length, 2);
  assert.equal(second.data.items.length, 1);
  assert.equal(
    new Set(
      [...first.data.items, ...second.data.items].map(
        (r: { id: string }) => r.id,
      ),
    ).size,
    3,
  );
  const id = first.data.items[0].id;
  assert.equal(
    (
      await user.call(
        "PATCH",
        `/api/v1/reservations/${id}`,
        { action: "cancel", version: 1 },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    200,
  );
  const past = await user.call(
    "GET",
    "/api/v1/reservations?period=past&pageSize=1",
  );
  assert.equal(past.data.total, 1);
  assert.equal(past.data.items[0].id, id);
  assert.equal(
    (await user.call("GET", "/api/v1/reservations?period=upcoming&pageSize=1"))
      .data.total,
    2,
  );
  assert.equal(
    (await user.call("GET", "/api/v1/reservations?period=invalid")).status,
    422,
  );
  assert.equal((await user.call("GET", "/api/v1/operations")).status, 403);
  // Leave no active holds for subsequent conflict tests in this isolated database.
  for (const row of [...first.data.items.slice(1), ...second.data.items]) {
    assert.equal(
      (
        await manager.call(
          "PATCH",
          `/api/v1/reservations/${row.id}`,
          { action: "cancel", version: 1 },
          { "idempotency-key": randomUUID() },
        )
      ).status,
      200,
    );
  }
});

test("provider endpoints stay absent while manual collections have their own schema", async () => {
  for (const url of [
    "/api/v1/payments",
    "/api/v1/payments/manual",
    "/api/v1/payments/records",
  ]) {
    assert.equal(app.hasRoute({ method: "POST", url }), false);
    assert.equal(app.hasRoute({ method: "GET", url }), false);
    assert.equal(app.hasRoute({ method: "PUT", url }), false);
  }
  const result = await pool.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payments'",
  );
  assert.equal(result.rowCount, 1);
});

test("contracts, CSRF, origin, session rotation, ownership and deny-by-default", async () => {
  const anonymous = await new Client().init();
  assert.ok(
    s.catalog.safeParse((await anonymous.call("GET", "/api/v1/catalog")).data)
      .success,
  );
  assert.equal(
    (await anonymous.call("GET", "/api/v1/reservations")).status,
    401,
  );
  assert.equal(
    (
      await anonymous.call(
        "POST",
        "/api/v1/session",
        { email: "manager@example.test", password: "TestPassword123!" },
        { "x-csrf-token": "" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await anonymous.call(
        "POST",
        "/api/v1/session",
        {},
        { origin: "https://attacker.test" },
      )
    ).status,
    403,
  );
  const previous = anonymous.cookie;
  await anonymous.login();
  assert.notEqual(anonymous.cookie, previous);
  const managerSnapshot = await anonymous.call("GET", "/api/v1/operations");
  assert.ok(s.operations.safeParse(managerSnapshot.data).success);
  await anonymous.call("DELETE", "/api/v1/session");
  assert.equal((await anonymous.call("GET", "/api/v1/operations")).status, 401);
  const user = await new Client().init();
  assert.equal(
    (
      await user.call("POST", "/api/v1/customers", {
        ...customer,
        password: "TestPassword123!",
        role: "manager",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await user.call("POST", "/api/v1/customers", {
        ...customer,
        password: "TestPassword123!",
      })
    ).data.user.role,
    "customer",
  );
  assert.equal((await user.call("GET", "/api/v1/operations")).status, 403);
  const slots = await user.slots();
  const result = await user.book(slots[0]!.id);
  assert.equal(result.status, 200);
  assert.ok(s.createdReservation.safeParse(result.data).success);
  assert.equal((await user.call("GET", "/api/v1/reservations")).data.total, 1);
  const other = await new Client().init();
  await other.call("POST", "/api/v1/customers", {
    ...customer,
    email: "other@example.test",
    password: "TestPassword123!",
  });
  assert.equal(
    (
      await other.call(
        "PATCH",
        `/api/v1/reservations/${result.data.reservation.id}`,
        { version: 1, action: "cancel" },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    404,
  );
});
test("concurrent same slot has one commit; retry has one booking; chair blocks another staff", async () => {
  const a = await new Client().init(),
    b = await new Client().init();
  const slot = (await a.slots())[0]!;
  const results = await Promise.all([a.book(slot.id), b.book(slot.id)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const occupiedTime = slot.startsAt;
  assert.ok(!(await a.slots("two")).some((s) => s.startsAt === occupiedTime));
  const next = (await a.slots())[0]!,
    key = randomUUID();
  const repeat = await Promise.all([
    a.book(next.id, "one", key),
    a.book(next.id, "one", key),
  ]);
  assert.deepEqual(
    repeat.map((r) => r.status),
    [200, 200],
  );
  assert.equal(repeat[0]!.data.reservation.id, repeat[1]!.data.reservation.id);
  assert.equal(repeat[0]!.data.guestToken, repeat[1]!.data.guestToken);
  assert.equal(
    (await a.book((await a.slots())[0]!.id, "one", key)).status,
    409,
  );
  const stored = (
    await pool.query("SELECT result FROM platform.idempotency WHERE key=$1", [
      key,
    ])
  ).rows[0]!.result;
  assert.equal(stored.guestToken, null);
});
test("DB exclusion constraints protect direct competing writes, independent of application locks", async () => {
  const client = await new Client().init();
  const r = await client.book((await client.slots("one", "2026-10-28"))[0]!.id);
  assert.equal(r.status, 200);
  await assert.rejects(
    pool.query(
      `INSERT INTO reservations.bookings(id,salon_id,version,customer_snapshot,staff_id,staff_name,service_id,service_name,chair_id,starts_at,ends_at,occupied_until,total,deposit,status,payment_status,hold_expires_at) SELECT $1,salon_id,version,customer_snapshot,staff_id,staff_name,service_id,service_name,chair_id,starts_at,ends_at,occupied_until,total,deposit,status,payment_status,hold_expires_at FROM reservations.bookings WHERE id=$2`,
      [randomUUID(), r.data.reservation.id],
    ),
    (error: unknown) => (error as { code: string }).code === "23P01",
  );
});
test("expired holds release capacity", async () => {
  const client = await new Client().init();
  const slot = (await client.slots("one", "2026-10-30"))[0]!,
    r = await client.book(slot.id);
  assert.equal(r.status, 200);
  time = "2026-10-26T06:11:00Z";
  assert.ok(
    (await client.slots("one", "2026-10-30")).some((s) => s.id === slot.id),
  );
});
test("rescheduling and management edits keep booked resources consistent", async () => {
  const manager = await new Client().login(),
    staff = await new Client().login("staff@example.test");
  const r = await manager.book((await manager.slots())[0]!.id);
  assert.equal(r.status, 200);
  const target = (await manager.slots())[0]!;
  const moved = await manager.call(
    "PATCH",
    `/api/v1/reservations/${r.data.reservation.id}`,
    { version: 1, action: "reschedule", slotId: target.id },
    { "idempotency-key": randomUUID() },
  );
  assert.equal(moved.status, 200);
  assert.equal(moved.data.startsAt, target.startsAt);
  assert.equal(moved.data.id, r.data.reservation.id);
  assert.equal(moved.data.status, r.data.reservation.status);
  const persisted = (
    await pool.query(
      "SELECT starts_at,status FROM reservations.bookings WHERE id=$1",
      [r.data.reservation.id],
    )
  ).rows[0]!;
  assert.equal(persisted.starts_at.toISOString(), target.startsAt);
  assert.equal(persisted.status, r.data.reservation.status);
  const rejected = await manager.call(
    "PUT",
    "/api/v1/management",
    {
      resource: "schedules",
      value: {
        id: "one-27",
        staffId: "one",
        date: "2026-10-27",
        kind: "leave",
        startsAt: "09:00",
        endsAt: "19:00",
        note: "",
      },
    },
    { "idempotency-key": randomUUID() },
  );
  assert.equal(rejected.status, 409);
  const schedule = (
    await pool.query("SELECT document FROM salon.schedules WHERE id='one-27'")
  ).rows[0]!.document;
  assert.equal(schedule.kind, "shift");
  const staffRows = (await staff.call("GET", "/api/v1/operations")).data;
  assert.deepEqual(staffRows.customers, []);
  assert.ok(
    staffRows.reservations.every(
      (b: { staffId: string }) => b.staffId === "one",
    ),
  );
  assert.equal(
    (
      await staff.call(
        "PUT",
        "/api/v1/management",
        { resource: "services", value: service },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    403,
  );
});
test("sessions persist across app instances and logout revokes the old cookie", async () => {
  const manager = await new Client().login();
  const cookie = manager.cookie;
  const second = await createApp(config, pool, () => time);
  try {
    const result = await second.inject({
      method: "GET",
      url: "/api/v1/session",
      headers: { cookie },
    });
    assert.equal(result.json().user.role, "manager");
    await manager.call("DELETE", "/api/v1/session");
    const revoked = await second.inject({
      method: "GET",
      url: "/api/v1/session",
      headers: { cookie },
    });
    assert.equal(revoked.json().user, null);
  } finally {
    await second.close();
  }
});
test("rate limiting and production cookie flags are enforced", async () => {
  const client = await new Client().init();
  let last;
  for (let i = 0; i < 11; i++)
    last = await client.call("POST", "/api/v1/session", {});
  assert.equal(last!.status, 429);
  const production = await createApp(
    {
      ...config,
      NODE_ENV: "production",
      PUBLIC_ORIGIN: "https://salon.example",
      TRUST_PROXY: "127.0.0.1",
    },
    pool,
    () => time,
  );
  try {
    const response = await production.inject({
      method: "GET",
      url: "/api/v1/session",
      headers: { "x-forwarded-proto": "https" },
      remoteAddress: "127.0.0.1",
    });
    assert.equal(response.statusCode, 200);
    const cookie = String(response.headers["set-cookie"]);
    assert.match(cookie, /__Host-salon=/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/i);
  } finally {
    await production.close();
  }
});
test("zero-deposit booking confirms without any payment provider", async () => {
  const manager = await new Client().login();
  const change = await manager.call(
    "PUT",
    "/api/v1/management",
    {
      resource: "services",
      value: { ...service, deposit: { amount: 0, currency: "TRY" } },
    },
    { "idempotency-key": randomUUID() },
  );
  assert.equal(change.status, 200);
  const guest = await new Client().init();
  const r = await guest.book(
    (await guest.slots("two", "2026-10-29"))[0]!.id,
    "two",
  );
  assert.equal(r.status, 200);
  assert.equal(r.data.reservation.status, "confirmed");
  assert.equal(r.data.reservation.holdExpiresAt, null);
  assert.equal(r.data.reservation.paymentStatus, "unpaid");
});
test("outbox retries failures, bounds retries and recovers worker leases", async () => {
  await pool.query("TRUNCATE notifications.outbox");
  const row = (
    await pool.query(
      "SELECT id,version FROM reservations.bookings ORDER BY created_at LIMIT 1",
    )
  ).rows[0]!;
  await enqueue(pool, "reservation.created", {
    reservationId: row.id,
    version: row.version,
  });
  const resolve = (payload: { reservationId: string; version: number }) =>
    notificationContent(pool, config.SALON_ID, payload);
  let sends = 0;
  const worker = new OutboxWorker(
    pool,
    {
      send: async () => {
        sends++;
        throw new Error("private provider error");
      },
    },
    "sms",
    resolve,
    2,
  );
  assert.equal(await worker.tick(), true);
  assert.equal(sends, 1);
  let job = (await pool.query("SELECT * FROM notifications.outbox")).rows[0]!;
  assert.equal(job.status, "pending");
  assert.equal(job.last_error, "DELIVERY_FAILED");
  await pool.query(
    "UPDATE notifications.outbox SET available_at=now()-interval '1 second'",
  );
  await worker.tick();
  job = (await pool.query("SELECT * FROM notifications.outbox")).rows[0]!;
  assert.equal(job.status, "dead");
  await pool.query(
    "UPDATE notifications.outbox SET status='processing',lease_until=now()-interval '1 second',attempts=0",
  );
  const successful = new OutboxWorker(
    pool,
    {
      send: async () => {
        sends++;
      },
    },
    "sms",
    resolve,
  );
  assert.equal(await successful.tick(), true);
  assert.equal(
    (await pool.query("SELECT status FROM notifications.outbox")).rows[0]!
      .status,
    "sent",
  );
  assert.equal(await successful.tick(), false);
});
