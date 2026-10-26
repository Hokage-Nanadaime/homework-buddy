/** Screenshots every .html file in a folder to a .png next to it.  Usage: node scripts/screenshot.cjs <folder> */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2]);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    await page.goto('file://' + path.join(dir, f));
    await page.screenshot({ path: path.join(dir, f.replace('.html', '.png')), fullPage: true });
  }
  await browser.close();
})();
