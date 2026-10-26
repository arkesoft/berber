import type pg from "pg";
import { randomUUID } from "node:crypto";
import {
  transaction,
  lockSalon,
  audit,
  type Sql,
} from "../../infrastructure/database.js";
import { once } from "../../infrastructure/idempotency.js";
import { readSalon } from "../salon/index.js";
import { enqueue } from "../notifications/index.js";
import type { BookingTransactions, BookingStore } from "./ports.js";
import type { Booking } from "./domain.js";
import type { RequestContext } from "../../kernel/actor.js";
import { localDate } from "../scheduling/domain.js";
import { DomainError } from "../../kernel/errors.js";
type Row = {
  id: string;
  version: number;
  customer_id: string | null;
  customer_snapshot: Booking["customer"];
  staff_id: string;
  staff_name: string;
  service_id: string;
  service_name: string;
  chair_id: string;
  starts_at: Date;
  ends_at: Date;
  occupied_until: Date;
  total: number;
  deposit: number;
  status: Booking["status"];
  payment_status: Booking["paymentStatus"];
  hold_expires_at: Date | null;
  guest_token_hash: string | null;
  guest_expires_at: Date | null;
};
function map(row: Row): Booking {
  return {
    id: row.id,
    version: row.version,
    customerId: row.customer_id,
    customer: row.customer_snapshot,
    staffId: row.staff_id,
    staffName: row.staff_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    chairId: row.chair_id,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    occupiedUntil: row.occupied_until.toISOString(),
    total: row.total,
    deposit: row.deposit,
    status: row.status,
    paymentStatus: row.payment_status,
    holdExpiresAt: row.hold_expires_at?.toISOString() ?? null,
    guestTokenHash: row.guest_token_hash,
    guestExpiresAt: row.guest_expires_at?.toISOString() ?? null,
  };
}
export async function expireHolds(sql: Sql, salonId: string, now: string) {
  const expired = await sql.query<Row>(
    "UPDATE reservations.bookings SET status='expired',hold_expires_at=NULL,version=version+1 WHERE salon_id=$1 AND status='pending_payment' AND hold_expires_at<=$2 RETURNING *",
    [salonId, now],
  );
  for (const row of expired.rows) {
    await enqueue(sql, "reservation.expired", {
      reservationId: row.id,
      version: row.version,
    });
    await audit(sql, "system", "reservation.expired", row.id, randomUUID());
  }
}
export async function notificationContent(
  sql: Sql,
  salonId: string,
  payload: { reservationId: string; version: number },
) {
  const row = (
    await sql.query<Row>(
      "SELECT * FROM reservations.bookings WHERE salon_id=$1 AND id=$2",
      [salonId, payload.reservationId],
    )
  ).rows[0];
  if (!row || row.version !== payload.version) return null;
  const { salon } = await readSalon(sql, salonId);
  const date = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: salon.timezone,
  }).format(row.starts_at);
  const labels: Record<string, string> = {
    pending_payment: "kapora bekliyor",
    confirmed: "onaylandı",
    cancelled: "iptal edildi",
    expired: "saat tutma süresi doldu",
    in_service: "başladı",
    completed: "tamamlandı",
    no_show: "gelmedi olarak kaydedildi",
  };
  return {
    phone: row.customer_snapshot.phone,
    email: row.customer_snapshot.email,
    text: `${salon.name}: ${date} ${row.service_name} randevunuz ${labels[row.status] ?? row.status}.`,
  };
}
export function bookingStore(
  sql: Sql,
  salonId: string,
  context: RequestContext,
): BookingStore {
  return {
    catalog: () => readSalon(sql, salonId),
    busy: async () =>
      (
        await sql.query<Row>(
          "SELECT * FROM reservations.bookings WHERE salon_id=$1 AND status IN ('pending_payment','confirmed','in_service')",
          [salonId],
        )
      ).rows.map(map),
    find: async (id) => {
      const row = (
        await sql.query<Row>(
          "SELECT * FROM reservations.bookings WHERE salon_id=$1 AND id=$2 FOR UPDATE",
          [salonId, id],
        )
      ).rows[0];
      return row ? map(row) : null;
    },
    insert: async (b) => {
      await sql.query(
        `INSERT INTO reservations.bookings(id,salon_id,version,customer_id,customer_snapshot,staff_id,staff_name,service_id,service_name,chair_id,starts_at,ends_at,occupied_until,total,deposit,status,payment_status,hold_expires_at,guest_token_hash,guest_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          b.id,
          salonId,
          b.version,
          b.customerId,
          b.customer,
          b.staffId,
          b.staffName,
          b.serviceId,
          b.serviceName,
          b.chairId,
          b.startsAt,
          b.endsAt,
          b.occupiedUntil,
          b.total,
          b.deposit,
          b.status,
          b.paymentStatus,
          b.holdExpiresAt,
          b.guestTokenHash,
          b.guestExpiresAt,
        ],
      );
    },
    save: async (b) => {
      await sql.query(
        "UPDATE reservations.bookings SET version=$3,status=$4,payment_status=$5,hold_expires_at=$6,starts_at=$7,ends_at=$8,occupied_until=$9,chair_id=$10 WHERE salon_id=$1 AND id=$2",
        [
          salonId,
          b.id,
          b.version,
          b.status,
          b.paymentStatus,
          b.holdExpiresAt,
          b.startsAt,
          b.endsAt,
          b.occupiedUntil,
          b.chairId,
        ],
      );
    },
    list: async (actor, date) => {
      const rows = (
        await sql.query<Row>(
          `SELECT * FROM reservations.bookings WHERE salon_id=$1 AND ($2='manager' OR ($2='staff' AND staff_id=$3) OR ($2='customer' AND customer_id=$4)) ORDER BY starts_at,id`,
          [salonId, actor.role, actor.staffId, actor.customerId],
        )
      ).rows.map(map);
      const zone = (await readSalon(sql, salonId)).salon.timezone;
      return date
        ? rows.filter((b) => localDate(b.startsAt, zone) === date)
        : rows;
    },
    event: async (b, topic) =>
      enqueue(sql, topic, { reservationId: b.id, version: b.version }),
    audit: async (action, id) =>
      audit(sql, context.actor?.id ?? "guest", action, id, context.requestId),
  };
}
export function bookingTransactions(
  pool: pg.Pool,
  salonId: string,
  context: RequestContext,
  clock: () => string,
): BookingTransactions {
  async function execute<T>(work: (sql: Sql) => Promise<T>) {
    try {
      return await transaction(pool, async (sql) => {
        await lockSalon(sql, salonId);
        await expireHolds(sql, salonId, clock());
        return work(sql);
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23P01")
        throw new DomainError(
          "SLOT_CONFLICT",
          "Çalışan veya koltuk artık müsait değil.",
          409,
        );
      throw error;
    }
  }
  return {
    execute: (scope, key, body, work) =>
      execute((sql) =>
        once(sql, scope, key, body, () =>
          work(bookingStore(sql, salonId, context)),
        ),
      ),
    read: (work) => execute((sql) => work(bookingStore(sql, salonId, context))),
  };
}
