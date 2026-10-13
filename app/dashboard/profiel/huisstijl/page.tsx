import type { Metadata } from "next";
import { Palette } from "lucide-react";
import { InstellingenPagina } from "@/app/components/instellingen/instellingen-pagina";
import { SettingsGroup, SettingsRow } from "@/app/components/instellingen/settings";
import { laadProfiel } from "@/app/lib/profiel/laad";

export const metadata: Metadata = { title: "Huisstijl & logo" };

// Logo en kleuren pas je aan in de rekentool zelf (klik op de kop); hier zie je ze per rekentool.
export default async function HuisstijlPagina() {
  const { tools } = await laadProfiel();
  return (
    <InstellingenPagina titel="Huisstijl & logo">
      <p className="text-sm text-muted-foreground">Je logo en kleuren pas je aan in je rekentool: klik op de kop. Zo zie je meteen wat je klant ziet.</p>
      {tools.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Zodra je een rekentool hebt, zie je hier het uiterlijk ervan.</p>
      ) : (
        <SettingsGroup kop="Je rekentools">
          {tools.map((t) => (
            <SettingsRow
              key={t.id}
              href={`/dashboard/tools/${t.id}?paneel=uiterlijk`}
              icoon={Palette}
              titel={t.naam}
              samenvatting={t.branding?.logoUrl ? "Logo en kleur ingesteld" : "Nog geen logo"}
              rechts={
                <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
                  <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: t.branding?.primaireKleur ?? "#15803d" }} />
                  {t.branding?.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- extern logo
                    <img src={t.branding.logoUrl} alt="" width={28} height={28} className="h-7 w-7 rounded border border-border bg-white object-contain" />
                  )}
                </span>
              }
            />
          ))}
        </SettingsGroup>
      )}
    </InstellingenPagina>
  );
}
