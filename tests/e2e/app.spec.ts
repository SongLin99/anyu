import { test, expect, type Page } from "@playwright/test";
async function onboard(page: Page) {
  await page.goto("");
  await page.getByRole("button", { name: "继续，慢慢认识这里" }).click();
  await page.getByRole("button", { name: "继续，慢慢认识这里" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "找到我的起步方向" }).click();
  await page.getByRole("button", { name: /评价与比较的压力/ }).click();
  await page.getByRole("button", { name: "继续，选一个小愿望" }).click();
  await page.getByRole("button", { name: /吃完饭后，更平静一点/ }).click();
  await page.getByRole("button", { name: "开启我的小小计划" }).click();
  await expect(
    page.getByRole("heading", { name: /今天也慢慢来/ }),
  ).toBeVisible();
}
const mobileNav = (page: Page) =>
  page.getByRole("navigation", { name: "底部导航" });
test("record, shared memory, edit/delete and refresh persistence", async ({
  page,
}) => {
  await onboard(page);
  await page.getByRole("button", { name: /冲动来了，陪我一下/ }).click();
  await page.getByLabel("想说的话").fill("排练之后有点紧张");
  await page.getByRole("button", { name: /保存，让小屿/ }).click();
  await mobileNav(page).getByRole("button", { name: "我的记录" }).click();
  await expect(
    page.getByText("排练之后有点紧张", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("小屿 · 支持卡", { exact: true })).toBeVisible();
  await mobileNav(page)
    .getByRole("button", { name: "小屿", exact: true })
    .click();
  await expect(page.getByText("小屿 · 支持卡 · 来自记录")).toBeVisible();
  await page.reload();
  await mobileNav(page).getByRole("button", { name: "我的记录" }).click();
  await expect(
    page.getByText("排练之后有点紧张", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("编辑记录").click();
  await page.getByLabel("想说的话").fill("更新后的感受");
  await page.getByRole("button", { name: /保存，让小屿/ }).click();
  await expect(page.getByText("更新后的感受", { exact: true })).toBeVisible();
  page.on("dialog", (d) => d.accept());
  await page.getByLabel("删除记录").click();
  await expect(page.getByText("更新后的感受", { exact: true })).toHaveCount(0);
  await mobileNav(page)
    .getByRole("button", { name: "小屿", exact: true })
    .click();
  await expect(page.getByText("小屿 · 支持卡 · 来自记录")).toHaveCount(0);
});
test("backfill, wave marker and emergency route", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: /刚刚经历了风浪/ }).click();
  const yesterday = new Date(Date.now() - 86400000);
  const dt = new Date(
    yesterday.getTime() - yesterday.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("发生的时间").fill(dt);
  await page.getByRole("button", { name: /保存，让小屿/ }).click();
  await mobileNav(page).getByRole("button", { name: "我的记录" }).click();
  await expect(page.getByText(/谢谢你补上那天的经历/)).toBeVisible();
  await page.getByRole("button", { name: "需要身体上的帮助？" }).click();
  await expect(page.getByRole("link", { name: "拨打120" })).toHaveAttribute(
    "href",
    "tel:120",
  );
});
test("desktop layout and no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await onboard(page);
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
});
test("mobile layout and encrypted backup", async ({ page }) => {
  await onboard(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "打开设置" }).click();
  await page.getByRole("button", { name: "导出加密备份" }).click();
  await page.getByLabel("备份密码").fill("testing-password-2026");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出加密备份", exact: true })
    .last()
    .click();
  const file = await downloading;
  const stream = await file.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  expect(text).not.toContain("comparison");
  expect(JSON.parse(text).format).toBe("anyu-backup-v1");
  await page.getByLabel("希望先实现的变化").selectOption("kind");
  await page.getByRole("button", { name: "恢复加密备份" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "backup.anyu",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
  await page.getByLabel("备份密码").fill("testing-password-2026");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "解密并恢复" }).click();
  await expect(page.getByLabel("希望先实现的变化")).toHaveValue("calm");
});
