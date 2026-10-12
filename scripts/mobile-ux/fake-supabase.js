// Nep-Supabase voor lokale schermtests: auth (altijd dezelfde gebruiker) en een eenvoudige opslag op schijf.
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = "/tmp/fake-storage";
const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "jan@devries-hoveniers.nl", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  res.setHeader("content-type", "application/json");
  if (url.startsWith("/auth/v1/user")) return res.end(JSON.stringify(user));
  if (url.startsWith("/auth/v1/token")) return res.end(JSON.stringify({ access_token: "x", refresh_token: "y", expires_in: 3600, token_type: "bearer", user }));
  const up = url.match(/^\/storage\/v1\/object\/(?!public\/)(.+)$/);
  if (up && (req.method === "POST" || req.method === "PUT")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      let body = Buffer.concat(chunks);
      const ct = req.headers["content-type"] || "";
      if (ct.startsWith("multipart/form-data")) {
        const b = ct.match(/boundary=(.+)$/)[1];
        const txt = body.toString("latin1");
        const start = txt.indexOf("\r\n\r\n") + 4;
        const end = txt.lastIndexOf("\r\n--" + b);
        body = Buffer.from(txt.slice(start, end), "latin1");
      }
      const file = path.join(ROOT, up[1]);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, body);
      res.end(JSON.stringify({ Key: up[1], Id: "x" }));
    });
    return;
  }
  const pub = url.match(/^\/storage\/v1\/object\/public\/(.+)$/);
  if (pub && req.method === "GET") {
    const file = path.join(ROOT, pub[1]);
    if (fs.existsSync(file)) { res.setHeader("content-type", file.endsWith(".pdf") ? "application/pdf" : "application/octet-stream"); return res.end(fs.readFileSync(file)); }
  }
  res.statusCode = 404; res.end("{}");
}).listen(54321, "127.0.0.1", () => console.log("fake supabase :54321"));
