// Nep-Supabase voor de testomgeving (er is geen Docker/supabase start in de sandbox): auth met meerdere gebruikers en een eenvoudige
// bestandsopslag. Het gebruikers-id volgt uit het e-mailadres (zie ids.js). Elk wachtwoord geldt voor bestaande testgebruikers;
// een nieuw e-mailadres kan zich registreren. Poort 54321.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { userId, sessie, emailVanJwt } = require("./ids.js");
const ROOT = process.env.FAKE_STORAGE || "/tmp/fake-storage";
const bekend = new Set();
const gebruiker = (email) => ({ id: userId(email), aud: "authenticated", role: "authenticated", email, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
const body = (req) => new Promise((ok) => { const c = []; req.on("data", (x) => c.push(x)); req.on("end", () => ok(Buffer.concat(c))); });

http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  res.setHeader("content-type", "application/json");
  const bearer = (req.headers.authorization || "").replace(/^Bearer /i, "");
  if (url.startsWith("/auth/v1/user")) {
    const email = emailVanJwt(bearer);
    if (!email) { res.statusCode = 401; return res.end(JSON.stringify({ code: 401, msg: "geen sessie" })); }
    return res.end(JSON.stringify(gebruiker(email)));
  }
  if (url.startsWith("/auth/v1/signup")) {
    const j = JSON.parse((await body(req)).toString() || "{}");
    const email = String(j.email || "").toLowerCase();
    if (bekend.has(email)) { res.statusCode = 422; return res.end(JSON.stringify({ code: 422, error_code: "user_already_exists", msg: "User already registered" })); }
    bekend.add(email);
    return res.end(JSON.stringify(sessie(email)));
  }
  if (url.startsWith("/auth/v1/token")) {
    const j = JSON.parse((await body(req)).toString() || "{}");
    const email = req.url.includes("refresh_token") ? Buffer.from(String(j.refresh_token || "").replace(/^rt\./, ""), "base64url").toString() : String(j.email || "").toLowerCase();
    if (!email.includes("@")) { res.statusCode = 400; return res.end(JSON.stringify({ error: "invalid_grant" })); }
    return res.end(JSON.stringify(sessie(email)));
  }
  if (url.startsWith("/auth/v1/logout")) return res.end("{}");
  const up = url.match(/^\/storage\/v1\/object\/(?!public\/)(.+)$/);
  if (up && (req.method === "POST" || req.method === "PUT")) {
    let b = await body(req);
    const ct = req.headers["content-type"] || "";
    if (ct.startsWith("multipart/form-data")) {
      const bd = ct.match(/boundary=(.+)$/)[1];
      const txt = b.toString("latin1");
      b = Buffer.from(txt.slice(txt.indexOf("\r\n\r\n") + 4, txt.lastIndexOf("\r\n--" + bd)), "latin1");
    }
    const file = path.join(ROOT, up[1]);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, b);
    return res.end(JSON.stringify({ Key: up[1], Id: "x" }));
  }
  const pub = url.match(/^\/storage\/v1\/object\/public\/(.+)$/);
  if (pub && req.method === "GET") {
    const file = path.join(ROOT, pub[1]);
    if (fs.existsSync(file)) { res.setHeader("content-type", file.endsWith(".pdf") ? "application/pdf" : "application/octet-stream"); return res.end(fs.readFileSync(file)); }
  }
  res.statusCode = 404; res.end("{}");
}).listen(54321, "127.0.0.1", () => console.log("test nep-supabase :54321"));
