import { chromium, webkit } from "playwright";
import { preview } from "vite";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const url = `http://127.0.0.1:${server.httpServer.address().port}/?check`;
await fs.mkdir(".browser-check", { recursive: true });
const reports = [];
try {
  for (const [name, type, viewport, touch] of [
    ["chromium", chromium, { width: 1440, height: 1000 }, false],
    ["webkit-landscape", webkit, { width: 1194, height: 834 }, true],
    ["webkit-portrait", webkit, { width: 834, height: 1194 }, true],
    ["chromium-phone", chromium, { width: 390, height: 844 }, true],
  ]) {
    const browser = await type.launch(type === chromium ? { args: ["--mute-audio"] } : {});
    try {
      const page = await browser.newPage({
        viewport,
        hasTouch: touch,
        deviceScaleFactor: 1,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("response", (r) => {
        if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
      });
      await page.goto(url);
      await page.waitForFunction(() => window.__flyer?.ready());
      const ready = () => page.waitForFunction(() => window.__flyer?.ready());
      const home = () => page.evaluate(() => window.__flyer.resetCamera());
      assert.equal(await page.locator("#settings, #volume, #fov, #guide button").count(), 0);
      await page.locator("#help").click();
      assert.equal(await page.locator("#guide").isVisible(), true);
      await page.mouse.click(5, 5);
      assert.equal(await page.locator("#guide").isVisible(), false);
      await page.locator("#language-open").click();
      await page.locator('[data-language="en"]').click();
      await page.waitForFunction(() => document.documentElement.lang === "en");
      assert.equal(await page.locator("html").getAttribute("lang"), "en");
      assert.equal(await page.locator("#languages").isVisible(), false);
      await page.reload();
      await ready();
      assert.equal(await page.locator('[data-language="en"]').getAttribute("aria-pressed"), "true");
      await page.locator("#language-open").click();
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#languages").isVisible(), false);
      await page.locator("#language-open").click();
      await page.mouse.click(5, 5);
      assert.equal(await page.locator("#languages").isVisible(), false);
      await page.locator("#language-open").click();
      await page.locator('[data-language="ja"]').click();
      await page.waitForFunction(() => document.documentElement.lang === "ja");


      await page.screenshot({ path: `.browser-check/${name}-initial.png` });
      const bounds = await page.locator("canvas").boundingBox();
      assert.equal(await page.evaluate(() => window.__flyer.diagnostics().layout), "landscape", "layout is fixed in every orientation");
      assert.equal(
        await page.locator(".skill-label:visible").count(),
        0,
        "locked skill labels are absent",
      );
      assert.deepEqual(
        bounds,
        { x: 0, y: 0, width: viewport.width, height: viewport.height },
        "table fills viewport",
      );
      assert.equal(
        await page
          .locator(
            "header, footer, .camera-controls, .camera-hint, .table-caption, .die-label",
          )
          .count(),
        0,
      );
      assert.equal(
        await page
          .locator(".die-hit")
          .allTextContents()
          .then((a) => a.join("")),
        "",
      );
      const rollBounds = await page.locator("#roll").boundingBox();
      assert.equal(rollBounds.width, rollBounds.height, "roll is circular");
      assert.ok(
        rollBounds.x > viewport.width / 2 && rollBounds.y > viewport.height / 2,
      );

      await page.evaluate(() => window.__flyer.seed(321));
      await page.locator("#roll").click();
      await ready();
      const dice = await page.evaluate(() => window.__flyer.state().dice);
      assert.equal(await page.locator("#roll-remaining").textContent(), "2/2");
      assert.deepEqual(
        await page.evaluate(() =>
          window.__flyer.diagnostics().dice.map((d) => d.top),
        ),
        dice,
        `${name}: visible dice match rules`,
      );
      await page.screenshot({ path: `.browser-check/${name}-rolled.png` });
      const tap = async (selector) => {
        const b = await page.locator(selector).boundingBox();
        assert.ok(b, selector);
        if (touch)
          await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      };
      await tap('[data-id="die:0"]');
      assert.equal(
        await page.locator('[data-id="die:0"]').getAttribute("aria-pressed"),
        "true",
      );
      const heldPosition = await page.evaluate(
        () => window.__flyer.diagnostics().dice[0].position,
      );
      await page.locator("#roll").click();
      await ready();
      assert.equal(
        (await page.evaluate(() => window.__flyer.state().dice))[0],
        dice[0],
      );
      assert.deepEqual(
        await page.evaluate(
          () => window.__flyer.diagnostics().dice[0].position,
        ),
        heldPosition,
      );
      assert.deepEqual(
        await page.locator("canvas").boundingBox(),
        bounds,
        "HUD changes must not resize canvas",
      );
      const cameraBeforeWheel = await page.evaluate(
        () => window.__flyer.diagnostics().camera,
      );
      await page.mouse.move(30, 200);
      await page.mouse.wheel(0, -180);
      await page.waitForFunction(
        (before) =>
          JSON.stringify(window.__flyer.diagnostics().camera) !==
          JSON.stringify(before),
        cameraBeforeWheel,
      );
      const physical = await page.evaluate(() => {
        const p = window.__flyer.diagnostics().dice[1].position;
        return window.__flyer.project(p[0], p[1] + 0.39, p[2]);
      });
      if (touch)
        await page.touchscreen.tap(
          physical.x + bounds.x,
          physical.y + bounds.y,
        );
      else await page.mouse.click(physical.x + bounds.x, physical.y + bounds.y);
      assert.equal(
        await page.locator('[data-id="die:1"]').getAttribute("aria-pressed"),
        "true",
        "tap physical die after zoom",
      );
      await home();

      const beforePan = await page.evaluate(() => window.__flyer.diagnostics());
      await page.mouse.move(30, 125);
      await page.mouse.down();
      await page.mouse.move(100, 150, { steps: 6 });
      await page.mouse.up();
      const afterPan = await page.evaluate(() => window.__flyer.diagnostics());
      assert.notDeepEqual(afterPan.camera, beforePan.camera);
      assert.ok(
        afterPan.quaternion.every(
          (v, i) => Math.abs(v - beforePan.quaternion[i]) < 1e-9,
        ),
      );
      assert.equal(
        await page.locator('[data-id="die:0"]').getAttribute("aria-pressed"),
        "true",
      );
      await home();
      if (name === "chromium") {
        const cdp = await page.context().newCDPSession(page);
        const before = await page.evaluate(
          () => window.__flyer.diagnostics().camera,
        );
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [
            { x: 500, y: 140, id: 0 },
            { x: 600, y: 140, id: 1 },
          ],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: 450, y: 140, id: 0 },
            { x: 650, y: 140, id: 1 },
          ],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        assert.notDeepEqual(
          await page.evaluate(() => window.__flyer.diagnostics().camera),
          before,
          "pinch zooms",
        );
        assert.equal(
          await page.locator('[data-id="die:0"]').getAttribute("aria-pressed"),
          "true",
          "pinch does not toggle dice",
        );
        await home();
      }
      await page.locator("#roll").click();
      assert.deepEqual(
        await page.evaluate(() => window.__flyer.diagnostics().keepRings),
        [false, false, false, false, false],
        "last roll immediately hides keep rings",
      );
      await ready();
      await tap('[data-id="die:0"]');
      assert.deepEqual(
        await page.evaluate(() => window.__flyer.diagnostics().keepRings),
        [false, false, false, false, false],
        "spent rerolls cannot show keep rings",
      );
      await page.evaluate(() => {
        const s = window.__flyer.state();
        s.dice = [2, 2, 3, 4, 5];
        s.rollsUsed = 1;
        s.status = "playing";
        s.categories.str_full_house =
          s.categories.str_four_of_a_kind =
          s.categories.str_three_of_a_kind_5 =
            true;
        window.__flyer.fixture(s);
      });
      await tap('[data-id="skill:0"]');
      assert.equal(
        await page.locator('[data-id="skill:0"]').getAttribute("aria-pressed"),
        "true",
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator('[data-id="skill:0"]').getAttribute("aria-pressed"),
        "false",
      );
      await tap('[data-id="skill:0"]');
      await tap('[data-id="die:0"]');
      await ready();
      assert.equal(
        (await page.evaluate(() => window.__flyer.state().dice))[0],
        6,
      );
      assert.equal(
        await page.locator('[data-id="skill:0"]').isDisabled(),
        true,
      );
      await page.screenshot({ path: `.browser-check/${name}-skill.png` });
      await tap('[data-id="category:dex_free"]');
      await ready();
      assert.equal(
        await page.evaluate(() => window.__flyer.state().categories.dex_free),
        true,
      );
      assert.equal(
        await page.evaluate(() => window.__flyer.state().dice.length),
        0,
      );
      assert.equal(
        await page.locator('[data-id="die:0"]').getAttribute("aria-pressed"),
        "false",
      );
      await page.evaluate(() => {
        const s = window.__flyer.state();
        s.dice = [6, 6, 6, 6, 6];
        s.rollsUsed = 3;
        for (let i = 1; i < 5; i++) s.categories[`dungeon_floor_${i}`] = true;
        window.__flyer.fixture(s);
      });
      await tap('[data-id="category:dungeon_floor_5"]');
      await ready();
      assert.equal(
        await page.evaluate(() => window.__flyer.state().status),
        "won",
      );
      await page.locator("#result").waitFor({ state: "visible" });
      await page.mouse.click(5, 5);
      assert.equal(await page.locator("#result").isVisible(), true, "victory stays open after backdrop click");
      assert.equal(await page.locator("#result button:visible").count(), 1);
      assert.equal(await page.locator("#result-title").isVisible(), true);
      assert.match(await page.locator("#result-title").innerText(), /勝利/);
      assert.equal(await page.locator("#result-copy").isVisible(), true);
      assert.equal(await page.locator("#result-copy").innerText(), "地下5階を踏破しました。");
      assert.equal(
        (await page.locator(".category").allTextContents()).join(""),
        "",
      );
      await page.waitForFunction(
        () => window.__flyer.audio().lastCue === "victory",
      );

      await page.screenshot({ path: `.browser-check/${name}-won.png` });
      await page.locator("#again").click();
      await ready();
      assert.equal(
        await page.evaluate(() => window.__flyer.state().status),
        "playing",
      );
      await page.evaluate(() => {
        const s = window.__flyer.state();
        for (const id in s.categories) s.categories[id] = true;
        s.categories.dungeon_floor_5 = false;
        s.dice = [1, 2, 3, 4, 5];
        s.rollsUsed = 2;
        window.__flyer.fixture(s);
      });
      for (let i = 0; i < 5; i++) await tap(`[data-id="die:${i}"]`);
      await page.locator("#roll").click();
      await ready();
      assert.equal(
        await page.evaluate(() => window.__flyer.state().status),
        "lost",
      );
      assert.equal(await page.locator("#result button:visible").count(), 1);
      await page.mouse.click(5, 5);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#result").isVisible(), true, "loss requires replay action");
      await page.locator("#again").click();
      await page.locator("#sound").click();
      await page.waitForFunction(
        () => window.__flyer.audio().state === "suspended",
      );
      assert.equal(await page.evaluate(() => window.__flyer.audio().rms), 0);
      await page.reload();
      await ready();
      assert.equal(
        await page.locator("#sound").getAttribute("aria-label"),
        "音声 OFF",
      );
      assert.equal(await page.locator("#volume, #fov").count(), 0);
      await page.evaluate(() => {
        document.querySelector("#roll").click();
        document.querySelector("#roll").click();
      });
      assert.equal(
        await page.evaluate(() => window.__flyer.state().rollsUsed),
        1,
        "rapid input consumes one roll",
      );
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await ready();
      assert.equal(
        await page.evaluate(() => window.__flyer.diagnostics().motions),
        0,
        "hiding finishes presentation",
      );
      await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      assert.equal(
        await page.evaluate(() => window.__flyer.state().rollsUsed),
        1,
      );
      const draws = await page.evaluate(
        () => window.__flyer.diagnostics().draws,
      );
      await page.waitForTimeout(150);
      assert.ok(
        (await page.evaluate(() => window.__flyer.diagnostics().draws)) -
          draws <=
          1,
        "idle table stops rendering",
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false);
      assert.deepEqual(errors, []);
      reports.push({
        name,
        errors,
        diagnostics: await page.evaluate(() => window.__flyer.diagnostics()),
      });
      console.log(`${name}: passed`);
    } finally {
      await browser.close();
    }
  }
  await fs.writeFile(
    ".browser-check/report.json",
    JSON.stringify(reports, null, 2),
  );
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}
