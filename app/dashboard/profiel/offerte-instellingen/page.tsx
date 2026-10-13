import type { Metadata } from "next";
import { InstellingenPagina } from "@/app/components/instellingen/instellingen-pagina";
import { laadProfiel } from "@/app/lib/profiel/laad";
import { OfferteGegevensFormulier } from "../offertegegevens-formulier";

export const metadata: Metadata = { title: "Offerte-instellingen" };

export default async function OfferteInstellingenPagina() {
  const { offertegegevens } = await laadProfiel();
  return (
    <InstellingenPagina titel="Offerte-instellingen">
      <p className="text-sm text-muted-foreground">Nummering, geldigheid, betaling en standaardteksten voor nieuwe offertes. Je bedrijfsgegevens staan bij Bedrijfsgegevens.</p>
      <OfferteGegevensFormulier start={offertegegevens} modus="offerte" autoOpslaan />
    </InstellingenPagina>
  );
}
