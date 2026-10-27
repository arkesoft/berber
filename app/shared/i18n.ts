import { uiMessages } from "./locales/tr";
import { slotMessages } from "./locales/slots.tr";
import { collectionMessages } from "./locales/collections.tr";
import { panelMessages } from "./locales/panels.tr";
import { landingMessages } from "./locales/landing.tr";
import { paymentSettingsMessages } from "./locales/payment-settings.tr";
const tr = {
  ...slotMessages,
  ...collectionMessages,
  ...panelMessages,
  ...uiMessages,
  ...landingMessages,
  ...paymentSettingsMessages,
  "nav.home": "Salon",
  "nav.book": "Randevu al",
  "nav.appointments": "Randevularım",
  "nav.login": "Giriş yap",
  "nav.staffMenu": "Çalışma menüsü",
  "identity.storyLabel": "Salon deneyimi",
  "identity.storyTitle": "Bir sonraki iyi kesim.",
  "identity.storyCopy":
    "Randevularınızı tek yerden görün. Bir sonraki ziyaretiniz için kendinize zaman ayırın.",
  "common.retry": "Tekrar dene",
  "common.loading": "Yükleniyor…",
  "common.save": "Kaydet",
  "staff.services": "Verebildiği hizmetler",
  "staff.servicesHint":
    "Bu çalışanın verebildiği hizmetleri seçin. Yeni eklenen hizmetleri buradan ayrıca işaretleyin.",
  "staff.servicesSummary": "Hizmetler: {services}",
  "staff.noServices": "Hizmet seçilmedi",
  "staff.createServiceFirst":
    "Önce Hizmetler ve fiyatlar ekranından bir hizmet oluşturun.",
  "staff.serviceRequired": "En az bir hizmet seçin.",
  "common.back": "Geri",
  "common.continue": "Devam et",
  "booking.title": "Kendinize zaman ayırın.",
  "booking.subtitle": "Hizmetinizi seçin, size uygun saati birlikte bulalım.",
  "booking.liveConfirmed": "Randevunuz onaylandı. Ayrıntılar aşağıda.",
  "booking.liveSelection":
    ", seçiminiz hazır. Göndermeden önce bilgilerinizi kontrol edin.",
  "booking.liveDeposit": "Kapora",
  "booking.liveReview":
    "Bilgilerinizi kontrol edin. Kapora gerekmiyorsa randevunuz doğrudan onaylanır.",
  "booking.paymentDisabled":
    "Çevrim içi ödeme şu anda kapalı. Kaporalı randevuların kesinleşmesi için salonla iletişime geçin; süreli saat tutma tek başına onay değildir.",
  "booking.service": "Hizmet",
  "booking.staff": "Berber",
  "booking.time": "Tarih ve saat",
  "booking.contact": "Bilgileriniz",
  "booking.payment": "Kapora ve onay",
  "status.pending_payment": "Kapora bekleniyor",
  "status.confirmed": "Onaylandı",
  "status.in_service": "Hizmet sürüyor",
  "status.completed": "Tamamlandı",
  "status.cancelled": "İptal edildi",
  "status.no_show": "Gelmedi",
  "status.expired": "Süresi doldu",
  "payment.unpaid": "Ödenmedi",
  "payment.pending": "Bekliyor",
  "payment.paid": "Ödendi",
  "payment.failed": "Başarısız",
  "payment.refund_pending": "İade incelemesinde",
  "payment.refunded": "İade edildi",
  "payment.partially_refunded": "Kısmen iade edildi",
};
export type MessageKey = keyof typeof tr;
export function t(key: MessageKey, values: Record<string, unknown> = {}) {
  return tr[key].replace(/\{(\w+)\}/g, (_, name: string) =>
    String(values[name] ?? ""),
  );
}
