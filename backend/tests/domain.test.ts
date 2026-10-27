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
  slotOverview,
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
test("rescheduling copies only time and chair, preserving reservation identity and state", () => {
  const reservation = new Reservation(booking);
  const target = {
    id: "slot-not-booking",
    status: "available",
    total: 1,
    startsAt: "2026-10-27T08:00:00Z",
    endsAt: "2026-10-27T08:30:00Z",
    occupiedUntil: "2026-10-27T08:40:00Z",
    chairId: "new-chair",
  };
  reservation.change("reschedule", 1, manager, now, target);
  const changed = reservation.snapshot();
  assert.equal(changed.id, booking.id);
  assert.equal(changed.status, booking.status);
  assert.equal(changed.total, booking.total);
  assert.equal(changed.startsAt, target.startsAt);
  assert.equal(changed.version, 2);
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
test("configurable slot intervals keep busy, past and unavailable slots while commit candidates exclude them", () => {
  const input = {
    date: "2026-10-26",
    zone: "Europe/Istanbul",
    now: "2026-10-26T05:00:00Z",
    bookingDays: 7,
    duration: 30,
    buffer: 10,
    intervalMinutes: 20,
    shifts: [
      {
        kind: "shift" as const,
        ...localRange("2026-10-26", "09:00", "13:00", "Europe/Istanbul"),
      },
      {
        kind: "break" as const,
        ...localRange("2026-10-26", "11:00", "12:00", "Europe/Istanbul"),
      },
    ],
    busy: [localRange("2026-10-26", "10:00", "10:40", "Europe/Istanbul")],
    chairs: [{ id: "chair", busy: [] }],
    closedDates: [],
  };
  const overview = slotOverview(input);
  assert.equal(overview[0]!.status, "available");
  assert.equal(
    Date.parse(overview[1]!.startsAt) - Date.parse(overview[0]!.startsAt),
    20 * 60000,
  );
  assert.equal(
    overview.find((x) => x.startsAt === "2026-10-26T07:00:00.000Z")!.status,
    "busy",
  );
  assert.equal(
    overview.find((x) => x.startsAt === "2026-10-26T08:00:00.000Z")!.status,
    "unavailable",
  );
  assert.ok(candidateSlots(input).every((x) => x.status === "available"));
  assert.equal(
    slotOverview({ ...input, now: "2026-10-26T06:01:00Z" })[0]!.status,
    "past",
  );
  assert.ok(
    slotOverview({ ...input, chairs: [] }).every(
      (x) => x.status === "unavailable",
    ),
  );
  assert.ok(
    slotOverview({ ...input, closedDates: [input.date] }).every(
      (x) => x.status === "unavailable",
    ),
  );
  assert.equal(
    slotOverview({
      ...input,
      busy: [],
      chairs: [{ id: "chair", busy: input.busy }],
    }).find((x) => x.startsAt === "2026-10-26T07:00:00.000Z")!.status,
    "busy",
  );
  for (const intervalMinutes of [0, -1, 4, 121, 5.5])
    assert.throws(() => slotOverview({ ...input, intervalMinutes }));
  for (const intervalMinutes of [5, 17, 120])
    assert.ok(slotOverview({ ...input, intervalMinutes }).length > 0);
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
