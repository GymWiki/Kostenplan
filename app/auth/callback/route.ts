import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { rondGastKoppelingAf } from "@/app/lib/gast-koppeling";

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

  // Gast die Google koppelt dat al bij een ander account hoort: kies in het
  // paneel wat er met het voorbeeld moet gebeuren.
  if (searchParams.get("error_code") === "identity_already_exists") {
    redirect("/probeer/editor?paneel=account&bestaat=google");
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Gast die een account heeft gemaakt: het voorbeeld wordt een gewoon bedrijf.
      const via = searchParams.get("via");
      const user = data.user ?? (await supabase.auth.getUser()).data.user;
      if ((via === "google" || via === "email") && user && !user.is_anonymous) {
        await rondGastKoppelingAf(user.id, via);
      }
      redirect(next);
    }
  }

  redirect("/login?error=google-mislukt");
}
