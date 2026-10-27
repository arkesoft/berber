import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { z } from "zod";
import * as s from "../../../../app/contracts/schemas.js";
import {
  transaction,
  lockSalon,
  audit,
  type Sql,
} from "../../infrastructure/database.js";
import { once } from "../../infrastructure/idempotency.js";
import type { RequestContext } from "../../kernel/actor.js";
import { ensure } from "../../kernel/errors.js";
import { readPaymentSettings, savePaymentSettings } from "../salon/index.js";
import {
  bookingStore,
  expireHolds,
  Reservation,
  toDto,
} from "../reservations/index.js";

function authorize(context: RequestContext) {
  ensure(
    context.actor?.role === "manager",
    "FORBIDDEN",
    "Tahsilat işlemleri için yönetici yetkisi gerekli.",
    403,
  );
}
async function entries(sql: Sql, salonId: string, reservationId: string) {
  const rows = (
    await sql.query(
      "SELECT * FROM payments.collections WHERE salon_id=$1 AND reservation_id=$2 ORDER BY created_at,id",
      [salonId, reservationId],
    )
  ).rows;
  return rows.map((row) =>
    s.collectionEntry.parse({
      id: row.id,
      reservationId: row.reservation_id,
      actorId: row.actor_id,
      amount: { amount: row.amount, currency: row.currency },
      method: row.method,
      reversesId: row.reverses_id,
      note: row.note,
      createdAt: row.created_at.toISOString(),
    }),
  );
}
async function view(
  sql: Sql,
  salonId: string,
  id: string,
  context: RequestContext,
  now: string,
) {
  const b = await bookingStore(sql, salonId, context).find(id);
  ensure(b, "NOT_FOUND", "Randevu bulunamadı.", 404);
  return {
    reservation: toDto(b, context, now),
    entries: await entries(sql, salonId, id),
  };
}
export async function collectionHistory(
  pool: pg.Pool,
  salonId: string,
  id: string,
  context: RequestContext,
  now: string,
) {
  authorize(context);
  return transaction(pool, async (sql) => {
    await lockSalon(sql, salonId);
    await expireHolds(sql, salonId, now);
    return view(sql, salonId, id, context, now);
  });
}
export async function recordCollection(
  pool: pg.Pool,
  salonId: string,
  id: string,
  input: z.infer<typeof s.collectionRequest>,
  context: RequestContext,
  key: string,
  now: string,
) {
  authorize(context);
  return transaction(pool, async (sql) => {
    await lockSalon(sql, salonId);
    return once(
      sql,
      `collection:${salonId}:${context.actor!.id}:${id}`,
      key,
      input,
      async () => {
        const store = bookingStore(sql, salonId, context);
        const b = await store.find(id);
        ensure(b, "NOT_FOUND", "Randevu bulunamadı.", 404);
        const history = await entries(sql, salonId, id);
        const net = history.reduce(
          (sum, entry) =>
            sum +
            (entry.reversesId ? -entry.amount.amount : entry.amount.amount),
          0,
        );
        ensure(
          net === (b.receivedAmount ?? 0),
          "UNAVAILABLE",
          "Tahsilat kayıtları kontrol edilmeli; işlem durduruldu.",
          503,
        );
        const original =
          input.action === "reverse"
            ? history.find((e) => e.id === input.entryId)
            : undefined;
        if (input.action === "reverse")
          ensure(
            original &&
              !original.reversesId &&
              !history.some((e) => e.reversesId === original.id),
            "INVALID_TRANSITION",
            "Bu tahsilat zaten düzeltilmiş veya bulunamadı.",
            409,
          );
        const amount =
          input.action === "receive" ? input.amount : original!.amount.amount;
        const method =
          input.action === "receive" ? input.method : original!.method;
        const aggregate = new Reservation(b);
        aggregate.recordCollection(
          input.action === "receive" ? amount : -amount,
          input.version,
          now,
        );
        const entryId = randomUUID();
        await sql.query(
          "INSERT INTO payments.collections(id,salon_id,reservation_id,actor_id,amount,method,reverses_id,note,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            entryId,
            salonId,
            id,
            context.actor!.id,
            amount,
            method,
            original?.id ?? null,
            input.note,
            now,
          ],
        );
        const changed = aggregate.snapshot();
        await store.save(changed);
        if (changed.status !== b.status)
          await store.event(changed, "reservation.confirmed");
        await audit(
          sql,
          context.actor!.id,
          `collection.${input.action}`,
          entryId,
          context.requestId,
        );
        return view(sql, salonId, id, context, now);
      },
    );
  });
}
export async function paymentPreferences(
  pool: pg.Pool,
  salonId: string,
  context: RequestContext,
  change?: { input: z.infer<typeof s.paymentSettings>; key: string },
) {
  authorize(context);
  if (!change) return readPaymentSettings(pool, salonId);
  return transaction(pool, async (sql) => {
    await lockSalon(sql, salonId);
    return once(
      sql,
      `payment-settings:${salonId}:${context.actor!.id}`,
      change.key,
      change.input,
      async () => {
        const updated = await savePaymentSettings(sql, salonId, change.input);
        await audit(
          sql,
          context.actor!.id,
          "payment-settings.updated",
          salonId,
          context.requestId,
        );
        return updated;
      },
    );
  });
}
