import { index, route, type RouteConfig } from "@react-router/dev/routes";
export default [
  index("routes/home.tsx"),
  route("randevu", "routes/booking.tsx"),
  route("giris", "routes/login.tsx"),
  route("randevularim", "routes/appointments.tsx"),
  route("yonetim/:section?", "routes/manager.tsx"),
  route("calisan/:section?", "routes/staff.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
