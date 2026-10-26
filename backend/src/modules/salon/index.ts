import { z } from "zod";
import * as s from "../../../../app/contracts/schemas.js";
import type { Sql } from "../../infrastructure/database.js";
import { ensure } from "../../kernel/errors.js";
import { localRange } from "../scheduling/domain.js";
import type { CatalogSnapshot } from "./contracts.js";
export type { CatalogSnapshot } from "./contracts.js";
export async function readSalon(
  sql: Sql,
  salonId: string,
): Promise<CatalogSnapshot> {
  const row = (
    await sql.query<{ document: unknown; buffer_minutes: number }>(
      "SELECT document,buffer_minutes FROM salon.settings WHERE id=$1",
      [salonId],
    )
  ).rows[0];
  ensure(row, "UNAVAILABLE", "Salon kurulumu tamamlanmamış.", 503);
  // These reads may share a transaction client; node-postgres requires sequential queries on it.
  const services = await sql.query(
    "SELECT document FROM salon.services WHERE salon_id=$1 ORDER BY id",
    [salonId],
  );
  const staff = await sql.query(
    "SELECT document FROM salon.staff WHERE salon_id=$1 ORDER BY id",
    [salonId],
  );
  const chairs = await sql.query(
    "SELECT document FROM salon.chairs WHERE salon_id=$1 ORDER BY id",
    [salonId],
  );
  const schedules = await sql.query(
    "SELECT document,starts_at,ends_at FROM salon.schedules WHERE salon_id=$1 ORDER BY starts_at",
    [salonId],
  );
  const closures = await sql.query<{ day: string }>(
    "SELECT day::text FROM salon.closures WHERE salon_id=$1",
    [salonId],
  );
  return {
    salon: s.salon.parse(row.document),
    buffer: row.buffer_minutes,
    services: services.rows.map((x) => s.service.parse(x.document)),
    staff: staff.rows.map((x) => s.staff.parse(x.document)),
    chairs: chairs.rows.map((x) => s.chair.parse(x.document)),
    schedules: schedules.rows.map((x) => s.schedule.parse(x.document)),
    intervals: schedules.rows.map((x) => ({
      ...s.schedule.parse(x.document),
      startsAt: new Date(x.starts_at as string).toISOString(),
      endsAt: new Date(x.ends_at as string).toISOString(),
    })),
    closedDates: closures.rows.map((x) => x.day),
  };
}
export async function updateSalon(
  sql: Sql,
  salonId: string,
  change: s.ManagementChange,
) {
  ensure(
    change.resource !== "customers",
    "VALIDATION_ERROR",
    "Müşteri kaydı kimlik modülüne aittir.",
  );
  if (change.resource === "salon") {
    ensure(
      change.value.id === salonId,
      "FORBIDDEN",
      "İşletme değiştirilemez.",
      403,
    );
    try {
      new Intl.DateTimeFormat("tr", {
        timeZone: change.value.timezone,
      }).format();
    } catch {
      ensure(false, "VALIDATION_ERROR", "Saat dilimi geçersiz.");
    }
    const previous = (await readSalon(sql, salonId)).salon;
    ensure(
      previous.timezone === change.value.timezone,
      "VALIDATION_ERROR",
      "Saat dilimi değişikliği veri göçü gerektirir.",
    );
    await sql.query("UPDATE salon.settings SET document=$2 WHERE id=$1", [
      salonId,
      change.value,
    ]);
    return;
  }
  if (change.resource === "services")
    ensure(
      change.value.deposit.amount <= change.value.price.amount,
      "VALIDATION_ERROR",
      "Kapora hizmet ücretini aşamaz.",
    );
  if (change.resource === "staff") {
    const services = (await readSalon(sql, salonId)).services;
    ensure(
      change.value.serviceIds.every((id) => services.some((s) => s.id === id)),
      "VALIDATION_ERROR",
      "Hizmet kaydı bulunamadı.",
    );
  }
  if (change.resource === "schedules") {
    const catalog = await readSalon(sql, salonId);
    ensure(
      catalog.staff.some((x) => x.id === change.value.staffId),
      "VALIDATION_ERROR",
      "Çalışan bulunamadı.",
    );
    let range;
    try {
      range = localRange(
        change.value.date,
        change.value.startsAt,
        change.value.endsAt,
        catalog.salon.timezone,
      );
    } catch {
      ensure(
        false,
        "VALIDATION_ERROR",
        "Mesai saati saat diliminde belirsiz veya geçersiz.",
      );
    }
    await sql.query(
      "INSERT INTO salon.schedules(id,salon_id,staff_id,document,starts_at,ends_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document,staff_id=EXCLUDED.staff_id,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at WHERE salon.schedules.salon_id=$2",
      [
        change.value.id,
        salonId,
        change.value.staffId,
        change.value,
        range.startsAt,
        range.endsAt,
      ],
    );
  } else {
    const table = {
      services: "salon.services",
      staff: "salon.staff",
      chairs: "salon.chairs",
    }[change.resource];
    await sql.query(
      `INSERT INTO ${table}(id,salon_id,document) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document WHERE ${table}.salon_id=$2`,
      [change.value.id, salonId, change.value],
    );
  }
}
export const setupSchema = z.object({
  salon: s.salon,
  bufferMinutes: z.number().int().min(0).max(120).default(10),
  services: z.array(s.service),
  staff: z.array(s.staff),
  chairs: z.array(s.chair),
  schedules: z.array(s.schedule),
  closedDates: z.array(s.date).default([]),
});
