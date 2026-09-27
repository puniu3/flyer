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
      await page.goto(url);
      const ready = () => page.waitForFunction(() => window.__flyer?.ready());
      await ready();
      await page.evaluate(() => {
        const s = window.__flyer.state();
        s.dice = [5, 5, 5, 1, 2]; s.rollsUsed = 1;
        s.categories.str_full_house = s.categories.str_four_of_a_kind = true;
        window.__flyer.fixture(s);
        window.__flyer.tap("category:str_three_of_a_kind_5");
      });
      await page.waitForFunction(() => window.__flyer.diagnostics().effects.particles === 6);
      await page.waitForFunction(() => window.__flyer.diagnostics().effects.particles === 0);
      assert.equal(await page.evaluate(() => window.__flyer.diagnostics().effects.bursts), 1);
      await page.evaluate(() => {
        const s = window.__flyer.state();
        s.dice = [2, 2, 3, 4, 5]; s.rollsUsed = 1;
        s.skillsUsed.skill_str_mighty = true;
        window.__flyer.fixture(s); window.__flyer.tap("category:dex_free");
      });
      await ready();
      assert.equal(await page.evaluate(() => window.__flyer.diagnostics().effects.bursts), 1, "turn reset is not an unlock");
      await page.evaluate(() => {
        const s = window.__flyer.state(); s.dice = [2, 2, 3, 4, 5]; s.rollsUsed = 1;
        window.__flyer.fixture(s); window.__flyer.tap("skill:0");
      });
      await page.waitForFunction(() => window.__flyer.diagnostics().effects.glow.every(x => x >= 0.2));
      const draws = await page.evaluate(() => window.__flyer.diagnostics().draws);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => window.__flyer.diagnostics().draws), draws, "steady glow is idle");
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      assert.deepEqual(await page.evaluate(() => window.__flyer.diagnostics().effects.glow), [0,0,0,0,0,0]);
      await page.evaluate(() => {
        delete document.hidden; document.dispatchEvent(new Event("visibilitychange"));
        const s = window.__flyer.state(); s.dice = [6,6,6,6,6]; s.rollsUsed = 3;
        for (let i = 1; i < 5; i++) s.categories[`dungeon_floor_${i}`] = true;
        window.__flyer.fixture(s); window.__flyer.tap("category:dungeon_floor_5");
      });
      await page.waitForFunction(() => window.__flyer.diagnostics().effects.particles === 10);
      await page.locator("#again").click();
      assert.equal(await page.evaluate(() => window.__flyer.diagnostics().effects.particles), 0, "restart clears victory particles");
      assert.equal(await page.evaluate(() => window.__flyer.state().status), "playing");
      console.log(`${type.name()}: unlock, selection, victory, idle and lifecycle passed`);
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
