import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.PWA_TEST_URL || "http://127.0.0.1:4173/anyu/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole("button").first().waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button").first().waitFor();
  assert.ok((await page.title()).includes("安屿"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: installed PWA app shell opens offline without JavaScript errors.",
  );
} finally {
  await browser.close();
}
