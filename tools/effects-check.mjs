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
      for (const [index, cue, result] of [[0, "mighty", 6], [1, "acrobatics", 2], [2, "magic", 4]]) {
        await page.evaluate(index => {
          const s = window.__flyer.state();
          for (const g of ["str", "dex", "int"])
            Object.keys(s.categories).filter(k => k.startsWith(g)).slice(0, 3).forEach(k => s.categories[k] = true);
          s.dice = [2, 2, 3, 4, 5]; s.rollsUsed = 1;
          for (const key in s.skillsUsed) s.skillsUsed[key] = false;
          window.__flyer.fixture(s);
          window.__flyer.tap(`skill:${index}`);
          window.__flyer.tap("die:2");
        }, index);
        assert.deepEqual(await page.evaluate(() => window.__flyer.diagnostics().effects.abilities.active), [index]);
        await ready();
        await page.waitForFunction(cue => window.__flyer.audio().lastCue === cue, cue);
        assert.equal(await page.evaluate(() => window.__flyer.state().dice[2]), result);
        const rms = await page.evaluate(async () => {
          let peak = 0;
          for (let i = 0; i < 10; i++) {
            peak = Math.max(peak, window.__flyer.audio().rms);
            await new Promise(r => setTimeout(r, 20));
          }
          return peak;
        });
        assert.ok(rms > 0.001, `${cue}: themed audio reaches output`);
        await page.waitForFunction(() => window.__flyer.diagnostics().effects.abilities.active.length === 0);
        const idle = await page.evaluate(() => window.__flyer.diagnostics().draws);
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => window.__flyer.diagnostics().draws), idle);
      }
      await page.evaluate(() => {
        const s = window.__flyer.state();
        for (const key in s.skillsUsed) s.skillsUsed[key] = false;
        window.__flyer.fixture(s);
        window.__flyer.tap("skill:2"); window.__flyer.tap("die:2");
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      assert.deepEqual(await page.evaluate(() => window.__flyer.diagnostics().effects.abilities.active), []);
      const hiddenCount = await page.evaluate(() => window.__flyer.audio().count);
      await page.waitForTimeout(450);
      assert.equal(await page.evaluate(() => window.__flyer.audio().count), hiddenCount, "hidden skill cannot play a delayed impact");
      console.log(`${type.name()}: unlock, three themed abilities, audio, victory, idle and lifecycle passed`);
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
