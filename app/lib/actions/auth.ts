"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { createUserWithFirstCompany } from "@/app/lib/dal";
import { getBaseUrl } from "@/app/lib/url";
import { registerSchema, loginSchema } from "@/app/lib/validation";

export type AuthFormState = {
  error?: string;
  info?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    bedrijfsnaam: formData.get("bedrijfsnaam"),
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

  const { bedrijfsnaam, email, password } = parsed.data;

  const baseUrl = await getBaseUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { bedrijfsnaam },
      emailRedirectTo: `${baseUrl}/auth/confirm`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { fieldErrors: { email: "Dit e-mailadres is al in gebruik" } };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Registreren is niet gelukt. Probeer het opnieuw." };
  }

  await createUserWithFirstCompany(data.user.id, email, bedrijfsnaam);

  if (!data.session) {
    return {
      info: "Bijna klaar! Check je e-mail en klik op de bevestigingslink om in te loggen.",
    };
  }

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
