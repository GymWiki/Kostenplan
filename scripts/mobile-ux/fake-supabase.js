// Nep-Supabase voor lokale schermtests: alleen /auth/v1/user (en refresh), altijd dezelfde gebruiker.
const http = require("http");
const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "jan@devries-hoveniers.nl", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
http.createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url.startsWith("/auth/v1/user")) return res.end(JSON.stringify(user));
  if (req.url.startsWith("/auth/v1/token")) return res.end(JSON.stringify({ access_token: "x", refresh_token: "y", expires_in: 3600, token_type: "bearer", user }));
  res.statusCode = 404; res.end("{}");
}).listen(54321, "127.0.0.1", () => console.log("fake supabase :54321"));
