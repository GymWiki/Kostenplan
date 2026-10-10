import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// PKCE-callback voor Google OAuth (zie signInWithGoogleAction in
// app/lib/actions/auth.ts): Supabase stuurt de browser hierheen terug met
// een `code` na het Google-consentscherm, die hier wordt omgewisseld voor
// een echte sessie.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // Alleen interne paden: anders is dit een open redirect.
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.includes("\\") ? nextRaw : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?error=google-mislukt");
}
