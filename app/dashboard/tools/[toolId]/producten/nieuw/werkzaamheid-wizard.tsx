"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Segmented } from "@/app/components/ui/segmented";
import { UnitInput } from "@/app/components/ui/unit-input";
import { cn } from "@/app/lib/cn";
import { formatCurrency } from "@/app/lib/format";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { createWerkzaamheidAction } from "@/app/lib/actions/werkzaamheden";
import { EIGEN_WERKZAAMHEID, HOVENIER_PRESETS, presetNaarDraft, type HovenierPreset } from "@/app/lib/presets";
import {
  METHODE_OPTIES,
  STAP_WOORD,
  arbeidVraag,
  bouwPreviewProduct,
  heeftProductiviteit,
  kortEenheid,
  methodeLabel,
  stap2IsGeldig,
  valideerMaterialen,
  type Methode,
  type WerkzaamheidDraft,
} from "@/app/lib/werkzaamheid";
import { berekenKostenOpbouw } from "@/app/lib/werkzaamheid-kosten";
import type { Branding, SubscriptionTier } from "@/app/generated/prisma/client";
import { TarievenKnop, useTarieven } from "../../tarieven-context";
import { KlantVoorbeeld, useKlantVoorbeeld } from "../editor/klant-voorbeeld";
import { KostenOpbouwKaart } from "../editor/kosten-opbouw-kaart";
import { MaterialenTabel } from "../editor/materialen-tabel";

const STAPPEN = ["Kies werkzaamheid", "Materialen en prijzen", "Werktempo en voorbeeld"] as const;

// Aanmaken in 3 stappen: kies een werkzaamheid → check materialen en prijzen
// → werktempo en volledig voorbeeld. Er wordt pas iets opgeslagen bij "Zet op
// mijn website"; annuleren laat dus niets achter. De voorbeeldprijzen krijgen
// een geel label tot de hovenier ze wijzigt.
export function WerkzaamheidWizard({
  toolId,
  branding,
  subscriptionTier,
  bestaandeNamen,
  tarievenNogVoorbeeld,
}: {
  toolId: string;
  branding: Branding | null;
  subscriptionTier: SubscriptionTier;
  bestaandeNamen: string[];
  tarievenNogVoorbeeld: boolean;
}) {
  const router = useRouter();
  const { costSettings, tarief, openTarieven } = useTarieven();
  const stapEenheid = costSettings.arbeidStapEenheid;

  const [stap, setStap] = useState(1);
  const [preset, setPreset] = useState<HovenierPreset | null>(null);
  const [draft, setDraft] = useState<WerkzaamheidDraft | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [toonFouten, setToonFouten] = useState(false);

  const kies = (p: HovenierPreset) => {
    setPreset(p);
    setDraft(presetNaarDraft(p, stapEenheid));
    setFout(null);
  };

  // Niet-opgeslagen werk: waarschuw bij sluiten.
  useEffect(() => {
    if (!draft || klaar || stap === 1) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [draft, klaar, stap]);

  const wijzig = (patch: Partial<WerkzaamheidDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const leeg: WerkzaamheidDraft = {
    naam: "",
    methode: null,
    productiviteit: "",
    transportPerDag: false,
    bandbreedte: false,
    werktempoPerMateriaal: false,
    materialen: [],
  };
  const actueel = draft ?? leeg;
  const preview = useMemo(
    () => bouwPreviewProduct({ toolId, draft: actueel, icoon: preset?.icoon ?? null }),
    [toolId, actueel, preset]
  );
  const voorbeeld = useKlantVoorbeeld(preview);
  const opbouw = useMemo(
    () =>
      berekenKostenOpbouw({
        product: preview,
        optieId: voorbeeld.gekozenId,
        hoeveelheid: voorbeeld.qty,
        costSettings,
      }),
    [preview, voorbeeld.gekozenId, voorbeeld.qty, costSettings]
  );

  const fouten = useMemo(() => valideerMaterialen(actueel), [actueel]);
  const eenheid = preview.eenheid;
  const eenheidKort = kortEenheid(eenheid);
  const woord = STAP_WOORD[stapEenheid].enkelvoud;

  const geldig = stap === 1 ? preset !== null : stap === 2 ? stap2IsGeldig(actueel) : stap2IsGeldig(actueel) && heeftProductiviteit(actueel);

  async function volgende() {
    if (!draft) return;
    if (!geldig) {
      setToonFouten(true);
      return;
    }
    setFout(null);
    if (stap < 3) {
      setToonFouten(false);
      setStap(stap + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setBezig(true);
    const r = await createWerkzaamheidAction(toolId, draft, preset && preset.id !== EIGEN_WERKZAAMHEID.id ? preset.id : null);
    if (r.ok) {
      setKlaar(true);
      router.push(`/dashboard/tools/${toolId}/producten?nieuw=${r.productId}`);
    } else {
      setBezig(false);
      setFout(r.error);
    }
  }

  const stapHint = {
    DAGDEEL: "Een dagdeel is een ochtend of middag. Reken met je normale ploeg.",
    DAG: "Een dag is een hele werkdag. Reken met je normale ploeg.",
    UUR: "Reken met wat je normaal in een uur doet, met je normale ploeg.",
  }[stapEenheid];

  return (
    <div className="flex flex-col gap-5 pb-28">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/tools/${toolId}/producten`}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Annuleren
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-muted-foreground">Stap {stap} van 3</p>
          <TarievenKnop compact />
        </div>
      </div>

      <ol className="grid grid-cols-3 gap-2">
        {STAPPEN.map((naam, i) => (
          <li key={naam} aria-current={i + 1 === stap ? "step" : undefined} className="min-w-0">
            <div className={cn("h-1.5 rounded-full", i + 1 <= stap ? "bg-primary" : "bg-border")} />
            <p className={cn("mt-1.5 break-words text-xs leading-tight sm:text-sm", i + 1 === stap ? "font-bold text-foreground" : "text-muted-foreground")}>
              {naam}
            </p>
          </li>
        ))}
      </ol>

      {fout && (
        <p role="alert" className="rounded-lg border border-destructive bg-destructive/10 px-3 py-2.5 text-sm font-medium text-foreground">
          {fout}
        </p>
      )}

      {stap === 1 && (
        <section aria-labelledby="stap1-titel" className="flex flex-col gap-4">
          <div>
            <h1 id="stap1-titel" className="text-3xl font-bold leading-tight text-foreground">
              Wat wil je laten uitrekenen?
            </h1>
            <p className="mt-1 text-muted-foreground">
              Kies een werkzaamheid. Materialen en een rekenmethode staan al klaar, jij checkt alleen de prijzen.
            </p>
          </div>
          <div role="radiogroup" aria-labelledby="stap1-titel" className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
            {[...HOVENIER_PRESETS, EIGEN_WERKZAAMHEID].map((p) => {
              const Icoon = PRODUCT_ICONS[p.icoon];
              const eigen = p.id === EIGEN_WERKZAAMHEID.id;
              const aan = preset?.id === p.id;
              const heeftAl = !eigen && bestaandeNamen.some((n) => n.trim().toLowerCase() === p.naam.toLowerCase());
              const methode = METHODE_OPTIES.find((o) => o.value === presetNaarDraft(p, stapEenheid).methode)?.label;
              return (
                <label
                  key={p.id}
                  className={cn(
                    "relative flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-xl border-[1.5px] p-3.5 transition-colors focus-within:ring-[3px] focus-within:ring-ring/35",
                    eigen && "border-dashed",
                    aan ? "border-primary bg-accent" : "border-input bg-card hover:bg-secondary"
                  )}
                >
                  <input
                    type="radio"
                    name="werkzaamheid"
                    checked={aan}
                    onChange={() => kies(p)}
                    className="sr-only"
                  />
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                    {eigen ? <Plus className="h-5 w-5" aria-hidden="true" /> : Icoon && <Icoon className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block break-words font-bold leading-tight text-foreground">{eigen ? "Iets anders" : p.naam}</span>
                    <span className="mt-0.5 block break-words text-sm text-muted-foreground">
                      {eigen ? "Begin leeg" : heeftAl ? "Heb je al · nog een maken" : methode}
                    </span>
                  </span>
                  {aan && (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </section>
      )}

      {stap >= 2 && draft && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            {stap === 2 && (
              <section aria-labelledby="stap2-titel" className="flex flex-col gap-4">
                <div>
                  <h1 id="stap2-titel" className="text-3xl font-bold leading-tight text-foreground">
                    Klopt dit met jouw prijzen?
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    {preset?.id === EIGEN_WERKZAAMHEID.id
                      ? "Geef je werkzaamheid een naam en vul je materialen en prijzen in, inclusief je marge."
                      : "Gele labels zijn voorbeeldprijzen. Pas ze aan naar wat jij rekent, inclusief je marge. Weghalen kan ook."}
                  </p>
                </div>
                <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <Field
                    label="Naam op je website"
                    htmlFor="wz-naam"
                    error={toonFouten && draft.naam.trim() === "" ? "Geef de werkzaamheid een naam." : undefined}
                  >
                    <Input
                      id="wz-naam"
                      value={draft.naam}
                      maxLength={120}
                      autoFocus={preset?.id === EIGEN_WERKZAAMHEID.id}
                      placeholder={preset?.id === EIGEN_WERKZAAMHEID.id ? "Bijv. Tuinverlichting" : undefined}
                      onChange={(e) => wijzig({ naam: e.target.value })}
                      aria-invalid={toonFouten && draft.naam.trim() === "" ? true : undefined}
                    />
                  </Field>
                  <Field
                    label="Hoe reken je dit?"
                    as="fieldset"
                    error={toonFouten && draft.methode === null ? "Kies hoe je dit rekent." : undefined}
                  >
                    <Segmented<Methode>
                      name="methode"
                      value={draft.methode}
                      onChange={(methode) => wijzig({ methode })}
                      options={METHODE_OPTIES}
                    />
                  </Field>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-foreground">Materialen die de klant kan kiezen</p>
                    <MaterialenTabel
                      rijen={draft.materialen}
                      onChange={(materialen) => wijzig({ materialen })}
                      eenheidSuffix={`/ ${eenheidKort}`}
                      bandbreedte={false}
                      werktempo={false}
                      tempoSuffix=""
                      fouten={fouten}
                      toonAlleFouten={toonFouten}
                    />
                  </div>
                </div>
              </section>
            )}

            {stap === 3 && (
              <section aria-labelledby="stap3-titel" className="flex flex-col gap-4">
                <div>
                  <h1 id="stap3-titel" className="text-3xl font-bold leading-tight text-foreground">
                    Hoe snel werk je?
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    Hiermee rekenen we je arbeid uit. <span className="lg:hidden">Hieronder</span>
                    <span className="hidden lg:inline">Rechts</span> zie je meteen wat een klant betaalt.
                  </p>
                </div>
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <Field
                    label={arbeidVraag(draft.naam, eenheid, stapEenheid)}
                    htmlFor="wz-tempo"
                    hint={stapHint}
                    error={toonFouten && !heeftProductiviteit(draft) ? "Vul in hoeveel je maakt." : undefined}
                  >
                    <UnitInput
                      id="wz-tempo"
                      suffix={`${eenheidKort} per ${woord}`}
                      className="sm:max-w-[16rem]"
                      value={draft.productiviteit}
                      placeholder="Bijv. 6"
                      autoFocus
                      aria-invalid={toonFouten && !heeftProductiviteit(draft) ? true : undefined}
                      onChange={(e) => wijzig({ productiviteit: e.target.value })}
                    />
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground">
                    <p>
                      Je rekent <strong>{formatCurrency(tarief)}</strong> per {woord}. Dat geldt voor al je werkzaamheden.
                    </p>
                    <button type="button" onClick={openTarieven} className="min-h-11 cursor-pointer font-semibold underline">
                      Wijzigen
                    </button>
                  </div>
                  {tarievenNogVoorbeeld && (
                    <p className="rounded-md border border-example bg-example/15 px-3 py-2 text-sm text-foreground">
                      Je tarieven zijn nog <strong>voorbeeldwaarden</strong>. Controleer ze via Wijzigen, anders klopt de prijs niet met wat jij rekent.
                    </p>
                  )}
                </div>
                <p className="flex gap-2 px-1 text-sm text-muted-foreground">
                  Voorrijkosten ({formatCurrency(costSettings.voorrijTarief)}) en transport ({formatCurrency(costSettings.transportTarief)}) komen
                  uit je tarieven. Bandbreedte, extra vragen en andere opties vind je later onder Geavanceerd.
                </p>
              </section>
            )}
          </div>

          <aside aria-label="Voorbeeld" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
            <KlantVoorbeeld product={preview} state={voorbeeld} branding={branding} subscriptionTier={subscriptionTier} />
            {stap === 3 && <KostenOpbouwKaart opbouw={opbouw} eenheid={eenheid} stap={stapEenheid} />}
          </aside>
        </div>
      )}

      {/* Vaste onderbalk */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:left-64">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={stap === 1 || bezig}
            onClick={() => {
              setFout(null);
              setStap(stap - 1);
            }}
            className={cn(stap === 1 && "invisible")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Terug
          </Button>
          <Button type="button" size="lg" disabled={!geldig || bezig} onClick={volgende}>
            {stap < 3 ? (
              <>
                Volgende
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                {bezig ? "Opslaan…" : "Zet op mijn website"}
              </>
            )}
          </Button>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{preset ? `${methodeLabel(actueel.methode)}` : ""}</span>
    </div>
  );
}
