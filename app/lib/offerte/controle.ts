import { formatCenten } from "@/app/lib/pricing/format";
import { isGeldigBtwId, isGeldigEmail, isGeldigKvk } from "./validatie";
import { heeftStatutaireGegevens } from "./gegevens";
import { berekenTotalen } from "./bereken";
import type { OfferteInhoud } from "./model";

// "Controleren en versturen": wat moet kloppen voordat een offerte de deur uit
// mag. Blokkerend = versturen kan niet; waarschuwing = de hovenier moet het
// gezien hebben. Wordt ook server-side herhaald bij het versturen.
export type ControlePunt = { id: string; bericht: string; actie?: "klant" | "regels" | "meta" | "profiel" };

export type ControleUitkomst = { blokkerend: ControlePunt[]; waarschuwingen: ControlePunt[]; ok: ControlePunt[] };

export const AFWIJKING_DREMPEL = 0.25;

export function controleerOfferte(inhoud: OfferteInhoud, nu: Date = new Date()): ControleUitkomst {
  const blokkerend: ControlePunt[] = [];
  const waarschuwingen: ControlePunt[] = [];
  const ok: ControlePunt[] = [];
  const a = inhoud.afzender;

  const bedrijfOk = a.handelsnaam.trim() !== "" && isGeldigKvk(a.kvkNummer || "") && (!heeftStatutaireGegevens(a.rechtsvorm) || a.statutaireZetel.trim() !== "");
  if (!bedrijfOk) blokkerend.push({ id: "bedrijf", bericht: heeftStatutaireGegevens(a.rechtsvorm) ? "Handelsnaam, KvK-nummer en statutaire zetel ontbreken of kloppen niet." : "Handelsnaam of KvK-nummer ontbreekt of klopt niet (8 cijfers).", actie: "profiel" });
  else ok.push({ id: "bedrijf", bericht: "Handelsnaam en KvK-nummer staan erop." });

  if (!a.korActief && !isGeldigBtwId(a.btwId || "")) blokkerend.push({ id: "btwid", bericht: "Btw-id ontbreekt (of zet de kleineondernemersregeling aan).", actie: "profiel" });

  const klantOk = inhoud.klant.naam.trim() !== "" && isGeldigEmail(inhoud.klant.email);
  if (!klantOk) blokkerend.push({ id: "klant", bericht: inhoud.klant.naam.trim() === "" ? "De naam van de klant ontbreekt." : "Het e-mailadres van de klant ontbreekt of klopt niet.", actie: "klant" });
  else ok.push({ id: "klant", bericht: "Klantnaam en e-mailadres kloppen." });

  const regels = inhoud.secties.flatMap((s) => s.regels).filter((r) => r.type !== "tekst");
  const t = berekenTotalen(inhoud);
  const nulRegels = regels.filter((r) => (t.regels[r.id]?.excl ?? 0) <= 0);
  if (regels.length === 0 || regels.every((r) => (t.regels[r.id]?.excl ?? 0) <= 0)) blokkerend.push({ id: "geenregels", bericht: "Er is nog geen regel met een bedrag.", actie: "regels" });
  else if (nulRegels.length > 0) blokkerend.push({ id: "nulregels", bericht: nulRegels.length === 1 ? `De regel "${nulRegels[0].omschrijving || "zonder omschrijving"}" heeft een bedrag van €0. Vul een prijs in of maak er een tekstregel van.` : `${nulRegels.length} regels hebben een bedrag van €0. Vul een prijs in of maak er tekstregels van.`, actie: "regels" });
  else ok.push({ id: "regels", bericht: "Alle regels hebben een bedrag." });

  const tot = new Date(`${inhoud.geldigTot}T23:59:59`);
  if (!(tot.getTime() > nu.getTime())) blokkerend.push({ id: "geldig", bericht: "De geldigheidsdatum ligt niet in de toekomst.", actie: "meta" });
  else ok.push({ id: "geldig", bericht: "De offerte is nog geldig." });

  if (inhoud.bijlagen.length === 0) waarschuwingen.push({ id: "av", bericht: "Er zijn geen algemene voorwaarden bijgevoegd. Upload ze bij Profiel → Offertegegevens.", actie: "profiel" });
  else ok.push({ id: "av", bericht: "Algemene voorwaarden worden meegestuurd." });

  const rek = inhoud.bron?.totaalRekentoolInclCenten;
  if (rek && rek > 0) {
    const afwijking = Math.abs(t.totaalIncl - rek) / rek;
    if (afwijking > AFWIJKING_DREMPEL) waarschuwingen.push({ id: "afwijking", bericht: `Het totaal wijkt ${Math.round(afwijking * 100)}% af van de berekening in de rekentool (die was ${formatCenten(rek)}). Klopt dat?`, actie: "regels" });
  }
  for (const w of inhoud.bron?.waarschuwingen ?? []) waarschuwingen.push({ id: `bron-${w.slice(0, 12)}`, bericht: w, actie: "regels" });

  const kort = ["iban", "telefoon", "email", "adresRegel"].filter((k) => !String((a as Record<string, unknown>)[k] ?? "").trim());
  if (kort.length > 0) waarschuwingen.push({ id: "gegevens", bericht: "Niet alle bedrijfsgegevens zijn ingevuld (IBAN, telefoon, e-mail of adres).", actie: "profiel" });

  return { blokkerend, waarschuwingen, ok };
}
