import { describe, expect, it } from "vitest";
import { addDays, formatMoney, formatTime } from "../app/shared/format";
import { createReservation, money } from "../app/contracts/schemas";
describe("display and boundary validation", () => {
  it("formats integer minor units without changing them", () => {
    expect(formatMoney({ amount: 65001, currency: "TRY" })).toContain("650,01");
    expect(money.safeParse({ amount: 1.2, currency: "TRY" }).success).toBe(
      false,
    );
  });
  it("uses explicit timezones across midnight and DST", () => {
    expect(formatTime("2026-10-26T22:30:00Z", "Europe/Istanbul")).toBe("01:30");
    expect(formatTime("2026-03-29T01:30:00Z", "Europe/Berlin")).toBe("03:30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("rejects missing privacy acknowledgement", () => {
    expect(
      createReservation.safeParse({
        serviceId: "cut",
        staffId: "emre",
        slotId: "slot",
        customer: {
          name: "Deniz",
          email: "d@example.test",
          phone: "5551234567",
        },
        privacyAccepted: false,
      }).success,
    ).toBe(false);
  });
});
