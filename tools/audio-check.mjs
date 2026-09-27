import { chromium, webkit } from "playwright";
import { preview } from "vite";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const url = `http://127.0.0.1:${server.httpServer.address().port}/?check`;
const reports = [];
try {
  for (const [name, type] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({
        viewport: { width: 1194, height: 834 },
      });
      await page.goto(url);
      await page.waitForFunction(() => window.__flyer?.ready());
      await page.locator("#roll").click();
      const samples = await page.evaluate(async () => {
        const a = [];
        for (let i = 0; i < 30; i++) {
          a.push(window.__flyer.audio().rms);
          await new Promise((r) => setTimeout(r, 25));
        }
        return a;
      });
      const peakRms = Math.max(...samples);
      assert.ok(peakRms > 0.001, `${name}: limiter output audible signal`);
      await page.locator("#sound").click();
      await page.waitForFunction(
        () => window.__flyer.audio().state === "suspended",
      );
      assert.equal(await page.evaluate(() => window.__flyer.audio().rms), 0);
      await page.waitForTimeout(500);
      const count = await page.evaluate(() => window.__flyer.audio().count);
      await page.locator("#sound").click();
      await page.waitForFunction(
        () => window.__flyer.audio().state === "running",
      );
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(() => window.__flyer.audio().count),
        count,
        "unmuting must not replay old cues",
      );
      assert.equal(await page.evaluate(() => window.__flyer.audio().rms), 0);
      reports.push({ name, peakRms, muting: true, stalePlayback: false });
      console.log(
        `${name}: roll RMS ${peakRms.toFixed(4)}, mute and resume passed`,
      );
    } finally {
      await browser.close();
    }
  }
  const manifest = JSON.parse(
    await fs.readFile("public/assets/audio/manifest.json", "utf8"),
  );
  for (const [cue, entry] of Object.entries(manifest)) {
    assert.equal(entry.clipped_samples, 0, cue);
    assert.ok(entry.duration > 0 && entry.duration < 1.3, cue);
    assert.ok(entry.peak < 1, cue);
  }
  await fs.writeFile(
    ".browser-check/audio.json",
    JSON.stringify({ reports, delivery: manifest }, null, 2),
  );
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}
