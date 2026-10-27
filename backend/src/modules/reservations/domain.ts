import { ensure } from "../../kernel/errors.js";
import type { Actor } from "../../kernel/actor.js";
export type Status =
  | "pending_payment"
  | "confirmed"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";
export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refund_pending"
  | "refunded"
  | "partially_refunded";
export type Action = "cancel" | "reschedule" | "start" | "complete" | "no_show";
export type Booking = {
  id: string;
  version: number;
  customerId: string | null;
  customer: { name: string; email: string; phone: string };
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  chairId: string;
  startsAt: string;
  endsAt: string;
  occupiedUntil: string;
  total: number;
  deposit: number;
  receivedAmount?: number;
  status: Status;
  paymentStatus: PaymentStatus;
  holdExpiresAt: string | null;
  guestTokenHash: string | null;
  guestExpiresAt: string | null;
};
export function canAccess(b: Booking, actor: Actor | null) {
  return (
    actor?.role === "manager" ||
    (actor?.role === "staff" && actor.staffId === b.staffId) ||
    (actor?.role === "customer" && actor.customerId === b.customerId)
  );
}
export function actions(
  b: Booking,
  actor: Actor | null,
  now: string,
): Action[] {
  if (!canAccess(b, actor)) return [];
  if (
    b.status === "pending_payment" &&
    b.holdExpiresAt &&
    Date.parse(b.holdExpiresAt) <= Date.parse(now)
  )
    return [];
  const operational = actor?.role === "manager" || actor?.role === "staff";
  if (b.status === "in_service") return operational ? ["complete"] : [];
  if (!["pending_payment", "confirmed"].includes(b.status)) return [];
  const result: Action[] =
    Date.parse(b.startsAt) > Date.parse(now) || operational
      ? ["cancel", "reschedule"]
      : [];
  if (operational && b.status === "confirmed") {
    if (Date.parse(now) >= Date.parse(b.startsAt) - 15 * 60000)
      result.push("start");
    if (Date.parse(now) >= Date.parse(b.endsAt)) result.push("no_show");
  }
  return result;
}
export class Reservation {
  constructor(private value: Booking) {
    this.value = structuredClone(value);
  }
  snapshot(): Booking {
    return structuredClone(this.value);
  }
  recordCollection(delta: number, version: number, now: string) {
    const b = this.value;
    ensure(
      version === b.version,
      "VERSION_CONFLICT",
      "Randevu değişti; listeyi yenileyin.",
      409,
    );
    if (delta > 0) {
      ensure(
        !["cancelled", "expired", "no_show"].includes(b.status),
        "INVALID_TRANSITION",
        "Bu randevuya yeni tahsilat eklenemez.",
        409,
      );
      ensure(
        !(
          b.status === "pending_payment" &&
          b.holdExpiresAt &&
          Date.parse(b.holdExpiresAt) <= Date.parse(now)
        ),
        "HOLD_EXPIRED",
        "Saat tutma süresi doldu; tahsilat kaydedilemez.",
        409,
      );
    }
    const received = (b.receivedAmount ?? 0) + delta;
    ensure(
      Number.isSafeInteger(delta) &&
        delta !== 0 &&
        received >= 0 &&
        received <= b.total,
      "VALIDATION_ERROR",
      "Tahsilat kalan bakiyeyi aşamaz.",
    );
    b.receivedAmount = received;
    if (b.status === "pending_payment" && received >= b.deposit) {
      b.status = "confirmed";
      b.holdExpiresAt = null;
    }
    b.paymentStatus =
      ["cancelled", "expired"].includes(b.status) && received > 0
        ? "refund_pending"
        : received >= b.total && received > 0
          ? "paid"
          : received > 0
            ? "pending"
            : "unpaid";
    b.version++;
  }
  change(
    action: Action,
    version: number,
    actor: Actor | null,
    now: string,
    newSlot?: {
      startsAt: string;
      endsAt: string;
      occupiedUntil: string;
      chairId: string;
    },
  ) {
    const b = this.value;
    ensure(
      version === b.version,
      "VERSION_CONFLICT",
      "Randevu değişti; listeyi yenileyin.",
      409,
    );
    ensure(
      actions(b, actor, now).includes(action),
      "INVALID_TRANSITION",
      "Bu işlem randevunun durumunda uygulanamaz.",
      409,
    );
    if (action === "reschedule") {
      ensure(newSlot, "VALIDATION_ERROR", "Yeni saat gerekli.");
      b.startsAt = newSlot.startsAt;
      b.endsAt = newSlot.endsAt;
      b.occupiedUntil = newSlot.occupiedUntil;
      b.chairId = newSlot.chairId;
    } else {
      b.status = (
        {
          cancel: "cancelled",
          start: "in_service",
          complete: "completed",
          no_show: "no_show",
        } as const
      )[action];
      b.holdExpiresAt = null;
      if (
        action === "cancel" &&
        ((b.receivedAmount ?? 0) > 0 ||
          ["paid", "partially_refunded"].includes(b.paymentStatus))
      )
        b.paymentStatus = "refund_pending";
    }
    b.version++;
  }
}
