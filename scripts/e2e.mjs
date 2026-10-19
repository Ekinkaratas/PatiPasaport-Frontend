import puppeteer from 'puppeteer-core';

const BASE_URL = (process.env.E2E_BASE_URL ?? '').replace(/\/+$/, '');
const HEADED = process.argv.includes('--headed');
const ACCOUNTS = {
  owner: {
    email: process.env.E2E_OWNER_EMAIL,
    password: process.env.E2E_OWNER_PASSWORD,
  },
  clinic: {
    email: process.env.E2E_CLINIC_EMAIL,
    password: process.env.E2E_CLINIC_PASSWORD,
  },
};

const missing = [
  ...(BASE_URL ? [] : ['E2E_BASE_URL']),
  ...Object.entries(ACCOUNTS).flatMap(([role, account]) => [
    ...(account.email ? [] : [`E2E_${role.toUpperCase()}_EMAIL`]),
    ...(account.password ? [] : [`E2E_${role.toUpperCase()}_PASSWORD`]),
  ]),
];
if (missing.length > 0) {
  console.error(
    `.env içinde eksik değişken: ${missing.join(', ')} (bkz. .env.example).`,
  );
  process.exit(2);
}

const results = [];
const problems = [];
const warnings = [];
const FILE_REQUEST = /\/api\/documents\/[^/]+\/file/;

async function step(name, run) {
  const started = Date.now();
  try {
    const detail = await run();
    results.push({ name, ok: true, ms: Date.now() - started, detail });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started });
    console.log(
      `  ✗ ${name} — ${error instanceof Error ? error.message : error}`,
    );
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: !HEADED,
  args: ['--lang=tr-TR'],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('pp.language', 'tr');
  } catch {
    return;
  }
});

let authCalls = 0;
page.on('request', (request) => {
  if (/\/api\/auth\/(login|refresh|register)$/.test(request.url())) {
    authCalls += 1;
  }
});
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  const text = message.text();
  if (/status of 401/.test(text)) return;
  if (/status of 429/.test(text)) {
    problems.push(
      'istek sınırı aşıldı (429): gateway giriş/yenileme sınırı, bir dakika bekleyip tekrar çalıştırın',
    );
    return;
  }
  if (/Download the React DevTools/.test(text)) return;
  if (FILE_REQUEST.test(message.location()?.url ?? '')) return;
  problems.push(`konsol: ${text}`);
});
page.on('pageerror', (error) =>
  problems.push(`sayfa hatası: ${error.message}`),
);
page.on('response', (response) => {
  const url = response.url();
  if (!url.includes('/api/')) return;
  if (response.status() < 500) return;
  problems.push(`sunucu ${response.status()}: ${url}`);
});
page.on('requestfailed', (request) => {
  if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
  if (FILE_REQUEST.test(request.url())) {
    warnings.push(
      `dosya isteği koptu, uygulama yeniden denedi: ${request.failure()?.errorText}`,
    );
    return;
  }
  problems.push(
    `istek başarısız: ${request.url()} (${request.failure()?.errorText})`,
  );
});

async function open(path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
}

async function nav(path) {
  await page.evaluate((target) => {
    window.history.pushState(null, '', target);
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  }, path);
}

async function openPet(petPath) {
  const current = await page.evaluate(() => location.pathname);
  if (current !== petPath) {
    await page.evaluate(() =>
      document
        .querySelector('[role=tablist]')
        ?.setAttribute('data-e2e-old', ''),
    );
    await nav(petPath);
  }
  await page.waitForSelector('[role=tablist]:not([data-e2e-old])', {
    timeout: 15000,
  });
}

async function waitText(text, timeout = 15000) {
  await page.waitForFunction(
    (value) => document.body.innerText.includes(value),
    { timeout },
    text,
  );
}

async function waitPath(prefix, timeout = 15000) {
  await page.waitForFunction(
    (value) => location.pathname.startsWith(value),
    { timeout },
    prefix,
  );
}

async function waitIdle(scope = 'main', timeout = 15000) {
  await page.waitForFunction(
    (selector) =>
      !document.querySelector(`${selector} [role=status][aria-busy=true]`),
    { timeout },
    scope,
  );
}

async function clickByText(selector, text) {
  const clicked = await page.evaluate(
    (sel, value) => {
      const element = [...document.querySelectorAll(sel)].find(
        (node) => node.textContent.trim() === value,
      );
      element?.click();
      return Boolean(element);
    },
    selector,
    text,
  );
  expect(clicked, `"${text}" bulunamadı`);
}

async function login({ email, password }, next) {
  await nav(`/login?next=${encodeURIComponent(next)}`);
  await page.waitForSelector('input[type=email]', { timeout: 15000 });
  await page.type('input[type=email]', email);
  await page.type('input[type=password]', password);
  await page.click('form button[type=submit]');
  await waitPath(next);
}

async function logout() {
  await clickByText('header button', 'Çıkış yap');
  await page.waitForFunction(() => location.pathname === '/', {
    timeout: 15000,
  });
}

console.log(`PatiPasaport duman testleri → ${BASE_URL}\n`);

console.log('Herkese açık sayfalar');
await step('ana sayfa açılıyor', async () => {
  await open('/');
  await page.waitForSelector('h1', { timeout: 15000 });
  const title = await page.title();
  expect(title.includes('PatiPasaport'), `beklenmeyen başlık: ${title}`);
});
await step('giriş ve kayıt formları', async () => {
  await nav('/login');
  await page.waitForSelector('input[type=email]', { timeout: 15000 });
  await nav('/register');
  await page.waitForSelector('input[type=password]', { timeout: 15000 });
});
await step('bilinmeyen adres 404 gösteriyor', async () => {
  await nav('/boyle-bir-sayfa-yok');
  await waitText('404');
});
await step('korumalı sayfa girişe yönlendiriyor', async () => {
  await nav('/panel/pets');
  await waitPath('/login');
  const search = await page.evaluate(() => location.search);
  expect(search.includes('next='), 'dönüş adresi eklenmedi');
});

console.log('\nHayvan sahibi');
await step('giriş', async () => {
  await login(ACCOUNTS.owner, '/panel');
  await waitText('Merhaba');
});
await step('genel bakış ve yaklaşan aşılar kartı', async () => {
  await waitText('Yaklaşan aşılar');
});
let petPaths = [];
await step('hayvan listesi ve detay', async () => {
  await nav('/panel/pets');
  await page.waitForSelector('a[href^="/panel/pets/"]:not([href$="/new"])', {
    timeout: 15000,
  });
  petPaths = await page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll('a[href^="/panel/pets/"]')]
        .map((a) => a.getAttribute('href'))
        .filter(
          (href) =>
            href &&
            /^\/panel\/pets\/[^/]+$/.test(href) &&
            !href.endsWith('/new'),
        ),
    ),
  ]);
  expect(petPaths.length > 0, 'hayvan bulunamadı');
  await openPet(petPaths[0]);
  return `${petPaths.length} hayvan`;
});
await step('sağlık kaydı sekmeleri', async () => {
  for (const tab of [
    'Aşılar',
    'Reçeteler',
    'Tahliller',
    'Belgeler',
    'Kayıtlar',
  ]) {
    await clickByText('[role=tab]', tab);
    await page.waitForFunction(
      (name) =>
        [...document.querySelectorAll('[role=tab]')]
          .find((node) => node.textContent.trim() === name)
          ?.getAttribute('aria-selected') === 'true',
      { timeout: 15000 },
      tab,
    );
    await waitIdle('[role=tabpanel]');
  }
});
await step('belge açılıyor (blob)', async () => {
  let hasDocument = false;
  for (const petPath of petPaths) {
    await openPet(petPath);
    await clickByText('[role=tab]', 'Belgeler');
    await page.waitForFunction(
      () => {
        const panel = document.querySelector('[role=tabpanel]');
        return (
          panel?.querySelector('[aria-label^="Aç: "], [role=alert]') ||
          panel?.textContent.includes('Henüz belge yok.')
        );
      },
      { timeout: 15000 },
    );
    hasDocument = Boolean(await page.$('[aria-label^="Aç: "]'));
    if (hasDocument) break;
  }
  if (!hasDocument) return 'hiçbir hayvanda belge yok, atlandı';
  const result = await page.evaluate(async () => {
    const tab = {
      opener: {},
      location: { href: '' },
      document: { title: '', body: { textContent: '' } },
      close() {},
    };
    window.open = () => tab;
    document.querySelector('[aria-label^="Aç: "]').click();
    for (let i = 0; i < 40 && !tab.location.href; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return {
      href: tab.location.href,
      alert:
        document.querySelector('[role=tabpanel] [role=alert]')?.textContent ??
        '',
    };
  });
  expect(result.href.startsWith('blob:'), result.alert || 'dosya açılmadı');
});
await step('izinler ve profil sayfaları', async () => {
  await nav('/panel/consents');
  await waitText('İzinlerim');
  await nav('/panel/profile');
  await page.waitForSelector('main form', { timeout: 15000 });
});
await step('sayfa yenilenince oturum korunuyor', async () => {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main form', { timeout: 15000 });
  await waitPath('/panel/profile');
});
await step('çıkış ve panele geri dönülemiyor', async () => {
  await logout();
  await nav('/panel');
  await page.waitForFunction(() => !location.pathname.startsWith('/panel'), {
    timeout: 15000,
  });
});

console.log('\nKlinik');
await step('giriş', async () => {
  await login(ACCOUNTS.clinic, '/clinic');
  await waitText('Onay bekleyen taslak');
});
await step('hasta arama ve izinler', async () => {
  await nav('/clinic/patients');
  await page.waitForSelector('form[role=search]', { timeout: 15000 });
  await nav('/clinic/consents');
  await page.waitForSelector('main h1', { timeout: 15000 });
  await waitIdle();
});
await step('hasta detayı ve sağlık bölümü', async () => {
  const patient = await page.evaluate(
    () =>
      document
        .querySelector('main a[href^="/clinic/patients/"]')
        ?.getAttribute('href') ?? null,
  );
  if (!patient) return 'izin veren hasta yok, atlandı';
  await nav(patient);
  await page.waitForSelector('[role=tablist]', { timeout: 15000 });
});
await step('AI taslakları', async () => {
  await nav('/clinic/drafts');
  await waitText('AI taslakları');
  await waitIdle();
});
await step('stok: Sat düğmesi ve miktar kutusu', async () => {
  await nav('/clinic/stock');
  await page.waitForSelector('[aria-label^="Sat: "]', { timeout: 15000 });
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-label^="Sat: "]')].map((button) => {
      const reason = button.getAttribute('aria-describedby');
      const quantity = button
        .closest('li')
        ?.querySelector('input[type=number]');
      return {
        blocked: button.getAttribute('aria-disabled') === 'true',
        tooltip: reason ? document.getElementById(reason)?.textContent : null,
        quantity: quantity?.value,
      };
    }),
  );
  expect(rows.length > 0, 'stok kalemi yok');
  for (const row of rows) {
    expect(row.quantity === '1', 'miktar kutusu varsayılanı 1 değil');
    if (row.blocked) {
      expect(row.tooltip, 'kapalı Sat düğmesinin açıklaması yok');
    }
  }
  const sellable = rows.findIndex((row) => !row.blocked);
  if (sellable === -1) return `${rows.length} kalem, satılabilir kalem yok`;
  await page.evaluate((index) => {
    document.querySelectorAll('[aria-label^="Sat: "]')[index].click();
  }, sellable);
  await page.waitForSelector('dialog[open]', { timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), {
    timeout: 5000,
  });
  return `${rows.length} kalem, satış penceresi açıldı (kaydedilmedi)`;
});
await step('satış raporu ve geçmişi', async () => {
  await nav('/clinic/sales');
  await waitText('Ciro');
  await nav('/clinic/sales/history');
  await page.waitForSelector('form[role=search]', { timeout: 15000 });
  await waitIdle();
});
await step('klinik bilgileri ve çıkış', async () => {
  await nav('/clinic/profile');
  await page.waitForSelector('main h1', { timeout: 15000 });
  await logout();
});

await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} adım başarılı ` +
    `(${authCalls} giriş/yenileme isteği).`,
);
if (warnings.length > 0) {
  console.log(`\nUyarı (${warnings.length}):`);
  for (const warning of warnings) console.log(`  • ${warning}`);
}
if (problems.length > 0) {
  const unique = [...new Set(problems)];
  console.log(`\nBeklenmeyen ${unique.length} sorun:`);
  for (const problem of unique) console.log(`  • ${problem}`);
}
process.exit(failed.length > 0 || problems.length > 0 ? 1 : 0);
