import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { Sql } from "../../infrastructure/database.js";
export type Notification = {
  id: string;
  topic: string;
  recipient: string;
  text: string;
};
export interface NotificationSender {
  send(message: Notification): Promise<void>;
}
export type NotificationResolver = (payload: {
  reservationId: string;
  version: number;
}) => Promise<{ phone: string; email: string; text: string } | null>;
export async function enqueue(
  sql: Sql,
  topic: string,
  payload: Record<string, unknown>,
) {
  await sql.query(
    "INSERT INTO notifications.outbox(id,topic,payload) VALUES($1,$2,$3)",
    [randomUUID(), topic, payload],
  );
}
export class OutboxWorker {
  constructor(
    private pool: pg.Pool,
    private sender: NotificationSender,
    private channel: "sms" | "email",
    private resolve: NotificationResolver,
    private maxAttempts = 6,
  ) {}
  async tick() {
    await this.pool.query(
      "UPDATE notifications.outbox SET status='dead',lease_until=NULL,lease_token=NULL,last_error='ATTEMPTS_EXHAUSTED' WHERE attempts >= $1 AND (status='pending' OR (status='processing' AND lease_until<now()))",
      [this.maxAttempts],
    );
    const lease = randomUUID();
    const result = await this.pool.query<{
      id: string;
      topic: string;
      payload: { reservationId: string; version: number };
      attempts: number;
    }>(
      `UPDATE notifications.outbox SET status='processing',lease_token=$1,lease_until=now()+interval '60 seconds',attempts=attempts+1 WHERE id=(SELECT id FROM notifications.outbox WHERE (status='pending' AND available_at<=now()) OR (status='processing' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id,topic,payload,attempts`,
      [lease],
    );
    const job = result.rows[0];
    if (!job) return false;
    try {
      const content = await this.resolve(job.payload);
      if (content)
        await this.sender.send({
          id: job.id,
          topic: job.topic,
          recipient: this.channel === "sms" ? content.phone : content.email,
          text: content.text,
        });
      await this.pool.query(
        "UPDATE notifications.outbox SET status='sent',completed_at=now(),payload='{}',lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2",
        [job.id, lease],
      );
    } catch {
      // Store a safe classification; provider errors can contain credentials or recipients.
      const delay =
        Math.min(3600, 2 ** job.attempts * 10) + Math.floor(Math.random() * 10);
      await this.pool.query(
        "UPDATE notifications.outbox SET status=$3,available_at=now()+($4::int*interval '1 second'),lease_until=NULL,lease_token=NULL,last_error='DELIVERY_FAILED' WHERE id=$1 AND lease_token=$2",
        [
          job.id,
          lease,
          job.attempts >= this.maxAttempts ? "dead" : "pending",
          delay,
        ],
      );
    }
    return true;
  }
}
