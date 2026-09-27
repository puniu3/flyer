import { chromium, webkit } from "playwright";
import { preview } from "vite";
import assert from "node:assert/strict";
const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const url = `http://127.0.0.1:${server.httpServer.address().port}/?check`;
try {
  for (const type of [chromium, webkit]) {
    const browser = await type.launch(type === chromium ? { args: ["--mute-audio"] } : {});
    try {
      const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      page.on("response", r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.addInitScript(() => {
        window.printOverflow = [];
        const fill = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
          const width = this.measureText(text).width;
          const left = this.textAlign === "center" ? x - width / 2 : x;
          if (left < 0 || left + width > this.canvas.width || y < 0 || y > this.canvas.height)
            window.printOverflow.push({ text, font: this.font, x, y });
          return fill.call(this, text, x, y, ...args);
        };
      });
      await page.goto(url);
      await page.waitForFunction(() => window.__flyer?.ready());
      await page.evaluate(() => {
        const s = window.__flyer.state();
        for (const g of ["str", "dex", "int"])
          Object.keys(s.categories).filter(k => k.startsWith(g)).slice(0, 3).forEach(k => s.categories[k] = true);
        s.dice = [1, 2, 3, 4, 5]; s.rollsUsed = 1;
        window.__flyer.fixture(s);
      });
      const state = await page.evaluate(() => window.__flyer.state());
      for (const locale of ["ja", "en", "zh", "zh-TW", "ko", "de", "fr", "es"]) {
        await page.locator("#language-open").click();
        await page.locator(`[data-language="${locale}"]`).click();
        await page.waitForFunction(locale => document.documentElement.lang === locale, locale);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.deepEqual(await page.evaluate(() => window.__flyer.state()), state);
        await page.screenshot({ path: `.browser-check/locale-${type.name()}-${locale}.png` });
        await page.locator("#help").click();
        if (locale === "zh") {
          assert.equal(await page.locator("#guide h2").textContent(), "游戏规则");
          assert.ok(await page.evaluate(() => document.fonts.check('32px "Flyer SC"', '掷骰力量葫芦顺子')));
          assert.match(await page.locator("#guide li").first().evaluate(e => getComputedStyle(e).fontFamily), /Flyer SC/);
          if (type === chromium) {
            const cdp = await page.context().newCDPSession(page);
            await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
            const { root } = await cdp.send("DOM.getDocument");
            const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#guide li" });
            const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
            assert.ok(fonts.some(f => f.isCustomFont && /Noto Serif SC/.test(f.familyName)));
            console.log("Simplified Chinese rendered font:", fonts);
          }
        }
        await page.keyboard.press("Escape");
      }
      assert.deepEqual(await page.evaluate(() => window.printOverflow), []);
      assert.deepEqual(errors, []);
      console.log(`${type.name()}: eight locales, text bounds, font loading and state preservation passed`);
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
