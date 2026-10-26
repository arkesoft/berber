import { z } from "zod";
import { apiError, type ApiErrorCode } from "../../contracts/schemas";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode | "NETWORK_ERROR" | "CONTRACT_ERROR",
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
let csrfToken = "";
let guestToken = "";
export function setSessionTokens(csrf: string, guest = "") {
  csrfToken = csrf;
  guestToken = guest;
}
export function setGuestToken(token: string | null) {
  guestToken = token ?? "";
}
export function resetTokens() {
  csrfToken = "";
  guestToken = "";
}
export const mockMode = import.meta.env.VITE_API_MODE === "mock";

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    key?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.key) headers["Idempotency-Key"] = options.key;
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  if (guestToken) headers["X-Guest-Token"] = guestToken;
  if (mockMode && typeof sessionStorage !== "undefined")
    headers["X-Mock-Scenario"] =
      sessionStorage.getItem("mock-scenario") ?? "success";
  let response: Response;
  try {
    const url = new URL(
      `/api/v1${path}`,
      typeof window === "undefined"
        ? "http://localhost"
        : window.location.origin,
    );
    response = await fetch(url, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "Bağlantı kurulamadı. Seçimleriniz korunuyor; tekrar deneyin.",
    );
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiError.safeParse(data);
    throw new ApiError(
      parsed.success ? parsed.data.code : "UNAVAILABLE",
      parsed.success
        ? parsed.data.message
        : "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
      response.status,
    );
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new ApiError(
      "CONTRACT_ERROR",
      "Sunucudan beklenmeyen bir yanıt alındı.",
    );
  return parsed.data;
}
