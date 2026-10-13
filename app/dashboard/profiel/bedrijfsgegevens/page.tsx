import type { Metadata } from "next";
import { InstellingenPagina } from "@/app/components/instellingen/instellingen-pagina";
import { abonnementLoopt, laadProfiel } from "@/app/lib/profiel/laad";
import { OfferteGegevensFormulier } from "../offertegegevens-formulier";
import { factuurExportStatus } from "@/app/lib/factuur/export-server";
import { BedrijfVerwijderen } from "../bedrijf-verwijderen";

export const metadata: Metadata = { title: "Bedrijfsgegevens" };

// Alle officiële gegevens van het bedrijf op één plek; offertes lezen ze hieruit.
export default async function BedrijfsgegevensPagina() {
  const { company, alleBedrijven, offertegegevens } = await laadProfiel();
  const facturen = alleBedrijven.length > 1 ? await factuurExportStatus(company.id) : undefined;
  return (
    <InstellingenPagina titel="Bedrijfsgegevens">
      <p className="text-sm text-muted-foreground">Deze gegevens staan op je offertes en facturen. Wijzigingen worden automatisch opgeslagen.</p>
      <OfferteGegevensFormulier start={offertegegevens} modus="bedrijf" autoOpslaan bedrijfId={company.id} />
      {alleBedrijven.length > 1 && <BedrijfVerwijderen company={{ id: company.id, naam: company.naam }} abonnementLoopt={abonnementLoopt(company.subscriptionStatus)} facturen={facturen} />}
    </InstellingenPagina>
  );
}
