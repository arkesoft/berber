import { salon } from "../contracts/schemas";

// Deployment-owned public configuration. Replace demo identity before real release.
export const publicSalon = salon.parse({
  id: "salon-demo",
  name: "Kıyı Berber",
  description: "İyi bir kesim. Kendinize ayırdığınız bir saat.",
  address: "Caferağa, Kadıköy / İstanbul — örnek salon",
  phone: "+90 212 000 00 00",
  timezone: "Europe/Istanbul",
  currency: "TRY",
  bookingDays: 30,
});
