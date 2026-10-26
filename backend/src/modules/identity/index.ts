import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { z } from "zod";
import * as s from "../../../../app/contracts/schemas.js";
import { transaction, audit, type Sql } from "../../infrastructure/database.js";
import { ensure, DomainError } from "../../kernel/errors.js";
import type { Actor } from "../../kernel/actor.js";
import { hashPassword, verifyPassword } from "./password.js";
export { hashPassword } from "./password.js";
type Account = {
  id: string;
  name: string;
  role: Actor["role"];
  staff_id: string | null;
  customer_id: string | null;
  password_hash: string;
  locked_until: Date | null;
  failed_attempts: number;
};
export async function getActor(
  sql: Sql,
  salonId: string,
  id: string | undefined,
): Promise<(Actor & { name: string }) | null> {
  if (!id) return null;
  const u = (
    await sql.query<Account>(
      "SELECT * FROM identity.users WHERE salon_id=$1 AND id=$2 AND active=true",
      [salonId, id],
    )
  ).rows[0];
  return u
    ? {
        id: u.id,
        name: u.name,
        role: u.role,
        staffId: u.staff_id,
        customerId: u.customer_id,
      }
    : null;
}
export async function authenticate(
  pool: pg.Pool,
  salonId: string,
  input: z.infer<typeof s.login>,
  requestId: string,
) {
  // Row lock serializes failed attempts across API processes. Hashing is capped by route rate limit.
  const result = await transaction(pool, async (sql) => {
    const u = (
      await sql.query<Account>(
        "SELECT * FROM identity.users WHERE salon_id=$1 AND email=$2 AND active=true FOR UPDATE",
        [salonId, input.email.toLowerCase()],
      )
    ).rows[0];
    if (!u) {
      await hashPassword(input.password);
      return null;
    }
    if (u.locked_until && u.locked_until > new Date()) return null;
    if (!(await verifyPassword(input.password, u.password_hash))) {
      await sql.query(
        "UPDATE identity.users SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=4 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=$1",
        [u.id],
      );
      await audit(sql, u.id, "identity.login_failed", u.id, requestId);
      return null;
    }
    await sql.query(
      "UPDATE identity.users SET failed_attempts=0,locked_until=NULL WHERE id=$1",
      [u.id],
    );
    await audit(sql, u.id, "identity.login", u.id, requestId);
    return getActor(sql, salonId, u.id);
  });
  ensure(result, "UNAUTHENTICATED", "E-posta veya parola eşleşmedi.", 401);
  return result;
}
export async function registerCustomer(
  pool: pg.Pool,
  salonId: string,
  input: z.infer<typeof s.register>,
  requestId: string,
) {
  const hash = await hashPassword(input.password),
    id = randomUUID();
  try {
    return await transaction(pool, async (sql) => {
      await saveCustomer(sql, salonId, {
        id,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
      });
      await sql.query(
        "INSERT INTO identity.users(id,salon_id,email,name,password_hash,role,customer_id) VALUES($1,$2,$3,$4,$5,'customer',$1)",
        [id, salonId, input.email.toLowerCase(), input.name, hash],
      );
      await audit(sql, id, "identity.register", id, requestId);
      return (await getActor(sql, salonId, id))!;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      throw new DomainError(
        "VALIDATION_ERROR",
        "Bu bilgilerle kayıt oluşturulamadı; mevcut hesabınızla giriş yapın.",
      );
    throw error;
  }
}
export async function listCustomers(sql: Sql, salonId: string) {
  return (
    await sql.query(
      "SELECT document FROM identity.customers WHERE salon_id=$1 ORDER BY id",
      [salonId],
    )
  ).rows.map((x) => s.customer.extend({ id: s.id }).parse(x.document));
}
export async function saveCustomer(
  sql: Sql,
  salonId: string,
  input: z.infer<typeof s.customer> & { id: string },
) {
  await sql.query(
    "INSERT INTO identity.customers(id,salon_id,document) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document WHERE identity.customers.salon_id=$2",
    [input.id, salonId, input],
  );
}
