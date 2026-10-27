import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import * as s from "../contracts/schemas";
import { seedData, demoToday } from "./data";

let data = seedData();
let paymentPreferences = {
  version: 1,
  depositEnabled: true,
  onlinePaymentVisible: true,
};
function seedCollections(): z.infer<typeof s.collectionEntry>[] {
  return data.reservations
    .filter((r) => (r.received?.amount ?? 0) > 0)
    .map((r) => ({
      id: `collection-${r.id}`,
      reservationId: r.id,
      actorId: "manager-demo",
      createdAt: `${demoToday}T05:00:00Z`,
      amount: r.received!,
      method: "cash",
      reversesId: null,
      note: "Demo kapora kaydı",
    }));
}
const collectionEntries = seedCollections();
let current: s.Session["user"] = null;
let sequence = 20;
let elapsed = 0;
let started = Date.now();
const guestAccess = new Map<string, string>();
const replays = new Map<string, { signature: string; response: unknown }>();
const accounts = new Map<
  string,
  { password: string; user: NonNullable<s.Session["user"]> }
>();
const csrf = "demo-csrf-token";
export function resetMock() {
  data = seedData();
  paymentPreferences = {
    version: 1,
    depositEnabled: true,
    onlinePaymentVisible: true,
  };
  collectionEntries.length = 0;
  collectionEntries.push(...seedCollections());
  current = null;
  sequence = 20;
  elapsed = 0;
  started = Date.now();
  guestAccess.clear();
  replays.clear();
  accounts.clear();
}
export function advanceMockClock(ms: number) {
  elapsed += ms;
}
function now() {
  return new Date(
    new Date(`${demoToday}T06:00:00Z`).getTime() +
      Date.now() -
      started +
      elapsed,
  );
}
function error(code: s.ApiErrorCode, message: string, status: number) {
  return HttpResponse.json(
    s.apiError.parse({ code, message, requestId: "mock-request" }),
    { status },
  );
}
function reply<T>(schema: z.ZodType<T>, value: unknown) {
  return HttpResponse.json(schema.parse(value) as never);
}
function expire() {
  data.reservations.forEach((r) => {
    if (
      r.status === "pending_payment" &&
      r.holdExpiresAt &&
      new Date(r.holdExpiresAt) <= now()
    ) {
      r.status = "expired";
      r.version++;
      r.allowedActions = [];
    }
  });
}
function access(r: s.Reservation, request: Request) {
  return (
    current?.role === "manager" ||
    (current?.role === "staff" && current.staffId === r.staffId) ||
    (current?.role === "customer" && current.id === r.customerId) ||
    guestAccess.get(r.id) === request.headers.get("X-Guest-Token")
  );
}
function visible() {
  return data.reservations
    .filter(
      (r) =>
        current?.role === "manager" ||
        (current?.role === "staff"
          ? r.staffId === current.staffId
          : current?.role === "customer" && r.customerId === current.id),
    )
    .map((r) => ({
      ...r,
      chairName: data.chairs.find((c) => c.id === r.chairId)?.name,
      allowedActions:
        current?.role === "customer"
          ? r.allowedActions.filter((a) => a === "cancel" || a === "reschedule")
          : r.allowedActions,
    }));
}
function workspace(): s.Operations {
  return {
    ...data,
    customers: current?.role === "manager" ? data.customers : [],
    reservations: visible(),
    schedules: data.schedules.filter(
      (x) => current?.role === "manager" || x.staffId === current?.staffId,
    ),
    chairs: current?.role === "manager" ? data.chairs : [],
  };
}
function overlaps(a: string, b: string, c: string, d: string) {
  return new Date(a) < new Date(d) && new Date(c) < new Date(b);
}
function slotOptions(
  serviceId: string,
  staffId: string,
  date: string,
  ignoreId?: string,
): (s.Slot & {
  chairId: string | null;
  status: "available" | "busy" | "unavailable" | "past";
})[] {
  const service = data.services.find((x) => x.id === serviceId && x.active);
  const person = data.staff.find(
    (x) => x.id === staffId && x.active && x.serviceIds.includes(serviceId),
  );
  if (
    !service ||
    !person ||
    !s.date.safeParse(date).success ||
    date < demoToday ||
    (new Date(date).getTime() - new Date(demoToday).getTime()) / 86400000 >=
      data.salon.bookingDays
  )
    return [];
  const shifts = data.schedules.filter(
    (x) => x.staffId === staffId && x.date === date,
  );
  const shift = shifts.find((x) => x.kind === "shift");
  const start = shift?.startsAt ?? "09:00",
    end = shift?.endsAt ?? "19:00";
  const result: ReturnType<typeof slotOptions> = [];
  const startMinute = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
  let endMinute = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
  if (endMinute <= startMinute) endMinute += 1440;
  const midnight = Date.parse(`${date}T00:00:00+03:00`);
  for (
    let minute = startMinute;
    minute < Math.min(endMinute, 1440);
    minute += data.salon.slotIntervalMinutes
  ) {
    const startsAt = new Date(midnight + minute * 60000).toISOString();
    const endsAt = new Date(
      new Date(startsAt).getTime() + service.durationMinutes * 60_000,
    ).toISOString();
    const occupiedUntil = new Date(
      Date.parse(endsAt) + 10 * 60000,
    ).toISOString();
    if (Date.parse(occupiedUntil) > midnight + endMinute * 60000) continue;
    const unavailable =
      shifts.some((x) => x.kind === "leave") ||
      shifts.some(
        (x) =>
          x.kind === "break" &&
          overlaps(
            startsAt,
            occupiedUntil,
            `${date}T${x.startsAt}:00+03:00`,
            `${date}T${x.endsAt}:00+03:00`,
          ),
      );
    const busy = data.reservations.filter(
      (r) =>
        r.id !== ignoreId &&
        ["pending_payment", "confirmed", "in_service"].includes(r.status) &&
        overlaps(
          startsAt,
          occupiedUntil,
          r.startsAt,
          new Date(Date.parse(r.endsAt) + 10 * 60000).toISOString(),
        ),
    );
    const chair = data.chairs.find(
      (c) =>
        c.active &&
        (!c.assignedStaffId || c.assignedStaffId === staffId) &&
        !busy.some((r) => r.chairId === c.id),
    );
    const eligible = data.chairs.some(
      (c) => c.active && (!c.assignedStaffId || c.assignedStaffId === staffId),
    );
    const status =
      new Date(startsAt) <= now()
        ? "past"
        : unavailable || !eligible
          ? "unavailable"
          : busy.some((r) => r.staffId === staffId) || !chair
            ? "busy"
            : "available";
    result.push({
      id: `${staffId}|${startsAt}`,
      staffId,
      startsAt,
      endsAt,
      chairId: status === "available" ? chair!.id : null,
      status,
    });
  }
  return result;
}
function slots(...args: Parameters<typeof slotOptions>) {
  return slotOptions(...args).filter(
    (slot): slot is typeof slot & { chairId: string } =>
      slot.status === "available" && slot.chairId !== null,
  );
}

export const handlers = [
  http.all("*/api/v1/*", async ({ request }) => {
    const url = new URL(request.url),
      path = url.pathname.replace("/api/v1", ""),
      method = request.method;
    const scenario = request.headers.get("X-Mock-Scenario");
    await delay(scenario === "slow" ? 1800 : 80);
    if (scenario === "network-error") return HttpResponse.error();
    if (scenario === "server-error")
      return error("UNAVAILABLE", "Servise şu anda ulaşılamıyor.", 503);
    if (
      scenario === "unauthorized" &&
      !["/catalog", "/availability", "/session"].includes(path)
    )
      return error(
        "UNAUTHENTICATED",
        "Oturumunuz sona erdi. Yeniden giriş yapın.",
        401,
      );
    expire();
    if (method === "GET" && path === "/catalog")
      return reply(s.catalog, {
        salon: data.salon,
        services:
          scenario === "empty"
            ? []
            : data.services
                .filter((x) => x.active)
                .map((x) => ({
                  ...x,
                  deposit: paymentPreferences.depositEnabled
                    ? x.deposit
                    : { amount: 0, currency: "TRY" },
                })),
        paymentSettings: paymentPreferences,
        staff: data.staff.filter((x) => x.active),
        today: demoToday,
      });
    if (method === "GET" && path === "/session")
      return reply(s.session, { user: current, csrfToken: csrf });
    if (method === "GET" && path === "/availability") {
      const date = url.searchParams.get("date") ?? "";
      if (
        !s.date.safeParse(date).success ||
        !url.searchParams.get("serviceId") ||
        !url.searchParams.get("staffId")
      )
        return error(
          "VALIDATION_ERROR",
          "Hizmet, berber ve geçerli bir tarih seçin.",
          422,
        );
      return reply(s.availability, {
        unavailableSlots:
          scenario === "empty"
            ? []
            : slotOptions(
                url.searchParams.get("serviceId")!,
                url.searchParams.get("staffId")!,
                date,
              ).filter((slot) => slot.status !== "available"),
        slots:
          scenario === "empty"
            ? []
            : slots(
                url.searchParams.get("serviceId")!,
                url.searchParams.get("staffId")!,
                date,
              ),
        timezone: data.salon.timezone,
        fetchedAt: now().toISOString(),
      });
    }
    if (method === "GET" && path === "/reservations") {
      if (!current)
        return error(
          "UNAUTHENTICATED",
          "Randevularınız için giriş yapın.",
          401,
        );
      let rows = visible();
      const period = url.searchParams.get("period");
      if (period && period !== "all")
        rows = rows.filter(
          (r) =>
            ["confirmed", "pending_payment", "in_service"].includes(
              r.status,
            ) ===
            (period === "upcoming"),
        );
      const filter = url.searchParams.get("date");
      if (filter) rows = rows.filter((r) => r.startsAt.slice(0, 10) === filter);
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1),
        pageSize = Math.min(
          100,
          Math.max(1, Number(url.searchParams.get("pageSize")) || 20),
        );
      rows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      if (period === "past") rows.reverse();
      return reply(s.page, {
        items:
          scenario === "empty"
            ? []
            : rows.slice((page - 1) * pageSize, page * pageSize),
        total: scenario === "empty" ? 0 : rows.length,
        page,
        pageSize,
      });
    }
    if (method === "GET" && path === "/operations") {
      if (!current) return error("UNAUTHENTICATED", "Giriş yapın.", 401);
      if (current.role === "customer")
        return error("FORBIDDEN", "Bu alana erişim yetkiniz yok.", 403);
      return reply(s.operations, workspace());
    }
    if (
      method === "GET" &&
      (path === "/payment-settings" ||
        /^\/reservations\/[^/]+\/collections$/.test(path))
    ) {
      if (current?.role !== "manager")
        return error("FORBIDDEN", "Yönetici yetkisi gerekli.", 403);
      if (path === "/payment-settings")
        return reply(s.paymentSettings, paymentPreferences);
      const r = data.reservations.find((r) => r.id === path.split("/")[2]);
      return r
        ? reply(s.collections, {
            reservation: r,
            entries: collectionEntries.filter((e) => e.reservationId === r.id),
          })
        : error("NOT_FOUND", "Randevu bulunamadı.", 404);
    }
    if (method === "GET") return error("NOT_FOUND", "Kayıt bulunamadı.", 404);
    if (request.headers.get("X-CSRF-Token") !== csrf)
      return error(
        "FORBIDDEN",
        "Oturum doğrulanamadı. Sayfayı yenileyin.",
        403,
      );
    if (method === "DELETE" && path === "/session") {
      current = null;
      guestAccess.clear();
      return reply(s.session, { user: null, csrfToken: csrf });
    }
    const body: unknown = await request.json().catch(() => null);
    if (path === "/session" || path === "/customers") {
      const parsed = (path === "/customers" ? s.register : s.login).safeParse(
        body,
      );
      if (!parsed.success)
        return error(
          "VALIDATION_ERROR",
          "Giriş bilgilerinizi kontrol edin.",
          422,
        );
      const email = parsed.data.email.toLowerCase();
      if (path === "/customers") {
        const registration = s.register.parse(body);
        if (
          accounts.has(email) ||
          [
            "musteri@example.test",
            "yonetici@example.test",
            "berber@example.test",
          ].includes(email)
        )
          return error(
            "VALIDATION_ERROR",
            "Bu e-posta için mevcut hesabınızla giriş yapın.",
            422,
          );
        current = {
          id: `customer-${++sequence}`,
          name: registration.name,
          role: "customer",
          staffId: null,
        };
        accounts.set(email, { password: registration.password, user: current });
      } else {
        const account = accounts.get(email);
        if (account && account.password === parsed.data.password)
          current = account.user;
        else if (
          parsed.data.password === "Demo12345!" &&
          [
            "musteri@example.test",
            "yonetici@example.test",
            "berber@example.test",
          ].includes(email)
        ) {
          current = email.startsWith("yonetici")
            ? {
                id: "manager-demo",
                name: "Salon yöneticisi",
                role: "manager",
                staffId: null,
              }
            : email.startsWith("berber")
              ? {
                  id: "staff-demo",
                  name: "Emre Kaya",
                  role: "staff",
                  staffId: "emre",
                }
              : {
                  id: "customer-demo",
                  name: "Deniz Yılmaz",
                  role: "customer",
                  staffId: null,
                };
        } else
          return error(
            "UNAUTHENTICATED",
            "E-posta veya parola eşleşmedi.",
            401,
          );
      }
      guestAccess.clear();
      return reply(s.session, { user: current, csrfToken: csrf });
    }
    const key = request.headers.get("Idempotency-Key");
    if (!key || key.length < 8)
      return error("VALIDATION_ERROR", "İşlem anahtarı eksik.", 422);
    const scope = `${current?.id ?? (path === "/reservations" ? "guest" : request.headers.get("X-Guest-Token")) ?? "guest"}:${method}:${path}:${key}`;
    const signature = JSON.stringify(body),
      previous = replays.get(scope);
    if (previous)
      return previous.signature === signature
        ? HttpResponse.json(previous.response as never)
        : error(
            "IDEMPOTENCY_CONFLICT",
            "Bu işlem anahtarı farklı bilgilerle kullanıldı.",
            409,
          );
    function save<T>(schema: z.ZodType<T>, value: unknown) {
      const result = schema.parse(value);
      replays.set(scope, { signature, response: structuredClone(result) });
      return reply(schema, result);
    }
    if (method === "PUT" && path === "/payment-settings") {
      if (current?.role !== "manager")
        return error("FORBIDDEN", "Yönetici yetkisi gerekli.", 403);
      const parsed = s.paymentSettings.safeParse(body);
      if (!parsed.success)
        return error("VALIDATION_ERROR", "Ayarları kontrol edin.", 422);
      if (parsed.data.version !== paymentPreferences.version)
        return error("VERSION_CONFLICT", "Ayarlar değişti; yenileyin.", 409);
      paymentPreferences = { ...parsed.data, version: parsed.data.version + 1 };
      return save(s.paymentSettings, paymentPreferences);
    }
    if (
      method === "POST" &&
      /^\/reservations\/[^/]+\/collections$/.test(path)
    ) {
      if (current?.role !== "manager")
        return error("FORBIDDEN", "Yönetici yetkisi gerekli.", 403);
      const parsed = s.collectionRequest.safeParse(body);
      if (!parsed.success)
        return error("VALIDATION_ERROR", "Tahsilatı kontrol edin.", 422);
      const r = data.reservations.find((r) => r.id === path.split("/")[2]);
      if (!r) return error("NOT_FOUND", "Randevu bulunamadı.", 404);
      const input = parsed.data;
      if (input.version !== r.version)
        return error("VERSION_CONFLICT", "Randevu değişti; yenileyin.", 409);
      const original =
        input.action === "reverse"
          ? collectionEntries.find(
              (e) => e.id === input.entryId && e.reservationId === r.id,
            )
          : undefined;
      if (
        input.action === "reverse" &&
        (!original ||
          original.reversesId ||
          collectionEntries.some((e) => e.reversesId === original.id))
      )
        return error("INVALID_TRANSITION", "Kayıt düzeltilemez.", 409);
      if (
        input.action === "receive" &&
        ["cancelled", "expired", "no_show"].includes(r.status)
      )
        return error(
          "INVALID_TRANSITION",
          "Bu randevuya tahsilat girilemez.",
          409,
        );
      const amount =
        input.action === "receive" ? input.amount : original!.amount.amount;
      const net = (r.received?.amount ?? 0) + (original ? -amount : amount);
      if (net < 0 || net > r.total.amount)
        return error(
          "VALIDATION_ERROR",
          "Tahsilat kalan bakiyeyi aşamaz.",
          422,
        );
      r.received = { amount: net, currency: "TRY" };
      r.version++;
      if (r.status === "pending_payment" && net >= r.deposit.amount) {
        r.status = "confirmed";
        r.holdExpiresAt = null;
        r.allowedActions = ["cancel", "reschedule", "start", "no_show"];
      }
      r.paymentStatus =
        ["cancelled", "expired"].includes(r.status) && net > 0
          ? "refund_pending"
          : net >= r.total.amount && net > 0
            ? "paid"
            : net > 0
              ? "pending"
              : "unpaid";
      collectionEntries.push({
        id: crypto.randomUUID(),
        reservationId: r.id,
        actorId: current.id,
        createdAt: now().toISOString(),
        amount: { amount, currency: "TRY" },
        method: input.action === "receive" ? input.method : original!.method,
        reversesId: original?.id ?? null,
        note: input.note,
      });
      const result = save(s.collections, {
        reservation: r,
        entries: collectionEntries.filter((e) => e.reservationId === r.id),
      });
      return scenario === "response-lost" ? HttpResponse.error() : result;
    }
    if (method === "POST" && path === "/reservations") {
      const parsed = s.createReservation.safeParse(body);
      if (!parsed.success)
        return error(
          "VALIDATION_ERROR",
          "Rezervasyon bilgilerini kontrol edin.",
          422,
        );
      const input = parsed.data;
      const chosen = slots(
        input.serviceId,
        input.staffId,
        input.slotId.split("|")[1]?.slice(0, 10) ?? "",
      ).find((x) => x.id === input.slotId);
      if (!chosen || scenario === "conflict")
        return error(
          "SLOT_CONFLICT",
          "Bu saat az önce doldu. Lütfen başka bir saat seçin.",
          409,
        );
      const service = data.services.find((x) => x.id === input.serviceId)!;
      const r: s.Reservation = {
        id: `r-${++sequence}`,
        chairId: chosen.chairId,
        version: 1,
        customer: input.customer,
        customerId: current?.role === "customer" ? current.id : null,
        staffId: input.staffId,
        staffName: data.staff.find((x) => x.id === input.staffId)!.name,
        serviceId: service.id,
        serviceName: service.name,
        startsAt: chosen.startsAt,
        endsAt: chosen.endsAt,
        total: { ...service.price },
        deposit: paymentPreferences.depositEnabled
          ? { ...service.deposit }
          : { amount: 0, currency: "TRY" },
        received: { amount: 0, currency: "TRY" },
        status:
          paymentPreferences.depositEnabled && service.deposit.amount > 0
            ? "pending_payment"
            : "confirmed",
        paymentStatus: "unpaid",
        holdExpiresAt:
          paymentPreferences.depositEnabled && service.deposit.amount > 0
            ? new Date(now().getTime() + 300_000).toISOString()
            : null,
        allowedActions: ["cancel"],
      };
      data.reservations.push(r);
      if (
        !data.customers.some((customer) => customer.email === r.customer.email)
      )
        data.customers.push({
          ...r.customer,
          id: r.customerId ?? `guest-${r.id}`,
        });
      const token = current ? null : crypto.randomUUID();
      if (token) guestAccess.set(r.id, token);
      const result = save(s.createdReservation, {
        reservation: r,
        guestToken: token,
      });
      return scenario === "response-lost" ? HttpResponse.error() : result;
    }
    if (method === "POST" && path === "/payments") {
      const input = s.paymentRequest.safeParse(body);
      if (!input.success)
        return error("VALIDATION_ERROR", "Rezervasyon gerekli.", 422);
      const r = data.reservations.find(
        (x) => x.id === input.data.reservationId,
      );
      if (!r || !access(r, request))
        return error("NOT_FOUND", "Rezervasyon bulunamadı.", 404);
      if (r.status === "expired" || scenario === "expired")
        return error(
          "HOLD_EXPIRED",
          "Saat tutma süresi doldu. Yeni bir saat seçin.",
          409,
        );
      if (r.status !== "pending_payment" && r.status !== "confirmed")
        return error(
          "INVALID_TRANSITION",
          "Bu rezervasyon için kapora işlemi yapılamaz.",
          409,
        );
      if (r.paymentStatus === "paid")
        return save(s.paymentResult, {
          reservation: r,
          checkoutUrl: null,
          mode: "mock",
        });
      if (scenario === "payment-failed") {
        r.paymentStatus = "failed";
        r.version++;
        return error(
          "PAYMENT_FAILED",
          "Demo kapora işlemi başarısız. Gerçek tahsilat yapılmadı.",
          422,
        );
      }
      r.paymentStatus = "paid";
      r.received = { ...r.deposit };
      collectionEntries.push({
        id: crypto.randomUUID(),
        reservationId: r.id,
        actorId: "demo-provider",
        createdAt: now().toISOString(),
        amount: { ...r.deposit },
        method: "card",
        reversesId: null,
        note: "Demo ödeme simülasyonu",
      });
      r.status = "confirmed";
      r.holdExpiresAt = null;
      r.version++;
      r.allowedActions = ["cancel", "reschedule", "start", "no_show"];
      return save(s.paymentResult, {
        reservation: r,
        checkoutUrl: null,
        mode: "mock",
      });
    }
    if (method === "PATCH" && path.startsWith("/reservations/")) {
      const r = data.reservations.find((x) => x.id === path.split("/")[2]);
      if (!r || !access(r, request))
        return error("NOT_FOUND", "Rezervasyon bulunamadı.", 404);
      const input = s.changeReservation.safeParse(body);
      if (!input.success)
        return error("VALIDATION_ERROR", "İşlem bilgileri eksik.", 422);
      if (input.data.version !== r.version)
        return error(
          "VERSION_CONFLICT",
          "Randevu güncellendi. Listeyi yenileyip tekrar deneyin.",
          409,
        );
      const action = input.data.action;
      if (!r.allowedActions.includes(action))
        return error(
          "INVALID_TRANSITION",
          "Bu durum değişikliği yapılamaz.",
          409,
        );
      if (
        ["start", "complete", "no_show"].includes(action) &&
        !["manager", "staff"].includes(current?.role ?? "")
      )
        return error("FORBIDDEN", "Bu işlem için yetkiniz yok.", 403);
      if (
        current?.role === "staff" &&
        ["cancel", "reschedule"].includes(action)
      )
        return error(
          "FORBIDDEN",
          "Plan değişikliklerini yönetici yapabilir.",
          403,
        );
      if (action === "reschedule") {
        const slotId = input.data.slotId ?? "";
        const chosen = slots(
          r.serviceId,
          r.staffId,
          slotId.split("|")[1]?.slice(0, 10) ?? "",
          r.id,
        ).find((x) => x.id === slotId);
        if (!chosen || scenario === "conflict")
          return error("SLOT_CONFLICT", "Seçilen saat artık uygun değil.", 409);
        r.startsAt = chosen.startsAt;
        r.endsAt = chosen.endsAt;
      } else if (action === "cancel") {
        r.status = "cancelled";
        r.allowedActions = [];
        if (r.paymentStatus === "paid") r.paymentStatus = "refund_pending";
      } else if (action === "start") {
        r.status = "in_service";
        r.allowedActions = ["complete"];
      } else {
        r.status = action === "complete" ? "completed" : "no_show";
        r.allowedActions = [];
      }
      r.version++;
      return save(s.reservation, r);
    }
    if (method === "PUT" && path === "/management") {
      if (current?.role !== "manager")
        return error("FORBIDDEN", "Yalnızca yönetici düzenleyebilir.", 403);
      const parsed = s.managementChange.safeParse(body);
      if (!parsed.success)
        return error("VALIDATION_ERROR", "Alanları kontrol edin.", 422);
      const change = parsed.data;
      if (change.resource === "chairs") {
        if (
          change.value.assignedStaffId &&
          !data.staff.some((staff) => staff.id === change.value.assignedStaffId)
        )
          return error(
            "VALIDATION_ERROR",
            "Koltuk için seçilen çalışan bulunamadı.",
            422,
          );
        if (
          data.reservations.some(
            (r) =>
              r.chairId === change.value.id &&
              ["confirmed", "pending_payment", "in_service"].includes(
                r.status,
              ) &&
              (!change.value.active ||
                (change.value.assignedStaffId &&
                  change.value.assignedStaffId !== r.staffId)),
          )
        )
          return error(
            "SLOT_CONFLICT",
            "Koltuk değişikliği aktif randevuyla çakışıyor.",
            409,
          );
      }
      if (
        change.resource === "services" &&
        change.value.deposit.amount > change.value.price.amount
      )
        return error("VALIDATION_ERROR", "Kapora toplam tutarı aşamaz.", 422);
      if (
        change.resource === "schedules" &&
        change.value.startsAt >= change.value.endsAt
      )
        return error(
          "VALIDATION_ERROR",
          "Bitiş saati başlangıçtan sonra olmalı.",
          422,
        );
      if (change.resource === "salon") data.salon = change.value;
      else if (change.resource === "customers") {
        if (
          data.customers.some(
            (c) => c.id !== change.value.id && c.email === change.value.email,
          )
        )
          return error(
            "VALIDATION_ERROR",
            "Bu e-posta başka bir müşteri kaydında kullanılıyor.",
            422,
          );
        data.customers = [
          ...data.customers.filter((x) => x.id !== change.value.id),
          change.value,
        ];
      } else if (change.resource === "services")
        data.services = [
          ...data.services.filter((x) => x.id !== change.value.id),
          change.value,
        ];
      else if (change.resource === "staff")
        data.staff = [
          ...data.staff.filter((x) => x.id !== change.value.id),
          change.value,
        ];
      else if (change.resource === "chairs")
        data.chairs = [
          ...data.chairs.filter((x) => x.id !== change.value.id),
          change.value,
        ];
      else
        data.schedules = [
          ...data.schedules.filter((x) => x.id !== change.value.id),
          change.value,
        ];
      return save(s.operations, workspace());
    }
    return error("NOT_FOUND", "İşlem bulunamadı.", 404);
  }),
];
