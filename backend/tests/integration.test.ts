import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { runner } from "node-pg-migrate";
import type { FastifyInstance } from "fastify";
import * as s from "../../app/contracts/schemas.js";
import { database, transaction } from "../src/infrastructure/database.js";
import { readConfig } from "../src/config.js";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/modules/identity/index.js";
import { updateSalon } from "../src/modules/salon/index.js";
import { OutboxWorker, enqueue } from "../src/modules/notifications/index.js";
import { notificationContent } from "../src/modules/reservations/index.js";
if (!process.env.TEST_DATABASE_URL)
  process.loadEnvFile("../.local/backend.env");
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "Dedicated TEST_DATABASE_URL ending in _test required; tests never target a production database",
  );
const pool = database(url),
  config = readConfig({ ...process.env, DATABASE_URL: url, NODE_ENV: "test" });
let app: FastifyInstance;
let time = "2026-10-26T06:00:00Z";
const customer = {
  name: "Test Müşteri",
  email: "customer@example.test",
  phone: "+905550000000",
};
const service = {
  id: "cut",
  name: "Saç kesimi",
  description: "Test hizmeti",
  durationMinutes: 30,
  price: { amount: 65000, currency: "TRY" as const },
  deposit: { amount: 15000, currency: "TRY" as const },
  active: true,
};
before(async () => {
  await runner({
    databaseUrl: url,
    dir: resolve("migrations"),
    direction: "up",
    migrationsTable: "schema_migrations",
    count: Infinity,
    log: () => {},
  });
  const hash = await hashPassword("TestPassword123!");
  // Explicit isolated-test reset; never part of application startup or production setup.
  await pool.query("TRUNCATE salon.settings CASCADE");
  await pool.query(
    "TRUNCATE identity.sessions,platform.idempotency,platform.audit,notifications.outbox",
  );
  await transaction(pool, async (sql) => {
    await sql.query(
      "INSERT INTO salon.settings(id,document,buffer_minutes) VALUES($1,$2,10)",
      [
        config.SALON_ID,
        {
          id: config.SALON_ID,
          name: "Test Salon",
          description: "Yerel test",
          address: "Örnek sokak test adresi",
          phone: "+905550000000",
          timezone: "Europe/Istanbul",
          currency: "TRY",
          bookingDays: 30,
        },
      ],
    );
    await updateSalon(sql, config.SALON_ID, {
      resource: "services",
      value: service,
    });
    for (const id of ["one", "two"])
      await updateSalon(sql, config.SALON_ID, {
        resource: "staff",
        value: {
          id,
          name: `Berber ${id}`,
          title: "Berber",
          serviceIds: ["cut"],
          active: true,
        },
      });
    await updateSalon(sql, config.SALON_ID, {
      resource: "chairs",
      value: { id: "chair", name: "Koltuk", active: true },
    });
    for (const staff of ["one", "two"])
      for (const day of ["26", "27", "28", "29", "30"])
        await updateSalon(sql, config.SALON_ID, {
          resource: "schedules",
          value: {
            id: `${staff}-${day}`,
            staffId: staff,
            date: `2026-10-${day}`,
            kind: "shift",
            startsAt: "09:00",
            endsAt: "19:00",
            note: "",
          },
        });
    await sql.query(
      "INSERT INTO identity.users(id,salon_id,email,name,password_hash,role) VALUES('manager',$1,'manager@example.test','Yönetici',$2,'manager')",
      [config.SALON_ID, hash],
    );
    await sql.query(
      "INSERT INTO identity.users(id,salon_id,email,name,password_hash,role,staff_id) VALUES('staff',$1,'staff@example.test','Berber',$2,'staff','one')",
      [config.SALON_ID, hash],
    );
  });
  app = await createApp(config, pool, () => time);
});
after(async () => {
  await app?.close();
  await pool.end();
});
class Client {
  static sequence = 1;
  ip = `127.0.0.${++Client.sequence}`;
  cookie = "";
  csrf = "";
  async call(
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    url: string,
    body?: unknown,
    extra: Record<string, string> = {},
  ) {
    const response = await app.inject({
      remoteAddress: this.ip,
      method,
      url,
      headers: {
        cookie: this.cookie,
        origin: config.PUBLIC_ORIGIN,
        "x-csrf-token": this.csrf,
        ...extra,
      },
      payload: body as Record<string, unknown>,
    });
    const cookie = response.headers["set-cookie"];
    if (cookie)
      this.cookie = (Array.isArray(cookie) ? cookie[0]! : cookie).split(
        ";",
      )[0]!;
    const data = response.json();
    if (data.csrfToken) this.csrf = data.csrfToken;
    return { status: response.statusCode, data, headers: response.headers };
  }
  async init() {
    assert.equal((await this.call("GET", "/api/v1/session")).status, 200);
    return this;
  }
  async login(email = "manager@example.test") {
    await this.init();
    assert.equal(
      (
        await this.call("POST", "/api/v1/session", {
          email,
          password: "TestPassword123!",
        })
      ).status,
      200,
    );
    return this;
  }
  async slots(staff = "one", date = "2026-10-27") {
    const r = await this.call(
      "GET",
      `/api/v1/availability?serviceId=cut&staffId=${staff}&date=${date}`,
    );
    assert.equal(r.status, 200);
    return s.availability.parse(r.data).slots;
  }
  async book(slotId: string, staffId = "one", key = randomUUID()) {
    return this.call(
      "POST",
      "/api/v1/reservations",
      { serviceId: "cut", staffId, slotId, customer, privacyAccepted: true },
      { "idempotency-key": key },
    );
  }
}
test("payment backend is absent while provider selection is deferred", async () => {
  for (const url of [
    "/api/v1/payments",
    "/api/v1/payments/manual",
    "/api/v1/payments/records",
    "/api/v1/payment-settings",
  ]) {
    assert.equal(app.hasRoute({ method: "POST", url }), false);
    assert.equal(app.hasRoute({ method: "GET", url }), false);
    assert.equal(app.hasRoute({ method: "PUT", url }), false);
  }
  const result = await pool.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payments'",
  );
  assert.equal(result.rowCount, 0);
});

test("contracts, CSRF, origin, session rotation, ownership and deny-by-default", async () => {
  const anonymous = await new Client().init();
  assert.ok(
    s.catalog.safeParse((await anonymous.call("GET", "/api/v1/catalog")).data)
      .success,
  );
  assert.equal(
    (await anonymous.call("GET", "/api/v1/reservations")).status,
    401,
  );
  assert.equal(
    (
      await anonymous.call(
        "POST",
        "/api/v1/session",
        { email: "manager@example.test", password: "TestPassword123!" },
        { "x-csrf-token": "" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await anonymous.call(
        "POST",
        "/api/v1/session",
        {},
        { origin: "https://attacker.test" },
      )
    ).status,
    403,
  );
  const previous = anonymous.cookie;
  await anonymous.login();
  assert.notEqual(anonymous.cookie, previous);
  const managerSnapshot = await anonymous.call("GET", "/api/v1/operations");
  assert.ok(s.operations.safeParse(managerSnapshot.data).success);
  await anonymous.call("DELETE", "/api/v1/session");
  assert.equal((await anonymous.call("GET", "/api/v1/operations")).status, 401);
  const user = await new Client().init();
  assert.equal(
    (
      await user.call("POST", "/api/v1/customers", {
        ...customer,
        password: "TestPassword123!",
        role: "manager",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await user.call("POST", "/api/v1/customers", {
        ...customer,
        password: "TestPassword123!",
      })
    ).data.user.role,
    "customer",
  );
  assert.equal((await user.call("GET", "/api/v1/operations")).status, 403);
  const slots = await user.slots();
  const result = await user.book(slots[0]!.id);
  assert.equal(result.status, 200);
  assert.ok(s.createdReservation.safeParse(result.data).success);
  assert.equal((await user.call("GET", "/api/v1/reservations")).data.total, 1);
  const other = await new Client().init();
  await other.call("POST", "/api/v1/customers", {
    ...customer,
    email: "other@example.test",
    password: "TestPassword123!",
  });
  assert.equal(
    (
      await other.call(
        "PATCH",
        `/api/v1/reservations/${result.data.reservation.id}`,
        { version: 1, action: "cancel" },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    404,
  );
});
test("concurrent same slot has one commit; retry has one booking; chair blocks another staff", async () => {
  const a = await new Client().init(),
    b = await new Client().init();
  const slot = (await a.slots())[0]!;
  const results = await Promise.all([a.book(slot.id), b.book(slot.id)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const occupiedTime = slot.startsAt;
  assert.ok(!(await a.slots("two")).some((s) => s.startsAt === occupiedTime));
  const next = (await a.slots())[0]!,
    key = randomUUID();
  const repeat = await Promise.all([
    a.book(next.id, "one", key),
    a.book(next.id, "one", key),
  ]);
  assert.deepEqual(
    repeat.map((r) => r.status),
    [200, 200],
  );
  assert.equal(repeat[0]!.data.reservation.id, repeat[1]!.data.reservation.id);
  assert.equal(repeat[0]!.data.guestToken, repeat[1]!.data.guestToken);
  assert.equal(
    (await a.book((await a.slots())[0]!.id, "one", key)).status,
    409,
  );
  const stored = (
    await pool.query("SELECT result FROM platform.idempotency WHERE key=$1", [
      key,
    ])
  ).rows[0]!.result;
  assert.equal(stored.guestToken, null);
});
test("DB exclusion constraints protect direct competing writes, independent of application locks", async () => {
  const client = await new Client().init();
  const r = await client.book((await client.slots("one", "2026-10-28"))[0]!.id);
  assert.equal(r.status, 200);
  await assert.rejects(
    pool.query(
      `INSERT INTO reservations.bookings(id,salon_id,version,customer_snapshot,staff_id,staff_name,service_id,service_name,chair_id,starts_at,ends_at,occupied_until,total,deposit,status,payment_status,hold_expires_at) SELECT $1,salon_id,version,customer_snapshot,staff_id,staff_name,service_id,service_name,chair_id,starts_at,ends_at,occupied_until,total,deposit,status,payment_status,hold_expires_at FROM reservations.bookings WHERE id=$2`,
      [randomUUID(), r.data.reservation.id],
    ),
    (error: unknown) => (error as { code: string }).code === "23P01",
  );
});
test("expired holds release capacity", async () => {
  const client = await new Client().init();
  const slot = (await client.slots("one", "2026-10-30"))[0]!,
    r = await client.book(slot.id);
  assert.equal(r.status, 200);
  time = "2026-10-26T06:11:00Z";
  assert.ok(
    (await client.slots("one", "2026-10-30")).some((s) => s.id === slot.id),
  );
});
test("rescheduling and management edits keep booked resources consistent", async () => {
  const manager = await new Client().login(),
    staff = await new Client().login("staff@example.test");
  const r = await manager.book((await manager.slots())[0]!.id);
  assert.equal(r.status, 200);
  const target = (await manager.slots())[0]!;
  const moved = await manager.call(
    "PATCH",
    `/api/v1/reservations/${r.data.reservation.id}`,
    { version: 1, action: "reschedule", slotId: target.id },
    { "idempotency-key": randomUUID() },
  );
  assert.equal(moved.status, 200);
  assert.equal(moved.data.startsAt, target.startsAt);
  const rejected = await manager.call(
    "PUT",
    "/api/v1/management",
    {
      resource: "schedules",
      value: {
        id: "one-27",
        staffId: "one",
        date: "2026-10-27",
        kind: "leave",
        startsAt: "09:00",
        endsAt: "19:00",
        note: "",
      },
    },
    { "idempotency-key": randomUUID() },
  );
  assert.equal(rejected.status, 409);
  const schedule = (
    await pool.query("SELECT document FROM salon.schedules WHERE id='one-27'")
  ).rows[0]!.document;
  assert.equal(schedule.kind, "shift");
  const staffRows = (await staff.call("GET", "/api/v1/operations")).data;
  assert.deepEqual(staffRows.customers, []);
  assert.ok(
    staffRows.reservations.every(
      (b: { staffId: string }) => b.staffId === "one",
    ),
  );
  assert.equal(
    (
      await staff.call(
        "PUT",
        "/api/v1/management",
        { resource: "services", value: service },
        { "idempotency-key": randomUUID() },
      )
    ).status,
    403,
  );
});
test("sessions persist across app instances and logout revokes the old cookie", async () => {
  const manager = await new Client().login();
  const cookie = manager.cookie;
  const second = await createApp(config, pool, () => time);
  try {
    const result = await second.inject({
      method: "GET",
      url: "/api/v1/session",
      headers: { cookie },
    });
    assert.equal(result.json().user.role, "manager");
    await manager.call("DELETE", "/api/v1/session");
    const revoked = await second.inject({
      method: "GET",
      url: "/api/v1/session",
      headers: { cookie },
    });
    assert.equal(revoked.json().user, null);
  } finally {
    await second.close();
  }
});
test("rate limiting and production cookie flags are enforced", async () => {
  const client = await new Client().init();
  let last;
  for (let i = 0; i < 11; i++)
    last = await client.call("POST", "/api/v1/session", {});
  assert.equal(last!.status, 429);
  const production = await createApp(
    {
      ...config,
      NODE_ENV: "production",
      PUBLIC_ORIGIN: "https://salon.example",
      TRUST_PROXY: "127.0.0.1",
    },
    pool,
    () => time,
  );
  try {
    const response = await production.inject({
      method: "GET",
      url: "/api/v1/session",
      headers: { "x-forwarded-proto": "https" },
      remoteAddress: "127.0.0.1",
    });
    assert.equal(response.statusCode, 200);
    const cookie = String(response.headers["set-cookie"]);
    assert.match(cookie, /__Host-salon=/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/i);
  } finally {
    await production.close();
  }
});
test("zero-deposit booking confirms without any payment provider", async () => {
  const manager = await new Client().login();
  const change = await manager.call(
    "PUT",
    "/api/v1/management",
    {
      resource: "services",
      value: { ...service, deposit: { amount: 0, currency: "TRY" } },
    },
    { "idempotency-key": randomUUID() },
  );
  assert.equal(change.status, 200);
  const guest = await new Client().init();
  const r = await guest.book(
    (await guest.slots("two", "2026-10-29"))[0]!.id,
    "two",
  );
  assert.equal(r.status, 200);
  assert.equal(r.data.reservation.status, "confirmed");
  assert.equal(r.data.reservation.holdExpiresAt, null);
  assert.equal(r.data.reservation.paymentStatus, "unpaid");
});
test("outbox retries failures, bounds retries and recovers worker leases", async () => {
  await pool.query("TRUNCATE notifications.outbox");
  const row = (
    await pool.query(
      "SELECT id,version FROM reservations.bookings ORDER BY created_at LIMIT 1",
    )
  ).rows[0]!;
  await enqueue(pool, "reservation.created", {
    reservationId: row.id,
    version: row.version,
  });
  const resolve = (payload: { reservationId: string; version: number }) =>
    notificationContent(pool, config.SALON_ID, payload);
  let sends = 0;
  const worker = new OutboxWorker(
    pool,
    {
      send: async () => {
        sends++;
        throw new Error("private provider error");
      },
    },
    "sms",
    resolve,
    2,
  );
  assert.equal(await worker.tick(), true);
  assert.equal(sends, 1);
  let job = (await pool.query("SELECT * FROM notifications.outbox")).rows[0]!;
  assert.equal(job.status, "pending");
  assert.equal(job.last_error, "DELIVERY_FAILED");
  await pool.query(
    "UPDATE notifications.outbox SET available_at=now()-interval '1 second'",
  );
  await worker.tick();
  job = (await pool.query("SELECT * FROM notifications.outbox")).rows[0]!;
  assert.equal(job.status, "dead");
  await pool.query(
    "UPDATE notifications.outbox SET status='processing',lease_until=now()-interval '1 second',attempts=0",
  );
  const successful = new OutboxWorker(
    pool,
    {
      send: async () => {
        sends++;
      },
    },
    "sms",
    resolve,
  );
  assert.equal(await successful.tick(), true);
  assert.equal(
    (await pool.query("SELECT status FROM notifications.outbox")).rows[0]!
      .status,
    "sent",
  );
  assert.equal(await successful.tick(), false);
});
