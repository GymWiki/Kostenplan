"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Segmented } from "@/app/components/ui/segmented";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/input";
import { UnitInput } from "@/app/components/ui/unit-input";
import { AdresZoeker, type AdresKeuze } from "./adres-zoeker";
import { OpslaanStatus, useAutoSave } from "@/app/components/instellingen/use-autosave";
import { slaWerkgebiedOpAction, type WerkgebiedBereik } from "@/app/lib/actions/werkgebied";
import { parseGetal } from "@/app/lib/sjablonen";
import { adresRegel } from "@/app/lib/werkgebied/adres-invoer";
import { formatReeksen, parsePostcodes } from "@/app/lib/werkgebied/postcodes";
import { zoekPostcodeGebied } from "@/app/lib/werkgebied/pdok";
import { STANDAARD_MELDING_BUITEN, type Startadres, type WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";
import type { KaartPunt } from "./kaart";

const Kaart = dynamic(() => import("./kaart").then((m) => m.WerkgebiedKaart), { ssr: false, loading: () => <div className="h-[280px] w-full animate-pulse rounded-xl bg-muted" /> });

type ZoneTekst = { totKm: string; bedrag: string; nietMogelijk: boolean };

const kmTekst = (n: number) => String(n).replace(".", ",");

function naarZones(i: WerkgebiedInstellingen): ZoneTekst[] {
  return i.werkgebied.toeslag.zones.map((z) => ({ totKm: z.totKm === null ? "" : kmTekst(z.totKm), bedrag: z.bedragEuro === null ? "" : kmTekst(z.bedragEuro), nietMogelijk: z.bedragEuro === null }));
}

// Werkgebied en minimale opdracht. Gebruikt in Profiel (bedrijf) en in de editor (per rekentool: overnemen of afwijken).
export function WerkgebiedFormulier({
  bereik,
  start,
  bedrijfInstellingen,
  eigen = false,
  onOpgeslagen,
  autoOpslaan = false,
}: {
  // Automatisch opslaan (met status) in plaats van een opslaanknop.
  autoOpslaan?: boolean;
  bereik: WerkgebiedBereik;
  start: WerkgebiedInstellingen;
  // Bij een rekentool: wat het bedrijf heeft ingesteld (getoond als "overnemen" gekozen is).
  bedrijfInstellingen?: WerkgebiedInstellingen;
  // Bij een rekentool: heeft deze rekentool al een eigen instelling?
  eigen?: boolean;
  onOpgeslagen?: (i: WerkgebiedInstellingen) => void;
}) {
  const perTool = bereik.soort === "tool";
  const [overnemen, setOvernemen] = useState(perTool ? !eigen : false);
  const begin = overnemen && bedrijfInstellingen ? bedrijfInstellingen : start;
  const [w, setW] = useState(begin.werkgebied);
  const [m, setM] = useState(begin.minimum);
  const [straal, setStraal] = useState(kmTekst(begin.werkgebied.straalKm));
  const [perKm, setPerKm] = useState(kmTekst(begin.werkgebied.toeslag.perKmEuro));
  const [zones, setZones] = useState<ZoneTekst[]>(naarZones(begin));
  const [minBedrag, setMinBedrag] = useState(begin.minimum.bedragEuro ? kmTekst(begin.minimum.bedragEuro) : "");
  const [startKeuze, setStartKeuze] = useState<Startadres | null>(begin.werkgebied.start);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);
  const [postcodePunten, setPostcodePunten] = useState<KaartPunt[]>([]);

  const pc = useMemo(() => parsePostcodes(w.postcodes), [w.postcodes]);
  const startTekst = startKeuze ? `${startKeuze.postcode} ${startKeuze.huisnummer}${startKeuze.toevoeging ? ` ${startKeuze.toevoeging}` : ""}` : "";

  // Kaart voor postcodegebieden: een punt per (steekproef van) postcode.
  useEffect(() => {
    if (w.methode !== "POSTCODES" || pc.reeksen.length === 0) {
      setPostcodePunten([]);
      return;
    }
    const codes: number[] = [];
    for (const [a, b] of pc.reeksen) for (let c = a; c <= b && codes.length < 400; c++) codes.push(c);
    const stap = Math.max(1, Math.ceil(codes.length / 24));
    const sample = codes.filter((_, i) => i % stap === 0).slice(0, 24);
    let weg = false;
    const t = setTimeout(async () => {
      const uit = await Promise.all(sample.map((c) => zoekPostcodeGebied(c)));
      if (weg) return;
      setPostcodePunten(uit.flatMap((r, i) => (r.ok && r.waarde ? [{ lat: r.waarde.lat, lon: r.waarde.lon, label: String(sample[i]) }] : [])));
    }, 400);
    return () => {
      weg = true;
      clearTimeout(t);
    };
  }, [w.methode, pc.reeksen]);

  function kiesStart(k: AdresKeuze) {
    if (k.soort === "gevonden") {
      setStartKeuze({ postcode: k.adres.postcode, huisnummer: k.ruw.huisnummer, toevoeging: k.ruw.toevoeging, straat: k.adres.straat, plaats: k.adres.plaats, lat: k.adres.lat, lon: k.adres.lon });
    } else if (k.soort === "onbekend") setStartKeuze(null);
  }

  function bouwInstellingen(): WerkgebiedInstellingen {
    return {
      werkgebied: {
        ...w,
        start: startKeuze,
        straalKm: parseGetal(straal, 30),
        toeslag: {
          modus: w.toeslag.modus,
          perKmEuro: parseGetal(perKm, 0),
          zones: zones.map((z) => ({ totKm: z.totKm.trim() === "" ? null : parseGetal(z.totKm, 0), bedragEuro: z.nietMogelijk ? null : parseGetal(z.bedrag, 0) })),
        },
      },
      minimum: { ...m, bedragEuro: parseGetal(minBedrag, 0) },
    };
  }

  const auto = useAutoSave(
    { w, m, straal, perKm, zones, minBedrag, startKeuze, overnemen },
    async () => {
      const r = await slaWerkgebiedOpAction(perTool ? { ...bereik, overnemen } : bereik, bouwInstellingen());
      if (!r.ok) return { ok: false, fout: r.error };
      onOpgeslagen?.(r.instellingen);
      return { ok: true };
    },
    { aan: autoOpslaan, vertragingMs: 1200 }
  );

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setMelding(null);
    const r = await slaWerkgebiedOpAction(perTool ? { ...bereik, overnemen } : bereik, bouwInstellingen());
    setBezig(false);
    if (!r.ok) return setMelding({ soort: "fout", tekst: r.error });
    setMelding({ soort: "ok", tekst: "Opgeslagen. Je rekentools gebruiken dit direct." });
    onOpgeslagen?.(r.instellingen);
  }

  const uit = perTool && overnemen;
  const toeslagKan = w.methode === "STRAAL";

  return (
    <form onSubmit={opslaan} className="flex w-full max-w-[640px] flex-col gap-6">
      {perTool && (
        <Field label="Voor deze rekentool" as="fieldset">
          <Segmented
            name="werkgebied-bereik"
            value={overnemen ? "OVERNEMEN" : "EIGEN"}
            onChange={(v) => setOvernemen(v === "OVERNEMEN")}
            options={[
              { value: "OVERNEMEN", label: "Instelling van je bedrijf", description: "Wijzigingen in Profiel gelden ook hier." },
              { value: "EIGEN", label: "Eigen instelling", description: "Alleen voor deze rekentool." },
            ]}
            className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
          />
        </Field>
      )}

      <fieldset disabled={uit} className="flex min-w-0 flex-col gap-6 disabled:opacity-60">
        {/* ── Werkgebied ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Werkgebied</h3>
              <p className="text-sm text-muted-foreground">Vraag de klant eerst naar zijn adres. Zo weet hij vooraf of je bij hem werkt.</p>
            </div>
            <Switch aria-label="Werkgebied gebruiken" checked={w.aan} onChange={(e) => setW({ ...w, aan: e.target.checked })} />
          </div>

          {w.aan && (
            <>
              <Field label="Hoe bepaal je je werkgebied?" as="fieldset">
                <Segmented
                  name="werkgebied-methode"
                  value={w.methode}
                  onChange={(v) => setW({ ...w, methode: v, buiten: v === "POSTCODES" && w.buiten === "TOESLAG" ? "MARKEREN" : w.buiten })}
                  options={[
                    { value: "STRAAL", label: "Straal rond een adres", description: "Bijvoorbeeld 30 km rond je bedrijf." },
                    { value: "POSTCODES", label: "Postcodegebieden", description: "Een lijst postcodes of reeksen, bijv. 8000–8099." },
                  ]}
                  className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
                />
              </Field>

              {w.methode === "STRAAL" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
                  <Field label="Startadres" htmlFor="wg-start" hint={startKeuze ? adresRegel({ ...startKeuze }) : "Je vestigingsadres of een ander adres. Het wordt één keer opgezocht bij het opslaan."}>
                    <AdresZoeker id="wg-start" beginTekst={startTekst} onKeuze={kiesStart} />
                  </Field>
                  <Field label="Straal" htmlFor="wg-straal" hint="Hemelsbreed, dus niet de reisafstand.">
                    <UnitInput id="wg-straal" suffix="km" value={straal} onChange={(e) => setStraal(e.target.value)} />
                  </Field>
                </div>
              ) : (
                <Field
                  label="Postcodes"
                  htmlFor="wg-postcodes"
                  error={pc.fouten.length > 0 ? `Dit herken ik niet: ${pc.fouten.slice(0, 5).join(", ")}` : undefined}
                  hint={pc.aantal > 0 ? `${pc.aantal} ${pc.aantal === 1 ? "postcode" : "postcodes"}: ${formatReeksen(pc.reeksen).slice(0, 120)}` : "Plak een lijst met 4-cijferige postcodes en reeksen, gescheiden door komma's of regels."}
                >
                  <Textarea id="wg-postcodes" rows={4} value={w.postcodes} onChange={(e) => setW({ ...w, postcodes: e.target.value })} placeholder="8000-8099, 8101, 8200-8210" />
                </Field>
              )}

              <Kaart
                start={w.methode === "STRAAL" && startKeuze ? { lat: startKeuze.lat, lon: startKeuze.lon, label: "Startadres" } : null}
                straalKm={w.methode === "STRAAL" ? parseGetal(straal, 0) : null}
                postcodes={w.methode === "POSTCODES" ? postcodePunten : []}
                ariaLabel="Kaart van je werkgebied"
              />

              <Field label="Wat gebeurt er bij een adres buiten je werkgebied?" as="fieldset">
                <Segmented
                  name="werkgebied-buiten"
                  value={w.buiten}
                  onChange={(v) => setW({ ...w, buiten: v })}
                  options={[
                    { value: "GEEN_AANVRAAG", label: "Geen aanvraag", description: "De klant ziet een melding en kan geen aanvraag doen." },
                    { value: "MARKEREN", label: "Wel aanvragen", description: "De aanvraag komt binnen, gemarkeerd als \"Buiten werkgebied\"." },
                    ...(toeslagKan ? [{ value: "TOESLAG" as const, label: "Afstandstoeslag", description: "Extra voorrijkosten voor de afstand." }] : []),
                  ]}
                  className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-3"
                />
              </Field>

              {w.buiten === "TOESLAG" && toeslagKan && (
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4">
                  <Field label="Hoe reken je de toeslag?" as="fieldset">
                    <Segmented
                      name="werkgebied-toeslag"
                      value={w.toeslag.modus}
                      onChange={(v) => setW({ ...w, toeslag: { ...w.toeslag, modus: v } })}
                      options={[
                        { value: "PER_KM", label: "Per kilometer", description: "Voor elke km buiten de straal." },
                        { value: "ZONES", label: "Zones", description: "Een vast bedrag per afstandszone." },
                      ]}
                      className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
                    />
                  </Field>
                  {w.toeslag.modus === "PER_KM" ? (
                    <Field label="Extra voorrijkosten" htmlFor="wg-perkm" hint="Per kilometer buiten de straal, excl. btw.">
                      <UnitInput id="wg-perkm" prefix="€" suffix="per km" value={perKm} onChange={(e) => setPerKm(e.target.value)} />
                    </Field>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">De afstand is gerekend vanaf je startadres. Bedragen excl. btw.</p>
                      {zones.map((z, i) => {
                        const laatste = i === zones.length - 1;
                        return (
                          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                            <Field label={laatste ? "Vanaf" : "Tot en met"} htmlFor={`wg-zone-km-${i}`}>
                              {laatste ? (
                                <div className="flex h-11 items-center rounded-md border-[1.5px] border-input bg-muted px-3 text-base text-muted-foreground">
                                  {(() => {
                                    const v = zones[i - 1]?.totKm;
                                    return v ? `${v} km en verder` : "en verder";
                                  })()}
                                </div>
                              ) : (
                                <UnitInput id={`wg-zone-km-${i}`} suffix="km" value={z.totKm} onChange={(e) => setZones(zones.map((x, k) => (k === i ? { ...x, totKm: e.target.value } : x)))} />
                              )}
                            </Field>
                            <Field label="Toeslag" htmlFor={`wg-zone-bedrag-${i}`}>
                              {z.nietMogelijk ? (
                                <div className="flex h-11 items-center rounded-md border-[1.5px] border-input bg-muted px-3 text-base text-muted-foreground">Niet mogelijk</div>
                              ) : (
                                <UnitInput id={`wg-zone-bedrag-${i}`} prefix="€" value={z.bedrag} onChange={(e) => setZones(zones.map((x, k) => (k === i ? { ...x, bedrag: e.target.value } : x)))} />
                              )}
                            </Field>
                            <div className="flex h-11 items-center gap-1">
                              <label className="flex min-h-11 cursor-pointer items-center gap-1.5 text-sm text-foreground">
                                <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={z.nietMogelijk} onChange={(e) => setZones(zones.map((x, k) => (k === i ? { ...x, nietMogelijk: e.target.checked } : x)))} />
                                Niet mogelijk
                              </label>
                              {!laatste && zones.length > 2 && (
                                <button type="button" aria-label="Zone verwijderen" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-secondary" onClick={() => setZones(zones.filter((_, k) => k !== i))}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setZones([...zones.slice(0, -1), { totKm: "", bedrag: "", nietMogelijk: false }, zones[zones.length - 1]])}>
                        <Plus className="h-4 w-4" aria-hidden="true" /> Zone toevoegen
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Field label="Tekst bij een adres buiten je werkgebied" htmlFor="wg-melding" hint="Je telefoonnummer en e-mailadres staan er automatisch onder, als je ze op je rekentool toont.">
                <Textarea id="wg-melding" rows={3} value={w.melding} onChange={(e) => setW({ ...w, melding: e.target.value })} placeholder={STANDAARD_MELDING_BUITEN} />
              </Field>

              {w.buiten === "MARKEREN" && (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Automatisch een vriendelijke afwijzing mailen</h4>
                      <p className="text-sm text-muted-foreground">Standaard uit. De klant krijgt dan een mail als zijn aanvraag buiten je werkgebied valt.</p>
                    </div>
                    <Switch aria-label="Afwijzingsmail versturen" checked={w.afwijzingsmail.aan} onChange={(e) => setW({ ...w, afwijzingsmail: { ...w.afwijzingsmail, aan: e.target.checked } })} />
                  </div>
                  {w.afwijzingsmail.aan && (
                    <>
                      <Field label="Onderwerp" htmlFor="wg-mail-onderwerp">
                        <input id="wg-mail-onderwerp" className="h-11 w-full rounded-md border-[1.5px] border-input bg-card px-3 text-base" value={w.afwijzingsmail.onderwerp} onChange={(e) => setW({ ...w, afwijzingsmail: { ...w.afwijzingsmail, onderwerp: e.target.value } })} placeholder="Je aanvraag bij {bedrijf}" />
                      </Field>
                      <Field label="Tekst" htmlFor="wg-mail-tekst" hint="Gebruik {naam} en {bedrijf}.">
                        <Textarea id="wg-mail-tekst" rows={5} value={w.afwijzingsmail.tekst} onChange={(e) => setW({ ...w, afwijzingsmail: { ...w.afwijzingsmail, tekst: e.target.value } })} placeholder={"Beste {naam},\n\nBedankt voor je aanvraag. Je adres ligt helaas buiten ons werkgebied. Neem gerust contact op, dan kijken we of we iets voor je kunnen doen.\n\nMet vriendelijke groet,\n{bedrijf}"} />
                      </Field>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Minimale opdracht ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Minimale opdracht</h3>
              <p className="text-sm text-muted-foreground">Voor kleine klussen die je niet wilt doen, of die je tegen een minimumtarief doet.</p>
            </div>
            <Switch aria-label="Minimale opdracht gebruiken" checked={m.aan} onChange={(e) => setM({ ...m, aan: e.target.checked })} />
          </div>
          {m.aan && (
            <>
              <Field label="Minimumbedrag" htmlFor="wg-minimum" hint="Inclusief btw: het bedrag dat de klant ziet.">
                <UnitInput id="wg-minimum" prefix="€" className="max-w-[12rem]" value={minBedrag} onChange={(e) => setMinBedrag(e.target.value)} />
              </Field>
              <Field label="Wat gebeurt er onder het minimum?" as="fieldset">
                <Segmented
                  name="minimum-gedrag"
                  value={m.gedrag}
                  onChange={(v) => setM({ ...m, gedrag: v })}
                  options={[
                    { value: "TARIEF", label: "Minimumtarief rekenen", description: "De prijs wordt minimaal het minimumbedrag." },
                    { value: "GEEN_AANVRAAG", label: "Geen aanvraag", description: "\"We nemen opdrachten aan vanaf …\"" },
                    { value: "MARKEREN", label: "Wel aanvragen", description: "Gemarkeerd als \"Onder minimum\"." },
                  ]}
                  className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-3"
                />
              </Field>
            </>
          )}
        </section>
      </fieldset>

      {autoOpslaan ? (
        <OpslaanStatus stand={auto.stand} bericht={auto.bericht} opnieuw={auto.opnieuw} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={bezig}>
            {bezig ? "Opslaan…" : "Opslaan"}
          </Button>
          <p role="status" aria-live="polite" className={melding?.soort === "fout" ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
            {melding?.tekst}
          </p>
        </div>
      )}
    </form>
  );
}
