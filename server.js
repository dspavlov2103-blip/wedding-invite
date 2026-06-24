const http = require("http");
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 3847;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "svadba2026";
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// IMPORTANT:
// У пользователя может не быть npm. Поэтому сервер сделан без зависимостей:
// - фронтенд раздаём как статические файлы
// - ответы анкеты храним в JSON Lines: data/guest_responses.jsonl (одна строка = один гость)
const publicDir = path.join(__dirname, "public");
const responsesPath = path.join(dataDir, "guest_responses.jsonl");

function sendJson(res, statusCode, obj) {
  const payload = Buffer.from(JSON.stringify(obj));
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": payload.length,
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readRequestJson(req, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function nowLocalIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function getAuthToken(reqUrl, headers) {
  const auth = headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  try {
    const u = new URL(reqUrl, "http://localhost");
    return u.searchParams.get("token") || "";
  } catch {
    return "";
  }
}

function safeJoinPublic(urlPath) {
  const p = decodeURIComponent(urlPath.split("?")[0]);
  const clean = p === "/" ? "/index.html" : p;
  const joined = path.join(publicDir, clean);
  const resolved = path.resolve(joined);
  if (!resolved.startsWith(path.resolve(publicDir))) return null;
  return resolved;
}

function contentTypeFor(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
  if (lower.includes(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}

/** iOS/Android требуют Accept-Ranges и ответ 206 для <audio> */
function serveStaticFile(req, res, filePath) {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const type = contentTypeFor(filePath);
  const range = req.headers.range;

  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m) {
      res.writeHead(416, { "Content-Range": `bytes */${total}` });
      return res.end();
    }
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : total - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
      res.writeHead(416, { "Content-Range": `bytes */${total}` });
      return res.end();
    }
    end = Math.min(end, total - 1);
    const chunk = end - start + 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunk,
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
    });
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": total,
    "Accept-Ranges": "bytes",
    "Cache-Control": type.startsWith("audio/") ? "public, max-age=86400" : "no-store",
  });
  return fs.createReadStream(filePath).pipe(res);
}

function readAllResponses() {
  if (!fs.existsSync(responsesPath)) return [];
  const lines = fs.readFileSync(responsesPath, "utf8").split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line));
    } catch {
      // skip corrupted line
    }
  }
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return rows;
}

const server = http.createServer(async (req, res) => {
  try {
    // --- API: анкета ---
    if (req.method === "POST" && req.url === "/api/anketa") {
      const body = await readRequestJson(req);
      const { fullName, attending, companions, drinks, message } = body || {};

      if (!fullName?.trim()) return sendJson(res, 400, { ok: false, error: "Укажите имя и фамилию" });
      if (!attending) return sendJson(res, 400, { ok: false, error: "Выберите, будете ли вы на празднике" });
      if (!Array.isArray(drinks) || drinks.length === 0)
        return sendJson(res, 400, { ok: false, error: "Выберите хотя бы один напиток" });

      const rows = readAllResponses();
      const id = rows.length ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;
      const row = {
        id,
        full_name: String(fullName).trim(),
        attending: String(attending),
        companions: String(companions || "").trim(),
        drinks: drinks.map(String),
        message: String(message || "").trim(),
        created_at: nowLocalIso(),
      };
      fs.appendFileSync(responsesPath, JSON.stringify(row) + "\n", "utf8");
      return sendJson(res, 200, { ok: true, id });
    }

    // --- API: ответы (админ) ---
    if (req.method === "GET" && req.url?.startsWith("/api/responses")) {
      const token = getAuthToken(req.url, req.headers);
      if (token !== ADMIN_PASSWORD) return sendJson(res, 401, { ok: false, error: "Неверный пароль" });
      return sendJson(res, 200, { ok: true, rows: readAllResponses() });
    }

    // --- /admin ---
    if (req.method === "GET" && req.url?.split("?")[0] === "/admin") {
      const adminPath = path.join(publicDir, "admin.html");
      const buf = fs.readFileSync(adminPath);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(buf);
    }

    // --- Static files ---
    const filePath = safeJoinPublic(req.url || "/");
    if (!filePath) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Bad Request");
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not Found");
    }
    return serveStaticFile(req, res, filePath);
  } catch (e) {
    if (e?.message === "payload_too_large") return sendJson(res, 413, { ok: false, error: "Слишком большой запрос" });
    if (e?.message === "invalid_json") return sendJson(res, 400, { ok: false, error: "Некорректный JSON" });
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Приглашение: http://localhost:${PORT}`);
  console.log(`Анкеты (админ): http://localhost:${PORT}/admin`);
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`Публичная ссылка: ${process.env.RENDER_EXTERNAL_URL}`);
  }
});
