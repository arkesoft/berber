import { z } from "zod";

export const id = z.string().min(1).max(100);
export const date = z.iso.date();
export const instant = z.iso.datetime({ offset: true });
export const money = z.object({
  amount: z.number().int().nonnegative().max(100_000_000),
  currency: z.literal("TRY"),
});
export const role = z.enum(["customer", "manager", "staff"]);
export const customer = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(100),
  email: z.email("Geçerli bir e-posta yazın.").max(254),
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{10,20}$/, "Geçerli bir telefon numarası yazın."),
});
export const service = z.object({
  id,
  name: z.string().min(2).max(100),
  description: z.string().max(400),
  durationMinutes: z.number().int().min(10).max(240),
  price: money,
  deposit: money,
  active: z.boolean(),
});
export const staff = z.object({
  id,
  name: z.string().min(2).max(100),
  title: z.string().min(2).max(100),
  serviceIds: z.array(id).min(1),
  active: z.boolean(),
});
export const chair = z.object({
  id,
  name: z.string().min(2).max(100),
  active: z.boolean(),
});
export const salon = z.object({
  id,
  name: z.string().min(2).max(100),
  description: z.string().max(400),
  address: z.string().min(5).max(300),
  phone: z.string().min(10).max(25),
  timezone: z.string().min(1),
  currency: z.literal("TRY"),
  bookingDays: z.number().int().min(1).max(90),
});
export const catalog = z.object({
  salon,
  services: z.array(service),
  staff: z.array(staff),
  today: date,
});
export const slot = z.object({
  id,
  staffId: id,
  startsAt: instant,
  endsAt: instant,
});
export const availability = z.object({
  slots: z.array(slot),
  timezone: z.string(),
  fetchedAt: instant,
});
export const reservationStatus = z.enum([
  "pending_payment",
  "confirmed",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
  "expired",
]);
export const paymentStatus = z.enum([
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refund_pending",
  "refunded",
  "partially_refunded",
]);
export const reservation = z.object({
  id,
  version: z.number().int().positive(),
  customer,
  customerId: id.nullable(),
  staffId: id,
  staffName: z.string(),
  serviceId: id,
  serviceName: z.string(),
  startsAt: instant,
  endsAt: instant,
  total: money,
  deposit: money,
  status: reservationStatus,
  paymentStatus,
  holdExpiresAt: instant.nullable(),
  allowedActions: z.array(
    z.enum(["cancel", "reschedule", "start", "complete", "no_show"]),
  ),
});
export const page = z.object({
  items: z.array(reservation),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
});
export const createReservation = z.object({
  serviceId: id,
  staffId: id,
  slotId: id,
  customer,
  privacyAccepted: z.literal(true, {
    error: "Devam etmek için bilgilendirmeyi onaylayın.",
  }),
});
export const createdReservation = z.object({
  reservation,
  guestToken: z.string().nullable(),
});
export const changeReservation = z.object({
  version: z.number().int().positive(),
  action: z.enum(["cancel", "reschedule", "start", "complete", "no_show"]),
  slotId: id.optional(),
});
export const paymentRequest = z.object({ reservationId: id });
export const paymentResult = z.object({
  reservation,
  checkoutUrl: z.url().nullable(),
  mode: z.enum(["mock", "hosted"]),
});
export const user = z.object({
  id,
  name: z.string(),
  role,
  staffId: id.nullable(),
});
export const session = z.object({
  user: user.nullable(),
  csrfToken: z.string(),
});
export const login = z.object({
  email: z.email("Geçerli bir e-posta yazın."),
  password: z.string().min(8, "Parola en az 8 karakter olmalı.").max(128),
});
export const register = login.extend({
  name: customer.shape.name,
  phone: customer.shape.phone,
});
export const apiError = z.object({
  code: z.enum([
    "VALIDATION_ERROR",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "NOT_FOUND",
    "SLOT_CONFLICT",
    "HOLD_EXPIRED",
    "PAYMENT_FAILED",
    "VERSION_CONFLICT",
    "IDEMPOTENCY_CONFLICT",
    "INVALID_TRANSITION",
    "UNAVAILABLE",
  ]),
  message: z.string(),
  requestId: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
});
export const schedule = z.object({
  id,
  staffId: id,
  date,
  kind: z.enum(["shift", "break", "leave"]),
  startsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  note: z.string().max(200),
});
export const operations = z.object({
  customers: z.array(customer.extend({ id })),
  salon,
  services: z.array(service),
  staff: z.array(staff),
  chairs: z.array(chair),
  schedules: z.array(schedule),
  reservations: z.array(reservation),
});
export const managementChange = z.discriminatedUnion("resource", [
  z.object({
    resource: z.literal("customers"),
    value: customer.extend({ id }),
  }),
  z.object({ resource: z.literal("services"), value: service }),
  z.object({ resource: z.literal("staff"), value: staff }),
  z.object({ resource: z.literal("chairs"), value: chair }),
  z.object({ resource: z.literal("schedules"), value: schedule }),
  z.object({ resource: z.literal("salon"), value: salon }),
]);
export type Catalog = z.infer<typeof catalog>;
export type Reservation = z.infer<typeof reservation>;
export type CreateReservation = z.infer<typeof createReservation>;
export type Slot = z.infer<typeof slot>;
export type Session = z.infer<typeof session>;
export type Role = z.infer<typeof role>;
export type Operations = z.infer<typeof operations>;
export type ManagementChange = z.infer<typeof managementChange>;
export type ApiErrorCode = z.infer<typeof apiError>["code"];

// Executable contract first: HTTP adapters and mocks consume these same schemas.
export const endpoints = {
  catalog: { method: "get", path: "/catalog", output: catalog, auth: false },
  availability: {
    method: "get",
    path: "/availability",
    output: availability,
    auth: false,
  },
  session: { method: "get", path: "/session", output: session, auth: false },
  login: {
    method: "post",
    path: "/session",
    input: login,
    output: session,
    auth: false,
  },
  register: {
    method: "post",
    path: "/customers",
    input: register,
    output: session,
    auth: false,
  },
  logout: { method: "delete", path: "/session", output: session, auth: true },
  reservations: {
    method: "get",
    path: "/reservations",
    output: page,
    auth: true,
  },
  create: {
    method: "post",
    path: "/reservations",
    input: createReservation,
    output: createdReservation,
    auth: false,
    idempotent: true,
  },
  change: {
    method: "patch",
    path: "/reservations/{id}",
    input: changeReservation,
    output: reservation,
    auth: true,
    idempotent: true,
  },
  payment: {
    method: "post",
    path: "/payments",
    input: paymentRequest,
    output: paymentResult,
    auth: false,
    idempotent: true,
  },
  operations: {
    method: "get",
    path: "/operations",
    output: operations,
    auth: true,
  },
  management: {
    method: "put",
    path: "/management",
    input: managementChange,
    output: operations,
    auth: true,
    idempotent: true,
  },
} as const;
