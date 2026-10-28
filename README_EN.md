# PatiPasaport — Website

**EN** | [TR](README.md)

Web client for the PatiPasaport backend (NestJS gateway).
React + Vite + TypeScript + Tailwind CSS, Turkish/English, light and dark
themes.

Detailed documentation under `docs/` is in Turkish.

## Features

- **Pet owner panel (`/panel`):** add and edit pets, grant, edit and revoke
  clinic permissions (active permissions ending in 15 days or less get an
  "Ending soon" badge), profile and account closure.
- **Clinic panel (`/clinic`):** clinic code and QR, patient search and
  patient page, received permissions, stock, sales and monthly report, AI
  drafts, clinic details.
- **Health records (shared by both panels):** Exams/Surgeries,
  Vaccinations, Prescriptions, Lab results and Documents tabs. The backend
  filters the record list by a single type, so the Exams/Surgeries tab has a
  type selector. A clinic only sees the tabs covered by the scopes the pet
  owner granted.
- **AI (with the backend's AI service):**
  - A clinic uploads a document; the AI extracts a record draft, and the
    clinic approves, edits or rejects it on the AI drafts page. If the
    confidence score is 50% or lower, the draft dialog shows a warning.
  - If a document cannot be processed, the error code
    (`NOT_A_MEDICAL_DOCUMENT` etc.) is shown as a plain-language message;
    unknown codes are shown as they are.
  - When a lab result record is finalised, the backend generates a
    plain-language explanation for the pet owner. On the Lab results tab,
    under the results grouped by record, the explanation is not shown on its
    own; a "Get an AI explanation" button appears instead. Pressing it opens
    a confirmation dialog with the "does not replace your veterinarian's
    opinion" legal notice; after "I understand, show it" the explanation
    appears in an expanded box (with a confidence score and the same notice,
    collapsible with the arrow). Consent is asked for each lab result
    separately and again after a page reload. The button does not run the
    AI; it shows the explanation that is already prepared, and while it is
    being prepared it is polled every 5 s. Clinics never call this endpoint
    (`GET /records/:id/explanation` is open to the owner only); the button is
    hidden for older records without an explanation.

## Running

```bash
cp .env.example .env
npm install
npm run dev
```

Fill in the values in `.env` (descriptions are in `.env.example`). The app
uses no fallback values: if a required variable is missing, `npm run dev`,
`npm run build`, `npm run e2e` and `docker compose` print which variable is
missing and stop.

| Variable                                              | Used by                     | Meaning                                                 |
| ----------------------------------------------------- | --------------------------- | ------------------------------------------------------- |
| `API_PROXY_TARGET`                                    | Vite dev/preview proxy      | Gateway address (`http://localhost:3000`)               |
| `VITE_API_BASE_URL`                                   | App (embedded in the build) | API path, must stay relative (`/api`)                   |
| `VITE_CONTACT_EMAIL`                                  | App (embedded in the build) | Contact address shown on the site                       |
| `SITE_URL`                                            | Build                       | `sitemap.xml` is generated with this address            |
| `VITE_SOURCE_FRONTEND_URL`, `VITE_SOURCE_BACKEND_URL` | App (embedded in the build) | GitHub links in the footer; optional, hidden when empty |
| `API_UPSTREAM` etc.                                   | Docker compose              | See "Server deployment"                                 |
| `E2E_*`                                               | `npm run e2e`               | Test address and test accounts                          |

The site opens at `http://localhost:5173`. The backend gateway must be
running at `API_PROXY_TARGET`. If the backend runs in the server layout
(no published ports), the dev server cannot reach it and login does not
work; either start the backend with `-f docker-compose.dev.yml` added, or run
the site with the nginx web container (`http://localhost:8080`); see "Server
deployment".

| Command             | What it does                           |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Dev server (with the `/api` proxy)     |
| `npm run dev:lan`   | Same server, open to the local network |
| `npm run build`     | Type check + production build (`dist`) |
| `npm run preview`   | Serves the build output locally        |
| `npm test`          | Unit tests (Vitest)                    |
| `npm run e2e`       | Browser smoke test (needs the backend) |
| `npm run lint`      | ESLint                                 |
| `npm run typecheck` | Type check only                        |

Detailed documents under `docs/` (in Turkish):

- `docs/architecture.md`: layers, code splitting, file opening flow, visual
  and accessibility rules.
- `docs/testing.md`: unit tests, `npm run e2e` setup and coverage, manual
  checks.
- `docs/backend-notes.md`: gateway behaviour that affects the client (rate
  limiting, page sizes, cookie, documents) and open suggestions.

## API connection

The gateway does not enable CORS, so the browser reaches the API from the
**same origin**:

- In development, Vite forwards `/api/*` requests to the gateway and strips
  the `/api` prefix (`/api/auth/login` → `http://localhost:3000/auth/login`).
- In production, a reverse proxy must do the same. Example nginx:

  ```nginx
  location /api/ {
      proxy_pass http://gateway:3000/;   # the trailing "/" strips the prefix
  }
  location / {
      try_files $uri /index.html;        # SPA routing
  }
  ```

Every request sends the `X-Client-Type: 1` (WEB) and `x-correlation-id`
headers. The `correlationId` in an error response is shown to the user as a
"Support code".

## Access from a phone / the local network

```bash
npm run dev:lan        # = vite --host
```

Vite prints `Network: http://192.168.x.x:5173/` in the terminal; a phone on
the same Wi-Fi network as the computer opens the site at that address. The
Windows firewall must allow port 5173.

- `VITE_API_BASE_URL` must stay **relative** (`/api`). The phone sends its
  requests to Vite on the computer, and Vite forwards them to the gateway
  through `API_PROXY_TARGET`. With `VITE_API_BASE_URL=http://localhost:3000`
  the phone would call its own `localhost` and the request would never reach
  the computer.
- `API_PROXY_TARGET` is the gateway address as seen from the computer; it
  can stay `http://localhost:3000`.
- `http://192.168.x.x` is not a "secure context" for the browser (it is
  neither HTTPS nor `localhost`). Some browser APIs are unavailable there;
  the app does not depend on them (the request ID uses a fallback method,
  copying to the clipboard is silently disabled).
- The backend sends the refresh cookie with the `Secure` flag; browsers do
  not store it over HTTP. So when you sign in over plain HTTP on the local
  network, the session opens but ends when the page is reloaded or the
  access token (~15 min) expires. This is a known and accepted limitation:
  the local network is only for checking the layout; phone tests, including
  session renewal, are done on the live HTTPS site.

## Server deployment (Docker)

In production the backend is fully closed to the outside. The browser only
talks to this site's address; nginx in the web container forwards `/api/*`
requests to the gateway over Docker's internal network (the `/api` prefix is
stripped).

```
Browser ──443──► TLS proxy ──127.0.0.1:8080──► web (nginx) ──internal network──► gateway:3000
```

The only port open to the outside is the TLS proxy's 443. The web container
is only exposed to the server itself (`127.0.0.1:8080`); the gateway is not
exposed on any port.

### Deployment steps

1. Start the backend without publishing ports (**without**
   `docker-compose.dev.yml`):

   ```bash
   docker compose -f docker-compose.yml up -d
   ```

2. Find the name of the backend's Docker network. It has the form
   `<backend-folder>_backend` (on this machine `patipasaport_backend`):

   ```bash
   docker network ls
   ```

3. In this project's folder, create and fill in `.env`
   (`cp .env.example .env`). If the network name is different, set
   `BACKEND_NETWORK` accordingly. Then build and start the web container:

   ```bash
   docker compose --env-file .env -f deploy/docker/docker-compose.yml up -d --build
   ```

   As long as the container is running, the site is available on the machine
   where you ran this command at `http://localhost:8080` (the `WEB_BIND` and
   `WEB_PORT` values). Because `WEB_BIND=127.0.0.1`, this address is only open
   to that machine itself; access from the outside goes through the TLS proxy
   from step 4. To stop the container, run the same command with `down`
   instead of `up -d --build`.

   The image is built from source; there is no need to run `npm run build`
   or upload `dist/` beforehand. `.env` is not copied into the image; only
   `VITE_API_BASE_URL`, `VITE_CONTACT_EMAIL` and `SITE_URL` are passed to
   the build.

4. Point the server's TLS proxy (nginx, Caddy, Traefik etc.) from your
   domain to `http://127.0.0.1:8080`. Example nginx:

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

5. Set `TRUST_PROXY=2` for the gateway in the backend's `.env` (there are
   two proxies in front of it: the TLS proxy and this nginx). Otherwise the
   rate limiter treats all users as one IP, and the login limit (10 per
   minute) fills up for everyone at once. The other two variables **must stay empty**:

   - `CORS_ORIGINS=` empty: the browser reaches the API from the same
     address as the site (`https://yourdomain/api/...`) and nginx forwards the
     request to the gateway; since it is the same address, CORS is not needed.
     An empty value means "allow no other origin". Fill it in only if the API
     will be reached from another domain (in the form
     `https://app.example.com`, with no trailing `/`, comma-separated if there
     are several).
   - `REFRESH_COOKIE_PATH=` empty: the default `/api/auth` is used; the
     refresh cookie is only sent on `/api/auth/...` requests. Set it only if
     the API is served under a path other than `/api`.

### Settings (`.env` → `deploy/docker/docker-compose.yml`)

All of them are required; the table shows the recommended values.

| Variable          | Recommended            | Meaning                                                  |
| ----------------- | ---------------------- | -------------------------------------------------------- |
| `BACKEND_NETWORK` | `patipasaport_backend` | The backend's Docker network (joined as external)        |
| `API_UPSTREAM`    | `http://gateway:3000`  | Gateway address on the internal network, no trailing `/` |
| `WEB_BIND`        | `127.0.0.1`            | Server address the web container listens on              |
| `WEB_PORT`        | `8080`                 | Port the TLS proxy connects to                           |

### Notes

- nginx resolves the gateway name with Docker DNS (`127.0.0.11`) on every
  request. If the gateway restarts and its IP changes, the web container
  does not need a restart. While the gateway is down the site still loads;
  only API requests return 502.
- The site must be served over **HTTPS**: the refresh cookie is `Secure`, so
  over plain HTTP the session ends when the page is reloaded.
- Search engines are blocked with `robots.txt` and `X-Robots-Tag: noindex`.
  This is not access control; anyone who knows the address can open the
  site.
- `sitemap.xml` is generated at build time with `SITE_URL` and lists the
  public pages (`/`, `/register`, `/login`); it is currently not submitted
  to search engines. To enable indexing: in `public/robots.txt`, replace
  `Disallow: /` with rules blocking `/panel`, `/clinic` and `/api`, add a
  `Sitemap: <SITE_URL>/sitemap.xml` line, and remove the `X-Robots-Tag` line
  from `deploy/security-headers.conf`.
- `public/manifest.json` lets the site be opened like an app from a phone's
  "Add to Home Screen" (name, colours, icon).
- Updating: pull the new code and run the command from step 3 again.
- Configuration files: `Dockerfile`, `deploy/docker/default.conf.template`,
  `deploy/security-headers.conf`, `deploy/docker/docker-compose.yml`.

## Session

- The access token (opaque, ~15 min) is kept in memory only.
- The gateway keeps the refresh token in a cookie named `pp_refresh`
  (`HttpOnly; Secure; SameSite=Strict; Path=/api/auth`). JavaScript never
  sees this token; web responses have no `refreshToken` field, only
  `refreshExpiresIn`. "Remember me" only sets the session length on the
  backend (12 hours / 30 days).
- On startup `POST /api/auth/refresh` is tried directly (empty body; the
  browser sends the cookie). A 401 means there is no session; on a network
  error a "Can't reach the server" screen is shown. A `pp.refreshToken`
  entry left by an older version is removed once on startup.
- The backend treats reuse of the same refresh token during rotation as
  theft and closes the session family, so renewal is deduplicated both
  within a tab (single flight) and across tabs (Web Locks API).
- When a tab signs in or out, the other tabs are notified through
  `localStorage` (`pp.auth.event`, which holds no token).
- A `Secure` cookie works on `http://localhost` in Chrome, Edge and Firefox;
  use one of these browsers for development. Production must use HTTPS.

## Language

On startup: the language the user chose before, if any; otherwise Turkish
if the browser's primary language is Turkish, and English in every other
case. The choice is stored in `localStorage` (`pp.language`).

Translations live under `src/i18n/locales/{tr,en}/`. Backend error codes
(`EMAIL_ALREADY_EXISTS`, `PASSWORD_MIN_LENGTH|8` ...) are translated through
`errors.json`, and species/breed/stock/permission codes through
`enums.json`. Tests check that both languages have the same keys, that the
backend code lists are fully translated, and that no key used in the code
is missing from the translation files.

## Theme and design

- Design language "Dark Premium": navy background, amber accent, Plus
  Jakarta Sans font (served with the site, no external requests).
- The top menu has a Light/Dark switch. The choice is stored in
  `localStorage` (`pp.theme`); if there is no entry or it is invalid, the
  site opens **dark**. The device theme is deliberately not followed.
  Changes in another tab are applied immediately.
- `public/theme-init.js` applies the theme before the page is painted (no
  flash of the wrong theme). It is a separate file because the CSP does not
  allow inline scripts.
- Colours come only from the semantic variables in `src/styles/index.css`
  (`--pp-bg`, `--pp-surface`, `--pp-fg`, `--pp-accent` ...; in Tailwind
  `bg-surface`, `text-fg`, `text-accent-fg` and so on). Dark values are under
  `:root`, light values under `[data-theme='light']`; components use no raw
  colour codes. The same file also holds a temporary compatibility layer that
  maps the old colour names (`cocoa`, `cream`, `brand` ...) to the new
  variables.
- The accessibility target is WCAG AA: text contrast of at least 4.5:1 in
  both themes, touch targets of at least 44 px, visible keyboard focus, and
  status is never conveyed by colour alone.

## Folder structure

```
src/
  api/          HTTP layer, error model, gateway endpoints
  auth/         Session state, token renewal, storage
  app/          App shell: router (lazy page chunks), React Query
  components/   Shared components (ui/, form/, layout/)
  config/       Site constants (contact address etc.)
  domain/       Code lists and rules kept identical to the backend
  i18n/         Language setup and translations
  legal/        KVKK privacy notice
  lib/          Formatting, money, date, theme and file opening helpers
  pages/        Pages: auth/, panel/ (pet owner), clinic/ (clinic),
                health/ (health records section shared by both sides)
  security/     Honeypot and bot shield
  styles/       Tailwind theme
  test/         Test setup and API mocks
public/         theme-init.js, manifest, icons, robots.txt
scripts/        e2e.mjs (smoke test)
deploy/         nginx configuration, security headers, Docker files
docs/           Architecture, testing and backend notes (in Turkish)
```

`src/domain/constants.ts` is a copy of the lists in the backend's
`libs/common`; if a list changes in the backend, this file must be updated
too.

## Security

| Topic         | Measure                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XSS           | All content, including AI-generated text, is rendered by React as plain text; `dangerouslySetInnerHTML`, `innerHTML` and `eval` are not used. The production build enforces a CSP (`script-src 'self'`, no inline scripts).           |
| Clickjacking  | `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` (as an HTTP header).                                                                                                                                                         |
| Bots / spam   | A hidden honeypot field on every form; the registration form also has a time trap that blocks submissions faster than 3 s. These only stop simple bots; the real protection must be on the server.                                    |
| SQL injection | The client builds no SQL. The backend uses Prisma and parameterised `$queryRaw`/`$executeRaw`. The client also validates every field with the backend DTO rules and sends path parameters with `encodeURIComponent` and a UUID check. |
| CSRF          | API calls use the `Authorization` header. The cookie is only sent on the `/api/auth` path and with `SameSite=Strict`, so other sites cannot trigger refresh or logout.                                                                |
| Open redirect | `?next=` only accepts paths within the site.                                                                                                                                                                                          |
| Session       | Access token in memory; refresh token in an `HttpOnly` cookie (not accessible to JavaScript). A single renewal across tabs, with sign-in/sign-out sync.                                                                               |
| Headers       | `nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS (nginx).                                                                                                                          |
| Files         | Documents are opened as blobs via an authorised `fetch`; PDFs were verified to open in Chrome and Zen with CSP `object-src 'none'`.                                                                                                   |
| Dependencies  | `npm audit`: 0 vulnerabilities (2026-10-18). Test accounts are kept in `.env` without the `VITE_` prefix, so they never reach the build output; `.env` is not copied into the Docker image.                                           |

The dev server does not apply the CSP (Vite HMR uses inline scripts);
`npm run build && npm run preview` runs with the production headers.
Example server configuration: `deploy/nginx.conf` and
`deploy/security-headers.conf` (copied under `/etc/nginx/snippets/`).
