import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireVolledigAccount } from "@/app/lib/dal";
import { adminFontClasses } from "@/app/lib/admin-fonts";
import { GAST_BEWIJS_COOKIE } from "@/app/lib/gast";
import { controleerGastBewijs, gastOvernameActief } from "@/app/lib/gast-token";
import { OvernameFormulier } from "./overname-formulier";

export const metadata: Metadata = { title: "Voorbeeld toevoegen", robots: { index: false, follow: false } };

export default async function OvernemenPage() {
  await requireVolledigAccount();
  if (!gastOvernameActief()) redirect("/dashboard");
  const bewijs = controleerGastBewijs((await cookies()).get(GAST_BEWIJS_COOKIE)?.value);
  if (!bewijs) redirect("/dashboard");
  return (
    <div data-admin-theme className={`min-h-dvh bg-background text-foreground ${adminFontClasses}`}>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">Voorbeeld toevoegen aan je account?</h1>
        <p className="text-muted-foreground">Je bent ingelogd. Wil je de rekentool die je net maakte toevoegen aan je account? Je bestaande rekentools blijven zoals ze zijn.</p>
        <OvernameFormulier />
      </main>
    </div>
  );
}
