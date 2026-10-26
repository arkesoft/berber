import { setTimeout } from "node:timers/promises";
import { readConfig } from "./config.js";
import { database, transaction, lockSalon } from "./infrastructure/database.js";
import {
  expireHolds,
  notificationContent,
} from "./modules/reservations/index.js";
import { OutboxWorker } from "./modules/notifications/index.js";
import { SmsGateway, SmtpSender } from "./modules/notifications/adapters.js";
const config = readConfig(),
  pool = database(config.DATABASE_URL);
// One delivery channel per installation in v1; no silent double sends.
if (config.SMS_MODE === "gateway" && config.EMAIL_MODE === "smtp")
  throw new Error("Select one notification channel in v1");
const resolve = (payload: { reservationId: string; version: number }) =>
  notificationContent(pool, config.SALON_ID, payload);
const worker =
  config.SMS_MODE === "gateway"
    ? new OutboxWorker(
        pool,
        new SmsGateway(config.SMS_GATEWAY_URL!, config.SMS_GATEWAY_TOKEN!),
        "sms",
        resolve,
      )
    : config.EMAIL_MODE === "smtp"
      ? new OutboxWorker(pool, new SmtpSender(config), "email", resolve)
      : null;
let running = true;
process.once("SIGINT", () => {
  running = false;
});
process.once("SIGTERM", () => {
  running = false;
});
while (running) {
  try {
    await transaction(pool, async (sql) => {
      await lockSalon(sql, config.SALON_ID);
      await expireHolds(sql, config.SALON_ID, new Date().toISOString());
    });
    if (worker)
      for (let i = 0; i < 10 && running; i++) if (!(await worker.tick())) break;
    await pool.query("DELETE FROM identity.sessions WHERE expires_at<now()");
    await pool.query(
      "DELETE FROM platform.idempotency WHERE created_at<now()-interval '7 days'",
    );
    await pool.query(
      "DELETE FROM notifications.outbox WHERE status='sent' AND completed_at<now()-interval '30 days'",
    );
  } catch {
    process.stderr.write(
      "Worker cycle failed; retrying without logging private data.\n",
    );
  }
  if (running) await setTimeout(5000);
}
await pool.end();
