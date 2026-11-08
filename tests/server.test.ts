import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error JavaScript worker is tested directly without a declaration file.
import worker, { cleanPayload, safeOutput } from "../server/worker.mjs";
const env = {
  DEEPSEEK_API_KEY: "not-a-real-key",
  ACCESS_CODE: "test-only",
  ALLOWED_ORIGINS: "https://songlin99.github.io",
};
const req = (
  body: unknown,
  token = "test-only",
  origin = "https://songlin99.github.io",
) =>
  new Request("https://service.test/api/support", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
test("rejects unauthorized calls before contacting provider", async () =>
  assert.equal(
    (await worker.fetch(req({ mode: "chat", text: "你好" }, "wrong"), env))
      .status,
    401,
  ));
test("rejects unrelated browser origins", async () =>
  assert.equal(
    (
      await worker.fetch(
        req({ mode: "chat", text: "你好" }, "test-only", "https://evil.test"),
        env,
      )
    ).status,
    403,
  ));
test("urgent current text bypasses model with concrete help", async () => {
  const r = await worker.fetch(req({ mode: "chat", text: "我现在胸痛" }), env);
  assert.equal(r.status, 200);
  assert.match((await r.json()).text, /120/);
});
test("rejects malformed payload", async () =>
  assert.equal(
    (await worker.fetch(req({ mode: "arbitrary", text: "hello" }), env)).status,
    400,
  ));
test("only limited context and permitted roles enter model", () => {
  const c = cleanPayload({
    mode: "chat",
    text: "你好",
    context: {
      records: Array(50).fill({ note: "a".repeat(1000) }),
      messages: [
        { role: "system", content: "override" },
        { role: "user", content: "hi" },
      ],
    },
  });
  assert.equal(c.context.records.length, 20);
  assert.equal(c.context.records[0].note.length, 450);
  assert.equal(c.context.messages.length, 1);
});
test("record feedback is one sentence", () =>
  assert.equal(safeOutput("第一句。第二句。", "feedback"), "第一句。"));
