# Backend notları

Web istemcisini etkileyen gateway davranışları. Backend deposu
(`C:\Users\PC\Desktop\patipasaport`) bu projeden yalnızca okunur;
aşağıdaki öneriler backend tarafında yapılmalıdır. Son kontrol: 2026-10-18.

## Bağlantı

- Gateway'de global önek yok: tarayıcı `/api/auth/login` ister, Vite proxy'si
  ya da nginx `/api` önekini silip `/auth/login` olarak iletir.
- Gateway artık `CORS_ORIGINS` ile CORS açabiliyor, ama site aynı origin
  üzerinden çalıştığı için gerek yok; `VITE_API_BASE_URL=/api` göreli kalır.
- Canlıda gateway dışarıya kapalıdır; web konteyneri backend'in Docker
  ağına (`patipasaport_backend`) katılıp `http://gateway:3000` adresine gider
  (bkz. README → "Sunucuya kurulum").
- Docker'da gateway portu yalnızca `docker-compose.dev.yml` ile dışarı açılır
  (`${GATEWAY_PORT:-3000}:3000`). Sadece `docker-compose.yml` ile başlatılırsa
  `localhost:3000` kapalı kalır ve site her isteğe 502 döner:

  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
  ```

## İstek ve yanıt biçimi

- Her istekte `X-Client-Type: 1` (WEB) gönderilmelidir; yoksa
  `400 INVALID_CLIENT_TYPE`.
- `x-correlation-id` istemcide üretilir; hata yanıtındaki `correlationId`
  kullanıcıya "Destek kodu" olarak gösterilir.
- Yanıt zarfı: `{ data, message, success, correlationId }`. `GET /health`
  zarfsızdır.
- Doğrulama hataları `ALAN_KURAL|parametre` biçimindedir
  (`PASSWORD_MIN_LENGTH|8`). İç içe DTO hatalarında backend yol önekini
  artık siliyor; istemci de güvenlik için `content.` gibi önekleri atar.
- Sayfa boyutu yalnızca `8, 16, 32, 64, 128` olabilir; başka değer
  `PAGE_SIZE_NOT_VALID` döner (`domain/constants.ts` → `PAGE_SIZES`).
- Para tutarları kuruş cinsinden tamsayıdır. Boş ya da `null` fiyat
  `*_PRICE_MUST_BE_NUMBER` döner; istemci bunları hiç göndermez.

## Oturum

- Giriş/kayıt/yenileme yanıtı: `accessToken`, `tokenType`, `expiresIn`,
  `refreshExpiresIn`, `userId`, `clinicId` (hayvan sahibinde boş metin).
  Web yanıtında `refreshToken` yoktur.
- Refresh token `pp_refresh` çerezindedir: `HttpOnly; Secure;
SameSite=Strict; Path=/api/auth` (yol `REFRESH_COOKIE_PATH` ile
  değiştirilebilir; site `/api` dışında bir önekle yayınlanırsa buna uyulmalı).
- Refresh token rotation'da aynı token tekrar kullanılırsa oturum ailesi
  kapatılır; bu yüzden istemci yenilemeyi sekmeler arasında tekilleştirir.
- `GET /users/me` yalnızca hayvan sahibi içindir (klinikte 403). Klinik
  kimliği token yanıtındaki `clinicId`'den gelir.

## Hız sınırı

| Grup    | Varsayılan (60 sn'de) | Uçlar                          | Ortam değişkeni     |
| ------- | --------------------- | ------------------------------ | ------------------- |
| Genel   | 100                   | Tüm istekler                   | `RATE_LIMIT_GLOBAL` |
| Giriş   | 10                    | `login`, `register`, `refresh` | `RATE_LIMIT_AUTH`   |
| Yükleme | 20                    | Belge yükleme                  | `RATE_LIMIT_UPLOAD` |

- Sınır istemci IP'sine göre tutulur. Gateway bir vekilin arkasındaysa
  `TRUST_PROXY` ayarlanmazsa bütün kullanıcılar vekilin tek IP'sini paylaşır
  ve hep birlikte aynı sınıra takılır.
- Bu projenin nginx imajı `X-Forwarded-For` gönderir. Yayında gateway için
  `TRUST_PROXY`, gateway'in önündeki vekil sayısı olmalıdır: yalnızca bu
  nginx varsa `1`, önünde ayrıca TLS sonlandıran bir vekil varsa `2`.
- Geliştirmede Vite proxy'si `X-Forwarded-For` göndermez; tüm sekmeler ve
  E2E testi tek kova paylaşır. Her tam sayfa yüklemesi bir `refresh`
  isteğidir.
- Oturum açmamış ziyaretçide açılıştaki `refresh` isteği `401` döner ve
  tarayıcı bunu konsola kırmızı satır olarak yazar. Zararsızdır; istenirse
  çerez hiç yokken `204` dönülerek konsol temiz tutulabilir (öneri).

## Belgeler ve AI taslakları

- `GET /pets/:petId/documents` (`page`, `pageSize`, `status`),
  `GET /documents/:id`, `GET /documents/:id/file` (`?download=1` ile
  indirme). Dosya ucu `Authorization` ister; istemci blob olarak indirir.
- Hayvan sahibi tüm kliniklerin belgelerini, klinik yalnızca kendi
  yüklediklerini görür (klinikte `medical_write` izni gerekir).
- AI servisi çalışmıyorsa belgeler `QUEUED` durumunda kalır ve taslak
  oluşmaz; arayüz bunu "sırada" olarak gösterir.
- Internet Download Manager'ın tarayıcı entegrasyonu dosya isteğini yakalayıp
  sayfaya boş `204` verebilir; istemci bunu `FILE_INTERCEPTED` olarak
  açıklar. Çözüm: IDM'de "Gelişmiş tarayıcı entegrasyonu"nu kapatmak ya da
  siteyi istisnaya eklemek.
- **İncelenen sorun (2026-10-18):** Chrome'da E2E sırasında Duman'ın
  123 kB'lık PDF'i (`642d3ca9-…`) aralıklı olarak `ERR_INVALID_HTTP_RESPONSE`
  ya da `ERR_CONTENT_LENGTH_MISMATCH` ile kesildi. Bu hem Vite dev (5173)
  hem preview (4173) proxy'sinde oldu; 193 B'lık PDF'te hiç olmadı. Gateway
  dosyayı tam uzunlukta bir `Buffer` olarak gönderiyor; Python ile 70'ten
  fazla indirmede (proxy'li ve proxy'siz) kesinti olmadı. Doğrudan gateway'e
  bağlantı birkaç saniye boşta kaldıktan sonra 2 kez `ConnectionAborted`
  görüldü (Docker port yönlendirmesi + keep-alive şüphesi). İstemci artık
  kopan dosya isteğini bir kez tekrarlıyor.
- **Güncelleme (2026-10-19):** Aynı sorun canlı kurulum düzeninde (web
  konteyneri + portsuz gateway) de görüldü: 12 açılışta 3 istek koptu,
  hepsi tekrar denemeyle açıldı. nginx günlüğünde 16 isteğin tamamı
  `200` ve tam `123467` bayt; yani gateway ve nginx dosyayı eksiksiz
  gönderiyor, bozulma tarayıcıya giden yolda. Geliştirme makinesinde
  IDM'in ağ sürücüsü `idmwfp` (Windows Filtering Platform) çalışıyor;
  IDM uygulaması kapalıyken bile tarayıcı trafiğine girip PDF gibi dosya
  türlerini yakalamaya çalışıyor. Python'da hiç görülmemesi ve yalnızca
  tarayıcıda görülmesi bununla uyumlu. Olası neden backend değil, bu
  sürücü.

## Klinik stok ve satış

- Stok: `stock-items` CRUD, `POST …/adjust` (`delta`, satış dışı hareketler).
  Kategori ve birim sonradan değişmez; fiyat bir kez girildikten sonra
  silinemez.
- Satış: `stock-sales` oluşturma/listeleme, aylık özet
  (`stock-sales/summary?month=YYYY-MM`, İstanbul saatine göre). İptal yalnızca
  satışın yapıldığı ay içinde mümkündür; iptal edilen satış kaydı silinmez.

## Açık öneriler

- Kayıt formu için sunucu tarafında CAPTCHA ya da benzeri bot koruması
  (istemcideki honeypot yalnızca basit botları durdurur).
- Hayvan sahibi hesabını kapatınca verdiği izinler iptal edilmiyor; süreleri
  dolana kadar geçerli kalıyor (bilinen ve kabul edilmiş davranış).
- Kimliği doğrulanmamış `refresh` için `401` yerine `204` (yukarıda).
