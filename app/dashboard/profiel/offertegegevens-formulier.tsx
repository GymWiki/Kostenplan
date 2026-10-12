"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { saveOfferteGegevensAction, uploadVoorwaardenAction, verwijderVoorwaardenAction } from "@/app/lib/actions/offerte-gegevens";
import {
  BETAAL_PRESETS,
  heeftStatutaireGegevens,
  RECHTSVORM_LABEL,
  STANDAARD_HERROEPINGSTEKST,
  termijnenVoor,
  VOORWAARDEN_INFO,
  voorwaardenTeksten,
  type BetaalTermijn,
  type OfferteGegevensWaarden,
  type RechtsvormWaarde,
  type VoorwaardenBlok,
} from "@/app/lib/offerte/gegevens";
import { BTW_TARIEVEN, REGEL_SOORT_LABEL, btwVoorSoort, type RegelSoort } from "@/app/lib/offerte/btw-config";
import { formatteerOfferteNummer } from "@/app/lib/offerte/nummer-formaat";

// Velden-groepen die de wizard één voor één kan vragen (zelfde sleutels als
// ontbrekendeVerplichteGegevens() in app/lib/offerte/gegevens.ts).
export type VeldGroep = "handelsnaam" | "kvkNummer" | "statutaireZetel" | "adres" | "btwId" | "iban" | "ibanTenaamstelling" | "telefoon" | "email" | "contactNaam";

export function OfferteGegevensFormulier({
  start,
  alleenVelden,
  onOpgeslagen,
  onWijzig,
  opslaanLabel = "Offertegegevens opslaan",
}: {
  start: OfferteGegevensWaarden;
  // Wizard: alleen deze velden tonen (geen standaardinstellingen).
  alleenVelden?: string[];
  onOpgeslagen?: (g: OfferteGegevensWaarden) => void;
  onWijzig?: (g: OfferteGegevensWaarden) => void;
  opslaanLabel?: string;
}) {
  const [g, setG] = useState<OfferteGegevensWaarden>(start);
  const [fouten, setFouten] = useState<Record<string, string>>({});
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);
  const [upload, setUpload] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wizard = Boolean(alleenVelden);
  const toon = (sleutel: string) => !alleenVelden || alleenVelden.includes(sleutel);

  function zet<K extends keyof OfferteGegevensWaarden>(sleutel: K, waarde: OfferteGegevensWaarden[K]) {
    setG((vorig) => {
      const nieuw = { ...vorig, [sleutel]: waarde };
      onWijzig?.(nieuw);
      return nieuw;
    });
  }

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setMelding(null);
    const r = await saveOfferteGegevensAction(g);
    setBezig(false);
    if (!r.ok) {
      setFouten(r.fouten);
      return setMelding({ soort: "fout", tekst: r.error ?? "Controleer de gemarkeerde velden." });
    }
    setFouten({});
    setG(r.gegevens);
    setMelding({ soort: "ok", tekst: "Opgeslagen." });
    onOpgeslagen?.(r.gegevens);
  }

  async function kiesBestand(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUpload("Uploaden…");
    const fd = new FormData();
    fd.set("bestand", f);
    const r = await uploadVoorwaardenAction(fd);
    setUpload(r.ok ? null : r.error);
    if (r.ok) {
      zet("voorwaardenPdfUrl", r.url);
      zet("voorwaardenPdfNaam", r.naam);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const termijnen: BetaalTermijn[] = termijnenVoor(g.betaalPreset, g.betaalTermijnen);
  const sluit = (b: VoorwaardenBlok) => (nieuw: Partial<VoorwaardenBlok>) => zet("voorwaardenBlokken", g.voorwaardenBlokken.map((x) => (x.id === b.id ? { ...x, ...nieuw } : x)));
  const veld = (k: keyof OfferteGegevensWaarden, label: string, extra?: { hint?: string; type?: string; inputMode?: "numeric" | "tel" | "email" | "text"; autoComplete?: string; placeholder?: string }) => (
    <Field label={label} htmlFor={`og-${k}`} hint={extra?.hint} error={fouten[k]}>
      <Input
        id={`og-${k}`}
        type={extra?.type ?? "text"}
        inputMode={extra?.inputMode}
        autoComplete={extra?.autoComplete}
        placeholder={extra?.placeholder}
        value={String(g[k] ?? "")}
        aria-invalid={fouten[k] ? true : undefined}
        onChange={(e) => zet(k, e.target.value as never)}
      />
    </Field>
  );

  const groep = "grid grid-cols-1 gap-4 min-[520px]:grid-cols-2";
  return (
    <form onSubmit={opslaan} className="flex max-w-3xl flex-col gap-8" noValidate>
      {(toon("handelsnaam") || toon("kvkNummer") || toon("adres") || toon("btwId") || toon("statutaireZetel")) && (
        <fieldset className="flex flex-col gap-4">
          {!wizard && <legend className="mb-1 text-base font-bold text-foreground">Bedrijf</legend>}
          {toon("handelsnaam") && (
            <div className={groep}>
              {veld("handelsnaam", "Handelsnaam", { autoComplete: "organization" })}
              <Field label="Rechtsvorm" htmlFor="og-rechtsvorm">
                <Select id="og-rechtsvorm" value={g.rechtsvorm} onChange={(e) => zet("rechtsvorm", e.target.value as RechtsvormWaarde)}>
                  {(Object.keys(RECHTSVORM_LABEL) as RechtsvormWaarde[]).map((k) => (
                    <option key={k} value={k}>
                      {RECHTSVORM_LABEL[k]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          {heeftStatutaireGegevens(g.rechtsvorm) && (toon("statutaireZetel") || toon("handelsnaam")) && (
            <div className={groep}>
              {veld("statutaireNaam", "Statutaire naam", { hint: "Alleen invullen als die afwijkt van je handelsnaam." })}
              {veld("statutaireZetel", "Statutaire zetel", { hint: "De plaats waar je bv of nv statutair gevestigd is." })}
            </div>
          )}
          {toon("kvkNummer") && veld("kvkNummer", "KvK-nummer", { inputMode: "numeric", hint: "8 cijfers.", placeholder: "12345678" })}
          {toon("adres") && (
            <>
              {veld("adresRegel", "Straat en huisnummer", { autoComplete: "street-address" })}
              <div className={groep}>
                {veld("postcode", "Postcode", { autoComplete: "postal-code", placeholder: "1234 AB" })}
                {veld("plaats", "Plaats", { autoComplete: "address-level2" })}
              </div>
            </>
          )}
          {toon("btwId") && (
            <>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground">
                <span>
                  Ik gebruik de kleineondernemersregeling (KOR)
                  <span className="block text-sm font-normal text-muted-foreground">Je rekent dan geen btw.</span>
                </span>
                <Switch checked={g.korActief} onChange={(e) => zet("korActief", e.target.checked)} aria-label="Kleineondernemersregeling" />
              </label>
              {g.korActief ? (
                <Field label="Vermelding op de offerte" htmlFor="og-korTekst" error={fouten.korTekst}>
                  <Input id="og-korTekst" value={g.korTekst} onChange={(e) => zet("korTekst", e.target.value)} />
                </Field>
              ) : (
                veld("btwId", "Btw-id", { hint: "Formaat NL123456789B01.", placeholder: "NL123456789B01" })
              )}
            </>
          )}
        </fieldset>
      )}

      {(toon("iban") || toon("ibanTenaamstelling")) && (
        <fieldset className={groep}>
          {!wizard && <legend className="mb-1 text-base font-bold text-foreground">Betalen</legend>}
          {toon("iban") && veld("iban", "IBAN", { placeholder: "NL91 ABNA 0417 1643 00" })}
          {toon("ibanTenaamstelling") && veld("ibanTenaamstelling", "Ten name van", { hint: "Wiens naam staat op de rekening?" })}
        </fieldset>
      )}

      {(toon("telefoon") || toon("email") || toon("contactNaam")) && (
        <fieldset className="flex flex-col gap-4">
          {!wizard && <legend className="mb-1 text-base font-bold text-foreground">Contact</legend>}
          <div className={groep}>
            {toon("telefoon") && veld("telefoon", "Telefoon", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
            {toon("email") && veld("email", "E-mailadres", { type: "email", inputMode: "email", autoComplete: "email" })}
          </div>
          {!wizard && veld("website", "Website", { placeholder: "www.jouwbedrijf.nl" })}
          {toon("contactNaam") && (
            <div className={groep}>
              {veld("contactNaam", "Contactpersoon", { hint: "Wie ondertekent de offerte?" })}
              {veld("contactFunctie", "Functie", { placeholder: "Eigenaar" })}
            </div>
          )}
          {!wizard && (
            <p className="text-sm text-muted-foreground">
              Het logo op je offerte komt uit je rekentool. Je past het aan via Uiterlijk.
              {g.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- extern logo, afmetingen onbekend
                <img src={g.logoUrl} alt="Je logo" className="mt-2 h-12 w-auto max-w-[12rem] object-contain" />
              )}
            </p>
          )}
        </fieldset>
      )}

      {!wizard && (
        <>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-base font-bold text-foreground">Algemene voorwaarden</legend>
            <p className="text-sm text-muted-foreground">Upload je algemene voorwaarden als PDF. Ze worden bij elke offerte meegestuurd. Ben je lid van de VHG? Dan kun je de VHG-voorwaarden gebruiken.</p>
            {g.voorwaardenPdfUrl ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <a href={g.voorwaardenPdfUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-semibold underline">
                  {g.voorwaardenPdfNaam || "Algemene voorwaarden.pdf"}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await verwijderVoorwaardenAction();
                    zet("voorwaardenPdfUrl", "");
                    zet("voorwaardenPdfNaam", "");
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Verwijderen
                </Button>
              </div>
            ) : (
              <p className="rounded-lg bg-example/15 px-3 py-2 text-sm text-foreground">Nog geen voorwaarden geüpload. Bij het versturen krijg je hier een waarschuwing over.</p>
            )}
            <div>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" id="og-voorwaarden" onChange={kiesBestand} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" aria-hidden="true" /> {g.voorwaardenPdfUrl ? "Andere PDF kiezen" : "PDF uploaden"}
              </Button>
              {upload && <p role="status" className="mt-2 text-sm text-muted-foreground">{upload}</p>}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-base font-bold text-foreground">Standaard voor nieuwe offertes</legend>
            <div className={groep}>
              <Field label="Voorvoegsel offertenummer" htmlFor="og-nummerPrefix" hint={`Bijvoorbeeld ${formatteerOfferteNummer(g.nummerPrefix, new Date().getFullYear(), 1)}. Het volgnummer loopt per jaar op.`} error={fouten.nummerPrefix}>
                <Input id="og-nummerPrefix" value={g.nummerPrefix} maxLength={10} onChange={(e) => zet("nummerPrefix", e.target.value)} placeholder="Geen" />
              </Field>
              <Field label="Geldigheid in dagen" htmlFor="og-geldigheidDagen" error={fouten.geldigheidDagen}>
                <Input id="og-geldigheidDagen" inputMode="numeric" value={String(g.geldigheidDagen)} onChange={(e) => zet("geldigheidDagen", Number(e.target.value.replace(/\D/g, "")) || 0)} />
              </Field>
            </div>
            <Field label="Betaalvoorwaarden" htmlFor="og-betaalPreset" error={fouten.betaalTermijnen}>
              <Select
                id="og-betaalPreset"
                value={g.betaalPreset}
                onChange={(e) => {
                  zet("betaalPreset", e.target.value);
                  zet("betaalTermijnen", termijnenVoor(e.target.value, g.betaalTermijnen));
                }}
              >
                {Object.entries(BETAAL_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </Field>
            {g.betaalPreset === "EIGEN" && (
              <div className="flex flex-col gap-2">
                {termijnen.map((t, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <Field label={`Termijn ${i + 1}`} htmlFor={`og-t${i}`} className="flex-1">
                      <Input id={`og-t${i}`} value={t.label} onChange={(e) => zet("betaalTermijnen", termijnen.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    </Field>
                    <Field label="%" htmlFor={`og-p${i}`} className="w-24">
                      <Input id={`og-p${i}`} inputMode="numeric" value={String(t.percentage)} onChange={(e) => zet("betaalTermijnen", termijnen.map((x, j) => (j === i ? { ...x, percentage: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))} />
                    </Field>
                    <Button type="button" variant="outline" aria-label={`Termijn ${i + 1} verwijderen`} onClick={() => zet("betaalTermijnen", termijnen.filter((_, j) => j !== i))} disabled={termijnen.length < 2}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-fit" onClick={() => zet("betaalTermijnen", [...termijnen, { label: "Termijn", percentage: 0 }])}>
                  Termijn toevoegen
                </Button>
              </div>
            )}
            <Field label="Introductietekst" htmlFor="og-introTekst" hint="Staat bovenaan de offerte, na de aanhef.">
              <Textarea id="og-introTekst" value={g.introTekst} onChange={(e) => zet("introTekst", e.target.value)} />
            </Field>
            <Field label="Slottekst" htmlFor="og-slotTekst">
              <Textarea id="og-slotTekst" value={g.slotTekst} onChange={(e) => zet("slotTekst", e.target.value)} />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-base font-bold text-foreground">Voorwaarden en uitsluitingen</legend>
            <p className="text-sm text-muted-foreground">Zet aan wat voor jou geldt en pas de tekst aan. Dit komt standaard op elke nieuwe offerte; per offerte kun je het nog wijzigen.</p>
            {g.voorwaardenBlokken.map((b) => {
              const info = VOORWAARDEN_INFO[b.id];
              const set = sluit(b);
              const standaard = voorwaardenTeksten([{ ...b, aan: true, tekst: "" }])[0];
              return (
                <div key={b.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                  <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-foreground">
                    {info.titel}
                    <Switch checked={b.aan} onChange={(e) => set({ aan: e.target.checked })} aria-label={info.titel} />
                  </label>
                  {b.aan && (
                    <>
                      {info.keuzes && (
                        <Select aria-label={`${info.titel}: keuze`} value={b.keuze ?? info.keuzes[0].waarde} onChange={(e) => set({ keuze: e.target.value, tekst: "" })}>
                          {info.keuzes.map((k) => (
                            <option key={k.waarde} value={k.waarde}>
                              {k.label}
                            </option>
                          ))}
                        </Select>
                      )}
                      {b.id === "aanslag" && (
                        <Field label="Garantietermijn in maanden" htmlFor="og-aanslag">
                          <Input id="og-aanslag" inputMode="numeric" value={String(b.termijnMaanden ?? 12)} onChange={(e) => set({ termijnMaanden: Number(e.target.value.replace(/\D/g, "")) || 12, tekst: "" })} />
                        </Field>
                      )}
                      <Textarea aria-label={`${info.titel}: tekst`} value={b.tekst || standaard} onChange={(e) => set({ tekst: e.target.value })} />
                    </>
                  )}
                </div>
              );
            })}
            <Field label="Herroepingsrecht (voor particulieren)" htmlFor="og-herroeping" hint="Komt standaard op de offerte als de klant een particulier is. TODO(Pieter): juridisch laten checken.">
              <Textarea id="og-herroeping" className="min-h-32" value={g.herroepingTekst} onChange={(e) => zet("herroepingTekst", e.target.value)} />
              <button type="button" className="w-fit text-sm font-semibold underline" onClick={() => zet("herroepingTekst", STANDAARD_HERROEPINGSTEKST)}>
                Standaardtekst terugzetten
              </button>
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-base font-bold text-foreground">Btw per soort regel</legend>
            <p className="text-sm text-muted-foreground">Dit is de standaard voor nieuwe regels. Per regel kun je het nog aanpassen.</p>
            <div className={groep}>
              {(Object.keys(REGEL_SOORT_LABEL) as RegelSoort[]).map((soort) => (
                <Field key={soort} label={REGEL_SOORT_LABEL[soort]} htmlFor={`og-btw-${soort}`}>
                  <Select id={`og-btw-${soort}`} value={String(btwVoorSoort(soort, g.btwStandaard))} onChange={(e) => zet("btwStandaard", { ...(g.btwStandaard ?? {}), [soort]: Number(e.target.value) })}>
                    {BTW_TARIEVEN.map((p) => (
                      <option key={p} value={p}>
                        {p}%
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-base font-bold text-foreground">Herinnering</legend>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground">
              <span>
                Klant een herinnering sturen voor de offerte verloopt
                <span className="block text-sm font-normal text-muted-foreground">Standaard uit.</span>
              </span>
              <Switch checked={g.herinneringDagen != null} onChange={(e) => zet("herinneringDagen", e.target.checked ? 5 : null)} aria-label="Herinnering aan de klant" />
            </label>
            {g.herinneringDagen != null && (
              <Field label="Aantal dagen vóór het verlopen" htmlFor="og-herinnering">
                <Input id="og-herinnering" inputMode="numeric" value={String(g.herinneringDagen)} onChange={(e) => zet("herinneringDagen", Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} />
              </Field>
            )}
          </fieldset>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={bezig}>
          {bezig ? "Opslaan…" : opslaanLabel}
        </Button>
        {melding && (
          <p role="status" className={melding.soort === "ok" ? "text-sm font-medium text-primary" : "text-sm font-medium text-destructive"}>
            {melding.tekst}
          </p>
        )}
      </div>
    </form>
  );
}
