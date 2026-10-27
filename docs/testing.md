# Testler

| Komut               | Ne yapar                                                | Backend gerekir mi? |
| ------------------- | ------------------------------------------------------- | ------------------- |
| `npm test`          | Birim ve bileşen testleri (Vitest + jsdom)              | Hayır               |
| `npm run typecheck` | TypeScript (çeviri anahtarları dahil)                   | Hayır               |
| `npm run lint`      | ESLint                                                  | Hayır               |
| `npm run e2e`       | Gerçek tarayıcıda duman testi (puppeteer-core + Chrome) | Evet                |

Bir değişiklikten sonra önerilen sıra: `npx prettier --check .`,
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, backend
açıksa `npm run e2e`.

## Birim ve bileşen testleri

- Dosyalar test ettikleri kodun yanında durur (`*.test.ts(x)`).
- API, `fetch` taklit edilerek test edilir: `src/test/apiMock.tsx` içindeki
  `installApi`, `apiOk`, `apiFail` ve klinik sayfaları için
  `renderInClinic`. Yetkili istekler için testin başında `startSession(...)`,
  sonunda `__resetSessionForTests()` kullanılır.
- `src/test/setup.ts` testler boyunca çeviri dosyalarında olmayan anahtarları
  toplar; bir dosyada eksik anahtar kullanıldıysa o dosyanın testi
  "çeviri dosyalarında olmayan anahtarlar" hatasıyla düşer.
- `src/i18n/i18n.test.ts` TR ve EN dosyalarının aynı anahtarlara sahip
  olduğunu ve backend kod listelerinin (tür, cins, stok, izin) eksiksiz
  çevrildiğini denetler.
- Zaman hassas testlerde iş saat dilimi `Europe/Istanbul`'dur; UTC saatle
  ay sınırı kontrol edilirken buna dikkat edin.

## Duman testi (`npm run e2e`)

`scripts/e2e.mjs` yüklü Chrome'u (`channel: 'chrome'`) açar ve sitenin ana
akışlarını gezer. **Kalıcı hiçbir şey yazmaz**: satış penceresini açıp
kaydetmeden kapatır, belgeyi yalnızca açar.

Hazırlık:

1. Backend ve `npm run dev` (ya da `npm run preview`) çalışıyor olmalı.
2. `.env` içine test hesaplarını yazın (bkz. `.env.example`):
   `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`, `E2E_CLINIC_EMAIL`,
   `E2E_CLINIC_PASSWORD` ve `E2E_BASE_URL` (örn. `http://localhost:5173`
   ya da Docker kurulumunda `http://localhost:8080`). Hepsi zorunludur.
   Gerçek hesap şifresi kullanmayın.
   Bu değerler `VITE_` önekli olmadığı için uygulamaya gömülmez.

```bash
npm run e2e
```

```bash
npm run e2e -- --headed
```

Kapsam (19 adım):

- Herkese açık: ana sayfa, giriş/kayıt formları, 404, korumalı sayfanın
  girişe yönlendirmesi.
- Hayvan sahibi: giriş, genel bakış, hayvan listesi ve detay, sağlık
  sekmeleri, belgenin blob olarak açılması, izinler, profil, sayfa
  yenilenince oturumun korunması, çıkış.
- Klinik: giriş, hasta arama, izinler, hasta detayı, AI taslakları, stokta
  Sat düğmesi (miktar kutusu 1, fiyatsız/stoksuz kalemde açıklama), satış
  penceresi, satış raporu ve geçmişi, klinik bilgileri, çıkış.
- Her adımda konsol hataları, 5xx yanıtlar ve başarısız istekler toplanır;
  biri bile varsa komut 1 ile çıkar.
- İstisna: belge dosyası isteği koparsa uygulama bir kez yeniden dener. Bu
  durumda adım geçer, kopan istek "Uyarı" başlığı altında listelenir ve
  çıkış kodunu etkilemez. İkinci deneme de koparsa adım başarısız olur.

Notlar:

- Gateway giriş/yenileme uçlarını IP başına sınırlar (varsayılan 60 sn'de
  10). Betik ilk açılıştan sonra sayfayı yeniden yüklemeden, uygulama
  içinden gezer; bir çalıştırma 4 giriş/yenileme isteği yapar. Arka arkaya
  çok çalıştırırsanız `429` alabilirsiniz, bir dakika bekleyin.
- Belge adımı, hesabın hayvanlarından birinde belge yoksa "atlandı" der.

## Elle yapılan denetimler

- **Erişilebilirlik:** Lighthouse (Chrome DevTools ya da chrome-devtools
  MCP `lighthouse_audit`) ve axe-core. Hem 390 px hem 1280 px genişlikte
  bakılmalı; sayfa hiçbir genişlikte yatay taşmamalı.
- **Performans:** `npm run build && npm run preview`, ardından DevTools
  performans kaydı (yavaş 4G + 4x CPU). 2026-10-18 ölçümü: LCP 2,85 sn,
  CLS 0.
- **PDF + CSP:** production build ile bir PDF belgeyi "Aç" ile açın; Chrome
  ve Firefox tabanlı tarayıcıda PDF görüntüleyicinin yüklendiğini görün.
- **Telefon:** `npm run dev:lan`; düz HTTP'de `Secure` çerez saklanmadığı
  için sayfa yenilenince oturum kapanır (beklenen davranış, bkz. README).
