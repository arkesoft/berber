import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Reservation,
  actions,
  type Booking,
} from "../src/modules/reservations/domain.js";
import {
  localRange,
  candidateSlots,
} from "../src/modules/scheduling/domain.js";
const customer = {
  id: "customer",
  role: "customer" as const,
  staffId: null,
  customerId: "customer",
};
const manager = {
  id: "manager",
  role: "manager" as const,
  staffId: null,
  customerId: null,
};
const now = "2026-10-26T06:00:00Z";
const booking: Booking = {
  id: "b",
  version: 1,
  customerId: "customer",
  customer: {
    name: "Test",
    email: "test@example.test",
    phone: "+905550000000",
  },
  staffId: "staff",
  staffName: "Test",
  serviceId: "cut",
  serviceName: "Cut",
  chairId: "chair",
  startsAt: "2026-10-27T06:00:00Z",
  endsAt: "2026-10-27T06:30:00Z",
  occupiedUntil: "2026-10-27T06:40:00Z",
  total: 65000,
  deposit: 15000,
  status: "pending_payment",
  paymentStatus: "pending",
  holdExpiresAt: "2026-10-26T06:10:00Z",
  guestTokenHash: null,
  guestExpiresAt: null,
};
test("reservation transitions enforce version, ownership and immutability", () => {
  const original = {
    ...booking,
    status: "confirmed" as const,
    paymentStatus: "unpaid" as const,
    holdExpiresAt: null,
  };
  const r = new Reservation(original);
  assert.throws(() => r.change("cancel", 2, customer, now));
  assert.throws(() => r.change("start", 1, customer, now));
  r.change("cancel", 1, customer, now);
  assert.equal(r.snapshot().status, "cancelled");
  assert.equal(original.status, "confirmed");
  assert.throws(() => r.change("start", 2, manager, now));
  assert.deepEqual(
    actions({ ...booking, customerId: "other" }, customer, now),
    [],
  );
});
test("DST gaps and ambiguous local times are rejected; overnight shift crosses the day", () => {
  assert.throws(() =>
    localRange("2026-03-29", "02:30", "04:00", "Europe/Berlin"),
  );
  assert.throws(() =>
    localRange("2026-10-25", "02:30", "04:00", "Europe/Berlin"),
  );
  assert.deepEqual(
    localRange("2026-10-26", "22:00", "02:00", "Europe/Istanbul"),
    { startsAt: "2026-10-26T19:00:00Z", endsAt: "2026-10-26T23:00:00Z" },
  );
});
test("availability accounts for preparation, breaks, chairs, closure and overnight shift", () => {
  const input = {
    date: "2026-10-26",
    zone: "Europe/Istanbul",
    now,
    bookingDays: 7,
    duration: 30,
    buffer: 15,
    shifts: [
      {
        kind: "shift" as const,
        ...localRange("2026-10-26", "22:00", "02:00", "Europe/Istanbul"),
      },
    ],
    busy: [],
    chairs: [{ id: "c", busy: [] }],
    closedDates: [],
  };
  const slots = candidateSlots(input);
  assert.ok(slots.length > 0);
  assert.equal(slots.at(-1)?.startsAt, "2026-10-26T20:45:00.000Z");
  assert.deepEqual(candidateSlots({ ...input, chairs: [] }), []);
  assert.deepEqual(
    candidateSlots({ ...input, closedDates: ["2026-10-26"] }),
    [],
  );
  const breaks = [
    ...input.shifts,
    {
      kind: "break" as const,
      ...localRange("2026-10-26", "22:00", "23:00", "Europe/Istanbul"),
    },
  ];
  assert.equal(
    candidateSlots({ ...input, shifts: breaks })[0]?.startsAt,
    "2026-10-26T20:00:00.000Z",
  );
});
