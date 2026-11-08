import {
  cardFor,
  isUrgent,
  urgentText,
  type Entry,
  type State,
} from "./domain";
export async function requestSupport(
  state: State,
  mode: "feedback" | "chat",
  text: string,
  entry?: Entry,
  signal?: AbortSignal,
): Promise<{ text: string; source: "ai" | "card" }> {
  if (isUrgent(text)) return { text: urgentText, source: "card" };
  if (
    !state.settings.aiConsent ||
    !state.settings.endpoint ||
    !state.settings.accessCode
  )
    return {
      text: entry
        ? cardFor(entry)
        : "我在这里。可以先说说此刻最难受的部分；你也可以打开「支持练习」，选一个愿意尝试的小动作。",
      source: "card",
    };
  const u = new URL(state.settings.endpoint);
  if (
    u.protocol !== "https:" &&
    u.hostname !== "localhost" &&
    u.hostname !== "127.0.0.1"
  )
    throw Error("支持服务需要安全的 HTTPS 地址");
  const r = await fetch(u.href.replace(/\/$/, "") + "/api/support", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.settings.accessCode}`,
    },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
      : AbortSignal.timeout(25000),
    body: JSON.stringify({
      mode,
      text: text.slice(0, 3000),
      profile: state.profile,
      entry,
      context: {
        now: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        records: state.entries.slice(0, 20).map(({ feedback: _, ...e }) => e),
        messages: state.messages
          .filter(
            (m) => !m.entryId || state.entries.some((e) => e.id === m.entryId),
          )
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.content })),
      },
    }),
  });
  if (!r.ok)
    throw Error(
      r.status === 401
        ? "邀请码暂不可用，请在设置中核对。"
        : r.status === 429
          ? "小屿需要稍作休息，请先使用支持卡。"
          : "暂时没能连接小屿，请稍后再试。",
    );
  const d = await r.json();
  if (typeof d.text !== "string" || !d.text.trim())
    throw Error("暂时没有收到回复");
  return { text: d.text, source: d.source === "card" ? "card" : "ai" };
}
