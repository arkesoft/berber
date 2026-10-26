import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createHash } from "node:crypto";
const root = resolve("build/client");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".data": "text/x-script",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          code: "UNAVAILABLE",
          message: "Canlı API henüz bağlı değil.",
          requestId: "frontend-preview",
        }),
      );
      return;
    }
    let file = resolve(root, "." + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      await stat(file);
    } catch {
      if (extname(file)) {
        res.writeHead(404);
        res.end();
        return;
      }
      file = resolve(root, "__spa-fallback.html");
    }
    const body = await readFile(file),
      html = extname(file) === ".html";
    const hashes = html
      ? [...body.toString().matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
          .filter((x) => x[1])
          .map(
            (x) =>
              `'sha256-${createHash("sha256").update(x[1]).digest("base64")}'`,
          )
      : [];
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Cache-Control": url.pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      ...(html
        ? {
            "Content-Security-Policy": `default-src 'self'; script-src 'self' ${hashes.join(" ")}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
          }
        : {}),
    });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end("Preview build bulunamadi.");
  }
});
server.listen(4173, "127.0.0.1", () =>
  console.log("Local: http://127.0.0.1:4173"),
);
