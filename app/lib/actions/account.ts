"use server";

import { requireUser } from "@/app/lib/dal";
import { createClient } from "@/app/lib/supabase/server";
import { changePasswordSchema } from "@/app/lib/validation";

export type AccountFormState = { error?: string; success?: boolean } | null;

export async function updatePasswordAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  await requireUser();

  const parsed = changePasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldig wachtwoord" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "Wachtwoord wijzigen is niet gelukt. Probeer het opnieuw." };
  }

  return { success: true };
}
