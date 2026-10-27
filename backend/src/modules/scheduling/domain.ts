import { Temporal } from "@js-temporal/polyfill";
import { ensure } from "../../kernel/errors.js";
export type Interval = { startsAt: string; endsAt: string };
export function overlap(a: Interval, b: Interval) {
  return (
    Date.parse(a.startsAt) < Date.parse(b.endsAt) &&
    Date.parse(b.startsAt) < Date.parse(a.endsAt)
  );
}
export function localDate(instant: string, zone: string) {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(zone)
    .toPlainDate()
    .toString();
}
export function localRange(
  date: string,
  start: string,
  end: string,
  zone: string,
): Interval {
  const day = Temporal.PlainDate.from(date);
  const last = end <= start ? day.add({ days: 1 }) : day;
  // Reject DST gaps/ambiguities instead of silently moving a customer's appointment.
  const zoned = (d: Temporal.PlainDate, time: string) =>
    Temporal.ZonedDateTime.from(`${d}T${time}[${zone}]`, {
      disambiguation: "reject",
    })
      .toInstant()
      .toString();
  return { startsAt: zoned(day, start), endsAt: zoned(last, end) };
}
export type ScheduleInput = Interval & { kind: "shift" | "break" | "leave" };
type SlotInput = {
  date: string;
  zone: string;
  now: string;
  bookingDays: number;
  duration: number;
  buffer: number;
  intervalMinutes?: number;
  shifts: ScheduleInput[];
  busy: Interval[];
  chairs: { id: string; busy: Interval[] }[];
  closedDates: string[];
};
export function slotOverview(input: SlotInput) {
  const interval = input.intervalMinutes ?? 15;
  ensure(
    Number.isInteger(interval) && interval >= 5 && interval <= 120,
    "VALIDATION_ERROR",
    "Randevu saat aralığı 5–120 dakika olmalı.",
  );
  const today = Temporal.PlainDate.from(localDate(input.now, input.zone));
  const day = Temporal.PlainDate.from(input.date);
  if (
    Temporal.PlainDate.compare(day, today) < 0 ||
    Temporal.PlainDate.compare(day, today.add({ days: input.bookingDays })) >= 0
  )
    return [];
  const found = new Map<
    string,
    Interval & {
      chairId: string | null;
      occupiedUntil: string;
      status: "available" | "busy" | "unavailable" | "past";
    }
  >();
  for (const shift of input.shifts.filter((s) => s.kind === "shift")) {
    for (
      let start = Date.parse(shift.startsAt);
      start < Date.parse(shift.endsAt);
      start += interval * 60000
    ) {
      const startsAt = new Date(start).toISOString();
      if (localDate(startsAt, input.zone) !== input.date) continue;
      const endsAt = new Date(start + input.duration * 60000).toISOString();
      const occupiedUntil = new Date(
        Date.parse(endsAt) + input.buffer * 60000,
      ).toISOString();
      const occupied = { startsAt, endsAt: occupiedUntil };
      if (Date.parse(occupiedUntil) > Date.parse(shift.endsAt)) continue;
      const closed = input.closedDates.some((date) => {
        const a = Temporal.PlainDate.from(date).toZonedDateTime(input.zone);
        return overlap(occupied, {
          startsAt: a.toInstant().toString(),
          endsAt: a.add({ days: 1 }).toInstant().toString(),
        });
      });
      const unavailable =
        closed ||
        input.shifts.some((s) => s.kind !== "shift" && overlap(s, occupied)) ||
        input.chairs.length === 0;
      const chair = input.chairs.find(
        (c) => !c.busy.some((b) => overlap(b, occupied)),
      );
      const status =
        start <= Date.parse(input.now)
          ? "past"
          : unavailable
            ? "unavailable"
            : input.busy.some((b) => overlap(b, occupied)) || !chair
              ? "busy"
              : "available";
      found.set(startsAt, {
        startsAt,
        endsAt,
        occupiedUntil,
        chairId: status === "available" ? chair!.id : null,
        status,
      });
    }
  }
  return [...found.values()].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
}
export function candidateSlots(input: SlotInput) {
  return slotOverview(input).filter(
    (slot): slot is typeof slot & { chairId: string } =>
      slot.status === "available" && slot.chairId !== null,
  );
}
