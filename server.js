const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const port = 8787;
const submissionsPath = path.join(rootDir, "submissions.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

ensureSubmissionStore();

http
  .createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const origin = request.headers.origin || "*";

    if (request.method === "OPTIONS") {
      response.writeHead(204, buildCorsHeaders(origin));
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/submissions") {
      sendJson(response, 200, readSubmissions(), origin);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/submissions") {
      handleSubmissionPost(request, response, origin);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/submissions/reset") {
      writeSubmissions([]);
      sendJson(response, 200, { ok: true }, origin);
      return;
    }

    serveStatic(url.pathname, response);
  })
  .listen(port, () => {
    console.log(`Dashboard lokal: http://127.0.0.1:${port}/dashboard.html`);
  });

function handleSubmissionPost(request, response, origin) {
  const chunks = [];

  request.on("data", (chunk) => {
    chunks.push(chunk);
  });

  request.on("end", () => {
    try {
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const submissions = readSubmissions();
      const entry = {
        participantId: String(payload.participantId || "Unbekannt"),
        year: String(payload.year || "2022"),
        invested: Number(payload.invested || 0),
        totalValue: Number(payload.totalValue || 0),
        profit: Number(payload.profit || 0),
        returnRate: Number(payload.returnRate || 0),
        submittedAt: new Date().toISOString()
      };

      const existingIndex = submissions.findIndex(
        (item) => item.participantId === entry.participantId && item.year === entry.year
      );

      if (existingIndex >= 0) {
        submissions[existingIndex] = entry;
      } else {
        submissions.push(entry);
      }

      writeSubmissions(submissions);
      sendJson(response, 200, { ok: true, participantId: entry.participantId }, origin);
    } catch {
      sendJson(response, 400, { ok: false }, origin);
    }
  });
}

function serveStatic(urlPath, response) {
  const requestedPath = urlPath === "/" ? "/dashboard.html" : urlPath;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(data);
  });
}

function ensureSubmissionStore() {
  if (!fs.existsSync(submissionsPath)) {
    fs.writeFileSync(submissionsPath, "[]", "utf8");
  } else {
    fs.writeFileSync(submissionsPath, "[]", "utf8");
  }
}

function readSubmissions() {
  try {
    return JSON.parse(fs.readFileSync(submissionsPath, "utf8"));
  } catch {
    return [];
  }
}

function writeSubmissions(entries) {
  fs.writeFileSync(submissionsPath, JSON.stringify(entries, null, 2), "utf8");
}

function sendJson(response, statusCode, payload, origin = "*") {
  response.writeHead(statusCode, {
    ...buildCorsHeaders(origin),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function buildCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
