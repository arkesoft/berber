# Gerçek backend ile yerel deneme

26 Ekim 2026 tarihinde bu bilgisayarda kurulmuştur. Ücretli servis veya hesap gerekmez. SMS ve e-posta gönderimi kapalıdır; ödeme backend'i yoktur. Örnek hizmetlerin kaporası sıfırdır.

- Frontend: `http://127.0.0.1:5174` (`npm.cmd run dev:backend -- --strictPort`). Mock API kullanılmaz.
- Backend: `http://127.0.0.1:3001`.
- PostgreSQL: `127.0.0.1:55432`, ayrı `salon_local` veritabanı ve superuser olmayan `salon_local` rolü.
- Otomatik entegrasyon testleri `salon_backend_test` veritabanını kullanmaya devam eder; yerel deneme kayıtları test resetinden etkilenmez.
- Yerel ayarlar `.local/local.env`, yönetici/çalışan giriş bilgileri `.local/local-accounts.json` içindedir. Bu dosyalar git dışında tutulur; VITE değişkenlerine secret konmaz.

Başlangıç verileri: iki çalışan, üç hizmet, iki koltuk, kurulum tarihinden itibaren 30 günlük mesai ve öğle molaları. Gerçek işletme verisi değildir. Mesailer yönetim panelinden düzenlenebilir. Randevular PostgreSQL'e yazılır ve sayfa yenilenince kaybolmaz. Misafir rezervasyonu yapılabilir; daha sonra kendi randevularını yönetmek isteyen kullanıcı önce müşteri hesabı açıp giriş yapmalıdır. Misafir OTP ile sonradan yönetim tamamlanmamıştır.

PostgreSQL çalışırken, proje kökünden üç ayrı PowerShell terminalinde:

```powershell
cd backend
node --env-file=../.local/local.env --enable-source-maps dist/backend/src/server.js
```

```powershell
cd backend
node --env-file=../.local/local.env --enable-source-maps dist/backend/src/worker.js
```

```powershell
npm.cmd run dev:backend -- --strictPort
```

Backend kaynakları değişirse önce `backend/` içinde `npm.cmd run build` çalıştırılmalıdır. Bu kurulum production dağıtımı değildir; geliştirme sunucuları yalnız loopback adresine bağlıdır. Eski `5173` ve `4173` adresleri demo içindir. Yerel deneme veritabanını temizlemek için otomatik test komutları kullanılmaz; mevcut kayıtların silinmesi ayrıca açık talep gerektirir.
