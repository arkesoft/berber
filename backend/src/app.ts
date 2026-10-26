import Fastify, { type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import sessionPlugin from "@fastify/session";
import csrf from "@fastify/csrf-protection";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type pg from "pg";
import * as s from "../../app/contracts/schemas.js";
import type { Config } from "./config.js";
import { ensure, DomainError } from "./kernel/errors.js";
import type { RequestContext } from "./kernel/actor.js";
import { readSalon } from "./modules/salon/index.js";
import {
  getActor,
  authenticate,
  registerCustomer,
} from "./modules/identity/index.js";
import { PostgresSessionStore } from "./modules/identity/session-store.js";
import {
  BookingService,
  bookingTransactions,
  toDto,
} from "./modules/reservations/index.js";
import { localDate } from "./modules/scheduling/domain.js";
import { workspace, manage } from "./modules/operations/index.js";
import { transaction, lockSalon } from "./infrastructure/database.js";
declare module "fastify" {
  interface Session {
    userId?: string;
  }
}
export async function createApp(
  config: Config,
  pool: pg.Pool,
  clock = () => new Date().toISOString(),
) {
  const app = Fastify({
    bodyLimit: 32768,
    requestTimeout: 20000,
    trustProxy: config.TRUST_PROXY || false,
    genReqId: () => randomUUID(),
    logger:
      config.NODE_ENV === "test"
        ? false
        : {
            level: "info",
            serializers: {
              req: (r: { method: string; url: string }) => ({
                method: r.method,
                path: r.url.split("?")[0],
              }),
            },
          },
  });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
  });
  await app.register(cookie);
  await app.register(sessionPlugin, {
    secret: config.SESSION_SECRET,
    cookieName:
      config.NODE_ENV === "production" ? "__Host-salon" : "salon-session",
    store: new PostgresSessionStore(pool),
    saveUninitialized: false,
    rolling: false,
    cookie: {
      path: "/",
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 3600000,
    },
  });
  await app.register(csrf, {
    sessionPlugin: "@fastify/session",
    getToken: (r) => String(r.headers["x-csrf-token"] ?? ""),
    logLevel: "warn",
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      code: "UNAVAILABLE",
      message: "Çok fazla istek; daha sonra tekrar deneyin.",
      requestId: randomUUID(),
    }),
  });
  app.addHook("onSend", async (request, reply, payload) => {
    reply
      .header("Cache-Control", "no-store")
      .header("X-Request-Id", request.id);
    return payload;
  });
  app.addHook("preHandler", (request, reply, done) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return done();
    if (request.headers.origin !== config.PUBLIC_ORIGIN)
      return done(
        new DomainError("FORBIDDEN", "İstek kaynağı doğrulanamadı.", 403),
      );
    app.csrfProtection(request, reply, done);
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError)
      return reply.code(422).send({
        code: "VALIDATION_ERROR",
        message: "Alanları kontrol edin.",
        requestId: request.id,
      });
    if (error instanceof DomainError)
      return reply.code(error.status).send({
        code: error.code,
        message: error.message,
        requestId: request.id,
      });
    const e = error as { statusCode?: number; code?: string };
    if (e.statusCode === 429)
      return reply
        .code(429)
        .send({
          code: "UNAVAILABLE",
          message: "Çok fazla istek; daha sonra tekrar deneyin.",
          requestId: request.id,
        });
    if (e.statusCode === 403)
      return reply.code(403).send({
        code: "FORBIDDEN",
        message: "Oturum doğrulanamadı. Sayfayı yenileyin.",
        requestId: request.id,
      });
    if (e.statusCode && e.statusCode < 500)
      return reply.code(e.statusCode).send({
        code: "VALIDATION_ERROR",
        message: "İstek işlenemedi.",
        requestId: request.id,
      });
    request.log.error(
      { requestId: request.id, errorCode: e.code ?? "INTERNAL_ERROR" },
      "Request failed",
    );
    return reply.code(503).send({
      code: "UNAVAILABLE",
      message: "İşlem şu anda tamamlanamıyor.",
      requestId: request.id,
    });
  });
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      code: "NOT_FOUND",
      message: "İşlem bulunamadı.",
      requestId: request.id,
    }),
  );
  async function context(
    request: FastifyRequest,
    required = false,
  ): Promise<RequestContext> {
    const actor = await getActor(pool, config.SALON_ID, request.session.userId);
    ensure(!required || actor, "UNAUTHENTICATED", "Giriş yapın.", 401);
    return {
      actor,
      sessionId: request.session.sessionId,
      requestId: request.id,
      guestToken:
        typeof request.headers["x-guest-token"] === "string"
          ? request.headers["x-guest-token"]
          : undefined,
    };
  }
  function key(request: FastifyRequest) {
    return z
      .string()
      .regex(/^[\w-]{8,100}$/)
      .parse(request.headers["idempotency-key"]);
  }
  const tx = (ctx: RequestContext) =>
    bookingTransactions(pool, config.SALON_ID, ctx, clock);
  const service = (ctx: RequestContext) =>
    new BookingService(
      tx(ctx),
      clock,
      config.GUEST_SECRET,
      config.HOLD_MINUTES,
    );
  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async () => {
    await readSalon(pool, config.SALON_ID);
    return { status: "ready" };
  });
  app.get("/api/v1/session", async (request, reply) => {
    const ctx = await context(request);
    const token = reply.generateCsrf();
    return s.session.parse({ user: ctx.actor, csrfToken: token });
  });
  app.post(
    "/api/v1/session",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const actor = await authenticate(
        pool,
        config.SALON_ID,
        s.login.parse(request.body),
        request.id,
      );
      await request.session.regenerate();
      request.session.userId = actor.id;
      return s.session.parse({ user: actor, csrfToken: reply.generateCsrf() });
    },
  );
  app.post(
    "/api/v1/customers",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const actor = await registerCustomer(
        pool,
        config.SALON_ID,
        s.register.strict().parse(request.body),
        request.id,
      );
      await request.session.regenerate();
      request.session.userId = actor.id;
      return s.session.parse({ user: actor, csrfToken: reply.generateCsrf() });
    },
  );
  app.delete("/api/v1/session", async (request, reply) => {
    await request.session.regenerate();
    return s.session.parse({ user: null, csrfToken: reply.generateCsrf() });
  });
  app.get("/api/v1/catalog", async () => {
    const catalog = await readSalon(pool, config.SALON_ID);
    return s.catalog.parse({
      salon: catalog.salon,
      services: catalog.services.filter((s) => s.active),
      staff: catalog.staff.filter((s) => s.active),
      today: localDate(clock(), catalog.salon.timezone),
    });
  });
  app.get("/api/v1/availability", async (request) => {
    const query = z
      .object({ serviceId: s.id, staffId: s.id, date: s.date })
      .parse(request.query);
    return s.availability.parse(
      await service(await context(request)).availability(
        query.serviceId,
        query.staffId,
        query.date,
      ),
    );
  });
  app.post(
    "/api/v1/reservations",
    { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } },
    async (request) =>
      s.createdReservation.parse(
        await service(await context(request)).create(
          s.createReservation.strict().parse(request.body),
          await context(request),
          key(request),
        ),
      ),
  );
  app.get("/api/v1/reservations", async (request) => {
    const ctx = await context(request, true),
      query = z
        .object({
          date: s.date.optional(),
          page: z.coerce.number().int().min(1).max(10000).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        })
        .parse(request.query);
    return tx(ctx).read(async (store) => {
      const rows = await store.list(ctx.actor!, query.date);
      return s.page.parse({
        items: rows
          .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
          .map((b) => toDto(b, ctx, clock())),
        total: rows.length,
        page: query.page,
        pageSize: query.pageSize,
      });
    });
  });
  app.patch("/api/v1/reservations/:id", async (request) => {
    const ctx = await context(request, true),
      id = z.object({ id: s.id }).parse(request.params).id;
    return s.reservation.parse(
      await service(ctx).change(
        id,
        s.changeReservation.strict().parse(request.body),
        ctx,
        key(request),
      ),
    );
  });
  app.get("/api/v1/operations", async (request) => {
    const ctx = await context(request, true);
    return transaction(pool, async (sql) => {
      await lockSalon(sql, config.SALON_ID);
      return s.operations.parse(
        await workspace(sql, config.SALON_ID, ctx, clock()),
      );
    });
  });
  app.put("/api/v1/management", async (request) =>
    s.operations.parse(
      await manage(
        pool,
        config.SALON_ID,
        s.managementChange.parse(request.body),
        await context(request, true),
        key(request),
        clock(),
      ),
    ),
  );
  await app.ready();
  return app;
}
