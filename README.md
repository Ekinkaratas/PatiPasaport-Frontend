# PatiPasaport — Web Sitesi

[EN](README_EN.md) | **TR**

PatiPasaport backend'inin (NestJS gateway) web istemcisi.
React + Vite + TypeScript + Tailwind CSS, Türkçe/İngilizce, açık ve koyu tema.

## Özellikler

- **Hayvan sahibi paneli (`/panel`):** hayvan ekleme ve düzenleme, kliniklere
  izin verme, düzenleme ve iptal (bitişine 15 gün ya da daha az kalan aktif
  izinlerde "Yakında bitiyor" rozeti), profil ve hesap kapatma.
- **Klinik paneli (`/clinic`):** klinik kodu ve QR, hasta arama ve hasta
  sayfası, alınan izinler, stok, satışlar ve aylık rapor, AI taslakları,
  klinik bilgileri.
- **Sağlık kayıtları (iki panelde ortak):** Muayene/Ameliyat, Aşılar,
  Reçeteler, Tahliller ve Belgeler sekmeleri. Kayıt listesi backend'de tek
  türe göre süzüldüğü için Muayene/Ameliyat sekmesinde tür seçilir. Klinik
  yalnızca hayvan sahibinin verdiği izin kapsamlarındaki sekmeleri görür.
- **Yapay zekâ (backend'deki AI servisiyle):**
  - Klinik belge yükler; AI kayıt taslağı çıkarır, klinik AI Taslakları
    sayfasında onaylar, düzeltir ya da reddeder. Güven puanı %50 ya da
    altındaysa taslak penceresinde uyarı çıkar.
  - Belge işlenemezse hata kodu (`NOT_A_MEDICAL_DOCUMENT` vb.) anlaşılır bir
    mesajla gösterilir; bilinmeyen kodlar olduğu gibi yazılır.
  - Tahlil kaydı kesinleşince backend hayvan sahibi için sade dilde bir
    açıklama üretir. Tahliller sekmesinde, kayda göre gruplanan sonuçların
    altında açıklama kendiliğinden gösterilmez; "Yapay zekâ yorumlasın"
    butonu çıkar. Butona basınca "veteriner hekim görüşünün yerine geçmez"
    yasal uyarısını içeren bir onay penceresi açılır; "Okudum, yorumu göster"
    seçilince yorum açık bir kutuda görünür (güven puanı ve aynı uyarıyla,
    okla kapatılabilir). Onay her tahlil için ayrı istenir ve sayfa
    yenilenince yeniden sorulur. Buton yapay zekâyı çalıştırmaz, hazır
    açıklamayı gösterir; açıklama hazırlanıyorsa 5 sn'de bir yeniden
    sorulur. Klinik bu ucu çağırmaz (`GET /records/:id/explanation` yalnızca
    sahibe açıktır); açıklaması olmayan eski kayıtlarda buton görünmez.

## Çalıştırma

Gereksinim: Node.js **24.22.1 veya üzeri (24.x)** (`package.json` içindeki
`engines` alanı). Docker imajı da `node:24.22.1-alpine` ile derlenir.

```bash
cp .env.example .env
npm install
npm run dev
```

`.env` içindeki değerleri doldurun (açıklamalar `.env.example`'da). Uygulama
yedek değer kullanmaz: zorunlu bir değişken eksikse `npm run dev`,
`npm run build`, `npm run e2e` ve `docker compose` hangi değişkenin eksik
olduğunu yazıp durur.

| Değişken                                              | Kullanan                   | Anlamı                                                             |
| ----------------------------------------------------- | -------------------------- | ------------------------------------------------------------------ |
| `API_PROXY_TARGET`                                    | Vite dev/preview proxy'si  | Gateway adresi (`http://localhost:3000`)                           |
| `VITE_API_BASE_URL`                                   | Uygulama (build'e gömülür) | API yolu, göreli kalmalı (`/api`)                                  |
| `VITE_CONTACT_EMAIL`                                  | Uygulama (build'e gömülür) | Sitede gösterilen iletişim adresi                                  |
| `SITE_URL`                                            | Build                      | `sitemap.xml` bu adresle üretilir                                  |
| `VITE_SOURCE_FRONTEND_URL`, `VITE_SOURCE_BACKEND_URL` | Uygulama (build'e gömülür) | Alt bilgideki GitHub bağlantıları; isteğe bağlı, boşsa gösterilmez |
| `API_UPSTREAM` vb.                                    | Docker compose             | Bkz. "Sunucuya kurulum"                                            |
| `E2E_*`                                               | `npm run e2e`              | Test adresi ve test hesapları                                      |

Site `http://localhost:5173` adresinde açılır. Backend gateway'inin
`API_PROXY_TARGET` adresinde çalışıyor olması gerekir. Backend sunucu
düzeninde (portsuz) çalışıyorsa geliştirme sunucusu ona ulaşamaz ve giriş
çalışmaz; ya backend'i `-f docker-compose.dev.yml` ekleyerek başlatın ya da
siteyi nginx'li web konteyneriyle (`http://localhost:8080`) çalıştırın; bkz.
"Sunucuya kurulum".

| Komut               | Ne yapar                                 |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Geliştirme sunucusu (`/api` proxy'li)    |
| `npm run dev:lan`   | Aynı sunucu, yerel ağa açık (telefon)    |
| `npm run build`     | Tip kontrolü + production build (`dist`) |
| `npm run preview`   | Build çıktısını yerelde sunar            |
| `npm test`          | Birim testleri (Vitest)                  |
| `npm run e2e`       | Tarayıcıda duman testi (backend gerekir) |
| `npm run lint`      | ESLint                                   |
| `npm run typecheck` | Sadece tip kontrolü                      |

Ayrıntılı belgeler `docs/` altında:

- `docs/architecture.md`: katmanlar, kod bölme, dosya açma akışı, görsel ve
  erişilebilirlik kuralları.
- `docs/testing.md`: birim testleri, `npm run e2e` kurulumu ve kapsamı, elle
  yapılan denetimler.
- `docs/backend-notes.md`: gateway'in istemciyi etkileyen davranışları
  (hız sınırı, sayfa boyutları, çerez, belgeler) ve açık öneriler.

## API bağlantısı

Gateway CORS açmadığı için tarayıcı API'ye **aynı origin** üzerinden gider:

- Geliştirmede Vite, `/api/*` isteklerini gateway'e aktarır ve `/api`
  önekini siler (`/api/auth/login` → `http://localhost:3000/auth/login`).
- Production'da aynı işi reverse proxy yapmalıdır, örnek nginx:

  ```nginx
  location /api/ {
      proxy_pass http://gateway:3000/;   # sondaki "/" öneki siler
  }
  location / {
      try_files $uri /index.html;        # SPA yönlendirmesi
  }
  ```

Her istekte `X-Client-Type: 1` (WEB) ve `x-correlation-id` başlıkları
gönderilir. Hata yanıtındaki `correlationId` kullanıcıya "Destek kodu" olarak
gösterilir.

## Telefondan / yerel ağdan erişim

```bash
npm run dev:lan        # = vite --host
```

Vite terminalde `Network: http://192.168.x.x:5173/` adresini yazar; telefon
bilgisayarla aynı Wi-Fi ağındaysa bu adresle açılır. Windows güvenlik
duvarı 5173 portuna izin vermelidir.

- `VITE_API_BASE_URL` **göreli** kalmalıdır (`/api`). Telefon isteği
  bilgisayardaki Vite'a gönderir, Vite de `API_PROXY_TARGET` ile gateway'e
  aktarır. `VITE_API_BASE_URL=http://localhost:3000` yazılırsa telefon kendi
  `localhost`'una gider ve istek bilgisayara hiç ulaşmaz.
- `API_PROXY_TARGET` bilgisayarın gözünden gateway adresidir;
  `http://localhost:3000` olarak kalabilir.
- `http://192.168.x.x` tarayıcı için "güvenli bağlam" değildir (HTTPS ya da
  `localhost` değil). Bazı tarayıcı API'leri bu durumda yoktur; uygulama
  bunlara bağımlı değildir (istek kimliği yedek yöntemle üretilir, panoya
  kopyalama sessizce devre dışı kalır).
- Backend refresh çerezini `Secure` işaretiyle gönderir; tarayıcılar bu
  çerezi HTTP üzerinden saklamaz. Bu yüzden düz HTTP ile ağdan girişte oturum
  açılır ama sayfa yenilenince ya da erişim token'ı (~15 dk) dolunca kapanır.
  Bu bilinen ve kabul edilmiş bir durumdur: yerel ağ yalnızca görünümü
  denemek içindir; oturum yenileme dahil telefon testleri HTTPS'teki canlı
  sitede yapılır.

## Sunucuya kurulum (Docker)

Canlı ortamda backend dışarıya tamamen kapalıdır. Tarayıcı yalnızca bu
sitenin adresine gider; `/api/*` isteklerini web konteynerindeki nginx,
Docker'ın iç ağı üzerinden gateway'e aktarır (`/api` öneki silinir).

```
Tarayıcı ──443──► TLS vekili ──127.0.0.1:8080──► web (nginx) ──iç ağ──► gateway:3000
```

Dışarıya açık tek port TLS vekilinin 443'üdür. Web konteyneri yalnızca
sunucunun kendisine (`127.0.0.1:8080`) açılır, gateway hiçbir porta açılmaz.

### Kurulum adımları

1. Backend'i port açmadan başlatın (`docker-compose.dev.yml` **kullanmadan**):

   ```bash
   docker compose -f docker-compose.yml up -d
   ```

2. Backend'in Docker ağının adını öğrenin. Ad `<backend-klasörü>_backend`
   biçimindedir (bu makinede `patipasaport_backend`):

   ```bash
   docker network ls
   ```

3. Bu projenin klasöründe `.env` dosyasını oluşturup doldurun
   (`cp .env.example .env`). Ağ adı farklıysa `BACKEND_NETWORK` değerini
   ona göre yazın. Ardından web konteynerini derleyip başlatın:

   ```bash
   docker compose --env-file .env -f deploy/docker/docker-compose.yml up -d --build
   ```

   Konteyner açık kaldığı sürece site, bu komutu çalıştırdığınız makinede
   `http://localhost:8080` (`WEB_BIND` ve `WEB_PORT` değerleri) adresinden
   erişilebilir. `WEB_BIND=127.0.0.1` olduğu için bu adres yalnızca o
   makinenin kendisine açıktır; dışarıdan erişim 4. adımdaki TLS vekili
   üzerinden olur. Konteyneri durdurmak için aynı komutta `up -d --build`
   yerine `down` yazın.

   İmaj kaynak koddan derlenir; önceden `npm run build` çalıştırmak ya da
   `dist/` yüklemek gerekmez. `.env` imaja kopyalanmaz, derlemeye yalnızca
   `VITE_API_BASE_URL`, `VITE_CONTACT_EMAIL` ve `SITE_URL` aktarılır.

4. Sunucudaki TLS vekilini (nginx, Caddy, Traefik vb.) alan adınızdan
   `http://127.0.0.1:8080`'e yönlendirin. Örnek nginx:

   ```nginx
   server {
       listen 443 ssl http2;
       server_name patipasaport.live;
       ssl_certificate     /etc/letsencrypt/live/patipasaport.live/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/patipasaport.live/privkey.pem;
       client_max_body_size 12m;
       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto https;
       }
   }
   ```

5. Backend `.env` dosyasında gateway için `TRUST_PROXY=2` ayarlayın (önünde
   TLS vekili ve bu nginx olmak üzere iki vekil var). Yapılmazsa hız sınırı
   tüm kullanıcıları tek IP sayar; giriş sınırı (dakikada 10) herkes için
   ortak dolar. Diğer iki değişken **boş kalmalıdır**:

   - `CORS_ORIGINS=` boş: tarayıcı API'ye site ile aynı adresten
     (`https://alanadiniz/api/...`) gider ve isteği nginx gateway'e aktarır;
     aynı adres olduğu için CORS gerekmez. Boş değer "başka hiçbir adrese
     izin verme" demektir. Yalnızca API'ye başka bir alan adından
     erişilecekse doldurulur (`https://app.example.com` biçiminde, sonunda
     `/` olmadan, birden fazlaysa virgülle).
   - `REFRESH_COOKIE_PATH=` boş: varsayılan `/api/auth` kullanılır; refresh
     çerezi yalnızca `/api/auth/...` isteklerinde gönderilir. Yalnızca API
     `/api` dışında bir yolda sunuluyorsa o yol yazılır.

### Ayarlar (`.env` → `deploy/docker/docker-compose.yml`)

Hepsi zorunludur; tabloda önerilen değerler var.

| Değişken          | Önerilen               | Anlamı                                       |
| ----------------- | ---------------------- | -------------------------------------------- |
| `BACKEND_NETWORK` | `patipasaport_backend` | Backend'in Docker ağı (dışarıdan katılınır)  |
| `API_UPSTREAM`    | `http://gateway:3000`  | Gateway'in iç ağdaki adresi, sonunda `/` yok |
| `WEB_BIND`        | `127.0.0.1`            | Web konteynerinin dinlediği sunucu adresi    |
| `WEB_PORT`        | `8080`                 | TLS vekilinin bağlanacağı port               |

### Notlar

- nginx, gateway adını her istekte Docker DNS'i (`127.0.0.11`) ile çözer.
  Gateway yeniden başlayıp IP'si değişse de web konteynerini yeniden
  başlatmak gerekmez. Gateway kapalıyken site açılır, yalnızca API istekleri
  502 döner.
- Site **HTTPS** üzerinden sunulmalıdır: refresh çerezi `Secure` olduğu için
  düz HTTP'de oturum sayfa yenilenince kapanır.
- Arama motorları `robots.txt` ve `X-Robots-Tag: noindex` ile engellenir.
  Bu bir erişim kısıtı değildir; adresi bilen herkes siteye girebilir.
- `sitemap.xml` build sırasında `SITE_URL` adresiyle üretilir ve herkese
  açık sayfaları (`/`, `/register`, `/login`) listeler; şu an arama
  motorlarına bildirilmez. İndekslemeyi açmak için: `public/robots.txt`
  içinde `Disallow: /` yerine `/panel`, `/clinic`, `/api` engellenip
  `Sitemap: <SITE_URL>/sitemap.xml` satırı eklenir ve
  `deploy/security-headers.conf` içindeki `X-Robots-Tag` satırı kaldırılır.
- `public/manifest.json` siteyi telefonda "Ana ekrana ekle" ile uygulama
  gibi açılabilir yapar (ad, renkler, simge).
- Güncelleme: yeni kodu çekin ve 3. adımdaki komutu tekrar çalıştırın.
- Yapılandırma dosyaları: `Dockerfile`, `deploy/docker/default.conf.template`,
  `deploy/security-headers.conf`, `deploy/docker/docker-compose.yml`.

## Oturum

- Erişim token'ı (opaque, ~15 dk) yalnızca bellekte tutulur.
- Refresh token'ı gateway `pp_refresh` adlı `HttpOnly; Secure; SameSite=Strict;
Path=/api/auth` çerezinde tutar. JavaScript bu token'ı hiç görmez; web
  yanıtlarında `refreshToken` alanı yoktur, yalnızca `refreshExpiresIn` gelir.
  "Beni hatırla" yalnızca backend'deki oturum süresini belirler
  (12 saat / 30 gün).
- Açılışta doğrudan `POST /api/auth/refresh` denenir (gövde boş, çerez
  tarayıcı tarafından gönderilir). 401 oturum yok demektir; ağ hatasında
  "sunucuya ulaşılamadı" ekranı gösterilir. Eski sürümden kalan
  `pp.refreshToken` kaydı açılışta bir kez silinir.
- Backend refresh token rotation'da aynı token'ın tekrar kullanımını hırsızlık
  sayıp oturum ailesini kapattığı için yenileme hem sekme içinde (tek uçuş)
  hem sekmeler arasında (Web Locks API) tekilleştirilir.
- Bir sekmede giriş ya da çıkış yapılınca diğer sekmeler `localStorage`
  üzerinden (`pp.auth.event`, token içermez) haberdar olur.
- `Secure` çerez `http://localhost` üzerinde Chrome, Edge ve Firefox'ta
  çalışır; geliştirme için bu tarayıcılardan biri kullanılmalıdır. Production
  ortamı HTTPS olmalıdır.

## Dil

Açılışta: kullanıcı daha önce dil seçtiyse o; seçmediyse tarayıcının birincil
dili Türkçe ise Türkçe, diğer tüm durumlarda İngilizce. Seçim
`localStorage`'da (`pp.language`) saklanır.

Çeviriler `src/i18n/locales/{tr,en}/` altındadır. Backend hata kodları
(`EMAIL_ALREADY_EXISTS`, `PASSWORD_MIN_LENGTH|8` ...) `errors.json` ile,
tür/cins/stok/izin kodları `enums.json` ile çevrilir. Testler iki dilin aynı
anahtarlara sahip olduğunu, backend kod listelerinin eksiksiz çevrildiğini ve
kodda kullanılıp çeviri dosyasında olmayan anahtar kalmadığını denetler.

## Tema ve tasarım

- Tasarım dili "Koyu Premium": lacivert zemin, kehribar vurgu, Plus Jakarta
  Sans yazı tipi (siteyle birlikte sunulur, dış bağlantı yok).
- Üst menüde Açık/Koyu seçici vardır. Seçim `localStorage`'da (`pp.theme`)
  saklanır; kayıt yoksa ya da geçersizse site **koyu** açılır. Cihazın teması
  bilinçli olarak izlenmez. Başka sekmedeki değişiklik anında uygulanır.
- `public/theme-init.js` temayı sayfa çizilmeden önce uygular (yanlış temada
  yanıp sönme olmaz). CSP satır içi script'e izin vermediği için ayrı
  dosyadır.
- Renkler yalnızca `src/styles/index.css` içindeki anlamsal değişkenlerden
  gelir (`--pp-bg`, `--pp-surface`, `--pp-fg`, `--pp-accent` ...; Tailwind'de
  `bg-surface`, `text-fg`, `text-accent-fg` gibi). Koyu değerler `:root`,
  açık değerler `[data-theme='light']` altındadır; bileşenlerde ham renk kodu
  kullanılmaz. Eski renk adlarını (`cocoa`, `cream`, `brand` ...) yeni
  değişkenlere bağlayan geçici bir uyumluluk katmanı da aynı dosyadadır.
- Erişilebilirlik hedefi WCAG AA: metin kontrastı iki temada en az 4,5:1,
  dokunma hedefleri en az 44 px, görünür klavye odağı, durum yalnızca renkle
  anlatılmaz.

## Klasör yapısı

```
src/
  api/          HTTP katmanı, hata modeli, gateway uçları
  auth/         Oturum durumu, token yenileme, depolama
  app/          Uygulama kabuğu: router (sayfa parçaları lazy), React Query
  components/   Ortak bileşenler (ui/, form/, layout/)
  config/       Site sabitleri (iletişim adresi vb.)
  domain/       Backend ile birebir aynı tutulan kod listeleri ve kurallar
  i18n/         Dil altyapısı ve çeviriler
  legal/        KVKK aydınlatma metni
  lib/          Biçimlendirme, para, tarih, tema, dosya açma yardımcıları
  pages/        Sayfalar: auth/, panel/ (hayvan sahibi), clinic/ (klinik),
                health/ (iki tarafın ortak sağlık kayıtları bölümü)
  security/     Honeypot ve bot kalkanı
  styles/       Tailwind teması
  test/         Test kurulumu ve API taklitleri
public/         theme-init.js, manifest, simgeler, robots.txt
scripts/        e2e.mjs (duman testi)
deploy/         nginx yapılandırması, güvenlik başlıkları, Docker dosyaları
docs/           Mimari, test ve backend notları
```

`src/domain/constants.ts` backend'deki `libs/common` listelerinin kopyasıdır;
backend'de bir liste değişirse burası da güncellenmelidir.

## Güvenlik

| Konu             | Önlem                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XSS              | Tüm içerik, AI'ın ürettiği metinler dahil, React ile düz metin olarak çizilir; `dangerouslySetInnerHTML`, `innerHTML`, `eval` kullanılmaz. Production build'de CSP (`script-src 'self'`, satır içi script yok) devrededir.   |
| Clickjacking     | `X-Frame-Options: DENY` ve CSP `frame-ancestors 'none'` (HTTP başlığı olarak).                                                                                                                                               |
| Bot / spam       | Tüm formlarda gizli honeypot alanı; kayıt formunda ayrıca 3 sn'den hızlı gönderimi engelleyen zaman tuzağı. Bunlar yalnızca basit botları durdurur; asıl koruma sunucu tarafında olmalıdır.                                  |
| SQL injection    | İstemci SQL üretmez. Backend Prisma ve parametreli `$queryRaw`/`$executeRaw` kullanır. İstemci ayrıca tüm alanları backend DTO kurallarıyla doğrular, yol parametrelerini `encodeURIComponent` ve UUID kontrolüyle gönderir. |
| CSRF             | API çağrıları `Authorization` başlığıyla yapılır. Çerez yalnızca `/api/auth` yolunda ve `SameSite=Strict` ile gönderildiğinden başka sitelerden refresh/logout tetiklenemez.                                                 |
| Açık yönlendirme | `?next=` yalnızca site içi yolları kabul eder.                                                                                                                                                                               |
| Oturum           | Erişim token'ı bellekte; refresh token `HttpOnly` çerezde (JavaScript erişemez). Sekmeler arası tek yenileme ile giriş/çıkış senkronu.                                                                                       |
| Başlıklar        | `nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS (nginx).                                                                                                                 |
| Dosyalar         | Belgeler yetkili `fetch` ile blob olarak açılır; CSP `object-src 'none'` iken PDF'in Chrome ve Zen'de açıldığı doğrulandı.                                                                                                   |
| Bağımlılıklar    | `npm audit`: 0 açık (2026-10-18). Test hesapları `.env` içinde `VITE_` öneksiz tutulur, build çıktısına girmez; `.env` Docker imajına kopyalanmaz.                                                                           |

Geliştirme sunucusunda CSP uygulanmaz (Vite HMR satır içi script kullanır); `npm run build && npm run preview` production başlıklarıyla çalışır. Örnek sunucu yapılandırması: `deploy/nginx.conf` ve `deploy/security-headers.conf` (`/etc/nginx/snippets/` altına kopyalanır).
