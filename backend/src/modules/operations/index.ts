import type pg from "pg";
import type { ManagementChange } from "../../../../app/contracts/schemas.js";
import {
  transaction,
  lockSalon,
  audit,
  type Sql,
} from "../../infrastructure/database.js";
import { once } from "../../infrastructure/idempotency.js";
import type { RequestContext } from "../../kernel/actor.js";
import { ensure } from "../../kernel/errors.js";
import { readSalon, updateSalon } from "../salon/index.js";
import { listCustomers, saveCustomer } from "../identity/index.js";
import { bookingStore, expireHolds, toDto } from "../reservations/index.js";
import { overlap } from "../scheduling/domain.js";
export async function workspace(
  sql: Sql,
  salonId: string,
  context: RequestContext,
  now: string,
) {
  ensure(
    context.actor && context.actor.role !== "customer",
    "FORBIDDEN",
    "Bu alana erişim yetkiniz yok.",
    403,
  );
  const catalog = await readSalon(sql, salonId),
    manager = context.actor.role === "manager";
  return {
    salon: catalog.salon,
    services: catalog.services,
    staff: manager
      ? catalog.staff
      : catalog.staff.filter((s) => s.id === context.actor!.staffId),
    chairs: manager
      ? catalog.chairs
      : catalog.chairs.filter(
          (c) =>
            !c.assignedStaffId || c.assignedStaffId === context.actor!.staffId,
        ),
    schedules: catalog.schedules.filter(
      (s) => manager || s.staffId === context.actor!.staffId,
    ),
    customers: manager ? await listCustomers(sql, salonId) : [],
    reservations: (
      await bookingStore(sql, salonId, context).list(context.actor)
    ).map((b) => ({
      ...toDto(b, context, now),
      chairName: catalog.chairs.find((c) => c.id === b.chairId)?.name,
    })),
  };
}
export async function manage(
  pool: pg.Pool,
  salonId: string,
  input: ManagementChange,
  context: RequestContext,
  key: string,
  now: string,
) {
  ensure(
    context.actor?.role === "manager",
    "FORBIDDEN",
    "Yönetici yetkisi gerekli.",
    403,
  );
  return transaction(pool, async (sql) => {
    await lockSalon(sql, salonId);
    await expireHolds(sql, salonId, now);
    return once(sql, `manage:${context.actor!.id}`, key, input, async () => {
      if (input.resource === "customers")
        await saveCustomer(sql, salonId, input.value);
      else await updateSalon(sql, salonId, input);
      // Prevent schedule/resource edits from silently invalidating committed appointments.
      const catalog = await readSalon(sql, salonId);
      for (const b of await bookingStore(sql, salonId, context).busy()) {
        const occupied = { startsAt: b.startsAt, endsAt: b.occupiedUntil };
        ensure(
          catalog.staff.some((s) => s.id === b.staffId && s.active) &&
            catalog.chairs.some(
              (c) =>
                c.id === b.chairId &&
                c.active &&
                (!c.assignedStaffId || c.assignedStaffId === b.staffId),
            ),
          "SLOT_CONFLICT",
          "Bu değişiklik aktif randevunun çalışan veya koltuk atamasını bozuyor. Önce ilgili randevuyu düzenleyin.",
          409,
        );
        const shifts = catalog.intervals.filter((s) => s.staffId === b.staffId);
        ensure(
          shifts.some(
            (s) =>
              s.kind === "shift" &&
              Date.parse(s.startsAt) <= Date.parse(b.startsAt) &&
              Date.parse(s.endsAt) >= Date.parse(b.occupiedUntil),
          ) && !shifts.some((s) => s.kind !== "shift" && overlap(s, occupied)),
          "SLOT_CONFLICT",
          "Mesai değişikliği mevcut randevuyla çakışıyor.",
          409,
        );
      }
      await audit(
        sql,
        context.actor!.id,
        `management.${input.resource}`,
        input.value.id,
        context.requestId,
      );
      return workspace(sql, salonId, context, now);
    });
  });
}
