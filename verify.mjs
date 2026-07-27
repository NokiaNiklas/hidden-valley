import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5178/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']
});
const page = await browser.newPage({ viewport: { width: 500, height: 300 } });

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { canvas: false };
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return { canvas: true, w: c.width, h: c.height, gl: !!gl };
});

console.log('CANVAS:', JSON.stringify(info));
console.log('--- console/errors ---');
console.log(logs.length ? logs.join('\n') : '(none)');

try {
  await page.screenshot({ path: 'verify.png', animations: 'disabled', timeout: 90000 });
  console.log('screenshot: ok');
} catch (e) {
  console.log('screenshot: FAILED (renderer too slow in headless swiftshader) —', e.name);
}
await browser.close();
