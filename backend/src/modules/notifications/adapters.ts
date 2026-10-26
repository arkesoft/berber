import nodemailer from "nodemailer";
import type { Config } from "../../config.js";
import type { Notification, NotificationSender } from "./index.js";
export class SmsGateway implements NotificationSender {
  constructor(
    private url: string,
    private token: string,
  ) {}
  async send(message: Notification) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "Idempotency-Key": message.id,
      },
      body: JSON.stringify({
        messageId: message.id,
        to: message.recipient,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("DELIVERY_FAILED");
  }
}
export class SmtpSender implements NotificationSender {
  private transport;
  constructor(private config: Config) {
    this.transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      requireTLS: config.SMTP_PORT !== 465,
      auth: config.SMTP_USER
        ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
        : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: { rejectUnauthorized: true },
    });
  }
  async send(message: Notification) {
    const domain = new URL(this.config.PUBLIC_ORIGIN).hostname;
    await this.transport.sendMail({
      from: this.config.EMAIL_FROM,
      to: message.recipient,
      subject: "Randevu bilgilendirmesi",
      text: message.text,
      messageId: `<${message.id}@${domain}>`,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
}
