export const slotMessages = {
  "slots.interval": "Randevu saat aralığı (dakika)",
  "slots.intervalHint":
    "5–120 arasında dakika girin. Örneğin 20: 09.00, 09.20, 09.40. Aralık mesai başlangıcından hesaplanır; hizmet süresini ve mevcut randevuları değiştirmez.",
  "slots.intervalError": "5 ile 120 arasında tam sayı girin.",
  "slots.intervalSummary": "Randevu saat aralığı: {minutes} dakika",
  "slots.available": "Müsait",
  "slots.selected": "Seçildi",
  "slots.busy": "Dolu",
  "slots.unavailable": "Uygun değil",
  "slots.past": "Geçti",
  "slots.empty":
    "Bu gün için çalışma saatleri bulunmuyor. Başka bir gün seçebilirsiniz.",
  "slots.noneAvailable":
    "Bu gün seçilebilir saat kalmadı. Dolu saatler aşağıdaki açıklamalarıyla görünür; başka bir gün seçebilirsiniz.",
  "slots.legend": "Saat durumları",
  "slots.help": "Saat renkleri ne anlama geliyor?",
  "slots.help.available": "Açık zemin ve yeşil yazı: bu saati seçebilirsiniz.",
  "slots.help.selected": "Yeşil tonlu zemin: seçtiğiniz başlangıç saati.",
  "slots.help.busy":
    "Kırmızı tonlu zemin: hizmet süreniz ve hazırlık aralığı boyunca çalışan veya uygun koltuk dolu. Geçici olarak tutulan saatler de dahildir; seçilemez.",
  "slots.help.unavailable":
    "Gri zemin: çalışma planı veya kaynak uygunluğu nedeniyle seçilemez.",
  "slots.help.past":
    "Gri zemin ve Geçti etiketi: başlangıç saati geçmiş, seçilemez.",
  "slots.liveHint":
    "Saatler otomatik yenilenir. Seçim, randevu oluşturulana kadar yer ayırmaz; son kontrol kaydederken yapılır.",
} as const;
