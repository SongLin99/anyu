// Uses the already-authorized gh session. Useful when this network blocks Git's HTTPS transport.
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const repo = "SongLin99/anyu";
function api(path, method = "GET", body) {
  const args = ["api", path, "--method", method];
  if (body) args.push("--input", "-");
  return JSON.parse(
    execFileSync("gh", args, {
      input: body ? JSON.stringify(body) : undefined,
      encoding: "utf8",
      maxBuffer: 12000000,
      windowsHide: true,
    }),
  );
}
async function asyncApi(path, body) {
  return new Promise((resolve, reject) => {
    const p = spawn("gh", ["api", path, "--method", "POST", "--input", "-"], {
      windowsHide: true,
    });
    let out = "",
      err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) =>
      code ? reject(Error(err)) : resolve(JSON.parse(out)),
    );
    p.stdin.end(JSON.stringify(body));
  });
}
let ref;
try {
  ref = api(`repos/${repo}/git/ref/heads/main`);
} catch {
  api(`repos/${repo}/contents/README.md`, "PUT", {
    message: "Initialize Anyu repository",
    content: readFileSync("README.md").toString("base64"),
    branch: "main",
  });
  ref = api(`repos/${repo}/git/ref/heads/main`);
}
const previous = api(`repos/${repo}/git/commits/${ref.object.sha}`);
const oldTree = api(
  `repos/${repo}/git/trees/${previous.tree.sha}?recursive=1`,
).tree;
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const tree = [],
  binary = [];
for (const path of paths) {
  const buf = readFileSync(path);
  if (buf.includes(0) || /\.(png|jpg|jpeg|jar|webp|ico)$/.test(path))
    binary.push({ path, buf });
  else
    tree.push({
      path,
      mode: "100644",
      type: "blob",
      content: buf.toString("utf8"),
    });
}
for (let i = 0; i < binary.length; i += 6) {
  const group = await Promise.all(
    binary.slice(i, i + 6).map(async ({ path, buf }) => {
      const hash = createHash("sha1")
        .update(`blob ${buf.length}\0`)
        .update(buf)
        .digest("hex");
      if (oldTree.some((e) => e.path === path && e.sha === hash))
        return { path, mode: "100644", type: "blob", sha: hash };
      const blob = await asyncApi(`repos/${repo}/git/blobs`, {
        content: buf.toString("base64"),
        encoding: "base64",
      });
      return { path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );
  tree.push(...group);
}
for (const file of oldTree)
  if (file.type === "blob" && !paths.includes(file.path))
    tree.push({ path: file.path, mode: file.mode, type: "blob", sha: null });
const nextTree = api(`repos/${repo}/git/trees`, "POST", {
  base_tree: previous.tree.sha,
  tree,
});
if (nextTree.sha === previous.tree.sha) {
  console.log(JSON.stringify({ unchanged: true, commit: ref.object.sha }));
  process.exit(0);
}
const commit = api(`repos/${repo}/git/commits`, "POST", {
  message: process.argv[2] || "Build Anyu Android and PWA support app",
  tree: nextTree.sha,
  parents: [ref.object.sha],
  author: { name: "SongLin99", email: "978239451@qq.com" },
});
api(`repos/${repo}/git/refs/heads/main`, "PATCH", { sha: commit.sha });
if (process.argv.includes("--tag")) {
  try {
    api(`repos/${repo}/git/refs`, "POST", {
      ref: "refs/tags/v1.0.0",
      sha: commit.sha,
    });
  } catch {
    console.log("Tag exists; no tag was changed.");
  }
}
console.log(
  JSON.stringify({
    repository: "https://github.com/" + repo,
    commit: commit.sha,
    files: paths.length,
  }),
);
