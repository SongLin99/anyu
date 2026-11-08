import { readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
const base = process.env.APP_BASE || "/anyu/";
const manifest = {
  name: "安屿 · 给自己一小片安静",
  short_name: "安屿",
  description: "面向成年舞蹈生的进食困扰支持工具",
  theme_color: "#697e53",
  background_color: "#f7f7ef",
  display: "standalone",
  lang: "zh-CN",
  start_url: base,
  scope: base,
  icons: [
    { src: "icon-192.png", sizes: "192x192", type: "image/png" },
    {
      src: "icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
};
writeFileSync("dist/manifest.webmanifest", JSON.stringify(manifest));
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(dir + "/" + e.name) : [dir + "/" + e.name],
  );
}
const files = walk("dist").filter((p) => !p.endsWith("/sw.js"));
const hash = createHash("sha256");
for (const p of files) hash.update(readFileSync(p));
const version = "anyu-" + hash.digest("hex").slice(0, 12);
const urls = files.map((p) => base + p.slice(5));
writeFileSync(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(version)},FILES=${JSON.stringify(urls)},BASE=${JSON.stringify(base)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('anyu-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(BASE))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(BASE+'index.html',{ignoreVary:true})));return}if(FILES.includes(u.pathname))e.respondWith(caches.match(e.request,{ignoreVary:true}).then(r=>r||fetch(e.request)));});`,
);
console.log(`PWA ready: ${files.length} static files, ${version}`);
