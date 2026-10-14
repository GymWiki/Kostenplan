"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/app/lib/cn";
import { KNOP_POSITIES, WEERGAVEN, WEERGAVE_LABEL, WEERGAVE_UITLEG, type KnopPositie, type Plaatsing, type Weergave, type WeergaveConfig } from "@/app/lib/weergave/config";

// Kleine schets per weergave, zodat de hovenier in één oogopslag ziet hoe zijn klant het straks ziet.
function Schets({ soort }: { soort: Weergave }) {
  const lijn = "fill-none stroke-current";
  return (
    <svg viewBox="0 0 64 44" role="img" aria-hidden="true" className="h-11 w-16 text-muted-foreground">
      {soort === "tegels" && (
        <>
          <rect x="4" y="4" width="26" height="16" rx="3" className={lijn} strokeWidth="2" />
          <rect x="34" y="4" width="26" height="16" rx="3" className={lijn} strokeWidth="2" />
          <rect x="4" y="24" width="26" height="16" rx="3" className={lijn} strokeWidth="2" />
          <rect x="34" y="24" width="26" height="16" rx="3" className={lijn} strokeWidth="2" />
        </>
      )}
      {soort === "stappen" && (
        <>
          <rect x="4" y="5" width="56" height="4" rx="2" className={lijn} strokeWidth="2" />
          <rect x="4" y="5" width="22" height="4" rx="2" className="fill-current stroke-current" strokeWidth="2" />
          <rect x="4" y="15" width="56" height="18" rx="3" className={lijn} strokeWidth="2" />
          <rect x="40" y="37" width="20" height="5" rx="2.5" className="fill-current stroke-current" strokeWidth="1" />
        </>
      )}
      {soort === "lijst" && (
        <>
          <rect x="4" y="4" width="56" height="9" rx="3" className={lijn} strokeWidth="2" />
          <rect x="4" y="17" width="56" height="9" rx="3" className={lijn} strokeWidth="2" />
          <rect x="4" y="30" width="56" height="9" rx="3" className={lijn} strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

const POSITIE_LABEL: Record<KnopPositie, string> = { rechtsonder: "Rechtsonder in beeld", linksonder: "Linksonder in beeld", inline: "In de pagina, op de plek van de code" };

// Blok "Weergave" en "Plaatsing" in het paneel Uiterlijk. De rekentool in het midden wisselt direct mee.
export function WeergaveBlok({ waarde, onChange, metPlaatsing = true }: { waarde: WeergaveConfig; onChange: (patch: Partial<WeergaveConfig>) => void; metPlaatsing?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-bold text-foreground">Weergave</legend>
        <p className="-mt-1 text-sm text-muted-foreground">Zo kiest je klant wat hij nodig heeft. Je ziet het direct in het voorbeeld.</p>
        <div role="radiogroup" aria-label="Weergave" className="grid gap-2">
          {WEERGAVEN.map((w) => {
            const aan = waarde.weergave === w;
            return (
              <label
                key={w}
                className={cn(
                  "relative flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-[1.5px] p-3 transition-colors focus-within:ring-[3px] focus-within:ring-ring/35",
                  aan ? "border-primary bg-accent" : "border-input bg-card hover:bg-secondary"
                )}
              >
                <input type="radio" name="weergave" value={w} checked={aan} onChange={() => onChange({ weergave: w })} className="sr-only" />
                <Schets soort={w} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{WEERGAVE_LABEL[w]}</span>
                  <span className="block text-sm text-muted-foreground">{WEERGAVE_UITLEG[w]}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {waarde.weergave !== "lijst" && (
        <Field label="Kop boven de onderdelen" htmlFor="weergave-kop" hint="Bijvoorbeeld: Waar kunnen we je mee helpen?">
          <Input id="weergave-kop" value={waarde.kop} maxLength={80} onChange={(e) => onChange({ kop: e.target.value })} />
        </Field>
      )}
      {waarde.weergave === "tegels" && (
        <Field label="Tekst op de knop om een onderdeel toe te voegen" htmlFor="weergave-toevoeg">
          <Input id="weergave-toevoeg" value={waarde.toevoegTekst} maxLength={40} onChange={(e) => onChange({ toevoegTekst: e.target.value })} />
        </Field>
      )}

      {metPlaatsing && (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-base font-bold text-foreground">Plaatsing</legend>
        <div role="radiogroup" aria-label="Plaatsing" className="grid gap-2 sm:grid-cols-2">
          {(["inline", "popup"] as Plaatsing[]).map((p) => {
            const aan = waarde.plaatsing === p;
            return (
              <label key={p} className={cn("relative flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-lg border-[1.5px] p-3 focus-within:ring-[3px] focus-within:ring-ring/35", aan ? "border-primary bg-accent" : "border-input bg-card hover:bg-secondary")}>
                <input type="radio" name="plaatsing" value={p} checked={aan} onChange={() => onChange({ plaatsing: p })} className="sr-only" />
                <span className="text-sm font-semibold text-foreground">{p === "inline" ? "In de pagina" : "Knop met pop-up"}</span>
                <span className="text-sm text-muted-foreground">{p === "inline" ? "De rekentool staat op de pagina zelf." : "Een knop opent de rekentool in een venster."}</span>
              </label>
            );
          })}
        </div>
        {waarde.plaatsing === "popup" && (
          <>
            <Field label="Tekst op de knop" htmlFor="weergave-knop">
              <Input id="weergave-knop" value={waarde.knopTekst} maxLength={40} onChange={(e) => onChange({ knopTekst: e.target.value })} />
            </Field>
            <Field label="Waar staat de knop?" htmlFor="weergave-positie">
              <Select id="weergave-positie" value={waarde.knopPositie} onChange={(e) => onChange({ knopPositie: e.target.value as KnopPositie })}>
                {KNOP_POSITIES.map((k) => (
                  <option key={k} value={k}>
                    {POSITIE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        <p className="text-sm text-muted-foreground">Verandert de plaatsing? Kopieer dan de code onder “Zet op mijn website” opnieuw. De weergave past zich vanzelf aan.</p>
      </fieldset>
      )}

      <fieldset className="flex flex-col divide-y divide-border rounded-lg border border-border px-3">
        <legend className="px-1 text-sm font-bold text-foreground">Prijzen</legend>
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-foreground">
          Voorrijkosten meenemen in de vanaf-prijs
          <Switch checked={waarde.vanafInclVoorrij} onChange={(e) => onChange({ vanafInclVoorrij: e.target.checked })} aria-label="Voorrijkosten meenemen in de vanaf-prijs" />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-1 text-sm font-semibold text-foreground">
          Prijs pas tonen na de contactgegevens
          <Switch checked={waarde.prijsNaContact} onChange={(e) => onChange({ prijsNaContact: e.target.checked })} aria-label="Prijs pas tonen na de contactgegevens" />
        </label>
      </fieldset>
      <p className="-mt-2 text-sm text-muted-foreground">
        {waarde.vanafInclVoorrij ? "De vanaf-prijs telt de voorrijkosten mee." : "De vanaf-prijs is exclusief voorrijkosten; je klant leest dat bij de tegels."}{" "}
        {waarde.prijsNaContact ? "Let op: klanten haken sneller af als ze hun prijs niet meteen zien." : "Je klant ziet de prijs altijd vóór hij zijn gegevens invult."}
      </p>
    </div>
  );
}

// Per onderdeel: de tekst op de tegel en de maat waarmee de vanaf-prijs wordt berekend.
export function TegelBlok({
  naam,
  eenheid,
  heeftVanaf,
  waarde,
  onChange,
  standaardMaat,
}: {
  naam: string;
  eenheid: string;
  heeftVanaf: boolean;
  waarde: { tegelTekst: string | null; voorbeeldmaat: number | null };
  onChange: (patch: { tegelTekst?: string | null; voorbeeldmaat?: number | null }) => void;
  standaardMaat: number;
}) {
  const id = `tegel-${naam.replace(/\W+/g, "-")}`;
  // Eigen tekst bijhouden zolang er getypt wordt ("12," mag even bestaan); een geldige maat gaat meteen door.
  const [maatTekst, setMaatTekst] = useState(waarde.voorbeeldmaat === null ? "" : String(waarde.voorbeeldmaat).replace(".", ","));
  const [maatFout, setMaatFout] = useState<string | undefined>();
  return (
    <section aria-labelledby={`${id}-titel`} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      <h3 id={`${id}-titel`} className="font-bold text-foreground">
        Tegel in de rekentool
      </h3>
      <Field label="Eigen tekst op de tegel" htmlFor={`${id}-tekst`} hint="Leeg laten voor de vanaf-prijs. Maximaal 40 tekens.">
        <Input id={`${id}-tekst`} value={waarde.tegelTekst ?? ""} maxLength={40} placeholder="Bijv. Houten en betonnen schuttingen" onChange={(e) => onChange({ tegelTekst: e.target.value || null })} />
      </Field>
      {heeftVanaf ? (
        <Field label={`Maat voor de vanaf-prijs (${eenheid})`} htmlFor={`${id}-maat`} hint={`Standaard ${standaardMaat}. De vanaf-prijs rekent met het goedkoopste materiaal en deze maat.`} error={maatFout}>
          <Input
            id={`${id}-maat`}
            inputMode="decimal"
            autoComplete="off"
            value={maatTekst}
            placeholder={String(standaardMaat)}
            aria-invalid={maatFout ? true : undefined}
            onChange={(e) => {
              const tekst = e.target.value;
              setMaatTekst(tekst);
              if (tekst.trim() === "") {
                setMaatFout(undefined);
                return onChange({ voorbeeldmaat: null });
              }
              const n = Number(tekst.trim().replace(",", "."));
              if (Number.isFinite(n) && n > 0 && n <= 100000) {
                setMaatFout(undefined);
                onChange({ voorbeeldmaat: n });
              } else setMaatFout("Vul een getal groter dan 0 in, bijvoorbeeld 12,5.");
            }}
          />
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">Dit onderdeel heeft geen vaste maat, dus de tegel toont geen vanaf-prijs.</p>
      )}
    </section>
  );
}

// Eenmalige tip bij een nieuwe rekentool: wijst naar het weergave-paneel. Wegklikken of het paneel openen zet hem uit, voorgoed.
export function WeergaveTip({ onKies, onSluit }: { onKies: () => void; onSluit: () => void }) {
  return (
    <div role="note" className="flex items-start gap-2 rounded-xl border border-primary/30 bg-accent p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Kies hoe je klant de rekentool ziet</p>
        <p className="text-sm text-muted-foreground">Tegels, stappen of alles op één pagina. Je ziet het direct in het voorbeeld.</p>
        <Button type="button" className="mt-2 h-11" onClick={onKies}>
          Weergave kiezen
        </Button>
      </div>
      <button type="button" onClick={onSluit} aria-label="Tip sluiten" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
