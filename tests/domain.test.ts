import test from "node:test";
import assert from "node:assert/strict";
import {
  putEntry,
  reasons,
  goals,
  planFor,
  cardFor,
  pruneMessages,
  type Entry,
} from "../src/domain";
const entry = (kind: Entry["kind"], id: string): Entry => ({
  id,
  kind,
  at: "2026-10-01T12:00:00.000Z",
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
  feeling: "害怕",
  intensity: 5,
  note: "",
});
test("all 30 reason/goal combinations produce personalized plans", () => {
  for (const r of reasons)
    for (const g of goals) {
      const p = planFor({
        reason: r.id,
        goal: g.id,
        startedAt: "2026-01-01",
        name: "",
      });
      assert.equal(p.reason.id, r.id);
      assert.equal(p.goal.id, g.id);
      assert.ok(p.reason.practice && p.goal.action);
    }
});
test("wave replaces same-day absence confirmation, not urges", () => {
  const result = putEntry(
    [entry("clear", "c"), entry("urge", "u")],
    entry("wave", "w"),
  );
  assert.deepEqual(result.map((e) => e.id).sort(), ["u", "w"]);
});
test("cannot mark no occurrence on a day containing a wave", () =>
  assert.throws(() => putEntry([entry("wave", "w")], entry("clear", "c"))));
test("editing one record does not duplicate it", () => {
  const e = entry("urge", "a");
  assert.equal(putEntry([e], { ...e, note: "更新" }).length, 1);
});
test("backfilled feedback does not pretend it just happened", () =>
  assert.match(cardFor(entry("wave", "w")), /补上那天/));
test("deleting a source also removes AI messages derived from that source", () => {
  const messages = [
    {
      id: "direct",
      role: "assistant" as const,
      content: "record feedback",
      at: "2026-01-01",
      entryId: "w",
    },
    {
      id: "derived",
      role: "assistant" as const,
      content: "derived memory",
      at: "2026-01-01",
      contextEntryIds: ["w"],
    },
    {
      id: "independent",
      role: "user" as const,
      content: "my own words",
      at: "2026-01-01",
    },
  ];
  assert.deepEqual(
    pruneMessages(messages, ["w"]).map((m) => m.id),
    ["independent"],
  );
});
