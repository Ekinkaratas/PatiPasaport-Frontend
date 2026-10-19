# Mimari

Bu belge web istemcisinin nasıl kurulduğunu ve hangi kurallara göre
geliştirildiğini özetler. Çalıştırma ve kurulum için `README.md`, testler
için `docs/testing.md`, backend'e özgü davranışlar için
`docs/backend-notes.md`.

## Katmanlar

```
pages/  ──►  queries.ts (TanStack Query)  ──►  api/endpoints/*  ──►  api/client.ts  ──►  api/http.ts  ──►  /api (gateway)
   │                                                                     │
   └── components/ (ui, form, layout)                                    └── auth/session.ts (token, yenileme)
```

| Katman                | Görevi                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `api/http.ts`         | `fetch` sarmalayıcısı: `X-Client-Type: 1`, `x-correlation-id`, zaman aşımı, `BaseResponse` zarfını açma, JSON / FormData / blob.     |
| `api/client.ts`       | Yetkili istekler: erişim token'ını ekler, 401'de bir kez yeniler ve tekrar dener (`apiRequest`, `apiBlob`, `api.get/post/…`).        |
| `api/errors.ts`       | `ApiError` modeli; backend mesajını (`FIELD_RULE\|arg`) alan + kural + parametreye ayırır, iç içe DTO yol önekini (`content.`) atar. |
| `api/endpoints/*`     | Gateway uçlarının birebir karşılığı. Yol parametreleri `encodeURIComponent` ile, kimlikler UUID kontrolünden geçerek gönderilir.     |
| `auth/`               | Oturum durumu (`useSession`), açılışta yenileme, sekmeler arası senkron, korumalı sayfa kalkanları (`RequireAuth`, `GuestOnly`).     |
| `pages/**/queries.ts` | Sorgu anahtarları ve hook'lar. Liste sayfaları `keepPreviousData` kullanır; işlemdeki belgeler 15 sn'de bir yenilenir.               |
| `domain/`             | Backend'deki kod listeleri ve doğrulama kurallarının kopyası. Backend değişirse burası da güncellenir.                               |

Sorgu varsayılanları (`app/queryClient.ts`): 4xx tekrar denenmez, ağ hatası
ve 5xx en fazla 2 kez denenir, `staleTime` 30 sn, pencere odağında yenileme
kapalı.

## Yönlendirme ve kod bölme

- `app/router.tsx`: ana sayfa, giriş, kayıt, 404 ve hata sayfası ilk pakette.
  Hayvan sahibi (`/panel`) ve klinik (`/clinic`) sayfalarının tamamı
  `lazy` ile ayrı parçalara bölünür.
- Parça yüklenirken üstte ince bir ilerleme çubuğu görünür
  (`NavigationProgress`, `role="progressbar"`).
- Yeni sürüm yayınlandıktan sonra eski bir parça bulunamazsa
  (`isChunkLoadError`) hata sayfası "Uygulama güncellendi, sayfayı yenileyin"
  der.
- Ölçüm (production build): ilk yükte tek parça 732,6 kB (gzip 218,6 kB)
  iken bölmeden sonra ana sayfa için yüklenen JS yaklaşık 555 kB (gzip
  ~179 kB). Kalanın yarısı React DOM, geri kalanı i18next ve React Router.
  Yavaş 4G + 4x CPU yavaşlatmasıyla ana sayfa LCP 2,85 sn, CLS 0.

## Oturum

Ayrıntılar `README.md` → "Oturum". Kısaca: erişim token'ı yalnızca bellekte,
refresh token gateway'in `HttpOnly` çerezinde. Açılışta `POST /auth/refresh`
denenir; yenileme Web Locks ile sekmeler arasında tekilleştirilir. Çıkışta
kullanıcı ana sayfaya, süresi dolan oturumda giriş sayfasına (dönüş adresiyle
ve "Oturumunuz sona erdi" notuyla) gönderilir.

## Dosya açma / indirme

Belgeler (`GET /documents/:id/file`) `Authorization` başlığı gerektirdiği için
`<a href>` ile açılamaz:

1. Tıklamada boş bir sekme **eşzamanlı** açılır (açılır pencere engelleyicisi
   için), `opener` bağı kesilir.
2. Dosya `fetch` ile blob olarak alınır, `URL.createObjectURL` ile sekmeye
   yüklenir. İndirmede `?download=1` ve geçici bir `<a download>` kullanılır.
3. Bağlantı koparsa (istek hiç ulaşmaz ya da yanıt yarıda kesilir) dosya
   **bir kez** yeniden istenir. Zaman aşımı (60 sn) ve sunucu hataları
   tekrarlanmaz.
4. İkinci deneme de koparsa ya da blob boş gelirse `FILE_INTERCEPTED`
   gösterilir: Internet Download Manager gibi araçlar isteği yakalayıp
   tarayıcıya boş yanıt (`204`) verebilir.

`api/http.ts` yanıt gövdesi okunurken kopan bağlantıyı da `NETWORK_ERROR`
sayar; önceden bu durum "Beklenmeyen bir hata" olarak görünüyordu.

Production CSP'si (`object-src 'none'`, `img-src … blob:`) altında PDF'in
yeni sekmede açıldığı Chrome ve Zen (Firefox) ile doğrulandı (2026-10-18).

## Formlar ve doğrulama

- Her alan backend DTO kurallarıyla istemcide de doğrulanır
  (`domain/validation.ts`); sunucu hatası yine alana eşlenir.
- Tüm formlarda honeypot alanı, kayıt formunda ayrıca zaman tuzağı vardır
  (`security/`).
- Para tutarları kuruş cinsinden tamsayı olarak taşınır (`lib/money.ts`).
  İş saat dilimi `Europe/Istanbul`'dur (`domain/constants.ts`).

## Dil

- `i18next` tiplidir: `t('anahtar')` çağrısında olmayan bir anahtar derleme
  hatası verir.
- Dinamik anahtarlar için testler sırasında eksik anahtar dinleyicisi
  çalışır (`src/test/setup.ts`); bulunamayan anahtar testi düşürür.
- TR ve EN dosyalarının aynı anahtarlara sahip olduğu ayrıca test edilir.

## Görsel kurallar ve erişilebilirlik

- Renkler `styles/index.css` içindeki tema değişkenlerindendir (kayısı
  `brand`, krem, kakao, adaçayı, mercan).
- Beyaz yazının zemini en az `brand-700` / `coral-600` olmalıdır (WCAG AA
  4,5:1). `brand-500` yalnızca süs ve ikon için kullanılır. Odak çerçevesi
  `brand-700`.
- Yükleme göstergeleri `role="status"` + `aria-busy`, yana kayan tablolar
  odaklanabilir bölge (`TableScroll`) içindedir, sekmeler ok tuşlarıyla
  gezilir.
- Panel menüsü telefonda yatay kayar; seçili öğe otomatik görünür alana
  getirilir. Sayfa hiçbir genişlikte yatay taşmamalıdır (`minmax(0,1fr)`).
- Denetim (2026-10-18): axe ile 27 sayfa + sağlık sekmeleri, 390 px ve
  1280 px genişlikte ihlalsiz; Lighthouse erişilebilirlik puanı 100.

## Yayın

`Dockerfile` (Node ile build → nginx), `deploy/docker/default.conf.template`
(`/api/` → `${API_UPSTREAM}`, ad her istekte Docker DNS'iyle çözülür; SPA
yönlendirmesi, gzip, önbellek),
`deploy/security-headers.conf` (CSP, HSTS, `X-Robots-Tag`). Canlıda web
konteyneri backend'in Docker ağına katılır, gateway hiçbir porta açılmaz.
Kurulum adımları
`README.md` → "Sunucuya kurulum (Docker)".
