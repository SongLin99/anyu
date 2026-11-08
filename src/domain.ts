export type EventKind = "urge" | "wave" | "clear";
export type Entry = {
  id: string;
  kind: EventKind;
  at: string;
  createdAt: string;
  updatedAt: string;
  feeling: string;
  intensity: number;
  note: string;
  feedback?: string;
  feedbackSource?: "ai" | "card";
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string;
  source?: "ai" | "card";
  entryId?: string;
};
export type Profile = {
  reason: string;
  goal: string;
  startedAt: string;
  name: string;
};
export type Settings = {
  aiConsent: boolean;
  endpoint: string;
  accessCode: string;
  gentleWords: boolean;
  reminder: boolean;
  reminderTime: string;
};
export type State = {
  version: 1;
  profile: Profile | null;
  settings: Settings;
  entries: Entry[];
  messages: Message[];
  completed: string[];
};
export const reasons = [
  {
    id: "body",
    icon: "🪞",
    title: "担心体形的变化",
    subtitle: "吃完后，很害怕自己变胖",
    practice: "把「我感觉变胖了」与此刻的情绪、饱胀感分开记录。",
  },
  {
    id: "guilt",
    icon: "☁️",
    title: "内疚，或失去了控制",
    subtitle: "觉得吃多了，想要弥补",
    practice: "留意一句严格的饮食规则，看看它给你带来了什么压力。",
  },
  {
    id: "comparison",
    icon: "🩰",
    title: "评价与比较的压力",
    subtitle: "考核、镜子，或别人的一句话",
    practice: "把今天听到的评价，与「我如何看待自己」分开写下来。",
  },
  {
    id: "emotion",
    icon: "🌧️",
    title: "情绪有一点装不下",
    subtitle: "想让紧绷的自己好受一些",
    practice: "为此刻的情绪取一个名字，再选一个愿意联系的人。",
  },
  {
    id: "habit",
    icon: "🌿",
    title: "好像已经成了习惯",
    subtitle: "有时还没想清楚，就发生了",
    practice: "找到一个常出现冲动的时间或地点，提前放进一个支持动作。",
  },
  {
    id: "explore",
    icon: "✨",
    title: "我还说不清楚",
    subtitle: "没关系，我想慢慢了解自己",
    practice: "简单记下发生前后的情境，不必急着解释自己。",
  },
];
export const goals = [
  {
    id: "cope",
    icon: "🌱",
    title: "冲动来了，多一个办法",
    action: "选择一个能让你稍微安定的支持动作，放在随手可见的地方。",
    review: "哪些支持方式对我有帮助？",
  },
  {
    id: "reduce",
    icon: "🫶",
    title: "减少发生，照顾身体",
    action: "为一个容易发生的时段安排支持，并为身体评估准备一段说明。",
    review: "发生情况有没有变化？是否出现禁食、加练等其他补偿？",
  },
  {
    id: "calm",
    icon: "🍵",
    title: "吃完饭后，更平静一点",
    action: "为餐后留一段舒服的陪伴时间，可以安静坐着或联系朋友。",
    review: "餐后的困扰，与上周相比有什么不同？",
  },
  {
    id: "kind",
    icon: "🌷",
    title: "少一点自责，多一点生活",
    action: "用描述事实的一句话，替换一句责备自己的话。",
    review: "生活里有没有多一点属于自己的空间？",
  },
  {
    id: "understand",
    icon: "🔎",
    title: "先了解自己的规律",
    action: "留下一次简短记录，观察情境、感受和行为之间的关联。",
    review: "我发现了什么？又有哪些地方还不确定？",
  },
];
export const feelings = [
  "害怕",
  "内疚",
  "紧绷",
  "委屈",
  "疲惫",
  "说不清",
  "平静一些",
];
export const makeId = () => crypto.randomUUID();
export const dayKey = (date: string | Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function localDateTime(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export const initialState = (): State => ({
  version: 1,
  profile: null,
  settings: {
    aiConsent: false,
    endpoint: import.meta.env.VITE_SUPPORT_ENDPOINT || "",
    accessCode: "",
    gentleWords: true,
    reminder: false,
    reminderTime: "21:00",
  },
  entries: [],
  messages: [],
  completed: [],
});
export function putEntry(entries: Entry[], entry: Entry) {
  const day = dayKey(entry.at);
  const filtered = entries.filter(
    (e) =>
      e.id !== entry.id &&
      !(
        dayKey(e.at) === day &&
        ((entry.kind === "wave" && e.kind === "clear") ||
          (entry.kind === "clear" && e.kind === "clear"))
      ),
  );
  if (
    entry.kind === "clear" &&
    filtered.some((e) => e.kind === "wave" && dayKey(e.at) === day)
  )
    throw Error("这一天已有发生记录，请先核对记录，再确认当天没有发生。");
  return [...filtered, entry].sort((a, b) => b.at.localeCompare(a.at));
}
export function stats(state: State) {
  const recorded = new Set(state.entries.map((e) => dayKey(e.at))).size;
  const days = state.profile
    ? Math.max(
        1,
        Math.floor(
          (new Date(dayKey(new Date())).getTime() -
            new Date(dayKey(state.profile.startedAt)).getTime()) /
            86400000,
        ) + 1,
      )
    : 0;
  const week = state.entries.filter(
    (e) => Date.now() - new Date(e.at).getTime() < 7 * 86400000,
  );
  return {
    recorded,
    days,
    waves: week.filter((e) => e.kind === "wave").length,
    urges: week.filter((e) => e.kind === "urge").length,
  };
}
export function cardFor(e: Entry) {
  if (dayKey(e.at) !== dayKey(new Date()))
    return "谢谢你补上那天的经历，它能帮助我们更准确地理解哪些时刻需要支持。";
  if (e.kind === "wave")
    return "这次经历不会抹掉之前的努力，先照顾身体，也可以找一个信任的人陪陪你。";
  if (e.kind === "clear")
    return "谢谢你留意今天的自己，平静与不容易的时刻，都值得被认真看见。";
  return "冲动出现时，你仍可以为自己留一点空间，先选一个此刻愿意接受的支持。";
}
export function isUrgent(t: string) {
  return /呕血|吐血|胸痛|呼吸困难|昏倒|晕厥|意识不清|不想活|自杀|结束生命/.test(
    t,
  );
}
export const urgentText =
  "如果有呕血、胸痛、晕厥或呼吸困难，请立即联系急诊或拨打120，并请身边的人陪同；如果可能伤害自己，请立即联系急救和可信任的人。";
export const planFor = (p: Profile) => ({
  reason: reasons.find((r) => r.id === p.reason) || reasons[5],
  goal: goals.find((g) => g.id === p.goal) || goals[0],
});
