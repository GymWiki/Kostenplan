"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Eye,
  Layers,
  Ruler,
  SlidersHorizontal,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { SectionCard } from "@/app/components/ui/section-card";
import { Segmented } from "@/app/components/ui/segmented";
import { Switch } from "@/app/components/ui/switch";
import { UnitInput } from "@/app/components/ui/unit-input";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { cn } from "@/app/lib/cn";
import { formatCurrency } from "@/app/lib/format";
import { deleteWerkzaamheidAction, saveWerkzaamheidAction } from "@/app/lib/actions/werkzaamheden";
import { copyProductAction } from "@/app/lib/actions/products";
import { STAP_WOORD } from "@/app/lib/werkzaamheid";
import {
  METHODE_OPTIES,
  arbeidVraag,
  bestaandeExtras,
  bouwPreviewProduct,
  draftIsGeldig,
  draftVanProduct,
  heeftGeavanceerdeInstellingen,
  kortEenheid,
  valideerMaterialen,
  zetBandbreedte,
  type Methode,
  type ProductMetRelaties,
  type WerkzaamheidDraft,
} from "@/app/lib/werkzaamheid";
import { berekenKostenOpbouw } from "@/app/lib/werkzaamheid-kosten";
import type { Branding, SubscriptionTier } from "@/app/generated/prisma/client";
import { useTarieven } from "../../tarieven-context";
import { KlantVoorbeeld, useKlantVoorbeeld } from "./klant-voorbeeld";
import { KostenOpbouwKaart } from "./kosten-opbouw-kaart";
import { MaterialenTabel } from "./materialen-tabel";
import { OpslaanStatus } from "./opslaan-status";
import { useAutosave } from "./use-autosave";

const CHIPS = [
  { id: "blok-basis", label: "Basis" },
  { id: "blok-materialen", label: "Materialen" },
  { id: "blok-arbeid", label: "Arbeid" },
  { id: "blok-vaste-kosten", label: "Vaste kosten" },
  { id: "blok-geavanceerd", label: "Geavanceerd" },
] as const;

// Het bewerkscherm van een werkzaamheid: vijf blokken (Basis, Materialen,
// Arbeid, Vaste kosten, Geavanceerd), live klantvoorbeeld en kostenopbouw, en
// automatisch opslaan. Alles wat dit scherm niet kan tonen (andere sjablonen,
// afwijkende tarieven, extra materiaalgroepen, foto's) blijft onaangeroerd in
// de database en is bereikbaar via de uitgebreide weergave.
export function WerkzaamheidEditor({
  toolId,
  product,
  branding,
  subscriptionTier,
  extraOptiesSectie,
}: {
  toolId: string;
  product: ProductMetRelaties;
  branding: Branding | null;
  subscriptionTier: SubscriptionTier;
  extraOptiesSectie: React.ReactNode;
}) {
  const router = useRouter();
  const { costSettings, openTarieven } = useTarieven();

  const [draft, setDraft] = useState<WerkzaamheidDraft>(() => draftVanProduct(product));
  const [geavanceerdOpen, setGeavanceerdOpen] = useState(() =>
    heeftGeavanceerdeInstellingen(draftVanProduct(product), product)
  );
  const [verwijderOpen, setVerwijderOpen] = useState(false);
  const [verwijderBezig, setVerwijderBezig] = useState(false);

  const fouten = useMemo(() => valideerMaterialen(draft), [draft]);
  const geldig = draftIsGeldig(draft);

  // Server geeft ids terug voor nieuwe regels; die bewaren we los van de
  // draft, zodat dat nooit een nieuwe opslagronde start.
  const idMap = useRef<Record<string, string>>({});
  const autosave = useAutosave(
    draft,
    async (d) => {
      const payload: WerkzaamheidDraft = {
        ...d,
        materialen: d.materialen.map((r) => ({ ...r, id: r.id ?? idMap.current[r.sleutel] })),
      };
      const r = await saveWerkzaamheidAction(product.id, payload);
      if (r.ok) {
        idMap.current = { ...idMap.current, ...r.ids };
        return { ok: true };
      }
      return r;
    },
    { uitgeschakeld: !geldig }
  );

  const wijzig = (patch: Partial<WerkzaamheidDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const preview = useMemo(
    () => bouwPreviewProduct({ toolId, draft, origineel: product }),
    [toolId, draft, product]
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

  const eenheid = preview.eenheid;
  const eenheidKort = kortEenheid(eenheid);
  const stap = costSettings.arbeidStapEenheid;
  const woord = STAP_WOORD[stap].enkelvoud;
  const extras = bestaandeExtras(product);
  const Icoon = (product.icoon && PRODUCT_ICONS[product.icoon]) || Ruler;

  async function verwijder() {
    setVerwijderBezig(true);
    const r = await deleteWerkzaamheidAction(product.id);
    if (r.ok) router.push(`/dashboard/tools/${toolId}/producten`);
    else setVerwijderBezig(false);
  }

  const stapHint = {
    DAGDEEL: "Een dagdeel is een ochtend of middag. Reken met je normale ploeg.",
    DAG: "Een dag is een hele werkdag. Reken met je normale ploeg.",
    UUR: "Reken met wat je normaal in een uur doet, met je normale ploeg.",
  }[stap];

  const transportTekst =
    product.transportkostenOverride != null ? product.transportkostenOverride : costSettings.transportTarief;
  const voorrijTekst =
    product.voorrijkostenOverride != null ? product.voorrijkostenOverride : costSettings.voorrijTarief;

  return (
    <div className="flex flex-col gap-4 pb-28 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href={`/dashboard/tools/${toolId}/producten`}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-foreground hover:underline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Alle werkzaamheden
        </Link>
        <OpslaanStatus
          status={autosave.status}
          ongeldig={!geldig}
          fout={autosave.fout}
          onOpnieuw={autosave.opnieuw}
        />
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          <Icoon className="h-6 w-6" />
        </span>
        <h1 className="min-w-0 break-words text-3xl font-bold leading-tight text-foreground">
          {draft.naam.trim() || "Werkzaamheid"}
        </h1>
      </div>

      <nav
        aria-label="Naar een blok in dit scherm"
        className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2.5 md:-mx-8 md:px-8"
      >
        {CHIPS.map((chip) => (
          <a
            key={chip.id}
            href={`#${chip.id}`}
            onClick={(e) => {
              if (chip.id === "blok-geavanceerd") setGeavanceerdOpen(true);
              e.preventDefault();
              document.getElementById(chip.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="inline-flex h-10 shrink-0 items-center rounded-full border-[1.5px] border-input bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            {chip.label}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {/* 1. BASIS */}
          <SectionCard id="blok-basis" icon={Ruler} title="Basis" description="Hoe heet het en hoe reken je het af?">
            <div className="flex flex-col gap-5">
              <Field label="Naam op je website" htmlFor="wz-naam" error={draft.naam.trim() === "" ? "Geef de werkzaamheid een naam." : undefined}>
                <Input
                  id="wz-naam"
                  value={draft.naam}
                  maxLength={120}
                  aria-invalid={draft.naam.trim() === "" ? true : undefined}
                  onChange={(e) => wijzig({ naam: e.target.value })}
                />
              </Field>
              <Field label="Hoe reken je dit?" as="fieldset">
                <Segmented<Methode>
                  name="methode"
                  value={draft.methode}
                  onChange={(methode) => wijzig({ methode })}
                  options={METHODE_OPTIES}
                  disabled={draft.methode === null}
                />
                {draft.methode === null && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                    Deze werkzaamheid rekent op een eigen manier. Die instelling blijft zoals ze is. Wijzigen kan in de{" "}
                    <Link
                      href={`/dashboard/tools/${toolId}/producten/${product.id}/uitgebreid`}
                      className="font-semibold underline"
                    >
                      uitgebreide weergave
                    </Link>
                    .
                  </p>
                )}
              </Field>
            </div>
          </SectionCard>

          {/* 2. MATERIALEN */}
          <SectionCard
            id="blok-materialen"
            icon={Layers}
            title="Materialen en prijzen"
            description={`Wat de klant kan kiezen en wat jij per ${eenheidKort} rekent, inclusief je marge.`}
          >
            <MaterialenTabel
              rijen={draft.materialen}
              onChange={(materialen) => wijzig({ materialen })}
              eenheidSuffix={`/ ${eenheidKort}`}
              bandbreedte={draft.bandbreedte}
              werktempo={draft.werktempoPerMateriaal}
              tempoSuffix={`${eenheidKort} per ${woord}`}
              fouten={fouten}
            />
            {draft.materialen.some((m) => m.isVoorbeeld) && (
              <p className="mt-3 rounded-md border border-example bg-example/15 px-3 py-2 text-sm text-foreground">
                Gele <strong>voorbeeld</strong>-labels zijn prijzen uit onze startlijst. Pas ze aan naar wat jij rekent.
              </p>
            )}
          </SectionCard>

          {/* 3. ARBEID */}
          <SectionCard
            id="blok-arbeid"
            icon={Clock}
            title="Arbeid"
            description="Los van het materiaal: duurder materiaal betekent niet automatisch meer uren."
          >
            <div className="flex flex-col gap-4">
              <Field label={arbeidVraag(draft.naam, eenheid, stap)} htmlFor="wz-tempo" hint={stapHint}>
                <UnitInput
                  id="wz-tempo"
                  suffix={`${eenheidKort} per ${woord}`}
                  inputClassName="sm:max-w-[16rem]"
                  className="sm:max-w-[16rem]"
                  value={draft.productiviteit}
                  placeholder="Bijv. 6"
                  onChange={(e) => wijzig({ productiviteit: e.target.value })}
                />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground">
                <p>
                  Je rekent <strong>{formatCurrency(opbouw.arbeidTarief)}</strong> per {woord}.{" "}
                  {product.arbeidTariefOverride != null
                    ? "Dit is een eigen tarief voor dit werk."
                    : "Dat geldt voor al je werkzaamheden."}
                </p>
                <button type="button" onClick={openTarieven} className="min-h-11 cursor-pointer font-semibold underline">
                  Wijzigen
                </button>
              </div>
            </div>
          </SectionCard>

          {/* 4. VASTE KOSTEN */}
          <SectionCard
            id="blok-vaste-kosten"
            icon={Truck}
            title="Vaste kosten per klus"
            description={`Komen uit je tarieven en tellen ${draft.transportPerDag ? "voorrij één keer en transport per dag" : "één keer per project"}.`}
            action={
              <button type="button" onClick={openTarieven} className="min-h-11 cursor-pointer text-sm font-semibold underline">
                Wijzigen
              </button>
            }
          >
            <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <div className="rounded-lg bg-muted px-3 py-2.5">
                <dt className="text-sm text-muted-foreground">Voorrijkosten</dt>
                <dd className="text-lg font-bold text-foreground">{formatCurrency(voorrijTekst)}</dd>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2.5">
                <dt className="text-sm text-muted-foreground">{draft.transportPerDag ? "Transport per dag" : "Transport"}</dt>
                <dd className="text-lg font-bold text-foreground">{formatCurrency(transportTekst)}</dd>
              </div>
            </dl>
          </SectionCard>

          {/* 5. GEAVANCEERD */}
          <section
            id="blok-geavanceerd"
            aria-labelledby="blok-geavanceerd-titel"
            className="scroll-mt-36 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <button
              type="button"
              onClick={() => setGeavanceerdOpen((o) => !o)}
              aria-expanded={geavanceerdOpen}
              aria-controls="geavanceerd-inhoud"
              className="flex w-full cursor-pointer items-center gap-3 p-4 text-left sm:p-5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/35"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <SlidersHorizontal className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span id="blok-geavanceerd-titel" className="block text-lg font-bold leading-tight text-foreground">
                  Geavanceerd
                </span>
                <span className="block text-sm text-muted-foreground">Niet nodig om te starten</span>
              </span>
              <ChevronDown
                className={cn("h-5 w-5 shrink-0 text-foreground transition-transform", geavanceerdOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {geavanceerdOpen && (
              <div id="geavanceerd-inhoud" className="divide-y divide-border border-t border-border">
                <KeuzeRij
                  titel="Prijs tonen als bandbreedte"
                  uitleg="De klant ziet bijvoorbeeld € 1.150 – € 1.350 in plaats van één bedrag."
                  aan={draft.bandbreedte}
                  onChange={(aan) => setDraft((d) => zetBandbreedte(d, aan))}
                />
                <KeuzeRij
                  titel="Werktempo verschilt per materiaal"
                  uitleg="Bijvoorbeeld: klinkers leggen gaat langzamer dan tegels."
                  aan={draft.werktempoPerMateriaal}
                  onChange={(aan) => wijzig({ werktempoPerMateriaal: aan })}
                />
                <KeuzeRij
                  titel="Transport per dag rekenen"
                  uitleg="Standaard reken je transport één keer per klus."
                  aan={draft.transportPerDag}
                  onChange={(aan) => wijzig({ transportPerDag: aan })}
                />
                <div className="flex flex-col gap-3 p-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">Extra vraag aan de klant</p>
                      <p className="text-sm text-muted-foreground">Bijvoorbeeld: &ldquo;Moet de oude bestrating eruit?&rdquo;</p>
                    </div>
                    {product.extraOpties.length > 0 && (
                      <span className="text-sm font-semibold text-foreground">
                        {product.extraOpties.length} {product.extraOpties.length === 1 ? "vraag" : "vragen"}
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3 sm:p-4">{extraOptiesSectie}</div>
                </div>
                {extras.length > 0 && (
                  <div className="p-4 sm:px-5">
                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                      Deze werkzaamheid heeft ook {extras.join(", ")}. Die blijven zoals ze zijn en pas je aan in de{" "}
                      <Link
                        href={`/dashboard/tools/${toolId}/producten/${product.id}/uitgebreid`}
                        className="font-semibold underline"
                      >
                        uitgebreide weergave
                      </Link>
                      .
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-2 p-4 sm:px-5">
                  <form action={copyProductAction} className="ml-auto">
                    <input type="hidden" name="productId" value={product.id} />
                    <button
                      type="submit"
                      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-foreground hover:underline"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Kopie maken
                    </button>
                  </form>
                  {verwijderOpen ? (
                    <div role="alertdialog" aria-labelledby="verwijder-titel" className="rounded-lg border border-destructive bg-destructive/5 p-4">
                      <p id="verwijder-titel" className="font-semibold text-foreground">
                        &ldquo;{draft.naam.trim() || "Deze werkzaamheid"}&rdquo; verwijderen?
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        De werkzaamheid verdwijnt uit je rekentool. Dit kun je niet ongedaan maken.
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button type="button" variant="destructive" onClick={verwijder} disabled={verwijderBezig} className="h-11">
                          {verwijderBezig ? "Verwijderen…" : "Ja, verwijderen"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setVerwijderOpen(false)} disabled={verwijderBezig} className="h-11">
                          Nee, laat staan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVerwijderOpen(true)}
                      className="ml-auto flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-destructive hover:underline"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Werkzaamheid verwijderen
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Live voorbeeld: rechts (desktop, plakt mee) of onder de blokken (mobiel). */}
        <aside id="voorbeeld" aria-label="Voorbeeld" className="flex min-w-0 scroll-mt-36 flex-col gap-4 lg:sticky lg:top-36">
          <KlantVoorbeeld product={preview} state={voorbeeld} branding={branding} subscriptionTier={subscriptionTier} />
          <KostenOpbouwKaart opbouw={opbouw} eenheid={eenheid} stap={stap} />
        </aside>
      </div>

      {/* Vaste balk onderin (mobiel) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:left-64 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(voorbeeld.qty)} {eenheidKort} kost je klant
            </p>
            <p className="text-xl font-bold leading-tight text-foreground">{formatCurrency(opbouw.totaal)}</p>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={() => document.getElementById("voorbeeld")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="shrink-0"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Bekijk voorbeeld
          </Button>
        </div>
      </div>
    </div>
  );
}

function KeuzeRij({
  titel,
  uitleg,
  aan,
  onChange,
}: {
  titel: string;
  uitleg: string;
  aan: boolean;
  onChange: (aan: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 sm:px-5">
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{titel}</span>
        <span className="block text-sm text-muted-foreground">{uitleg}</span>
      </span>
      <Switch checked={aan} onChange={(e) => onChange(e.target.checked)} aria-label={titel} />
    </div>
  );
}
