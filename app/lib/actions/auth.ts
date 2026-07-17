"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getBaseUrl } from "@/app/lib/url";
import { registerSchema, loginSchema } from "@/app/lib/validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.code === "user_already_exists") {
      return { fieldErrors: { email: "Dit e-mailadres is al in gebruik" } };
    }
    return { error: error.message };
  }

  if (!data.user || !data.session) {
    return { error: "Registreren is niet gelukt. Probeer het opnieuw." };
  }

  // Geen Company hier — /onboarding/bedrijf (via requireActiveCompany() in
  // dal.ts) vraagt die zodra de gebruiker voor het eerst een dashboardpagina
  // bezoekt, hetzelfde pad als na Google-login.
  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Onjuist e-mailadres of wachtwoord" };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Werkt voor zowel inloggen als registreren: Supabase maakt bij de eerste
// keer automatisch een account aan op basis van het Google-profiel. Er is
// dan nog geen Company — requireActiveCompany() (zie dal.ts) stuurt de
// gebruiker naar /onboarding/bedrijf zodra die voor het eerst een
// dashboardpagina bezoekt, zodat ze zelf een bedrijfsnaam kiezen.
export async function signInWithGoogleAction() {
  const baseUrl = await getBaseUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${baseUrl}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=google-mislukt");
  }

  redirect(data.url);
}
