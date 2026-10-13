import type { Metadata } from "next";
import { InstellingenPagina } from "@/app/components/instellingen/instellingen-pagina";
import { WerkgebiedFormulier } from "@/app/components/werkgebied/werkgebied-formulier";
import { laadProfiel } from "@/app/lib/profiel/laad";

export const metadata: Metadata = { title: "Werkgebied en minimum" };

export default async function WerkgebiedPagina() {
  const { werkgebied } = await laadProfiel();
  return (
    <InstellingenPagina titel="Werkgebied en minimum">
      <p className="text-sm text-muted-foreground">Alleen aanvragen binnen je werkgebied en boven een minimumbedrag. Per rekentool kun je afwijken; dat doe je in de rekentool zelf.</p>
      <WerkgebiedFormulier bereik={{ soort: "bedrijf" }} start={werkgebied} autoOpslaan />
    </InstellingenPagina>
  );
}
