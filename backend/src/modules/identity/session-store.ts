import type pg from "pg";
import { createHash } from "node:crypto";
import type { Session } from "fastify";
import type { SessionStore } from "@fastify/session";
const hash = (id: string) => createHash("sha256").update(id).digest("hex");
export class PostgresSessionStore implements SessionStore {
  constructor(private pool: pg.Pool) {}
  set(id: string, session: Session, callback: (error?: Error) => void) {
    const expiry = session.cookie.expires ?? new Date(Date.now() + 8 * 3600000);
    void this.pool
      .query(
        "INSERT INTO identity.sessions(id_hash,data,expires_at) VALUES($1,$2,$3) ON CONFLICT(id_hash) DO UPDATE SET data=EXCLUDED.data,expires_at=EXCLUDED.expires_at",
        [hash(id), session, expiry],
      )
      .then(() => callback(), callback);
  }
  get(
    id: string,
    callback: (error: Error | null, session?: Session | null) => void,
  ) {
    void this.pool
      .query<{ data: Session }>(
        "SELECT data FROM identity.sessions WHERE id_hash=$1 AND expires_at>now()",
        [hash(id)],
      )
      .then((r) => callback(null, r.rows[0]?.data ?? null), callback);
  }
  destroy(id: string, callback: (error?: Error) => void) {
    void this.pool
      .query("DELETE FROM identity.sessions WHERE id_hash=$1", [hash(id)])
      .then(() => callback(), callback);
  }
}
