import { createHash } from "node:crypto";
import type { Sql } from "./database.js";
import { ensure } from "../kernel/errors.js";
export async function once<T>(
  sql: Sql,
  scope: string,
  key: string,
  body: unknown,
  work: () => Promise<T>,
): Promise<T> {
  ensure(
    /^[\w-]{8,100}$/.test(key),
    "VALIDATION_ERROR",
    "Geçerli işlem anahtarı gerekli.",
  );
  const signature = createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
  await sql.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `idempotency:${scope}:${key}`,
  ]);
  const existing = await sql.query<{ signature: string; result: T }>(
    "SELECT signature,result FROM platform.idempotency WHERE scope=$1 AND key=$2",
    [scope, key],
  );
  if (existing.rows[0]) {
    ensure(
      existing.rows[0].signature === signature,
      "IDEMPOTENCY_CONFLICT",
      "İşlem anahtarı farklı içerikle kullanıldı.",
      409,
    );
    return existing.rows[0].result;
  }
  const result = await work();
  await sql.query(
    "INSERT INTO platform.idempotency(scope,key,signature,result) VALUES($1,$2,$3,$4)",
    [scope, key, signature, JSON.stringify(result)],
  );
  return result;
}
