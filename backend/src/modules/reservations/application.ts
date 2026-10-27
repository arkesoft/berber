import { randomUUID, createHmac, createHash } from "node:crypto";
import type {
  CreateReservation,
  Reservation as ReservationDto,
} from "../../../../app/contracts/schemas.js";
import { ensure } from "../../kernel/errors.js";
import type { RequestContext } from "../../kernel/actor.js";
import { slotOverview, localDate } from "../scheduling/domain.js";
import {
  Reservation,
  actions,
  canAccess,
  type Booking,
  type Action,
} from "./domain.js";
import type { BookingStore, BookingTransactions } from "./ports.js";
export function toDto(
  b: Booking,
  context: RequestContext,
  now: string,
): ReservationDto {
  return {
    id: b.id,
    chairId: b.chairId,
    version: b.version,
    customer: b.customer,
    customerId: b.customerId,
    staffId: b.staffId,
    staffName: b.staffName,
    serviceId: b.serviceId,
    serviceName: b.serviceName,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    total: { amount: b.total, currency: "TRY" },
    deposit: { amount: b.deposit, currency: "TRY" },
    received: { amount: b.receivedAmount ?? 0, currency: "TRY" },
    status: b.status,
    paymentStatus: b.paymentStatus,
    holdExpiresAt: b.holdExpiresAt,
    allowedActions: actions(b, context.actor, now),
  };
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
async function slotOptions(
  store: BookingStore,
  serviceId: string,
  staffId: string,
  date: string,
  now: string,
  ignoreId?: string,
) {
  const catalog = await store.catalog();
  const service = catalog.services.find((s) => s.id === serviceId && s.active),
    staff = catalog.staff.find(
      (s) => s.id === staffId && s.active && s.serviceIds.includes(serviceId),
    );
  if (!service || !staff) return [];
  const busy = (await store.busy()).filter((b) => b.id !== ignoreId);
  return slotOverview({
    date,
    zone: catalog.salon.timezone,
    now,
    bookingDays: catalog.salon.bookingDays,
    duration: service.durationMinutes,
    buffer: catalog.buffer,
    intervalMinutes: catalog.salon.slotIntervalMinutes,
    shifts: catalog.intervals.filter((s) => s.staffId === staffId),
    closedDates: catalog.closedDates,
    busy: busy
      .filter((b) => b.staffId === staffId)
      .map((b) => ({ startsAt: b.startsAt, endsAt: b.occupiedUntil })),
    chairs: catalog.chairs
      .filter(
        (c) =>
          c.active && (!c.assignedStaffId || c.assignedStaffId === staffId),
      )
      .map((c) => ({
        id: c.id,
        busy: busy
          .filter((b) => b.chairId === c.id)
          .map((b) => ({ startsAt: b.startsAt, endsAt: b.occupiedUntil })),
      })),
  }).map((s) => ({ ...s, id: `${staffId}|${s.startsAt}`, staffId }));
}
export async function slots(...args: Parameters<typeof slotOptions>) {
  return (await slotOptions(...args)).filter(
    (slot): slot is typeof slot & { chairId: string } =>
      slot.status === "available" && slot.chairId !== null,
  );
}
export class BookingService {
  constructor(
    private readonly tx: BookingTransactions,
    private readonly clock: () => string,
    private readonly guestSecret: string,
    private readonly holdMinutes: number,
  ) {}
  availability(service: string, staff: string, date: string) {
    return this.tx.read(async (store) => {
      const options = await slotOptions(
        store,
        service,
        staff,
        date,
        this.clock(),
      );
      return {
        slots: options.filter((slot) => slot.status === "available"),
        unavailableSlots: options.filter((slot) => slot.status !== "available"),
        timezone: (await store.catalog()).salon.timezone,
        fetchedAt: this.clock(),
      };
    });
  }
  create(input: CreateReservation, context: RequestContext, key: string) {
    const scope = `create:${context.actor?.id ?? context.sessionId}`;
    return this.tx
      .execute(scope, key, input, async (store) => {
        ensure(
          context.actor?.role !== "staff",
          "FORBIDDEN",
          "Çalışan bu kanaldan rezervasyon oluşturamaz.",
          403,
        );
        const now = this.clock(),
          catalog = await store.catalog();
        const startsAt = input.slotId.slice(input.slotId.indexOf("|") + 1);
        let date: string;
        try {
          date = localDate(startsAt, catalog.salon.timezone);
        } catch {
          ensure(false, "VALIDATION_ERROR", "Saat seçimi geçersiz.");
        }
        const chosen = (
          await slots(store, input.serviceId, input.staffId, date, now)
        ).find((s) => s.id === input.slotId);
        ensure(
          chosen,
          "SLOT_CONFLICT",
          "Bu saat artık müsait değil; yeni saat seçin.",
          409,
        );
        const service = catalog.services.find((s) => s.id === input.serviceId)!,
          staff = catalog.staff.find((s) => s.id === input.staffId)!;
        const deposit = catalog.paymentSettings.depositEnabled
          ? service.deposit.amount
          : 0;
        const id = randomUUID(),
          guest = context.actor
            ? null
            : createHmac("sha256", this.guestSecret)
                .update(`${scope}:${key}:${id}`)
                .digest("base64url");
        const booking: Booking = {
          id,
          version: 1,
          customer: input.customer,
          customerId:
            context.actor?.role === "customer"
              ? context.actor.customerId
              : null,
          staffId: staff.id,
          staffName: staff.name,
          serviceId: service.id,
          serviceName: service.name,
          chairId: chosen.chairId,
          startsAt: chosen.startsAt,
          endsAt: chosen.endsAt,
          occupiedUntil: chosen.occupiedUntil,
          total: service.price.amount,
          deposit,
          receivedAmount: 0,
          status: deposit > 0 ? "pending_payment" : "confirmed",
          paymentStatus: deposit > 0 ? "pending" : "unpaid",
          holdExpiresAt:
            deposit > 0
              ? new Date(
                  Date.parse(now) + this.holdMinutes * 60000,
                ).toISOString()
              : null,
          guestTokenHash: guest ? tokenHash(guest) : null,
          guestExpiresAt: guest
            ? new Date(Date.parse(now) + 24 * 3600000).toISOString()
            : null,
        };
        await store.insert(booking);
        await store.event(booking, "reservation.created");
        await store.audit("reservation.created", id);
        // Guest credential is regenerated after replay; do not persist the bearer token in idempotency results.
        return { reservation: toDto(booking, context, now), guestToken: null };
      })
      .then((result) => ({
        ...result,
        guestToken: context.actor
          ? null
          : createHmac("sha256", this.guestSecret)
              .update(`${scope}:${key}:${result.reservation.id}`)
              .digest("base64url"),
      }));
  }
  change(
    id: string,
    input: { version: number; action: Action; slotId?: string },
    context: RequestContext,
    key: string,
  ) {
    return this.tx.execute(
      `change:${context.actor?.id ?? context.sessionId}:${id}`,
      key,
      input,
      async (store) => {
        const b = await store.find(id),
          now = this.clock();
        ensure(
          b && canAccess(b, context.actor),
          "NOT_FOUND",
          "Randevu bulunamadı.",
          404,
        );
        let target;
        if (input.action === "reschedule") {
          ensure(input.slotId, "VALIDATION_ERROR", "Yeni saat gerekli.");
          const catalog = await store.catalog();
          let date: string;
          try {
            date = localDate(
              input.slotId.slice(input.slotId.indexOf("|") + 1),
              catalog.salon.timezone,
            );
          } catch {
            ensure(false, "VALIDATION_ERROR", "Saat geçersiz.");
          }
          target = (
            await slots(store, b.serviceId, b.staffId, date, now, id)
          ).find((s) => s.id === input.slotId);
          ensure(target, "SLOT_CONFLICT", "Yeni saat müsait değil.", 409);
          // Preserve booked duration even if the service catalog changed later.
          ensure(
            Date.parse(target.endsAt) - Date.parse(target.startsAt) ===
              Date.parse(b.endsAt) - Date.parse(b.startsAt),
            "INVALID_TRANSITION",
            "Hizmet süresi değişti; yöneticiyle görüşün.",
            409,
          );
        }
        const aggregate = new Reservation(b);
        aggregate.change(
          input.action,
          input.version,
          context.actor,
          now,
          target,
        );
        const changed = aggregate.snapshot();
        await store.save(changed);
        await store.event(changed, `reservation.${input.action}`);
        await store.audit(`reservation.${input.action}`, id);
        return toDto(changed, context, now);
      },
    );
  }
}
