import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import worker from "./worker.mjs";
const raw = existsSync("../api.txt") ? readFileSync("../api.txt", "utf8") : "";
const key =
  process.env.DEEPSEEK_API_KEY || raw.match(/sk-[A-Za-z0-9_-]{12,}/)?.[0];
const env = {
  DEEPSEEK_API_KEY: key,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || "deepseek-flash",
  ACCESS_CODE: process.env.ACCESS_CODE || "local-development-only",
  ALLOWED_ORIGINS:
    "http://127.0.0.1:5173,http://localhost:5173,https://localhost",
};
http
  .createServer(async (req, res) => {
    try {
      const chunks = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 65536) {
          res.writeHead(413);
          res.end();
          return;
        }
        chunks.push(c);
      }
      const r = await worker.fetch(
        new Request("http://127.0.0.1:8787" + req.url, {
          method: req.method,
          headers: req.headers,
          ...(["GET", "HEAD"].includes(req.method)
            ? {}
            : { body: Buffer.concat(chunks) }),
        }),
        env,
      );
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch {
      res.writeHead(500);
      res.end("service unavailable");
    }
  })
  .listen(8787, "127.0.0.1", () =>
    console.log(
      "Local support: http://127.0.0.1:8787 (credentials never logged)",
    ),
  );
