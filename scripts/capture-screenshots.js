import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  const page = await context.newPage();

  const routes = [
    { url: 'http://localhost:5173/', file: '01_home_page.png' },
    { url: 'http://localhost:5173/services', file: '02_services_page.png' },
    { url: 'http://localhost:5173/about', file: '03_about_page.png' },
    { url: 'http://localhost:5173/contact', file: '04_contact_page.png' },
    { url: 'http://localhost:5173/login', file: '05_login_page.png' },
    { url: 'http://localhost:5173/register', file: '06_register_page.png' },
  ];

  const outputDir = path.resolve(__dirname, '../docs/reports/screenshots');

  for (const r of routes) {
    console.log(`Navigating to ${r.url}...`);
    await page.goto(r.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const dest = path.join(outputDir, r.file);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`Saved screenshot to ${dest}`);
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
