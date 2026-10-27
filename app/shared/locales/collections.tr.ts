export const collectionMessages = {
  "collection.title": "Tahsilat",
  "collection.received": "Alınan",
  "collection.remaining": "Kalan bakiye",
  "collection.total": "Randevu tutarı",
  "collection.unpaid": "Para alınmadı",
  "collection.partial": "Kısmi ödeme alındı",
  "collection.paid": "Tamamı alındı",
  "collection.zero": "Ücret yok",
  "collection.amount": "Alınan tutar (TL)",
  "collection.method": "Tahsilat yöntemi",
  "collection.cash": "Nakit",
  "collection.card": "Kart / fiziksel POS",
  "collection.bank_transfer": "Banka havalesi",
  "collection.note": "Açıklama (isteğe bağlı)",
  "collection.save": "Tahsilatı kaydet",
  "collection.history": "İşlem geçmişi",
  "collection.empty": "Henüz tahsilat kaydı yok.",
  "collection.reverse": "Hatalı kaydı düzelt",
  "collection.reason": "Düzeltme nedeni",
  "collection.reverseConfirm": "Kaydı düzelt",
  "collection.reverseHint":
    "Önceki kayıt korunur ve aynı tutarda ters kayıt eklenir. Bu işlem bankadan iade yapmaz; yalnızca hatalı tahsilat kaydını düzeltir.",
  "collection.reversed": "Düzeltildi",
  "collection.reversal": "Düzeltme kaydı",
  "collection.saved": "Tahsilat kaydedildi.",
  "collection.corrected": "Hatalı tahsilat düzeltildi.",
  "collection.invalidAmount":
    "Kalan bakiyeyi aşmayan, sıfırdan büyük bir tutar yazın (en fazla iki ondalık).",
  "collection.hint":
    "Salonda aldığınız ödemeleri kaydedin. Bu form müşterinin kartından para çekmez.",
  "collection.closed":
    "Bu randevuya yeni tahsilat girilemez. Önceki işlemleri aşağıda inceleyebilirsiniz.",
  "collection.review":
    "İptal veya süresi dolan randevuda tahsilat var. İade kararı ayrıca değerlendirilmeli; otomatik para iadesi yapılmadı.",
  "collection.netTotal": "Net kayıtlı tahsilat",
  "collection.all": "Tüm tahsilat durumları",
  "paymentPolicy.title": "Tahsilat tercihleri",
  "paymentPolicy.deposit": "Kapora iste",
  "paymentPolicy.depositHint":
    "Yeni randevularda hizmetin kapora tutarı istenir. Kapalıysa kapora sıfır olur ve randevu doğrudan onaylanır. Mevcut randevular değişmez.",
  "paymentPolicy.visible": "Çevrim içi ödeme alanını müşteriye göster",
  "paymentPolicy.visibleHint":
    "Rezervasyon ekranındaki sanal POS alanının görünürlüğünü belirler. Kapora ayarından bağımsızdır.",
  "paymentPolicy.disconnected":
    "Sanal POS bağlı değil. Alanı göstermek çevrim içi tahsilatı başlatmaz. Kapora açıksa süre dolmadan yönetici tarafından tahsilat kaydı girilmelidir.",
  "paymentPolicy.saved": "Tahsilat tercihleri kaydedildi.",
  "paymentPolicy.publicTitle": "Çevrim içi ödeme",
  "paymentPolicy.publicOffline":
    "Çevrim içi ödeme henüz kullanılamıyor. Ödeme için salonla iletişime geçin.",
  "paymentPolicy.noDeposit": "Bu randevuda kapora istenmiyor.",
} as const;
