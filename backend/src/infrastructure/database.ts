import pg from "pg";
export type Sql = Pick<pg.PoolClient, "query">;
export function database(url: string) {
  return new pg.Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 15000,
  });
}
export async function transaction<T>(
  pool: pg.Pool,
  work: (sql: Sql) => Promise<T>,
): Promise<T> {
  const sql = await pool.connect();
  try {
    await sql.query("BEGIN");
    const result = await work(sql);
    await sql.query("COMMIT");
    return result;
  } catch (error) {
    await sql.query("ROLLBACK");
    throw error;
  } finally {
    sql.release();
  }
}
export async function lockSalon(sql: Sql, salonId: string) {
  await sql.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `salon:${salonId}`,
  ]);
}
export async function audit(
  sql: Sql,
  actor: string,
  action: string,
  entity: string,
  requestId: string,
) {
  await sql.query(
    "INSERT INTO platform.audit(actor_id,action,entity_id,request_id) VALUES($1,$2,$3,$4)",
    [actor, action, entity, requestId],
  );
}
