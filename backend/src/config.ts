import { z } from "zod";
const configSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  SALON_ID: z.string().min(1).max(100),
  PUBLIC_ORIGIN: z.url(),
  SESSION_SECRET: z.string().min(48),
  GUEST_SECRET: z.string().min(48),
  TRUST_PROXY: z.string().optional(),
  SMS_MODE: z.enum(["disabled", "gateway"]).default("disabled"),
  SMS_GATEWAY_URL: z.url().optional(),
  SMS_GATEWAY_TOKEN: z.string().optional(),
  EMAIL_MODE: z.enum(["disabled", "smtp"]).default("disabled"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.email().optional(),
  HOLD_MINUTES: z.coerce.number().int().min(5).max(30).default(10),
});
export type Config = z.infer<typeof configSchema>;
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config = configSchema.parse(env);
  if (
    config.NODE_ENV === "production" &&
    !config.PUBLIC_ORIGIN.startsWith("https://")
  )
    throw new Error("Production PUBLIC_ORIGIN requires HTTPS");
  if (
    config.SMS_MODE === "gateway" &&
    (!config.SMS_GATEWAY_URL?.startsWith("https://") ||
      !config.SMS_GATEWAY_TOKEN)
  )
    throw new Error("SMS gateway requires HTTPS URL and token");
  if (config.EMAIL_MODE === "smtp" && (!config.SMTP_HOST || !config.EMAIL_FROM))
    throw new Error("SMTP host and from required");
  return config;
}
