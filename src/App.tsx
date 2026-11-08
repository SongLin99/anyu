import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  Flower2,
  Heart,
  Home,
  Leaf,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wind,
  X,
  Pencil,
  Upload,
  Phone,
  WifiOff,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Mascot, Garden } from "./Mascot";
import {
  cardFor,
  dayKey,
  feelings,
  goals,
  initialState,
  isUrgent,
  localDateTime,
  makeId,
  planFor,
  putEntry,
  reasons,
  stats,
  urgentText,
  type Entry,
  type EventKind,
  type Message,
  type State,
} from "./domain";
import {
  eraseState,
  exportBackup,
  importBackup,
  loadState,
  saveState,
} from "./storage";
import { requestSupport } from "./ai";
type Page = "home" | "records" | "plan" | "chat" | "support" | "settings";
type Modal =
  | "record"
  | "breathe"
  | "ground"
  | "connect"
  | "review"
  | "privacy"
  | "evidence"
  | "urgent"
  | "backup"
  | "import"
  | "cycle"
  | null;
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const nav = [
  { id: "home", label: "今天", icon: Home },
  { id: "records", label: "我的记录", icon: CalendarDays },
  { id: "plan", label: "小小计划", icon: Leaf },
  { id: "chat", label: "和小屿聊聊", icon: MessageCircle },
  { id: "support", label: "支持练习", icon: Heart },
] as const;
const dateLabel = (s: string) =>
  new Date(s).toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const tasks = [
  ["notice", "看见自己的感受", "不急着改变，先听听自己此刻的心情。"],
  ["practice", "试试今天的小练习", "一个愿意尝试的小动作，就很好。"],
  ["record", "留下一小段记录", "真实就足够，不需要写得完整。"],
];
export default function App() {
  const [state, setState] = useState<State | null>(null),
    [loadError, setLoadError] = useState(""),
    [page, setPage] = useState<Page>("home"),
    [modal, setModal] = useState<Modal>(null),
    [toast, setToast] = useState(""),
    [editing, setEditing] = useState<Entry | null>(null),
    [recordKind, setRecordKind] = useState<EventKind>("urge"),
    [recordDate, setRecordDate] = useState(localDateTime()),
    [recordFeeling, setRecordFeeling] = useState("说不清"),
    [intensity, setIntensity] = useState(5),
    [note, setNote] = useState(""),
    [recordError, setRecordError] = useState(""),
    [busy, setBusy] = useState(false),
    [chatBusy, setChatBusy] = useState(false),
    [chatText, setChatText] = useState(""),
    [selectedDay, setSelectedDay] = useState(dayKey(new Date())),
    [month, setMonth] = useState(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [backupPassword, setBackupPassword] = useState(""),
    [backupText, setBackupText] = useState(""),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [online, setOnline] = useState(navigator.onLine);
  const stateRef = useRef(state),
    chatEnd = useRef<HTMLDivElement>(null),
    generation = useRef(0),
    controllers = useRef(new Set<AbortController>()),
    lastReminder = useRef("");
  stateRef.current = state;
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 4500);
  };
  useEffect(() => {
    loadState()
      .then(setState)
      .catch(() =>
        setLoadError(
          "暂时无法打开本机记录。请检查是否允许网站存储，或改用普通浏览窗口；已有数据不会被自动覆盖。",
        ),
      );
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    const up = () => setOnline(navigator.onLine);
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", up);
    };
  }, []);
  useEffect(() => {
    if (state)
      saveState(state).catch(() =>
        notify("记录未能保存到设备，请检查可用空间并及时导出备份。"),
      );
  }, [state]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state?.messages.length, chatBusy]);
  useEffect(() => {
    if (!state?.settings.reminder || Capacitor.isNativePlatform()) return;
    const check = () => {
      const now = new Date(),
        key = dayKey(now);
      if (
        localDateTime(now).slice(11, 16) === state.settings.reminderTime &&
        lastReminder.current !== key
      ) {
        lastReminder.current = key;
        notify("愿意留一点时间，看看今天的自己吗？");
        if ("Notification" in window && Notification.permission === "granted")
          new Notification("给自己一小段时间", {
            body: "今天的小计划，可以按你的节奏来。",
            icon: import.meta.env.BASE_URL + "icon-192.png",
          });
      }
    };
    const id = window.setInterval(check, 30000);
    return () => clearInterval(id);
  }, [state?.settings.reminder, state?.settings.reminderTime]);
  const patch = (fn: (s: State) => State) => setState((s) => (s ? fn(s) : s));
  const openRecord = (kind: EventKind, entry?: Entry, date?: string) => {
    setEditing(entry || null);
    setRecordKind(entry?.kind || kind);
    setRecordDate(
      entry
        ? localDateTime(new Date(entry.at))
        : date
          ? date + "T12:00"
          : localDateTime(),
    );
    setRecordFeeling(entry?.feeling || "说不清");
    setIntensity(entry?.intensity ?? 5);
    setNote(entry?.note || "");
    setRecordError("");
    setModal("record");
  };
  const changePage = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const invalidate = () => {
    generation.current++;
    controllers.current.forEach((c) => c.abort());
    controllers.current.clear();
    setChatBusy(false);
  };
  const deleteEntry = (id: string) => {
    if (!window.confirm("删除这条记录？相关的小屿反馈也会从共享记忆移除。"))
      return;
    invalidate();
    patch((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== id),
      messages: s.messages.filter((m) => m.entryId !== id),
    }));
    notify("这条记录和相关反馈已移除。");
  };
  async function submitEntry() {
    if (!state) return;
    setRecordError("");
    const at = new Date(recordDate);
    if (!Number.isFinite(at.getTime()) || at.getTime() > Date.now() + 60000) {
      setRecordError("请选择已经发生的时间。");
      return;
    }
    const now = new Date().toISOString();
    const e: Entry = {
      id: editing?.id || makeId(),
      kind: recordKind,
      at: at.toISOString(),
      createdAt: editing?.createdAt || now,
      updatedAt: now,
      feeling: recordFeeling,
      intensity: recordKind === "clear" ? 0 : intensity,
      note: note.trim().slice(0, 1000),
    };
    let entries: Entry[];
    try {
      entries = putEntry(state.entries, e);
    } catch (err) {
      setRecordError((err as Error).message);
      return;
    }
    invalidate();
    const feedback = cardFor(e);
    e.feedback = feedback;
    e.feedbackSource = "card";
    entries = putEntry(entries, e);
    const removedIds = state.entries
      .filter((x) => !entries.some((y) => y.id === x.id) || x.id === e.id)
      .map((x) => x.id);
    const msg: Message = {
      id: makeId(),
      role: "assistant",
      content: feedback,
      at: now,
      source: "card",
      entryId: e.id,
    };
    const snapshot = {
      ...state,
      entries,
      messages: [
        ...state.messages.filter(
          (m) => !m.entryId || !removedIds.includes(m.entryId),
        ),
        msg,
      ],
    };
    setState(snapshot);
    setModal(isUrgent(e.note) ? "urgent" : null);
    setSelectedDay(dayKey(e.at));
    notify("已经记下了，小屿留了一句话给你。");
    if (isUrgent(e.note)) {
      patch((s) => ({
        ...s,
        entries: s.entries.map((x) =>
          x.id === e.id ? { ...x, feedback: urgentText } : x,
        ),
        messages: s.messages.map((m) =>
          m.id === msg.id ? { ...m, content: urgentText } : m,
        ),
      }));
      return;
    }
    const token = generation.current,
      controller = new AbortController();
    controllers.current.add(controller);
    try {
      const reply = await requestSupport(
        snapshot,
        "feedback",
        `记录类型：${e.kind}；感受：${e.feeling}；备注：${e.note}`,
        e,
        controller.signal,
      );
      if (token !== generation.current) return;
      patch((s) => {
        const live = s.entries.find((x) => x.id === e.id);
        if (!live || live.updatedAt !== e.updatedAt) return s;
        return {
          ...s,
          entries: s.entries.map((x) =>
            x.id === e.id
              ? { ...x, feedback: reply.text, feedbackSource: reply.source }
              : x,
          ),
          messages: s.messages.map((m) =>
            m.id === msg.id
              ? { ...m, content: reply.text, source: reply.source }
              : m,
          ),
        };
      });
    } catch {
      if (token === generation.current && snapshot.settings.aiConsent)
        notify("记录已保存，暂用小屿支持卡陪你。");
    } finally {
      controllers.current.delete(controller);
    }
  }
  async function sendChat(text = chatText) {
    text = text.trim();
    if (!state || !text || chatBusy) return;
    setChatText("");
    const user: Message = {
      id: makeId(),
      role: "user",
      content: text.slice(0, 3000),
      at: new Date().toISOString(),
    };
    const snapshot = { ...state, messages: [...state.messages, user] };
    setState(snapshot);
    setChatBusy(true);
    const token = generation.current,
      controller = new AbortController();
    controllers.current.add(controller);
    try {
      const reply = await requestSupport(
        state,
        "chat",
        text,
        undefined,
        controller.signal,
      );
      if (token === generation.current)
        patch((s) => ({
          ...s,
          messages: [
            ...s.messages,
            {
              id: makeId(),
              role: "assistant",
              content: reply.text,
              at: new Date().toISOString(),
              source: reply.source,
            },
          ],
        }));
      if (isUrgent(text)) setModal("urgent");
    } catch (err) {
      if (token === generation.current) {
        notify((err as Error).message);
        patch((s) => ({
          ...s,
          messages: [
            ...s.messages,
            {
              id: makeId(),
              role: "assistant",
              content:
                "刚才暂时没能连接。我为你保留了一张支持卡：先让自己坐得舒服一点，看看身边有没有一个愿意陪你的人。",
              at: new Date().toISOString(),
              source: "card",
            },
          ],
        }));
      }
    } finally {
      controllers.current.delete(controller);
      if (token === generation.current) setChatBusy(false);
    }
  }
  async function setReminder(
    enabled: boolean,
    time = state?.settings.reminderTime || "21:00",
  ) {
    try {
      if (Capacitor.isNativePlatform()) {
        if (enabled) {
          const permission = await LocalNotifications.requestPermissions();
          if (permission.display !== "granted")
            throw Error("可以在手机设置中允许安屿发送提醒。");
        }
        await LocalNotifications.cancel({ notifications: [{ id: 1001 }] });
        if (enabled) {
          const [hour, minute] = time.split(":").map(Number);
          await LocalNotifications.schedule({
            notifications: [
              {
                id: 1001,
                title: "给自己一小段时间",
                body: "今天的小计划，可以按你的节奏来。",
                schedule: { on: { hour, minute }, allowWhileIdle: true },
              },
            ],
          });
        }
      } else if (
        enabled &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        await Notification.requestPermission();
      }
      patch((s) => ({
        ...s,
        settings: { ...s.settings, reminder: enabled, reminderTime: time },
      }));
      notify(enabled ? "温和提醒已开启。" : "提醒已暂停。");
    } catch (err) {
      notify((err as Error).message);
    }
  }
  async function download(
    text: string,
    name: string,
    type = "application/json",
  ) {
    try {
      if (Capacitor.isNativePlatform()) {
        const file = await Filesystem.writeFile({
          path: name,
          data: text,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "保存安屿记录",
          url: file.uri,
          dialogTitle: "选择保存位置或分享对象",
        });
        return;
      }
      const u = URL.createObjectURL(new Blob([text], { type }));
      const a = document.createElement("a");
      a.href = u;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } catch {
      notify("暂时无法导出，请检查系统文件分享权限。");
    }
  }
  if (loadError)
    return (
      <div className="loading">
        <div>
          <Mascot />
          <p className="error">{loadError}</p>
          <button className="primary" onClick={() => location.reload()}>
            重新打开
          </button>
        </div>
      </div>
    );
  if (!state)
    return (
      <div className="loading">
        <div>
          <Mascot />
          <p className="muted">正在为你留一小块安静的地方…</p>
        </div>
      </div>
    );
  const plan = state.profile ? planFor(state.profile) : null,
    s = stats(state),
    today = dayKey(new Date()),
    done = tasks.filter(([id]) =>
      state.completed.includes(today + ":" + id),
    ).length;
  const label = (kind: EventKind) =>
    kind === "urge"
      ? "冲动来了"
      : kind === "clear"
        ? "确认没有发生"
        : state.settings.gentleWords
          ? "经历了风浪"
          : "催吐发生";
  const toggleTask = (id: string) => {
    patch((st) => ({
      ...st,
      completed: st.completed.includes(today + ":" + id)
        ? st.completed.filter((x) => x !== today + ":" + id)
        : [...st.completed, today + ":" + id],
    }));
    if (!state.completed.includes(today + ":" + id))
      notify("愿意尝试这一步，就值得被看见。");
  };
  const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate(),
    firstDay = (month.getDay() + 6) % 7;
  const visibleEntries = state.entries.filter(
    (e) => dayKey(e.at) === selectedDay,
  );
  const aiReady =
    state.settings.aiConsent &&
    !!state.settings.endpoint &&
    !!state.settings.accessCode;
  const modalContent: Record<
    Exclude<Modal, "record" | "backup" | "import" | null>,
    { title: string; body: ReactNode }
  > = {
    breathe: {
      title: "让此刻慢一点",
      body: (
        <>
          <p className="muted">
            不用刻意深呼吸。舒服地坐好，按自己的节奏自然呼吸，身体不适时请停止并获得帮助。
          </p>
          <div className="breathing">按自己的节奏</div>
          <p className="legal">
            动画只是陪伴，不是必须完成的任务。冲动没有减轻，也不是你的错。
          </p>
          <div className="footer-actions">
            <button className="secondary" onClick={() => setModal("connect")}>
              找个人陪我
            </button>
            <button className="primary" onClick={() => openRecord("urge")}>
              记下此刻
            </button>
          </div>
        </>
      ),
    },
    ground: {
      title: "回到身边的小世界",
      body: (
        <div className="stack">
          <p>先把脚放在舒服的位置，看看此刻身边有哪些东西。</p>
          <div className="note-box">
            🌿 看见：找一件颜色让你舒服的物品。
            <br />
            ☁️ 听见：留意一种不需要回应的声音。
            <br />
            🫶 感受：摸摸衣袖，或靠在椅背上。
            <br />
            🍵 选择：现在愿意联系谁，或去哪里获得支持？
          </div>
          <p className="legal">可以只做其中一项，不需要完成全部。</p>
          <button className="primary" onClick={() => openRecord("urge")}>
            留下一个简短记录
          </button>
        </div>
      ),
    },
    connect: {
      title: "让一个人陪陪你",
      body: (
        <div className="stack">
          <p>可以是朋友、家人、校心理中心，或熟悉你的专业人员。</p>
          <div className="note-box">
            我现在有一点难受，不需要你马上给建议。你愿意陪我待一会儿，或者和我说说话吗？
          </div>
          <button
            className="secondary"
            onClick={() => {
              navigator.clipboard
                .writeText(
                  "我现在有一点难受，不需要你马上给建议。你愿意陪我待一会儿，或者和我说说话吗？",
                )
                .then(() => notify("求助的话已复制，你可以选择发送给谁。"))
                .catch(() => notify("可以长按选择并复制这段话。"));
            }}
          >
            复制这段话
          </button>
          <p className="legal">
            准备就医时也可以这样说：「我最近有主动催吐的情况，想了解身体是否受到影响，以及能获得哪些帮助。」
          </p>
          <button className="text-button" onClick={() => setModal("urgent")}>
            身体不舒服时，如何获得帮助 →
          </button>
        </div>
      ),
    },
    review: {
      title: "这周，我们一起看看",
      body: (
        <div className="stack">
          <div className="stat-grid">
            <div>
              <div className="stat-num">{s.waves}</div>
              <div className="stat-label">近7天发生次数</div>
            </div>
            <div>
              <div className="stat-num">{s.urges}</div>
              <div className="stat-label">近7天冲动记录</div>
            </div>
            <div>
              <div className="stat-num">{s.recorded}</div>
              <div className="stat-label">累计记录天数</div>
            </div>
          </div>
          <p className="legal">
            未记录的时间仍然是未知，不会算作「没有发生」。数字只是理解经历的线索。
          </p>
          <div className="review-lines">
            <p>🌱 {plan?.goal.review}</p>
            <p>☁️ 有没有以禁食、加练或药物来补偿的情况？</p>
            <p>🫶 是否需要更多身体或心理上的专业支持？</p>
            <p>
              🍃
              使用安屿是否反而增加了焦虑或记录压力？如果有，可以放慢并寻求支持。
            </p>
          </div>
          <button
            className="primary"
            onClick={() => {
              setModal(null);
              changePage("chat");
              setChatText("我想一起回顾最近一周的经历。");
            }}
          >
            和小屿聊聊
          </button>
          <p className="legal">
            症状增加、身体不适或持续没有改善时，请及时获得专业评估，不必等计划结束。
          </p>
        </div>
      ),
    },
    privacy: {
      title: "关于你的隐私",
      body: (
        <div className="legal">
          <p>
            你的目标、记录与聊天默认保存在当前设备的浏览器存储中，并使用 AES-GCM
            加密；同一设备上能访问本应用的人仍可能读取解锁后的内容。清理浏览器数据、卸载或更换设备可能丢失记录，请及时导出加密备份。
          </p>
          <ul className="privacy-details">
            <li>不收集体重、热量或身体照片，不向教师、学校或家人自动分享。</li>
            <li>
              只有你开启 AI 支持并填写邀请码后，才向代理服务及 DeepSeek
              发送当前请求、目标、最近最多20条记录与12条对话。不要填写真实姓名、学校或其他可识别信息。
            </li>
            <li>
              本项目代理不持久化对话正文。服务商仍可能按其自身政策处理请求和连接信息；使用前请阅读
              DeepSeek 隐私政策。
            </li>
            <li>
              删除记录会移除关联的反馈和记忆引用，但不能撤回已发送给第三方的请求。
            </li>
            <li>
              这是供18岁以上人群使用的恢复辅助原型，不提供诊断、实时监护或人工值守。
            </li>
          </ul>
          <a
            href="https://cdn.deepseek.com/policies/zh-CN/deepseek-privacy-policy.html"
            target="_blank"
            rel="noreferrer"
          >
            DeepSeek 隐私政策 ↗
          </a>
        </div>
      ),
    },
    evidence: {
      title: "你不是一个人，也值得获得支持",
      body: (
        <div className="stack">
          <p>
            研究关注到了舞蹈专业学生的进食困扰，但进食障碍风险筛查不能等同于催吐发生率。
          </p>
          <div className="note-box">
            薛晶晶等（2025）调查了北京舞蹈学院80名学生，其中女生57名、男生23名。研究报告进食态度和限制性进食结果，没有单独报告催吐人数，也没有评估本
            App 的效果。
          </div>
          <p>进食障碍可以获得帮助和治疗。恢复可能需要时间，不必独自承担。</p>
          <div className="inline-links">
            <a
              href="https://doi.org/10.1016/j.psc.2010.04.004"
              target="_blank"
              rel="noreferrer"
            >
              认知行为治疗综述 ↗
            </a>
            <a
              href="https://doi.org/10.1186/s40337-025-01390-z"
              target="_blank"
              rel="noreferrer"
            >
              治疗参与策略 ↗
            </a>
            <a
              href="https://www.nice.org.uk/guidance/ng69"
              target="_blank"
              rel="noreferrer"
            >
              临床指南 ↗
            </a>
          </div>
          <p className="legal">
            安屿借鉴合作、自我观察与支持练习的思路，尚未通过临床试验证明疗效。
          </p>
        </div>
      ),
    },
    urgent: {
      title: "先照顾身体，及时获得帮助",
      body: (
        <div className="stack">
          <div className="note-box warning">{urgentText}</div>
          <a className="primary out-link" href="tel:120">
            <Phone size={17} />
            拨打120
          </a>
          <p>
            持续催吐即使没有明显不适，也值得尽早安排身体和进食问题评估。App
            无法判断电解质或心脏状况。
          </p>
          <button className="secondary" onClick={() => setModal("connect")}>
            准备一段求助的话
          </button>
          <p className="legal">
            这里没有人工实时监护。没有以上症状，也不代表身体一定安全。
          </p>
        </div>
      ),
    },
    cycle: {
      title: "慢慢看见自己的循环",
      body: (
        <div className="stack">
          <p>这些是理解经历的线索，不是对你的判断。</p>
          {[
            "发生前：情境、评价、压力，或一段没有按时进食的时间",
            "脑海里：我当时对自己说了什么？",
            "感受：情绪、身体感觉，以及冲动",
            "行动之后：短暂发生了什么，后来又有什么感受",
          ].map((t, i) => (
            <div className="note-box" key={t}>
              {i + 1}. {t}
            </div>
          ))}
          <p className="legal">
            不必有暴食才会出现催吐冲动。觉得「吃多了」也不等于客观上发生了暴食。
          </p>
          <button className="primary" onClick={() => openRecord("urge")}>
            从一次记录开始
          </button>
        </div>
      ),
    },
  };
  const dialog = modal ? (
    <div className="modal-shade" onClick={() => !busy && setModal(null)}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          modal === "record"
            ? "留下一次记录"
            : modal === "backup"
              ? "加密备份"
              : modal === "import"
                ? "恢复备份"
                : modalContent[modal].title
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="title">
          <h2>
            {modal === "record"
              ? editing
                ? "修改这次记录"
                : "留下一次记录"
              : modal === "backup"
                ? "给记录一个备份"
                : modal === "import"
                  ? "从备份中恢复"
                  : modalContent[modal].title}
          </h2>
          <button
            className="icon-button"
            aria-label="关闭"
            onClick={() => setModal(null)}
          >
            <X size={20} />
          </button>
        </div>
        {modal === "record" ? (
          <>
            <div className="row" style={{ marginBottom: 18, flexWrap: "wrap" }}>
              <button
                className="pill"
                onClick={() =>
                  setModal(recordKind === "urge" ? "ground" : "connect")
                }
              >
                {recordKind === "urge" ? "先陪我缓一缓" : "找个人陪陪我"}
              </button>
              <button
                className="text-button"
                onClick={() => setModal("urgent")}
              >
                身体不舒服，需要帮助？
              </button>
            </div>
            <div className="field">
              <label>这一次，你想记下什么？</label>
              <div className="chips">
                {(["urge", "wave", "clear"] as EventKind[]).map((k) => (
                  <button
                    className={"chip " + (recordKind === k ? "active" : "")}
                    key={k}
                    onClick={() => setRecordKind(k)}
                  >
                    {label(k)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="event-time">发生的时间 · 可以补填</label>
              <input
                id="event-time"
                type="datetime-local"
                value={recordDate}
                max={localDateTime()}
                onChange={(e) => setRecordDate(e.target.value)}
              />
            </div>
            {recordKind !== "clear" && (
              <>
                <div className="field">
                  <label>此刻或当时的感受</label>
                  <div className="chips">
                    {feelings.map((f) => (
                      <button
                        key={f}
                        className={
                          "chip " + (recordFeeling === f ? "active" : "")
                        }
                        onClick={() => setRecordFeeling(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="intensity">困扰的强度：{intensity}</label>
                  <input
                    id="intensity"
                    type="range"
                    min="0"
                    max="10"
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                  />
                  <div className="range-labels">
                    <span>比较轻</span>
                    <span>很难承受</span>
                  </div>
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="event-note">想说的话 · 可不填</label>
              <textarea
                id="event-note"
                placeholder="发生了什么？一句话也可以，不必写得完整。"
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <p className="legal">
              「风浪」指催吐（自行诱发呕吐）的一次经历。记录冲动与实际发生是两件事。
              {recordKind === "clear"
                ? "请选择确认已经结束的一天，或在当天晚些时候核对。"
                : ""}
            </p>
            {recordError && (
              <p className="error" role="alert">
                {recordError}
              </p>
            )}
            <button className="primary wide" onClick={() => void submitEntry()}>
              <Check size={17} />
              保存，让小屿留一句话
            </button>
          </>
        ) : modal === "backup" || modal === "import" ? (
          <div className="stack">
            <p className="legal">
              备份会包含私人记录和聊天。请使用至少8位的独立密码；密码不会随文件保存，遗忘后无法恢复。导入会替换当前设备记录。
            </p>
            {modal === "import" && (
              <input
                type="file"
                accept=".json,.anyu"
                className="backup-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 5000000) {
                      notify("备份文件过大");
                      return;
                    }
                    f.text().then(setBackupText);
                  }
                }}
              />
            )}
            <label htmlFor="backup-password">备份密码</label>
            <input
              id="backup-password"
              type="password"
              autoComplete="new-password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
            />
            <button
              disabled={busy}
              className="primary"
              onClick={async () => {
                setBusy(true);
                try {
                  if (modal === "backup") {
                    download(
                      await exportBackup(state, backupPassword),
                      `安屿-加密备份-${today}.anyu`,
                    );
                    notify("已导出加密备份，请妥善保管。");
                  } else {
                    if (
                      !window.confirm("恢复备份会替换当前设备的记录，继续吗？")
                    )
                      return;
                    const restored = await importBackup(
                      backupText,
                      backupPassword,
                    );
                    invalidate();
                    setState(restored);
                    notify("记录已恢复，请重新确认 AI 授权与邀请码。");
                  }
                  setModal(null);
                  setBackupPassword("");
                  setBackupText("");
                } catch {
                  notify("未能完成，请核对文件和密码（密码至少8位）。");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? "正在处理…"
                : modal === "backup"
                  ? "导出加密备份"
                  : "解密并恢复"}
            </button>
          </div>
        ) : (
          modalContent[modal].body
        )}
      </section>
    </div>
  ) : null;
  if (!state.profile)
    return (
      <>
        <Onboarding
          onComplete={(reason, goal) =>
            patch((st) => ({
              ...st,
              profile: {
                reason,
                goal,
                startedAt: new Date().toISOString(),
                name: "",
              },
            }))
          }
          onHelp={() => setModal("urgent")}
          onEvidence={() => setModal("evidence")}
          onPrivacy={() => setModal("privacy")}
        />
        {dialog}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </>
    );
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <Leaf size={25} />
          </span>
          <div>
            <b>安屿</b>
            <small>A LITTLE SAFE PLACE</small>
          </div>
        </div>
        <nav className="nav" aria-label="主导航">
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => changePage(n.id)}
            >
              <n.icon size={19} />
              {n.label}
            </button>
          ))}
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => changePage("settings")}
          >
            <SettingsIcon size={19} />
            我的设置
          </button>
        </nav>
        <div className="side-bottom">
          <div className="mascot-wrap">
            <Mascot size={115} />
          </div>
          <p>
            每一种心情，
            <br />
            都有被温柔放下的地方。
          </p>
          <button className="text-button" onClick={() => setModal("privacy")}>
            <LockKeyhole size={11} /> 记录只属于你
          </button>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <span className="desktop-label">
            给自己一点空间，也给改变一点时间。
          </span>
          <span className="status">
            <i className="dot" />
            你的小小安全岛 {!online && <WifiOff size={13} />}
          </span>
          <div className="row">
            <span>
              {new Date().toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
            <button
              className="round-button"
              aria-label="打开设置"
              onClick={() => changePage("settings")}
            >
              <SettingsIcon size={15} />
            </button>
          </div>
        </header>
        {page === "home" && (
          <>
            <section className="intro">
              <span className="tag">A SOFTER DAY, AT YOUR PACE</span>
              <h1>
                {state.profile.name ? `${state.profile.name}，` : "嗨，"}
                今天也慢慢来 <span style={{ color: "#a4b68a" }}>✳</span>
              </h1>
              <p>不需要表现得很好，在这里，做你自己就好。</p>
            </section>
            {install && (
              <div className="install-banner">
                <Download size={18} />
                <span>把安屿放到桌面，需要时更容易找到。</span>
                <button
                  className="text-button"
                  onClick={() => {
                    install.prompt();
                    setInstall(null);
                  }}
                >
                  添加到桌面
                </button>
                <button
                  aria-label="暂时关闭安装提示"
                  onClick={() => setInstall(null)}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="dashboard">
              <div className="stack">
                <div className="card hero-card">
                  <div className="hero-text">
                    <span className="leaf-label">YOUR LITTLE ISLAND</span>
                    <h2>
                      不必独自面对，
                      <br />
                      这里有一小片安静。
                    </h2>
                    <p>无论现在是什么心情，我们都从此刻开始。</p>
                  </div>
                  <div className="mascot-wrap">
                    <Mascot size={170} />
                  </div>
                </div>
                <div className="two-actions">
                  <button
                    className="action-card"
                    onClick={() => openRecord("urge")}
                  >
                    <span className="action-icon">
                      <Wind size={23} />
                    </span>
                    <strong>冲动来了，陪我一下</strong>
                    <small>先给自己一点缓冲的空间</small>
                    <ArrowRight className="arrow" size={17} />
                  </button>
                  <button
                    className="action-card peach"
                    onClick={() => openRecord("wave")}
                  >
                    <span className="action-icon">
                      <Heart size={22} />
                    </span>
                    <strong>刚刚经历了风浪</strong>
                    <small>先照顾自己，我们再慢慢说</small>
                    <ArrowRight className="arrow" size={17} />
                  </button>
                </div>
                <div className="card">
                  <div className="card-title">
                    <h2>
                      <Flower2 size={18} color="#8ca171" />
                      今天的小小计划
                    </h2>
                    <button
                      className="text-button"
                      onClick={() => changePage("plan")}
                    >
                      查看计划 <ChevronRight size={12} />
                    </button>
                  </div>
                  {tasks.map(([id, title, desc]) => (
                    <div
                      className={
                        "task " +
                        (state.completed.includes(today + ":" + id)
                          ? "done"
                          : "")
                      }
                      key={id}
                    >
                      <button
                        className={
                          "check " +
                          (state.completed.includes(today + ":" + id)
                            ? "done"
                            : "")
                        }
                        aria-label={title}
                        onClick={() => toggleTask(id)}
                      >
                        {state.completed.includes(today + ":" + id) && (
                          <Check size={14} />
                        )}
                      </button>
                      <div>
                        <h3>{title}</h3>
                        <p>
                          {id === "practice" ? plan?.reason.practice : desc}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="progress-track">
                    <span style={{ width: `${(done / 3) * 100}%` }} />
                  </div>
                </div>
                <div className="quote">
                  <Sparkles size={19} color="#b6ad8a" />
                  <span>
                    「改变不必从更用力开始，也可以从对自己温柔一点开始。」
                  </span>
                </div>
              </div>
              <div className="stack">
                <div className="card">
                  <div className="card-title">
                    <h2>
                      <Leaf size={17} color="#8ca171" />
                      一点一滴，都有意义
                    </h2>
                    <button
                      className="icon-button"
                      aria-label="查看每周回顾"
                      onClick={() => setModal("review")}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </div>
                  <div className="stat-grid">
                    <div>
                      <div className="stat-num">{s.recorded}</div>
                      <div className="stat-label">累计记录 / 天</div>
                    </div>
                    <div>
                      <div className="stat-num">{s.days}</div>
                      <div className="stat-label">开始照顾自己 / 天</div>
                    </div>
                    <div>
                      <div className="stat-num">{state.completed.length}</div>
                      <div className="stat-label">尝试的小行动 / 次</div>
                    </div>
                  </div>
                  <div className="week-bars">
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - 6 + i);
                      const count = state.entries.filter(
                        (e) => dayKey(e.at) === dayKey(d),
                      ).length;
                      return (
                        <div className="bar-col" key={i}>
                          <div
                            className={"bar " + (i === 6 ? "today" : "")}
                            style={{
                              height: count ? Math.min(63, 15 + count * 13) : 5,
                            }}
                          />
                          <span>
                            {
                              ["日", "一", "二", "三", "四", "五", "六"][
                                d.getDay()
                              ]
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="stats-foot">记录的痕迹，没有好坏之分。</div>
                </div>
                <div className="card companion-card">
                  <div className="avatar-badge">
                    <Mascot size={95} />
                  </div>
                  <h2>小屿，在这里</h2>
                  <p>
                    想说的话，可以慢慢说。
                    <br />
                    不必整理好情绪才来找我。
                  </p>
                  <button className="pill" onClick={() => changePage("chat")}>
                    <MessageCircle size={15} />
                    和小屿聊一聊 <ArrowRight size={13} />
                  </button>
                  <div className="bottom">AI 陪伴助手 · 按你的节奏</div>
                </div>
                <div className="card">
                  <div className="card-title">
                    <h2>
                      <BookOpen size={17} color="#9d987b" />
                      给自己一份理解
                    </h2>
                  </div>
                  <p className="legal">
                    进食的困扰，值得被认真看见。你不需要先证明自己足够严重，才值得获得支持。
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setModal("evidence")}
                  >
                    你不是一个人，了解更多 →
                  </button>
                  <div className="mini-garden">
                    <Garden />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {page === "records" && (
          <>
            <div className="page-head">
              <div>
                <h1>
                  我的记录 <span style={{ color: "#a6b48c" }}>◌</span>
                </h1>
                <p>留下真实的自己，不需要一张完美的日历。</p>
              </div>
              <button
                className="primary"
                onClick={() => openRecord("urge", undefined, selectedDay)}
              >
                <Plus size={17} />
                留一笔
              </button>
            </div>
            <div className="grid-two">
              <section className="card">
                <div className="calendar-head">
                  <button
                    className="icon-button"
                    aria-label="上个月"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h3>
                    {month.getFullYear()}年 {month.getMonth() + 1}月
                  </h3>
                  <button
                    className="icon-button"
                    aria-label="下个月"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="calendar">
                  {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
                    <span key={w} className="weekday">
                      {w}
                    </span>
                  ))}
                  {Array.from({ length: firstDay }, (_, i) => (
                    <span key={"blank" + i} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const key = dayKey(
                      new Date(month.getFullYear(), month.getMonth(), i + 1),
                    );
                    const entries = state.entries.filter(
                      (e) => dayKey(e.at) === key,
                    );
                    return (
                      <button
                        className={
                          "day " +
                          (key === today ? "current " : "") +
                          (key === selectedDay ? "selected" : "")
                        }
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        aria-label={`${key}，${entries.length}条记录`}
                      >
                        <span>{i + 1}</span>
                        <span className="day-marks">
                          {[...new Set(entries.map((e) => e.kind))].map((k) => (
                            <i className={"mark " + k} key={k} />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="legend">
                  <span>
                    <i className="mark urge" />
                    冲动记录
                  </span>
                  <span>
                    <i className="mark wave" />
                    {state.settings.gentleWords ? "风浪" : "催吐发生"}
                  </span>
                  <span>
                    <i className="mark clear" />
                    确认没有发生
                  </span>
                </div>
                <p className="month-caption">
                  空白代表尚未记录，可以以后补填。
                </p>
              </section>
              <section className="card">
                <div className="card-title">
                  <h2>
                    {new Date(selectedDay + "T12:00").toLocaleDateString(
                      "zh-CN",
                      { month: "long", day: "numeric" },
                    )}{" "}
                    · 这一天
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => setModal("review")}
                  >
                    本周回顾 →
                  </button>
                </div>
                {!visibleEntries.length ? (
                  <div className="empty">
                    <Cloud size={35} />
                    <p>这一天还没有留下记录。想起来时，随时可以补上。</p>
                    {selectedDay <= today && (
                      <button
                        className="secondary"
                        onClick={() =>
                          openRecord("urge", undefined, selectedDay)
                        }
                      >
                        补上这一笔
                      </button>
                    )}
                  </div>
                ) : (
                  visibleEntries.map((e) => (
                    <article className="entry" key={e.id}>
                      <div className="row between">
                        <div className="row">
                          <span className={"entry-icon " + e.kind}>
                            {e.kind === "wave"
                              ? "☁️"
                              : e.kind === "urge"
                                ? "🍃"
                                : "🌱"}
                          </span>
                          <div>
                            <div className="entry-title">{label(e.kind)}</div>
                            <div className="entry-meta">
                              {dateLabel(e.at)} ·{" "}
                              {e.kind === "clear"
                                ? "当天确认"
                                : `${e.feeling} / 困扰 ${e.intensity}`}{" "}
                              {dayKey(e.at) !== dayKey(e.createdAt)
                                ? " · 补填"
                                : ""}
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <button
                            className="icon-button"
                            aria-label="编辑记录"
                            onClick={() => openRecord(e.kind, e)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label="删除记录"
                            onClick={() => deleteEntry(e.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {e.note && <p className="entry-note">{e.note}</p>}
                      <div className="entry-feedback">
                        <span className="tiny">
                          {e.feedbackSource === "ai"
                            ? "小屿 · AI回应"
                            : "小屿 · 支持卡"}
                        </span>
                        <br />
                        {e.feedback || cardFor(e)}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => {
                          changePage("chat");
                          setChatText(`我想聊聊${dateLabel(e.at)}的这次经历。`);
                        }}
                      >
                        继续聊这件事 →
                      </button>
                    </article>
                  ))
                )}
              </section>
            </div>
            <div className="note-box" style={{ marginTop: 20 }}>
              每一条记录都可以修改或删除。补填不会改变发生时间，也不会把未记录的日子当作「没有发生」。
            </div>
          </>
        )}
        {page === "plan" && (
          <>
            <div className="page-head">
              <div>
                <h1>小小计划，慢慢长大</h1>
                <p>不追求连续，也不催你赶路。这里的每一步都可以调整。</p>
              </div>
              <button
                className="text-button"
                onClick={() => changePage("settings")}
              >
                调整我的方向 →
              </button>
            </div>
            <div className="grid-two">
              <div className="stack">
                <div className="card hero-card">
                  <span className="eyebrow">YOUR OWN PATH</span>
                  <h2 style={{ marginTop: 13 }}>{plan?.goal.title}</h2>
                  <p>从「{plan?.reason.title}」开始理解自己。</p>
                  <div className="mini-garden">
                    <Garden />
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">
                    <h2>
                      <Flower2 size={18} />
                      今天愿意试的一步
                    </h2>
                  </div>
                  <p>{plan?.reason.practice}</p>
                  <div className="note-box" style={{ marginTop: 18 }}>
                    {plan?.goal.action}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      toggleTask("practice");
                    }}
                  >
                    {state.completed.includes(today + ":practice")
                      ? "✓ 今天已经尝试过，再次点击可撤销"
                      : "我愿意试一试 →"}
                  </button>
                </div>
                <button
                  className="card support-tile"
                  onClick={() => setModal("cycle")}
                >
                  <span className="emoji">🌿</span>
                  <h3>看见自己的循环</h3>
                  <p>情境、想法、感受和行动，可能怎样互相影响？</p>
                </button>
              </div>
              <div className="card">
                <div className="card-title">
                  <h2>7天起步 · 按自己的节奏</h2>
                  <span className="badge">可反复使用</span>
                </div>
                {[
                  "认识自己，不急着下结论",
                  "为容易难受的时段准备支持",
                  "照顾进食与排练之间的空隙",
                  "留意一条让自己紧绷的规则",
                  "听听身体感受背后的情绪",
                  "找回一件与体形无关的小事",
                  "回顾这一周，调整下一步",
                ].map((t, i) => (
                  <div className="plan-day" key={t}>
                    <div className="number">0{i + 1}</div>
                    <div>
                      <h3>{t}</h3>
                      <p>
                        {i === 0
                          ? plan?.reason.practice
                          : i === 1
                            ? plan?.goal.action
                            : i === 6
                              ? plan?.goal.review
                              : "只选一个愿意尝试的动作，不需要完成全部。"}
                      </p>
                    </div>
                  </div>
                ))}
                <p className="legal" style={{ marginTop: 18 }}>
                  这是内容安排，不是康复期限。涉及进食、体重恢复或身体状况的个体化调整，请与专业人员一起进行。
                </p>
                <button
                  className="primary wide"
                  style={{ marginTop: 15 }}
                  onClick={() => setModal("review")}
                >
                  看看这一周
                </button>
              </div>
            </div>
          </>
        )}
        {page === "chat" && (
          <>
            <div className="page-head">
              <div>
                <h1>小屿，听你慢慢说</h1>
                <p>记得你的方向，也尊重你此刻的感受。</p>
              </div>
              <button
                className="text-button"
                onClick={() => changePage("settings")}
              >
                {aiReady ? "AI已连接 · 管理" : "开启AI陪伴 →"}
              </button>
            </div>
            <div className="chat-layout">
              <section className="card chat-card">
                <div className="chat-header row">
                  <Mascot size={46} />
                  <div>
                    <h3>小屿</h3>
                    <span className="tiny muted">
                      {aiReady
                        ? "AI 陪伴助手 · 非人工值守"
                        : "支持卡模式 · 可在设置中连接AI"}
                    </span>
                  </div>
                </div>
                <div className="chat-messages" role="log" aria-live="polite">
                  {!state.messages.length && (
                    <div className="chat-welcome">
                      <Mascot size={135} />
                      <h3>你不必整理好情绪才来。</h3>
                      <p>
                        想从哪里说起都可以。你的记录和目标，会在同一份记忆里。
                      </p>
                      <div className="suggestions">
                        {[
                          "我刚刚被评价了体形",
                          "吃完饭后，我很内疚",
                          "我想回顾最近的记录",
                        ].map((t) => (
                          <button key={t} onClick={() => void sendChat(t)}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {state.messages.map((m) => (
                    <div className={"bubble " + m.role} key={m.id}>
                      {m.role === "assistant" && (
                        <span className="source">
                          {m.source === "ai"
                            ? "小屿 · AI回应"
                            : "小屿 · 支持卡"}
                          {m.entryId ? " · 来自记录" : ""}
                        </span>
                      )}
                      {m.content}
                    </div>
                  ))}
                  {chatBusy && (
                    <div className="bubble assistant muted">
                      小屿正在认真读你的话…
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
                <form
                  className="chat-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendChat();
                  }}
                >
                  <label className="sr-only" htmlFor="chat-message">
                    想对小屿说的话
                  </label>
                  <textarea
                    id="chat-message"
                    value={chatText}
                    maxLength={3000}
                    placeholder="想说的话，慢慢说…"
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        void sendChat();
                      }
                    }}
                  />
                  <button
                    disabled={chatBusy || !chatText.trim()}
                    aria-label="发送消息"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </section>
              <aside className="stack">
                <section className="card">
                  <div className="card-title">
                    <h2>
                      <Leaf size={16} />
                      我们记得的方向
                    </h2>
                  </div>
                  <div className="memory-item">
                    你的目标
                    <br />
                    <strong>{plan?.goal.title}</strong>
                  </div>
                  <div className="memory-item">
                    想先理解
                    <br />
                    {plan?.reason.title}
                  </div>
                  <div className="memory-item">
                    近期记录
                    <br />
                    {s.recorded}个有记录的日子
                  </div>
                  <p className="legal" style={{ marginTop: 16 }}>
                    记忆来自你填写的目标、记录与聊天。删除原记录后，相关反馈会同步移除。
                  </p>
                  <button
                    className="text-button"
                    onClick={() => changePage("settings")}
                  >
                    管理我的记录与记忆 →
                  </button>
                </section>
                <div className="quote">
                  <ShieldCheck size={25} />
                  <span>这里不提供诊断或实时监护，需要时请联系专业人员。</span>
                </div>
              </aside>
            </div>
          </>
        )}
        {page === "support" && (
          <>
            <div className="page-head">
              <div>
                <h1>支持可以有很多种</h1>
                <p>挑一个现在愿意接受的就好，没有必须完成的练习。</p>
              </div>
            </div>
            <div className="support-grid">
              {(
                [
                  {
                    modal: "breathe",
                    emoji: "☁️",
                    title: "让此刻慢一点",
                    desc: "舒服地坐着，按自己的节奏呼吸。",
                  },
                  {
                    modal: "ground",
                    emoji: "🌿",
                    title: "回到身边的小世界",
                    desc: "看见、听见、触摸，找回一点安定。",
                  },
                  {
                    modal: "connect",
                    emoji: "🫶",
                    title: "找一个人陪陪你",
                    desc: "准备一句容易开口的求助。",
                  },
                  {
                    modal: "cycle",
                    emoji: "🍃",
                    title: "理解我的循环",
                    desc: "不评判自己，慢慢辨认发生的过程。",
                  },
                  {
                    modal: "evidence",
                    emoji: "🌷",
                    title: "给自己一份理解",
                    desc: "进食困扰值得被看见，支持也可以被找到。",
                  },
                  {
                    modal: "urgent",
                    emoji: "🩹",
                    title: "身体需要帮助时",
                    desc: "了解何时应立即获得医疗帮助。",
                  },
                ] as const
              ).map((t) => (
                <button
                  key={t.modal}
                  className="card support-tile"
                  onClick={() => setModal(t.modal)}
                >
                  <span className="emoji">{t.emoji}</span>
                  <h3>{t.title}</h3>
                  <p>{t.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}
        {page === "settings" && (
          <>
            <div className="page-head">
              <div>
                <h1>按照你舒服的方式</h1>
                <p>你的方向、提醒和隐私，都可以自己决定。</p>
              </div>
            </div>
            <div className="grid-two settings-list">
              <div className="stack">
                <section className="card">
                  <div className="card-title">
                    <h2>我的方向</h2>
                  </div>
                  <div className="field">
                    <label htmlFor="name">希望怎么称呼你 · 可以留空</label>
                    <input
                      id="name"
                      value={state.profile.name}
                      maxLength={20}
                      placeholder="一个你喜欢的称呼"
                      onChange={(e) =>
                        patch((st) => ({
                          ...st,
                          profile: { ...st.profile!, name: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="reason">想先理解的原因</label>
                    <select
                      id="reason"
                      value={state.profile.reason}
                      onChange={(e) =>
                        patch((st) => ({
                          ...st,
                          profile: { ...st.profile!, reason: e.target.value },
                        }))
                      }
                    >
                      {reasons.map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label htmlFor="goal">希望先实现的变化</label>
                  <select
                    id="goal"
                    value={state.profile.goal}
                    onChange={(e) =>
                      patch((st) => ({
                        ...st,
                        profile: { ...st.profile!, goal: e.target.value },
                      }))
                    }
                  >
                    {goals.map((g) => (
                      <option value={g.id} key={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </section>
                <section className="card">
                  <h2>温柔的日常设置</h2>
                  <div className="setting-line">
                    <div>
                      <h3>使用「风浪」等柔和用词</h3>
                      <p>含义明确，随时可以切回直接用词。</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={state.settings.gentleWords}
                      aria-label="柔和用词"
                      className={
                        "switch " + (state.settings.gentleWords ? "on" : "")
                      }
                      onClick={() =>
                        patch((st) => ({
                          ...st,
                          settings: {
                            ...st.settings,
                            gentleWords: !st.settings.gentleWords,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="setting-line">
                    <div>
                      <h3>给自己一个温和提醒</h3>
                      <p>
                        {Capacitor.isNativePlatform()
                          ? "由手机系统按时提醒，锁屏文案保持中性。"
                          : "网页版仅在页面保持打开时检查提醒，关闭后不能保证送达。"}
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={state.settings.reminder}
                      aria-label="温和提醒"
                      className={
                        "switch " + (state.settings.reminder ? "on" : "")
                      }
                      onClick={() => void setReminder(!state.settings.reminder)}
                    />
                  </div>
                  {state.settings.reminder && (
                    <input
                      aria-label="提醒时间"
                      type="time"
                      value={state.settings.reminderTime}
                      onChange={(e) => void setReminder(true, e.target.value)}
                    />
                  )}
                  <button
                    className="text-button"
                    onClick={() => setModal("privacy")}
                  >
                    了解隐私与存储 →
                  </button>
                </section>
              </div>
              <div className="stack">
                <section className="card">
                  <div className="card-title">
                    <h2>
                      <Sparkles size={17} />
                      和小屿连接
                    </h2>
                    <span className="badge">
                      {aiReady ? "已开启" : "未开启"}
                    </span>
                  </div>
                  <p className="legal">
                    开启后，当前请求、目标、最近最多20条记录与12条对话将经支持服务发送至
                    DeepSeek。服务不会向朋友或学校分享记录，请避免填写可识别个人的信息。
                  </p>
                  <div className="field" style={{ marginTop: 15 }}>
                    <label htmlFor="invite">
                      朋友内测邀请码 · 不是 DeepSeek Key
                    </label>
                    <input
                      id="invite"
                      type="password"
                      autoComplete="off"
                      value={state.settings.accessCode}
                      placeholder="填写开发者提供的邀请码"
                      onChange={(e) =>
                        patch((st) => ({
                          ...st,
                          settings: {
                            ...st.settings,
                            accessCode: e.target.value.trim(),
                          },
                        }))
                      }
                    />
                  </div>
                  <details>
                    <summary className="tiny muted">
                      支持服务地址（通常无需修改）
                    </summary>
                    <input
                      aria-label="支持服务地址"
                      style={{ marginTop: 10 }}
                      value={state.settings.endpoint}
                      placeholder="https://支持服务地址"
                      onChange={(e) =>
                        patch((st) => ({
                          ...st,
                          settings: {
                            ...st.settings,
                            endpoint: e.target.value.trim(),
                          },
                        }))
                      }
                    />
                  </details>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={state.settings.aiConsent}
                      onChange={(e) => {
                        invalidate();
                        patch((st) => ({
                          ...st,
                          settings: {
                            ...st.settings,
                            aiConsent: e.target.checked,
                          },
                        }));
                      }}
                    />
                    <span>
                      我了解并同意上述必要信息发送至支持服务和
                      DeepSeek，以获得个性化 AI 回应。
                    </span>
                  </label>
                  <button
                    className="text-button"
                    onClick={() => setModal("privacy")}
                  >
                    完整说明与第三方隐私政策 →
                  </button>
                </section>
                <section className="card">
                  <h2>记录与共享记忆</h2>
                  <p className="legal" style={{ margin: "12px 0" }}>
                    当前设备本地保存。换设备前，请先导出加密备份；清理浏览器或卸载可能丢失数据。
                  </p>
                  <div className="stack">
                    <button
                      className="secondary"
                      onClick={() => {
                        setBackupPassword("");
                        setModal("backup");
                      }}
                    >
                      <Download size={16} />
                      导出加密备份
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setBackupPassword("");
                        setBackupText("");
                        setModal("import");
                      }}
                    >
                      <Upload size={16} />
                      恢复加密备份
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        const summary =
                          `安屿 · 就医准备摘要\n生成于 ${new Date().toLocaleString("zh-CN")}\n目标：${plan?.goal.title}\n近7天催吐发生记录：${s.waves}次；冲动记录：${s.urges}次\n注意：未记录日期为未知，以上不是诊断。\n\n` +
                          state.entries
                            .map(
                              (e) =>
                                `${dateLabel(e.at)} | ${e.kind === "wave" ? "催吐发生" : e.kind === "urge" ? "催吐冲动" : "确认当天没有催吐"} | ${e.feeling} | ${e.note}`,
                            )
                            .join("\n");
                        if (
                          window.confirm(
                            "摘要将以未加密文本导出，包含敏感信息。请只分享给你选择的人。",
                          )
                        )
                          download(
                            summary,
                            `安屿-就医摘要-${today}.txt`,
                            "text/plain;charset=utf-8",
                          );
                      }}
                    >
                      导出就医摘要（敏感文本）
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "清空全部聊天及 AI 反馈？你的原始记录和目标仍保留。",
                          )
                        ) {
                          invalidate();
                          patch((st) => ({
                            ...st,
                            messages: [],
                            entries: st.entries.map((e) => ({
                              ...e,
                              feedback: cardFor(e),
                              feedbackSource: "card",
                            })),
                          }));
                          notify("聊天与AI反馈已清空。");
                        }
                      }}
                    >
                      清空聊天与AI反馈
                    </button>
                    <button
                      className="text-button"
                      style={{ color: "#a47b67" }}
                      onClick={async () => {
                        if (
                          window.confirm(
                            "删除本设备全部记录、聊天和目标？此操作无法撤销，请先备份。",
                          )
                        ) {
                          invalidate();
                          await eraseState();
                          setState(initialState());
                          changePage("home");
                          notify("本设备数据已删除。");
                        }
                      }}
                    >
                      删除本设备所有数据
                    </button>
                  </div>
                </section>
                <section className="card">
                  <div className="row between">
                    <span className="legal">安屿 1.0 · 成年舞蹈生支持原型</span>
                    <Leaf size={16} />
                  </div>
                  <div className="inline-links" style={{ marginTop: 12 }}>
                    <button
                      className="text-button"
                      onClick={() => setModal("evidence")}
                    >
                      内容依据
                    </button>
                    <a
                      className="text-button"
                      href="https://github.com/SongLin99/anyu/releases/latest"
                      target="_blank"
                      rel="noreferrer"
                    >
                      安卓下载 ↗
                    </a>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
        <footer className="bottom-note">
          <Leaf size={11} />
          每一种心情，都有被温柔放下的地方。
          <button className="text-button" onClick={() => setModal("urgent")}>
            需要身体上的帮助？
          </button>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="底部导航">
        {nav.map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            onClick={() => changePage(n.id)}
          >
            <n.icon size={21} />
            <span>{n.id === "chat" ? "小屿" : n.label}</span>
          </button>
        ))}
      </nav>
      {dialog}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function Onboarding({
  onComplete,
  onHelp,
  onEvidence,
  onPrivacy,
}: {
  onComplete: (reason: string, goal: string) => void;
  onHelp: () => void;
  onEvidence: () => void;
  onPrivacy: () => void;
}) {
  const [step, setStep] = useState(0),
    [reason, setReason] = useState(""),
    [goal, setGoal] = useState(""),
    [adult, setAdult] = useState(false);
  const slides = [
    {
      title: (
        <>
          你已经承受了很多，
          <br />
          这里可以慢慢说。
        </>
      ),
      desc: "练习、考核、镜子里的自己。我们看见你的努力，也愿意听见那些关于进食和体形的压力。",
    },
    {
      title: (
        <>
          有进食困扰的舞蹈生，
          <br />
          不只有你。
        </>
      ),
      desc: "这些困扰值得被认真对待，不代表你不够自律。你不需要先证明自己足够严重，才值得获得支持。",
    },
    {
      title: (
        <>
          改变是可能的，
          <br />
          从一小步开始就好。
        </>
      ),
      desc: "获得合适的支持，可以帮助你改善进食困扰。今天不必做到完美，我们先找到适合自己的方向。",
    },
  ];
  return (
    <main className="onboarding">
      <div className="onboard-card">
        <div className="onboard-brand">安 屿 · A LITTLE SAFE PLACE</div>
        {step < 3 ? (
          <>
            <div className="onboard-visual">
              <Mascot size={230} variant={step === 0 ? "rest" : "hello"} />
            </div>
            <h1>{slides[step].title}</h1>
            <p className="desc">{slides[step].desc}</p>
            <div className="onboard-progress">
              {slides.map((_, i) => (
                <i className={i === step ? "active" : ""} key={i} />
              ))}
            </div>
            {step === 2 && (
              <label className="consent-line">
                <input
                  type="checkbox"
                  checked={adult}
                  onChange={(e) => setAdult(e.target.checked)}
                />
                <span>
                  我已年满18岁，了解安屿是辅助自助原型。记录默认保存在本设备，AI支持需要单独授权。
                  <button className="text-button" onClick={onPrivacy}>
                    隐私说明
                  </button>
                </span>
              </label>
            )}
            <button
              className="primary"
              disabled={step === 2 && !adult}
              onClick={() => setStep(step + 1)}
            >
              {step === 2 ? "找到我的起步方向" : "继续，慢慢认识这里"}
              <ArrowRight size={16} />
            </button>
            {step === 1 && (
              <button className="onboard-help" onClick={onEvidence}>
                了解这句话的研究依据 ↗
              </button>
            )}
          </>
        ) : (
          <>
            <span className="eyebrow">
              {step === 3
                ? "FIRST, UNDERSTAND YOU"
                : "A SMALL WISH FOR YOURSELF"}
            </span>
            <h1>
              {step === 3 ? (
                <>
                  冲动出现时，
                  <br />
                  哪种感受最接近你？
                </>
              ) : (
                <>
                  你最希望，
                  <br />
                  先出现什么变化？
                </>
              )}
            </h1>
            <p className="desc">
              {step === 3
                ? "选择现在最主要的一种就好。没有正确答案，以后也能修改。"
                : "把愿望放小一点，按自己愿意的节奏走。"}
            </p>
            <div className="option-list">
              {(step === 3 ? reasons : goals).map((o) => (
                <button
                  key={o.id}
                  className={
                    "option " +
                    ((step === 3 ? reason : goal) === o.id ? "active" : "")
                  }
                  onClick={() => (step === 3 ? setReason(o.id) : setGoal(o.id))}
                >
                  <span className="option-emoji">{o.icon}</span>
                  <span>
                    <strong>{o.title}</strong>
                    {"subtitle" in o && <small>{o.subtitle}</small>}
                  </span>
                  <i className="radio" />
                </button>
              ))}
            </div>
            <div className="onboard-footer">
              <button
                className="icon-button"
                aria-label="返回"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={19} />
              </button>
              <button
                className="primary"
                disabled={step === 3 ? !reason : !goal}
                onClick={() =>
                  step === 3 ? setStep(4) : onComplete(reason, goal)
                }
              >
                {step === 3 ? "继续，选一个小愿望" : "开启我的小小计划"}
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
        <button className="onboard-help" onClick={onHelp}>
          我现在需要帮助 →
        </button>
        <p className="legal" style={{ marginTop: 13 }}>
          在安屿，「风浪」可以指催吐发生的一次经历。
          <br />
          它只是柔和的称呼，你的身体安全始终重要。
        </p>
      </div>
    </main>
  );
}
