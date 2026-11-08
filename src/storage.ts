import { openDB } from "idb";
import { initialState, type State } from "./domain";
const dbPromise = openDB("anyu-private-v1", 1, {
  upgrade(db) {
    db.createObjectStore("vault");
  },
});
let queue: Promise<unknown> = Promise.resolve();
async function getKey() {
  const db = await dbPromise;
  let key = (await db.get("vault", "key")) as CryptoKey | undefined;
  if (!key) {
    key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    await db.put("vault", key, "key");
  }
  return key;
}
export async function loadState(): Promise<State> {
  const item = await (await dbPromise).get("vault", "state");
  if (!item) return initialState();
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: item.iv },
    await getKey(),
    item.data,
  );
  const parsed = JSON.parse(new TextDecoder().decode(raw));
  if (parsed.version !== 1) throw Error("暂不支持这个记录版本");
  return {
    ...initialState(),
    ...parsed,
    settings: { ...initialState().settings, ...parsed.settings },
  };
}
export function saveState(state: State) {
  queue = queue
    .catch(() => {})
    .then(async () => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await getKey(),
        new TextEncoder().encode(JSON.stringify(state)),
      );
      await (await dbPromise).put("vault", { iv, data }, "state");
    });
  return queue;
}
export async function eraseState() {
  await queue.catch(() => {});
  await (await dbPromise).clear("vault");
}
const b64 = (a: ArrayBuffer | Uint8Array) => {
  let s = "";
  for (const v of new Uint8Array(
    a instanceof ArrayBuffer ? a : (a.buffer as ArrayBuffer),
  ))
    s += String.fromCharCode(v);
  return btoa(s);
};
const bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function backupKey(password: string, salt: Uint8Array) {
  const m = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 310000,
      hash: "SHA-256",
    },
    m,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function exportBackup(state: State, password: string) {
  if (password.length < 8) throw Error("备份密码至少需要8位");
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const safe = { ...state, settings: { ...state.settings, accessCode: "" } };
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await backupKey(password, salt),
    new TextEncoder().encode(JSON.stringify(safe)),
  );
  return JSON.stringify({
    format: "anyu-backup-v1",
    salt: b64(salt),
    iv: b64(iv),
    data: b64(data),
  });
}
export async function importBackup(
  text: string,
  password: string,
): Promise<State> {
  const b = JSON.parse(text);
  if (b.format !== "anyu-backup-v1") throw Error("这不是安屿备份文件");
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes(b.iv) },
    await backupKey(password, bytes(b.salt)),
    bytes(b.data),
  );
  const s = JSON.parse(new TextDecoder().decode(raw));
  if (
    s.version !== 1 ||
    !s.profile ||
    !Array.isArray(s.entries) ||
    !Array.isArray(s.messages) ||
    !Array.isArray(s.completed) ||
    s.entries.some(
      (e: Record<string, unknown>) =>
        !["wave", "urge", "clear"].includes(String(e.kind)) ||
        !Number.isFinite(Date.parse(String(e.at))),
    )
  )
    throw Error("备份内容不完整");
  return {
    ...initialState(),
    ...s,
    settings: {
      ...initialState().settings,
      ...s.settings,
      aiConsent: false,
      accessCode: "",
    },
  };
}
