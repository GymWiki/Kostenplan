// Sessiecookie voor de nep-Supabase (zelfde formaat als @supabase/ssr).
const fn = () => {
  const exp = Math.floor(Date.now() / 1000) + 86400 * 30;
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = `${b({ alg: "HS256", typ: "JWT" })}.${b({ sub: "00000000-0000-4000-8000-000000000001", exp, role: "authenticated" })}.sig`;
  const sessie = { access_token: jwt, refresh_token: "r", expires_in: 86400 * 30, expires_at: exp, token_type: "bearer", user: { id: "00000000-0000-4000-8000-000000000001", email: "jan@devries-hoveniers.nl", aud: "authenticated", role: "authenticated" } };
  return { name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(sessie)).toString("base64url"), url: "http://localhost:3200" };
};
module.exports = fn;
