/**
 * 管理画面スクリーンショット撮影スクリプト
 * Usage: node scripts/take-admin-screenshots.mjs <email> <password>
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../docs/screenshots');
const BASE = 'http://localhost:3000';
const W = 1440, H = 900;

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/take-admin-screenshots.mjs <email> <password>');
  process.exit(1);
}

async function go(page, path, name, wait = 1500) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}`, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`✅ ${name}`);
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();

  // ログイン
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 12000 });
  } catch {
    // /dashboard 以外にリダイレクトされた場合も続行
  }
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${OUT}/dashboard.png`, clip: { x: 0, y: 0, width: W, height: H } });
  console.log('✅ dashboard.png');

  await go(page, '/products',           'admin-products.png');
  await go(page, '/orders',             'admin-orders.png');
  await go(page, '/customers',          'admin-customers.png');
  await go(page, '/settings/users',     'admin-settings.png');

  await browser.close();
  console.log('\n完了。docs/screenshots/ に保存されました。');
})();
