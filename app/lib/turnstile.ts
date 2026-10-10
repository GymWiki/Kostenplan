import "server-only";

// Cloudflare Turnstile server-side controle. Zonder TURNSTILE_SECRET_KEY:
// in productie weigeren (fail closed), in dev toestaan zodat lokaal werken kan.
export async function verifieerTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const turnstileActief = () => Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
