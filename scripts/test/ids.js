// Testgebruikers en sessiecookies voor de nep-Supabase (zelfde formaat als @supabase/ssr).
// Het gebruikers-id volgt uit het e-mailadres, zodat seed, nep-Supabase en Playwright elkaar zonder gedeelde opslag vinden.
const crypto = require("crypto");

const userId = (email) => {
  const h = crypto.createHash("sha1").update(`kostenplan-test:${email.toLowerCase()}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// Vaste testgebruikers. A1-A3 zijn drie identieke kopieën van hovenier A zodat parallelle agents elkaars data niet raken.
const GEBRUIKERS = {
  a1: "hovenier-a1@test.kostenplan.nl",
  a2: "hovenier-a2@test.kostenplan.nl",
  a3: "hovenier-a3@test.kostenplan.nl",
  b: "hovenier-b@test.kostenplan.nl",
  nieuw: "nieuw@test.kostenplan.nl",
};
const WACHTWOORD = "Testwachtwoord1!";

const jwt = (email) => {
  const exp = Math.floor(Date.now() / 1000) + 86400 * 30;
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b({ alg: "HS256", typ: "JWT" })}.${b({ sub: userId(email), email, exp, role: "authenticated" })}.sig`;
};
const sessie = (email) => {
  const exp = Math.floor(Date.now() / 1000) + 86400 * 30;
  return { access_token: jwt(email), refresh_token: `rt.${Buffer.from(email).toString("base64url")}`, expires_in: 86400 * 30, expires_at: exp, token_type: "bearer", user: { id: userId(email), email, aud: "authenticated", role: "authenticated" } };
};
// Cookie voor Playwright (context.addCookies).
const cookie = (email, base = process.env.BASE || "http://localhost:3200") => ({ name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(sessie(email))).toString("base64url"), url: base });
const emailVanJwt = (token) => {
  try { return JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString()).email || null; } catch { return null; }
};
module.exports = { userId, GEBRUIKERS, WACHTWOORD, sessie, cookie, jwt, emailVanJwt };
