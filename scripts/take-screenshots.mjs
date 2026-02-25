/**
 * 管理画面スクリーンショット撮影スクリプト
 * Usage: node scripts/take-screenshots.mjs <email> <password>
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../docs/screenshots');
const BASE = 'http://localhost:3000';

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/take-screenshots.mjs <email> <password>');
  process.exit(1);
}

async function shot(page, path, filename) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT_DIR}/${filename}`, fullPage: false });
  console.log(`✅ ${filename}`);
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── ログイン ──
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT_DIR}/login.png` });
  console.log('✅ login.png');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // ── ダッシュボード ──
  await page.screenshot({ path: `${OUT_DIR}/dashboard.png` });
  console.log('✅ dashboard.png');

  // ── 商品管理 ──
  await shot(page, '/products', 'products.png');

  // ── 注文管理 ──
  await shot(page, '/orders', 'orders.png');

  // ── 設定 ──
  await shot(page, '/settings/users', 'settings.png');

  await browser.close();
  console.log('\n🎉 全スクリーンショット完了');
})();
