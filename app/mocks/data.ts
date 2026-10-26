import { publicSalon } from "../config/salon";
import type { Operations, Reservation } from "../contracts/schemas";

export const demoToday = "2026-10-26";
const money = (amount: number) => ({ amount, currency: "TRY" as const });
export function seedData(): Operations {
  const services = [
    {
      id: "cut",
      name: "Saç kesimi",
      description: "Danışma, kişiye özel kesim ve son şekillendirme.",
      durationMinutes: 30,
      price: money(65000),
      deposit: money(15000),
      active: true,
    },
    {
      id: "beard",
      name: "Sakal düzenleme",
      description: "Yüzünüze uygun form, sıcak havlu ve bakım.",
      durationMinutes: 20,
      price: money(35000),
      deposit: money(10000),
      active: true,
    },
    {
      id: "ritual",
      name: "Saç ve sakal",
      description: "Kesimden son dokunuşa, bütün bir bakım.",
      durationMinutes: 50,
      price: money(90000),
      deposit: money(20000),
      active: true,
    },
  ];
  const staff = [
    {
      id: "emre",
      name: "Emre Kaya",
      title: "Klasik kesimler ve sakal",
      serviceIds: ["cut", "beard", "ritual"],
      active: true,
    },
    {
      id: "can",
      name: "Can Demir",
      title: "Modern kesimler ve şekillendirme",
      serviceIds: ["cut", "beard", "ritual"],
      active: true,
    },
  ];
  const reservations: Reservation[] = ["09:30", "11:00", "14:00", "16:00"].map(
    (time, i) => ({
      id: `r-${i + 1}`,
      version: 1,
      customer: {
        name: ["Deniz Yılmaz", "Mert Aydın", "Ege Şahin", "Arda Koç"][i]!,
        email: `customer${i}@example.test`,
        phone: "+90 555 000 00 00",
      },
      customerId: i === 0 ? "customer-demo" : `customer-${i}`,
      staffId: i % 2 ? "can" : "emre",
      staffName: i % 2 ? "Can Demir" : "Emre Kaya",
      serviceId: "cut",
      serviceName: "Saç kesimi",
      startsAt: `${demoToday}T${time}:00+03:00`,
      endsAt: `${demoToday}T${time.slice(0, 2)}:${time.endsWith("30") ? "59" : "30"}:00+03:00`,
      total: money(65000),
      deposit: money(15000),
      status: "confirmed",
      paymentStatus: "paid",
      holdExpiresAt: null,
      allowedActions: ["cancel", "reschedule", "start", "no_show"],
    }),
  );
  reservations.push({
    ...reservations[0]!,
    id: "r-past",
    startsAt: "2026-10-20T10:00:00+03:00",
    endsAt: "2026-10-20T10:30:00+03:00",
    status: "completed",
    allowedActions: [],
  });
  return {
    salon: publicSalon,
    services,
    staff,
    chairs: [
      { id: "chair-1", name: "Pencere yanı", active: true },
      { id: "chair-2", name: "İç salon", active: true },
    ],
    schedules: staff.flatMap((person) => [
      {
        id: `shift-${person.id}`,
        staffId: person.id,
        date: demoToday,
        kind: "shift" as const,
        startsAt: "09:00",
        endsAt: "19:00",
        note: "Normal mesai",
      },
      {
        id: `break-${person.id}`,
        staffId: person.id,
        date: demoToday,
        kind: "break" as const,
        startsAt: "12:00",
        endsAt: "13:00",
        note: "Öğle molası",
      },
    ]),
    reservations,
    customers: [
      ...new Map(
        reservations.map((r) => [
          r.customer.email,
          { ...r.customer, id: r.customerId ?? r.id },
        ]),
      ).values(),
    ],
  };
}
