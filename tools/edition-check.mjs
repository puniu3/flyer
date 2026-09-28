import assert from "node:assert/strict";

export async function checkEditions(browser, base, viewport) {
  for (const ui of ["text", "classic"]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(new URL(`?ui=${ui}`, base).href);
      await page.locator(ui === "text" ? "#command" : "#fd-stage button").first().waitFor();
      const sheets = await page.evaluate(() => [...document.styleSheets].map((sheet) => ({
        href: sheet.href,
        rules: [...sheet.cssRules].map((rule) => rule.cssText).join("\n"),
      })));
      assert.equal(sheets.length, 1, `${ui} loads only its own stylesheet`);
      if (ui === "text") {
        assert.match(sheets[0].rules, /#history\s*\{/);
        assert.equal(await page.locator(".response").first().evaluate((node) => getComputedStyle(node).whiteSpace), "pre-wrap");
        assert.equal(await page.locator("html").evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(238, 233, 223)");
        await page.locator("#command").fill("help");
        await page.locator("#command").press("Enter");
        await page.waitForFunction(() => document.querySelector("#messages").textContent.includes("UI切替:"));
        const history = await page.locator("#history").boundingBox();
        const input = await page.locator("#command").boundingBox();
        assert.ok(input.y >= history.y + history.height, "composer stays below scrollable history");
        assert.equal(await page.locator("#messages a").count(), 0);
        assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
      } else {
        assert.ok(new URL(sheets[0].href).pathname.endsWith("/classic/styles.css"));
      }
      assert.deepEqual(errors, [], `${ui} runtime errors`);
    } finally {
      await page.close();
    }
  }
}
