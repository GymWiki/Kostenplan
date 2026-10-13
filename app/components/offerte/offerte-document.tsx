import { AantalInvoer } from "./aantal-invoer";
import type { CSSProperties, ReactNode } from "react";
import { berekenTotalen, prijsPerEenheidWeergave, type Totalen } from "@/app/lib/offerte/bereken";
import type { OfferteInhoud, OfferteRegel } from "@/app/lib/offerte/model";
import {
  adresRegels,
  formatAantal,
  formatCents,
  formatDatum,
  formatDatumTijd,
  formatWeek,
  rechtsvormTekst,
  termijnBedragen,
  voetPaginaTekst,
  voettekstTekst,
} from "@/app/lib/offerte/weergave";
import { heeftStatutaireGegevens } from "@/app/lib/offerte/gegevens";
import { OFFERTE_CSS } from "./offerte-css";
import { FactuurBetaalBlok, FactuurKlantExtra, FactuurMetaRijen, FactuurTermijnBlok, FactuurWatermerk } from "@/app/components/factuur/factuur-blokken";
import { BTW_VERLEGD_TEKST, titelVan, type FactuurInhoud } from "@/app/lib/factuur/model";
import { brandingFontVariables, fontFamilyFor } from "@/app/lib/fonts";
import type { Lettertype } from "@/app/generated/prisma/client";

// Het offertedocument (A4). Eén component voor de editor, de publieke pagina,
// het voorbeeld en de PDF (headless Chromium): wat je op het scherm ziet, is wat
// in de PDF staat. In de editor kun je delen aanklikken (`bewerk`) en tekst
// en hoeveelheden direct aanpassen.

export type Selectie = {
  soort: "afzender" | "klant" | "meta" | "onderwerp" | "intro" | "sectie" | "regel" | "totaal" | "betaling" | "planning" | "voorwaarden" | "herroeping" | "slot";
  id?: string;
  sectieId?: string;
};

export type BewerkHaken = {
  selectie: Selectie | null;
  onSelect: (s: Selectie) => void;
  onRegel: (sectieId: string, regelId: string, patch: Partial<OfferteRegel>) => void;
  onSectieTitel: (sectieId: string, titel: string) => void;
  onTekst: (veld: "onderwerp" | "introductie" | "slottekst", waarde: string) => void;
};

export type AkkoordWeergave = { naam: string; tijdstip: Date };

export type OfferteDocumentProps = {
  inhoud: OfferteInhoud;
  modus?: "scherm" | "pdf";
  gekozenOptioneel?: readonly string[];
  bewerk?: BewerkHaken;
  // Publieke pagina: de klant vinkt optionele regels aan.
  optioneelKeuze?: { onToggle: (regelId: string) => void; uitgeschakeld?: boolean };
  akkoord?: AkkoordWeergave;
  // Ruimte voor een eigen blok onder het akkoordblok (niet gebruikt in de PDF).
  className?: string;
};


function Wijzigbaar({ sel, bewerk, children, className = "", as: Tag = "div" }: { sel: Selectie; bewerk?: BewerkHaken; children: ReactNode; className?: string; as?: "div" | "section" | "p" }) {
  if (!bewerk) return <Tag className={className}>{children}</Tag>;
  const gekozen = bewerk.selectie?.soort === sel.soort && (bewerk.selectie.id ?? "") === (sel.id ?? "");
  return (
    <Tag
      className={`og-wijzigbaar ${gekozen ? "og-gekozen" : ""} ${className}`}
      onClick={(e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("input,textarea,select,button")) return;
        bewerk.onSelect(sel);
      }}
    >
      {children}
    </Tag>
  );
}

export function OfferteDocument({ inhoud, modus = "scherm", gekozenOptioneel = [], bewerk, optioneelKeuze, akkoord, className = "" }: OfferteDocumentProps) {
  const a = inhoud.afzender;
  // Een factuur is een offerte-inhoud met factuurgegevens; dezelfde pagina, tabel en totalen.
  const factuur = (inhoud as Partial<FactuurInhoud>).factuur;
  const fInhoud = factuur ? (inhoud as FactuurInhoud) : null;
  const t: Totalen = berekenTotalen(inhoud, gekozenOptioneel);
  const geenBtw = t.kor || t.verlegd;
  const gekozen = new Set(gekozenOptioneel);
  const toonIncl = t.toonIncl;
  const particulier = inhoud.klant.type === "particulier";
  const stijl = { "--og-kleur": a.kleur || "#15803d", "--og-font": fontFamilyFor((a.lettertype as Lettertype) || "MODERN") } as CSSProperties;
  const klantNaam = inhoud.klant.bedrijfsnaam ? inhoud.klant.bedrijfsnaam : inhoud.klant.naam;
  const adresKlant = adresRegels(inhoud.klant.adres);
  const project = inhoud.projectadresGelijk ? inhoud.klant.adres : inhoud.projectadres;
  const projectRegels = adresRegels(project);
  const eindTotaal = toonIncl ? t.totaalIncl : t.totaalExcl;
  const termijnen = termijnBedragen(inhoud.betaaltermijnen, eindTotaal);
  const heeftPlanning = Boolean(inhoud.planning.startweek.trim() || inhoud.planning.doorlooptijd.trim());
  const aanhef = inhoud.klant.naam.trim() ? `Geachte ${inhoud.klant.naam.trim()},` : "Geachte heer/mevrouw,";

  return (
    <div className={`og-doc ${modus === "pdf" ? "og-pdf" : "og-scherm"} ${brandingFontVariables()} ${className}`} style={stijl} data-offerte-document>
      <style dangerouslySetInnerHTML={{ __html: OFFERTE_CSS }} />
      {fInhoud ? <FactuurWatermerk inhoud={fInhoud} /> : null}

      <Wijzigbaar sel={{ soort: "afzender" }} bewerk={bewerk} className="og-kop">
        <div>
          {a.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- document voor PDF/print: gewone img
            <img className="og-logo" src={a.logoUrl} alt={a.handelsnaam} />
          ) : (
            <div className="og-logo-naam">{a.handelsnaam}</div>
          )}
        </div>
        <div className="og-afzender">
          <strong>{a.handelsnaam}</strong>
          {heeftStatutaireGegevens(a.rechtsvorm) && a.statutaireNaam && a.statutaireNaam !== a.handelsnaam ? <div>{a.statutaireNaam}</div> : null}
          {heeftStatutaireGegevens(a.rechtsvorm) && a.statutaireZetel ? <div>{rechtsvormTekst(a)}</div> : null}
          <div>{a.adresRegel}</div>
          <div>{[a.postcode, a.plaats].filter(Boolean).join(" ")}</div>
          <div>{a.telefoon}</div>
          <div>{a.email}</div>
          {a.website ? <div>{a.website}</div> : null}
        </div>
      </Wijzigbaar>

      <div className="og-adresrij">
        <Wijzigbaar sel={{ soort: "klant" }} bewerk={bewerk} className="og-adres">
          <div style={{ fontWeight: 600 }}>{klantNaam || "Naam klant"}</div>
          {inhoud.klant.bedrijfsnaam && inhoud.klant.naam ? <div>t.a.v. {inhoud.klant.naam}</div> : null}
          {adresKlant.length > 0 ? adresKlant.map((r, i) => <div key={i}>{r}</div>) : bewerk ? <div style={{ color: "#9ca3af" }}>Adres klant</div> : null}
          {fInhoud ? <FactuurKlantExtra inhoud={fInhoud} /> : null}
        </Wijzigbaar>
        <Wijzigbaar sel={{ soort: "meta" }} bewerk={bewerk} className="og-meta">
          <dl>
            {fInhoud ? (
              <FactuurMetaRijen inhoud={fInhoud} />
            ) : (
              <>
                <dt>Offertenummer</dt>
                <dd>{inhoud.nummer}</dd>
                <dt>Datum</dt>
                <dd>{formatDatum(inhoud.datum)}</dd>
                <dt>Geldig tot</dt>
                <dd>{formatDatum(inhoud.geldigTot)}</dd>
              </>
            )}
            {projectRegels.length > 0 ? (
              <>
                <dt>Projectadres</dt>
                <dd style={{ fontWeight: 500 }}>{projectRegels.join(", ")}</dd>
              </>
            ) : null}
            {!fInhoud && inhoud.versie > 1 ? (
              <>
                <dt>Versie</dt>
                <dd>{inhoud.versie}</dd>
              </>
            ) : null}
          </dl>
        </Wijzigbaar>
      </div>

      <h1 className="og-titel">{factuur ? titelVan(factuur.soort) : "Offerte"}</h1>
      <Wijzigbaar sel={{ soort: "onderwerp" }} bewerk={bewerk}>
        {bewerk ? (
          <input className="og-invoer og-onderwerp" aria-label="Onderwerp" value={inhoud.onderwerp} onChange={(e) => bewerk.onTekst("onderwerp", e.target.value)} placeholder={factuur ? "Onderwerp van de factuur" : "Onderwerp van de offerte"} />
        ) : (
          <p className="og-onderwerp">{inhoud.onderwerp}</p>
        )}
      </Wijzigbaar>
      <div className="og-lijn" />

      {!factuur || inhoud.introductie.trim() || bewerk ? (
        <Wijzigbaar sel={{ soort: "intro" }} bewerk={bewerk}>
          {factuur ? null : <p>{aanhef}</p>}
          {bewerk ? (
            <AutoTekst label="Introductie" waarde={inhoud.introductie} onChange={(v) => bewerk.onTekst("introductie", v)} />
          ) : (
            <p className="og-tekst">{inhoud.introductie}</p>
          )}
        </Wijzigbaar>
      ) : null}

      <table className="og-tabel" style={{ marginTop: "7mm" }}>
        <colgroup>
          <col className="c-omschr" />
          <col className="c-aantal" />
          <col className="c-eenheid" />
          <col className="c-prijs" />
          <col className="c-btw" />
          <col className="c-totaal" />
        </colgroup>
        <thead>
          <tr>
            <th>Omschrijving</th>
            <th className="r">Aantal</th>
            <th>Eenheid</th>
            <th className="r">Prijs</th>
            <th className="r">Btw</th>
            <th className="r">Totaal</th>
          </tr>
        </thead>
        {inhoud.secties.map((s, si) => {
          const st = t.secties.find((x) => x.id === s.id)!;
          return (
            <tbody key={s.id}>
              {si > 0 ? (
                <tr className="og-spacer">
                  <td colSpan={6} />
                </tr>
              ) : null}
                <tr
                  className={`og-sectiekop ${bewerk ? "og-wijzigbaar" : ""} ${bewerk?.selectie?.soort === "sectie" && bewerk.selectie.id === s.id ? "og-gekozen" : ""}`}
                  onClick={bewerk ? (e) => !(e.target as HTMLElement).closest("input") && bewerk.onSelect({ soort: "sectie", id: s.id }) : undefined}
                >
                  <td colSpan={5}>
                    {bewerk ? <input className="og-invoer" style={{ fontWeight: 700 }} aria-label="Titel van de sectie" value={s.titel} onChange={(e) => bewerk.onSectieTitel(s.id, e.target.value)} /> : s.titel}
                  </td>
                  <td className="r">{formatCents(toonIncl ? st.incl : st.excl)}</td>
                </tr>
                {s.regels.map((r) => {
                  const u = t.regels[r.id];
                  const optNietGekozen = r.type === "optioneel" && !gekozen.has(r.id);
                  const rijKlas = [r.type === "tekst" ? "og-tekstregel" : "", optNietGekozen ? "og-niet-meetellen" : "", bewerk ? "og-wijzigbaar" : "", bewerk?.selectie?.soort === "regel" && bewerk.selectie.id === r.id ? "og-gekozen" : ""].join(" ");
                  return (
                    <tr key={r.id} className={rijKlas} onClick={bewerk ? (e) => !(e.target as HTMLElement).closest("input") && bewerk.onSelect({ soort: "regel", id: r.id, sectieId: s.id }) : undefined}>
                      <td>
                        {optioneelKeuze && r.type === "optioneel" ? (
                          <label style={{ display: "flex", gap: "2mm", alignItems: "flex-start" }}>
                            <input type="checkbox" checked={gekozen.has(r.id)} disabled={optioneelKeuze.uitgeschakeld} onChange={() => optioneelKeuze.onToggle(r.id)} style={{ marginTop: "1mm", width: "4mm", height: "4mm", accentColor: "var(--og-kleur)" }} />
                            <span>{r.omschrijving}</span>
                          </label>
                        ) : bewerk ? (
                          <input className="og-invoer" aria-label="Omschrijving" value={r.omschrijving} onChange={(e) => bewerk.onRegel(s.id, r.id, { omschrijving: e.target.value })} />
                        ) : (
                          r.omschrijving
                        )}
                        {r.type === "stelpost" ? <span className="og-label stel">Stelpost</span> : null}
                        {r.type === "optioneel" ? <span className="og-label opt">{modus === "pdf" || !optioneelKeuze ? "Optioneel" : "Optioneel"}</span> : null}
                        {r.type === "stelpost" ? <span className="og-toelichting">{r.toelichting || "Geschat bedrag, wordt op nacalculatie afgerekend."}</span> : null}
                        {r.type === "optioneel" ? <span className="og-toelichting">{gekozen.has(r.id) ? "Gekozen: telt mee in het totaal." : "Telt alleen mee in het totaal als u deze regel kiest."}</span> : null}
                        {r.toelichting && r.type !== "stelpost" ? <span className="og-toelichting">{r.toelichting}</span> : null}
                        {r.label === "meerwerk" ? <span className="og-label opt">Meerwerk</span> : null}
                        {r.label === "stelpost-open" ? <span className="og-label stel">Te bepalen</span> : null}
                        {r.kortingPct ? <span className="og-toelichting">Korting {formatAantal(r.kortingPct)}%: −{formatCents(u.korting)}</span> : null}
                      </td>
                      {r.type === "tekst" ? (
                        <td colSpan={5} />
                      ) : (
                        <>
                          <td className="r">
                            {bewerk ? <AantalInvoer aantal={r.aantal} onChange={(n) => bewerk.onRegel(s.id, r.id, { aantal: n })} /> : formatAantal(r.aantal)}
                          </td>
                          <td>
                            {bewerk ? <input className="og-invoer" aria-label="Eenheid" value={r.eenheid} onChange={(e) => bewerk.onRegel(s.id, r.id, { eenheid: e.target.value })} /> : r.eenheid}
                          </td>
                          <td className="r">{formatCents(prijsPerEenheidWeergave(r, toonIncl, t.kor))}</td>
                          <td className="r">{geenBtw ? "–" : `${r.btw}%`}</td>
                          <td className="r">{formatCents(toonIncl ? u.incl : u.excl)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          );
        })}
      </table>

      <Wijzigbaar sel={{ soort: "totaal" }} bewerk={bewerk} className="og-totaal">
        <dl>
          {geenBtw ? null : (
            <>
              <dt>Totaal excl. btw</dt>
              <dd>{formatCents(t.totaalExcl)}</dd>
              {t.btwGroepen.map((g) => (
                <div key={g.tarief} style={{ display: "contents" }}>
                  <dt>
                    Btw {g.tarief}% over {formatCents(g.grondslag)}
                  </dt>
                  <dd>{formatCents(g.btw)}</dd>
                </div>
              ))}
            </>
          )}
        </dl>
        <div className="eind">
          <span>{geenBtw ? "Totaal" : toonIncl ? "Totaal incl. btw" : "Totaal excl. btw"}</span>
          <span>{formatCents(eindTotaal)}</span>
        </div>
        {!geenBtw && !toonIncl ? <p className="klein">Totaal incl. btw: {formatCents(t.totaalIncl)}</p> : null}
        {t.kor ? <p className="klein">{a.korTekst}</p> : null}
        {t.verlegd ? <p className="klein">{BTW_VERLEGD_TEKST}</p> : null}
        {t.optioneelNietGekozenIncl > 0 ? <p className="klein">Niet meegeteld: optionele regels (samen {formatCents(toonIncl || t.kor ? t.optioneelNietGekozenIncl : Math.round(t.optioneelNietGekozenIncl / 1.21))}).</p> : null}
      </Wijzigbaar>

      {fInhoud ? <FactuurTermijnBlok inhoud={fInhoud} /> : null}
      {fInhoud ? <FactuurBetaalBlok inhoud={fInhoud} totalen={t} /> : null}

      {termijnen.length > 0 && (
        <Wijzigbaar sel={{ soort: "betaling" }} bewerk={bewerk} className="og-blok">
          <h3>Betaling</h3>
          <table>
            <tbody>
              {termijnen.map((x, i) => (
                <tr key={i}>
                  <td>{x.label}</td>
                  <td className="r">{formatAantal(x.percentage)}%</td>
                  <td className="r">
                    {formatCents(x.bedrag)} {t.kor ? "" : toonIncl ? "incl. btw" : "excl. btw"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="og-klein" style={{ marginTop: "1.5mm" }}>
            Betaling binnen 14 dagen na factuurdatum
            {a.iban ? `, op IBAN ${a.iban}${a.ibanTenaamstelling ? ` t.n.v. ${a.ibanTenaamstelling}` : ""}` : ""}.
          </p>
        </Wijzigbaar>
      )}

      {heeftPlanning && (
        <Wijzigbaar sel={{ soort: "planning" }} bewerk={bewerk} className="og-blok">
          <h3>Planning</h3>
          <p>
            {inhoud.planning.startweek.trim() ? <>Verwachte start: {formatWeek(inhoud.planning.startweek)}. </> : null}
            {inhoud.planning.doorlooptijd.trim() ? <>Verwachte doorlooptijd: {inhoud.planning.doorlooptijd}. </> : null}
            Dit is een indicatie en geen vaste afspraak.
          </p>
        </Wijzigbaar>
      )}

      {inhoud.voorwaarden.length > 0 && (
        <Wijzigbaar sel={{ soort: "voorwaarden" }} bewerk={bewerk} className="og-blok">
          <h3>Voorwaarden en uitsluitingen</h3>
          <ul className="og-klein">
            {inhoud.voorwaarden.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
          <p className="og-klein" style={{ marginTop: "2mm" }}>
            Op deze offerte en op de overeenkomst zijn onze algemene voorwaarden van toepassing
            {inhoud.bijlagen.length > 0 ? ", die als bijlage zijn meegestuurd" : ""}. Door akkoord te gaan verklaart u deze te hebben ontvangen en te aanvaarden.
          </p>
        </Wijzigbaar>
      )}

      {!factuur && particulier && inhoud.herroeping.aan && inhoud.herroeping.tekst.trim() && (
        <Wijzigbaar sel={{ soort: "herroeping" }} bewerk={bewerk} className="og-blok">
          <h3>Herroepingsrecht</h3>
          <p className="og-klein" style={{ whiteSpace: "pre-line" }}>
            {inhoud.herroeping.tekst}
          </p>
        </Wijzigbaar>
      )}

      <Wijzigbaar sel={{ soort: "slot" }} bewerk={bewerk} className="og-blok">
        {bewerk ? <AutoTekst label="Slottekst" waarde={inhoud.slottekst} onChange={(v) => bewerk.onTekst("slottekst", v)} /> : <p className="og-tekst" style={{ marginTop: 0 }}>{inhoud.slottekst}</p>}
        <p style={{ marginTop: "3mm" }}>Met vriendelijke groet,</p>
      </Wijzigbaar>

      <div className="og-ondertekening">
        <div>
          <div className="og-handtekening">
            <strong style={{ color: "#111827" }}>{a.contactNaam}</strong>
            <div>{[a.contactFunctie, a.handelsnaam].filter(Boolean).join(", ")}</div>
          </div>
        </div>
        {factuur ? null : <div className={`og-akkoord ${akkoord ? "og-getekend" : ""}`}>
          <h3>Akkoord opdrachtgever</h3>
          <p className="og-klein">Ik ga akkoord met deze offerte{eindTotaal > 0 ? ` van ${formatCents(eindTotaal)}` : ""} en de algemene voorwaarden.</p>
          <div className="velden">
            <div className="veld">
              Naam
              {akkoord ? <b>{akkoord.naam}</b> : null}
            </div>
            <div className="veld">
              Datum en tijd
              {akkoord ? <b>{formatDatumTijd(akkoord.tijdstip)}</b> : null}
            </div>
            {!akkoord ? <div className="veld" style={{ gridColumn: "1 / -1", minHeight: "14mm" }}>Handtekening</div> : null}
          </div>
        </div>}
      </div>

      <div className="og-voet">
        {voettekstTekst(a)}
        <span className="pagina">{voetPaginaTekst(inhoud)} · Pagina 1 van 1</span>
      </div>
    </div>
  );
}

// Tekstvak dat meegroeit met de inhoud (client-side; in de PDF nooit gebruikt).
function AutoTekst({ label, waarde, onChange }: { label: string; waarde: string; onChange: (v: string) => void }) {
  return (
    <textarea
      className="og-invoer og-tekst"
      aria-label={label}
      value={waarde}
      rows={Math.max(2, waarde.split("\n").length + Math.floor(waarde.length / 95))}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
