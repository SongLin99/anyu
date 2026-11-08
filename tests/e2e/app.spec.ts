import { test, expect, type Page } from "@playwright/test";
async function onboard(page: Page) {
  await page.goto("");
  await page.getByRole("button", { name: "继续，慢慢认识这里" }).click();
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

test("intro connects gentle terms to vomiting and cites the study", async ({
  page,
}) => {
  await page.goto("");
  await page.getByRole("button", { name: "继续，慢慢认识这里" }).click();
  const guide = page.getByRole("region", { name: "催吐与应用用词的对应图示" });
  await expect(
    guide.getByRole("heading", { name: "想要催吐", exact: true }),
  ).toBeVisible();
  await expect(
    guide.getByRole("heading", { name: "已经催吐", exact: true }),
  ).toBeVisible();
  await expect(guide.getByText("「冲动来了」", { exact: true })).toBeVisible();
  await expect(
    guide.getByText("「经历了风浪」", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/intro-terms-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "继续，慢慢认识这里" }).click();
  const study = page.getByRole("region", {
    name: "北京舞蹈学院研究的进食态度筛查结果",
  });
  await expect(study.locator(".study-person")).toHaveCount(57);
  await expect(study.locator(".study-person.calm")).toHaveCount(16);
  await expect(study.locator(".study-person.lilac")).toHaveCount(24);
  await expect(study.locator(".study-person.peach")).toHaveCount(17);
  await expect(study.getByText("不是确诊人数，也不是催吐发生率")).toBeVisible();
  await expect(study.getByRole("link")).toHaveAttribute(
    "href",
    "https://doi.org/10.26944/j.cnki.CN10-1081/G8.2025.10.009",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/intro-study-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "研究详情与适用范围 →" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "这是筛查，不是临床确诊",
  );
});

test("reset cancellation preserves data and confirmed reset restores first launch", async ({
  page,
}) => {
  await onboard(page);
  await page.getByRole("button", { name: /冲动来了，陪我一下/ }).click();
  await page.getByLabel("想说的话").fill("reset-test-private-record");
  await page.getByRole("button", { name: /保存，让小屿/ }).click();
  await page.getByRole("button", { name: "打开设置" }).click();
  await page.getByLabel("朋友内测邀请码").fill("reset-test-invitation");
  await page.getByLabel("我了解并同意上述必要信息").check();
  await page.getByRole("button", { name: "重新开始引导（重置App）" }).click();
  await expect(page.getByRole("dialog")).toContainText("将清空本设备");
  await page.getByRole("button", { name: "先保留现状" }).click();
  await mobileNav(page).getByRole("button", { name: "我的记录" }).click();
  await expect(
    page.getByText("reset-test-private-record", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "打开设置" }).click();
  await page.getByRole("button", { name: "重新开始引导（重置App）" }).click();
  await page.getByRole("button", { name: "确认清空并重新开始" }).click();
  await expect(
    page.getByRole("heading", { name: /你已经承受了很多/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /你已经承受了很多/ }),
  ).toBeVisible();
  await onboard(page);
  await mobileNav(page).getByRole("button", { name: "我的记录" }).click();
  await expect(
    page.getByText("reset-test-private-record", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "打开设置" }).click();
  await expect(page.getByLabel("朋友内测邀请码")).toHaveValue("");
  await expect(page.getByLabel("我了解并同意上述必要信息")).not.toBeChecked();
});
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
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.anyu",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await page.getByLabel("备份密码").fill("testing-password-2026");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "解密并恢复" }).click();
  await expect(page.getByLabel("希望先实现的变化")).toHaveValue("calm");
});
