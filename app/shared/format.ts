export function formatMoney(value: { amount: number; currency: string }) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: value.currency,
  }).format(value.amount / 100);
}
export function formatTime(value: string, timezone = "Europe/Istanbul") {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function formatDate(value: string, timezone = "Europe/Istanbul") {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}
export function addDays(value: string, days: number) {
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
