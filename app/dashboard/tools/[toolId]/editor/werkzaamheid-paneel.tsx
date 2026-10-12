"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock, Copy, Layers, Plus, Ruler, Trash2, Truck, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { KopActie } from "@/app/components/mobile/mobiele-kop";
import { MobieleSheet } from "@/app/components/mobile/mobiele-sheet";
import { SamenvattingRij } from "@/app/components/mobile/samenvatting-rij";
import { StickyActiebalk } from "@/app/components/mobile/sticky-actiebalk";
import { Stepper } from "@/app/components/mobile/stepper";
import { bedragKort } from "./mobiele-editor";
import { DropdownMenu } from "@/app/components/ui/dropdown-menu";
import { Field } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { SectionCard } from "@/app/components/ui/section-card";
import { Segmented } from "@/app/components/ui/segmented";
import { Switch } from "@/app/components/ui/switch";
import { UnitInput } from "@/app/components/ui/unit-input";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { formatCurrency } from "@/app/lib/format";
import {
  METHODE_OPTIES,
  STAP_WOORD,
  arbeidVraag,
  bouwPreviewProduct,
  draftIsGeldig,
  draftVanProduct,
  kortEenheid,
  valideerExtras,
  valideerMaterialen,
  voorbeeldHoeveelheidVoor,
  zetBandbreedte,
  nieuweSleutel,
  type ExtraRij,
  type Methode,
  type ProductMetRelaties,
  type WerkzaamheidDraft,
} from "@/app/lib/werkzaamheid";
import { berekenKostenOpbouw, prijsRange } from "@/app/lib/werkzaamheid-kosten";
import { useTarieven } from "../tarieven-context";
import { useEditorRepository } from "./repository";
import { KostenOpbouwKaart } from "../producten/editor/kosten-opbouw-kaart";
import { MaterialenTabel } from "../producten/editor/materialen-tabel";
import { useAutosave, type AutosaveStatus } from "../producten/editor/use-autosave";

type Blok = "extra-vraag" | "toeslag" | "bandbreedte" | "tempo-per-materiaal";

const BLOK_INFO: Record<Blok, { titel: string; uitleg: string }> = {
  "extra-vraag": { titel: "Extra vraag aan de klant", uitleg: "Bijvoorbeeld: “Moet de oude bestrating eruit?” met een meerprijs." },
  toeslag: { titel: "Toeslag", uitleg: "Een vast bedrag of bedrag per eenheid dat altijd meetelt, zoals afvoer van oud materiaal." },
  bandbreedte: { titel: "Bandbreedte", uitleg: "De klant ziet een prijs van–tot in plaats van één bedrag." },
  "tempo-per-materiaal": { titel: "Werktempo per materiaal", uitleg: "Klinkers leggen gaat langzamer dan tegels." },
};

// Paneel met de blokken van één werkzaamheid. Elke wijziging werkt direct door
// in de rekentool in het midden (onPreview) en wordt automatisch opgeslagen.
export function WerkzaamheidPaneel({
  toolId,
  product,
  onPreview,
  onStatus,
  onVerwijder,
  onGekopieerd,
  mobiel,
  onKlaar,
}: {
  toolId: string;
  product: ProductMetRelaties;
  onPreview: (p: ProductMetRelaties) => void;
  onStatus: (s: { status: AutosaveStatus; fout: string | null; ongeldig: boolean; opnieuw: () => void }) => void;
  onVerwijder: () => void;
  onGekopieerd: (productId: string) => void;
  // Alleen mobiel (< 768 px): "scherm" = eigen scherm met accordeon, "prijzen"
  // en "tempo" = snelle wijziging in een sheet. Zonder = het gewone paneel.
  mobiel?: "scherm" | "prijzen" | "tempo";
  onKlaar?: () => void;
}) {
  const { costSettings, openTarieven } = useTarieven();
  const [openBlok, setOpenBlok] = useState<string | null>("materialen");
  const [opbouwOpen, setOpbouwOpen] = useState(false);
  const [blokKiezen, setBlokKiezen] = useState(false);
  const repo = useEditorRepository();
  // De oorspronkelijke database-versie, vastgezet: de live voorbeeldversie die
  // we naar boven doorgeven mag nooit weer als invoer terugkomen (lus).
  const [origineel] = useState(product);
  const [draft, setDraft] = useState<WerkzaamheidDraft>(() => draftVanProduct(product));
  const [actief, setActief] = useState(product.actief);
  const [fout, setFout] = useState<string | null>(null);
  const [toegevoegd, setToegevoegd] = useState<Set<Blok>>(() => {
    const d = draftVanProduct(product);
    const s = new Set<Blok>();
    if (d.extras?.some((e) => !e.altijd)) s.add("extra-vraag");
    if (d.extras?.some((e) => e.altijd)) s.add("toeslag");
    if (d.bandbreedte) s.add("bandbreedte");
    if (d.werktempoPerMateriaal) s.add("tempo-per-materiaal");
    return s;
  });

  const fouten = useMemo(() => valideerMaterialen(draft), [draft]);
  const extraFouten = useMemo(() => valideerExtras(draft), [draft]);
  const geldig = draftIsGeldig(draft);

  const idMap = useRef<Record<string, string>>({});
  const autosave = useAutosave(
    draft,
    async (d) => {
      const payload: WerkzaamheidDraft = {
        ...d,
        materialen: d.materialen.map((r) => ({ ...r, id: r.id ?? idMap.current[r.sleutel] })),
        extras: d.extras?.map((e) => ({ ...e, id: e.id ?? idMap.current[e.sleutel] })),
      };
      const r = await repo.slaWerkzaamheidOp(product.id, payload);
      if (r.ok) {
        idMap.current = { ...idMap.current, ...r.ids };
        return { ok: true };
      }
      return r;
    },
    { uitgeschakeld: !geldig }
  );

  // Status naar de bovenbalk.
  const { status, fout: opslagFout, opnieuw } = autosave;
  useEffect(() => {
    onStatus({ status, fout: opslagFout, ongeldig: !geldig, opnieuw });
  }, [status, opslagFout, geldig, opnieuw, onStatus]);

  // Live naar de rekentool in het midden.
  const preview = useMemo(() => bouwPreviewProduct({ toolId, draft, origineel }), [toolId, draft, origineel]);
  useEffect(() => {
    onPreview({ ...preview, actief });
  }, [preview, actief, onPreview]);

  const wijzig = (patch: Partial<WerkzaamheidDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const eenheid = preview.eenheid;
  const eenheidKort = kortEenheid(eenheid);
  const stap = costSettings.arbeidStapEenheid;
  const woord = STAP_WOORD[stap].enkelvoud;
  const voorbeeldHoeveelheid = voorbeeldHoeveelheidVoor(eenheid);
  const opbouw = useMemo(
    () => berekenKostenOpbouw({ product: preview, optieId: null, hoeveelheid: voorbeeldHoeveelheid, costSettings }),
    [preview, voorbeeldHoeveelheid, costSettings]
  );
  const Icoon = (product.icoon && PRODUCT_ICONS[product.icoon]) || Ruler;
  const heeftVoorbeeld = draft.materialen.some((m) => m.isVoorbeeld);

  const voegBlokToe = (b: Blok) => {
    setToegevoegd((s) => new Set(s).add(b));
    if (b === "bandbreedte") setDraft((d) => zetBandbreedte(d, true));
    if (b === "tempo-per-materiaal") wijzig({ werktempoPerMateriaal: true });
    if (b === "extra-vraag") setDraft((d) => ({ ...d, extras: [...(d.extras ?? []), nieuweExtra(false)] }));
    if (b === "toeslag") setDraft((d) => ({ ...d, extras: [...(d.extras ?? []), nieuweExtra(true)] }));
  };
  const verwijderBlok = (b: Blok) => {
    setToegevoegd((s) => {
      const n = new Set(s);
      n.delete(b);
      return n;
    });
    if (b === "bandbreedte") setDraft((d) => zetBandbreedte(d, false));
    if (b === "tempo-per-materiaal") wijzig({ werktempoPerMateriaal: false });
    if (b === "extra-vraag") setDraft((d) => ({ ...d, extras: (d.extras ?? []).filter((e) => e.altijd) }));
    if (b === "toeslag") setDraft((d) => ({ ...d, extras: (d.extras ?? []).filter((e) => !e.altijd) }));
  };
  const beschikbaar = (Object.keys(BLOK_INFO) as Blok[]).filter((b) => !toegevoegd.has(b));

  async function wisselZichtbaar(aan: boolean) {
    setActief(aan);
    const r = await repo.zetActief(product.id, aan);
    if (!r.ok) {
      setActief(!aan);
      setFout("Wijzigen is niet gelukt.");
    }
  }

  async function dupliceer() {
    if (!repo.kopieerWerkzaamheid) return;
    const r = await repo.kopieerWerkzaamheid(product.id, toolId);
    if (r.ok) onGekopieerd(r.productId);
    else setFout(r.error);
  }

  // --- Mobiele weergaven (zelfde state en opslag als het paneel hierboven)
  const prijzenBlok = (
    <>
      <MaterialenTabel
        rijen={draft.materialen}
        onChange={(materialen) => wijzig({ materialen })}
        eenheidSuffix={`/ ${eenheidKort}`}
        bandbreedte={draft.bandbreedte}
        werktempo={draft.werktempoPerMateriaal}
        tempoSuffix={`${eenheidKort} per ${woord}`}
        fouten={fouten}
      />
      {heeftVoorbeeld && (
        <p className="rounded-md border border-example bg-example/15 px-3 py-2 text-sm text-foreground">
          Gele <strong>voorbeeld</strong>-labels zijn prijzen uit onze startlijst. Pas ze aan naar wat jij rekent.
        </p>
      )}
    </>
  );
  const tempoGetal = Number(String(draft.productiviteit).replace(",", ".")) || 0;
  const tempoBlok = (
    <div className="flex flex-col gap-3">
      <p className="text-base text-foreground">{arbeidVraag(draft.naam, eenheid, stap)}</p>
      <Stepper
        label={`Werktempo ${eenheidKort} per ${woord}`}
        waarde={tempoGetal}
        onChange={(n) => wijzig({ productiviteit: String(n).replace(".", ",") })}
        stap={1}
        min={0}
        eenheid={`${eenheidKort} per ${woord}`}
      />
      <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground">
        <span>
          Je rekent <strong>{formatCurrency(opbouw.arbeidTarief)}</strong> per {woord}.
        </span>
        <button type="button" onClick={openTarieven} className="min-h-11 cursor-pointer font-semibold underline">
          Wijzigen
        </button>
      </p>
    </div>
  );
  if (mobiel === "prijzen") return <div className="flex flex-col gap-3">{prijzenBlok}</div>;
  if (mobiel === "tempo") return tempoBlok;

  if (mobiel === "scherm") {
    const range = prijsRange(preview);
    const aantalMat = draft.materialen.filter((m) => m.naam.trim() !== "").length;
    const voorbeeldAantal = draft.materialen.filter((m) => m.isVoorbeeld).length;
    const wissel = (id: string) => setOpenBlok((o) => (o === id ? null : id));
    return (
      <div className="flex flex-col gap-3 pb-20 md:hidden">
        <KopActie>
          <DropdownMenu
            ariaLabel="Meer acties voor dit onderdeel"
            className="h-11 w-11"
            items={[
              ...(repo.kopieerWerkzaamheid ? [{ label: "Dupliceren", icon: Copy, onSelect: dupliceer }] : []),
              { label: "Verwijderen", icon: Trash2, destructive: true, onSelect: onVerwijder },
            ]}
          />
        </KopActie>
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 text-base font-semibold text-foreground">
          Op je website
          <Switch checked={actief} onChange={(e) => void wisselZichtbaar(e.target.checked)} aria-label="Op je website" />
        </label>
        {fout && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {fout}
          </p>
        )}

        <SamenvattingRij id="basis" titel="Basis" samenvatting={`${METHODE_OPTIES.find((m) => m.value === draft.methode)?.label ?? "Eigen instelling"} · ${draft.naam}`} open={openBlok === "basis"} onToggle={() => wissel("basis")}>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
            Naam
            <Input value={draft.naam} maxLength={120} enterKeyHint="done" aria-invalid={draft.naam.trim() === "" ? true : undefined} onChange={(e) => wijzig({ naam: e.target.value })} />
          </label>
          {draft.methode === null ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">Deze werkzaamheid rekent op een eigen manier. Die instelling blijft zoals ze is.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground">Rekenmethode</span>
              <div className="grid grid-cols-2 gap-2">
                {METHODE_OPTIES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={draft.methode === m.value}
                    onClick={() => wijzig({ methode: m.value })}
                    className={`min-h-11 cursor-pointer rounded-lg border-[1.5px] px-3 py-2 text-sm font-semibold ${draft.methode === m.value ? "border-primary bg-accent text-foreground" : "border-input bg-card text-foreground"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </SamenvattingRij>

        <SamenvattingRij
          id="materialen"
          titel="Materialen en prijzen"
          samenvatting={`${aantalMat} ${aantalMat === 1 ? "materiaal" : "materialen"}${range ? ` · ${bedragKort(range.min)}${range.max !== range.min ? `–${bedragKort(range.max)}` : ""} per ${eenheidKort}` : ""}`}
          waarschuwing={voorbeeldAantal > 0 ? (voorbeeldAantal === 1 ? "1 voorbeeldprijs" : `${voorbeeldAantal} voorbeeldprijzen`) : null}
          open={openBlok === "materialen"}
          onToggle={() => wissel("materialen")}
        >
          {prijzenBlok}
        </SamenvattingRij>

        <SamenvattingRij id="tempo" titel="Werktempo" samenvatting={tempoGetal > 0 ? `${tempoGetal} ${eenheidKort} per ${woord}` : "Nog niet ingevuld"} open={openBlok === "tempo"} onToggle={() => wissel("tempo")}>
          {tempoBlok}
        </SamenvattingRij>

        <SamenvattingRij
          id="vast"
          titel="Vaste kosten"
          samenvatting={`Voorrijkosten ${bedragKort(costSettings.voorrijTarief)} · Transport ${bedragKort(costSettings.transportTarief)}`}
          open={openBlok === "vast"}
          onToggle={() => wissel("vast")}
        >
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">Voorrijkosten</dt>
              <dd className="text-lg font-bold text-foreground">{formatCurrency(costSettings.voorrijTarief)}</dd>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">Transport</dt>
              <dd className="text-lg font-bold text-foreground">{formatCurrency(costSettings.transportTarief)}</dd>
            </div>
          </dl>
          <button type="button" onClick={openTarieven} className="min-h-11 w-fit cursor-pointer text-base font-semibold text-primary underline">
            Wijzigen
          </button>
        </SamenvattingRij>

        {toegevoegd.has("extra-vraag") && (
          <SamenvattingRij id="extra" titel={BLOK_INFO["extra-vraag"].titel} samenvatting={`${(draft.extras ?? []).filter((e) => !e.altijd).length} vraag`} open={openBlok === "extra"} onToggle={() => wissel("extra")}>
            <ExtraRijen altijd={false} rijen={draft.extras ?? []} fouten={extraFouten} onChange={(extras) => wijzig({ extras })} eenheidKort={eenheidKort} />
            <Button type="button" variant="ghost" className="w-fit text-destructive" onClick={() => verwijderBlok("extra-vraag")}>
              Blok verwijderen
            </Button>
          </SamenvattingRij>
        )}
        {toegevoegd.has("toeslag") && (
          <SamenvattingRij id="toeslag" titel={BLOK_INFO.toeslag.titel} samenvatting={`${(draft.extras ?? []).filter((e) => e.altijd).length} toeslag`} open={openBlok === "toeslag"} onToggle={() => wissel("toeslag")}>
            <ExtraRijen altijd rijen={draft.extras ?? []} fouten={extraFouten} onChange={(extras) => wijzig({ extras })} eenheidKort={eenheidKort} />
            <Button type="button" variant="ghost" className="w-fit text-destructive" onClick={() => verwijderBlok("toeslag")}>
              Blok verwijderen
            </Button>
          </SamenvattingRij>
        )}
        {toegevoegd.has("bandbreedte") && (
          <SamenvattingRij id="bandbreedte" titel={BLOK_INFO.bandbreedte.titel} samenvatting="Prijs van–tot" open={openBlok === "bandbreedte"} onToggle={() => wissel("bandbreedte")}>
            <p className="text-sm text-muted-foreground">Vul bij elk materiaal een prijs “van” en “tot” in, bij Materialen en prijzen.</p>
            <Button type="button" variant="ghost" className="w-fit text-destructive" onClick={() => verwijderBlok("bandbreedte")}>
              Blok verwijderen
            </Button>
          </SamenvattingRij>
        )}
        {toegevoegd.has("tempo-per-materiaal") && (
          <SamenvattingRij id="tpm" titel={BLOK_INFO["tempo-per-materiaal"].titel} samenvatting="Per materiaal" open={openBlok === "tpm"} onToggle={() => wissel("tpm")}>
            <p className="text-sm text-muted-foreground">Vul bij elk materiaal het eigen werktempo in, bij Materialen en prijzen.</p>
            <Button type="button" variant="ghost" className="w-fit text-destructive" onClick={() => verwijderBlok("tempo-per-materiaal")}>
              Blok verwijderen
            </Button>
          </SamenvattingRij>
        )}
        {beschikbaar.length > 0 && (
          <button
            type="button"
            onClick={() => setBlokKiezen(true)}
            className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-input text-base font-semibold text-foreground"
          >
            <Plus className="h-5 w-5" aria-hidden="true" /> Blok toevoegen
          </button>
        )}

        <StickyActiebalk>
          <button
            type="button"
            onClick={() => setOpbouwOpen(true)}
            className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-lg px-1 text-left text-sm text-foreground"
          >
            <span className="block text-muted-foreground">Opbouw voor {voorbeeldHoeveelheid} {eenheidKort}</span>
            <span className="block text-base font-bold tabular-nums">{formatCurrency(opbouw.totaal)}</span>
          </button>
          <Button type="button" size="lg" className="shrink-0 px-8" onClick={onKlaar}>
            Klaar
          </Button>
        </StickyActiebalk>

        <MobieleSheet open={opbouwOpen} onClose={() => setOpbouwOpen(false)} titel={`Opbouw voor ${voorbeeldHoeveelheid} ${eenheidKort}`}>
          <KostenOpbouwKaart opbouw={opbouw} eenheid={eenheid} stap={stap} />
          <p className="mt-2 text-sm text-muted-foreground">Alleen voor jou zichtbaar, zonder btw.</p>
        </MobieleSheet>
        <MobieleSheet open={blokKiezen} onClose={() => setBlokKiezen(false)} titel="Blok toevoegen">
          <ul className="flex flex-col gap-2">
            {beschikbaar.map((b) => (
              <li key={b}>
                <button
                  type="button"
                  onClick={() => {
                    voegBlokToe(b);
                    setBlokKiezen(false);
                    setOpenBlok(b === "extra-vraag" ? "extra" : b === "tempo-per-materiaal" ? "tpm" : b);
                  }}
                  className="flex min-h-16 w-full cursor-pointer flex-col items-start justify-center rounded-xl border border-border bg-card px-4 py-2 text-left"
                >
                  <span className="text-base font-semibold text-foreground">{BLOK_INFO[b].titel}</span>
                  <span className="text-sm text-muted-foreground">{BLOK_INFO[b].uitleg}</span>
                </button>
              </li>
            ))}
          </ul>
        </MobieleSheet>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          <Icoon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor="wz-naam" className="sr-only">
            Naam van het onderdeel
          </label>
          <Input
            id="wz-naam"
            value={draft.naam}
            maxLength={120}
            aria-invalid={draft.naam.trim() === "" ? true : undefined}
            onChange={(e) => wijzig({ naam: e.target.value })}
            className="h-11 border-transparent bg-transparent px-2 text-lg font-bold hover:border-input"
          />
        </div>
        <DropdownMenu
          ariaLabel="Meer acties voor dit onderdeel"
          items={[
            ...(repo.kopieerWerkzaamheid ? [{ label: "Dupliceren", icon: Copy, onSelect: dupliceer }] : []),
            { label: "Verwijderen", icon: Trash2, destructive: true, onSelect: onVerwijder },
          ]}
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground">
        Zichtbaar voor klanten
        <Switch checked={actief} onChange={(e) => void wisselZichtbaar(e.target.checked)} aria-label="Zichtbaar voor klanten" />
      </label>
      {fout && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {fout}
        </p>
      )}

      <SectionCard icon={Ruler} title="Basis" description="Hoe reken je dit af?">
        <Field label="Rekenmethode" as="fieldset">
          <Segmented<Methode>
            name="methode"
            value={draft.methode}
            onChange={(methode) => wijzig({ methode })}
            options={METHODE_OPTIES}
            disabled={draft.methode === null}
            className="grid-cols-2 lg:grid-cols-2"
          />
          {draft.methode === null && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
              Deze werkzaamheid rekent op een eigen manier. Die instelling blijft zoals ze is. Wijzigen kan in de{" "}
              <Link href={`/dashboard/tools/${toolId}/producten/${product.id}/uitgebreid`} className="font-semibold underline">
                uitgebreide weergave
              </Link>
              .
            </p>
          )}
        </Field>
      </SectionCard>

      <SectionCard
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
        {heeftVoorbeeld && (
          <p className="mt-3 rounded-md border border-example bg-example/15 px-3 py-2 text-sm text-foreground">
            Gele <strong>voorbeeld</strong>-labels zijn prijzen uit onze startlijst. Pas ze aan naar wat jij rekent.
          </p>
        )}
      </SectionCard>

      <SectionCard icon={Clock} title="Werktempo" description="Los van het materiaal.">
        <div className="flex flex-col gap-3">
          <Field label={arbeidVraag(draft.naam, eenheid, stap)} htmlFor="wz-tempo">
            <UnitInput
              id="wz-tempo"
              suffix={`${eenheidKort} per ${woord}`}
              value={draft.productiviteit}
              placeholder="Bijv. 6…"
              onChange={(e) => wijzig({ productiviteit: e.target.value })}
            />
          </Field>
          <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground">
            <span>
              Je rekent <strong>{formatCurrency(opbouw.arbeidTarief)}</strong> per {woord}.
            </span>
            <button type="button" onClick={openTarieven} className="min-h-11 cursor-pointer font-semibold underline">
              Wijzigen
            </button>
          </p>
        </div>
      </SectionCard>

      <SectionCard
        icon={Truck}
        title="Vaste kosten"
        description="Komen uit je tarieven."
        action={
          <button type="button" onClick={openTarieven} className="min-h-11 cursor-pointer text-sm font-semibold underline">
            Wijzigen
          </button>
        }
      >
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted px-3 py-2.5">
            <dt className="text-sm text-muted-foreground">Voorrijkosten</dt>
            <dd className="text-lg font-bold text-foreground">{formatCurrency(costSettings.voorrijTarief)}</dd>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2.5">
            <dt className="text-sm text-muted-foreground">Transport</dt>
            <dd className="text-lg font-bold text-foreground">{formatCurrency(costSettings.transportTarief)}</dd>
          </div>
        </dl>
      </SectionCard>

      {toegevoegd.has("extra-vraag") && (
        <BlokKaart blok="extra-vraag" onVerwijder={() => verwijderBlok("extra-vraag")}>
          <ExtraRijen
            altijd={false}
            rijen={draft.extras ?? []}
            fouten={extraFouten}
            onChange={(extras) => wijzig({ extras })}
            eenheidKort={eenheidKort}
          />
        </BlokKaart>
      )}
      {toegevoegd.has("toeslag") && (
        <BlokKaart blok="toeslag" onVerwijder={() => verwijderBlok("toeslag")}>
          <ExtraRijen
            altijd
            rijen={draft.extras ?? []}
            fouten={extraFouten}
            onChange={(extras) => wijzig({ extras })}
            eenheidKort={eenheidKort}
          />
        </BlokKaart>
      )}
      {toegevoegd.has("bandbreedte") && (
        <BlokKaart blok="bandbreedte" onVerwijder={() => verwijderBlok("bandbreedte")}>
          <p className="text-sm text-muted-foreground">Vul bij elk materiaal een prijs “van” en “tot” in, bij Materialen en prijzen hierboven.</p>
        </BlokKaart>
      )}
      {toegevoegd.has("tempo-per-materiaal") && (
        <BlokKaart blok="tempo-per-materiaal" onVerwijder={() => verwijderBlok("tempo-per-materiaal")}>
          <p className="text-sm text-muted-foreground">Vul bij elk materiaal het eigen werktempo in, bij Materialen en prijzen hierboven.</p>
        </BlokKaart>
      )}

      {beschikbaar.length > 0 && (
        <DropdownMenu
          ariaLabel="Blok toevoegen"
          align="start"
          className="h-11 w-auto gap-2 rounded-lg border-[1.5px] border-dashed border-input px-4 text-sm font-semibold text-foreground"
          trigger={
            <>
              <Plus className="h-4 w-4" aria-hidden="true" /> Blok toevoegen
            </>
          }
          items={beschikbaar.map((b) => ({ label: BLOK_INFO[b].titel, onSelect: () => voegBlokToe(b) }))}
        />
      )}

      <KostenOpbouwKaart opbouw={opbouw} eenheid={eenheid} stap={stap} />
      <p className="text-xs text-muted-foreground">Opbouw voor {voorbeeldHoeveelheid} {eenheidKort}, alleen voor jou zichtbaar.</p>
    </div>
  );
}

function nieuweExtra(altijd: boolean): ExtraRij {
  return { sleutel: nieuweSleutel(), naam: "", prijs: "", type: altijd ? "PER_STUK" : "PER_EENHEID", altijd };
}

function BlokKaart({ blok, onVerwijder, children }: { blok: Blok; onVerwijder: () => void; children: React.ReactNode }) {
  const info = BLOK_INFO[blok];
  return (
    <section aria-label={info.titel} className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-foreground">{info.titel}</h3>
          <p className="text-sm text-muted-foreground">{info.uitleg}</p>
        </div>
        <button
          type="button"
          onClick={onVerwijder}
          aria-label={`${info.titel} verwijderen`}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      {children}
    </section>
  );
}

function ExtraRijen({
  altijd,
  rijen,
  fouten,
  onChange,
  eenheidKort,
}: {
  altijd: boolean;
  rijen: ExtraRij[];
  fouten: { sleutel: string; veld: "naam" | "prijs"; melding: string }[];
  onChange: (rijen: ExtraRij[]) => void;
  eenheidKort: string;
}) {
  const eigen = rijen.filter((r) => r.altijd === altijd);
  const update = (sleutel: string, patch: Partial<ExtraRij>) => onChange(rijen.map((r) => (r.sleutel === sleutel ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-3">
      {eigen.map((r) => {
        const naamFout = fouten.find((f) => f.sleutel === r.sleutel && f.veld === "naam");
        const prijsFout = fouten.find((f) => f.sleutel === r.sleutel && f.veld === "prijs");
        return (
          <div key={r.sleutel} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <Field label={altijd ? "Naam van de toeslag" : "Vraag aan de klant"} htmlFor={`x-${r.sleutel}-naam`} error={naamFout?.melding}>
              <Input
                id={`x-${r.sleutel}-naam`}
                value={r.naam}
                placeholder={altijd ? "Bijv. Afvoer oude bestrating" : "Bijv. Moet de oude bestrating eruit?"}
                onChange={(e) => update(r.sleutel, { naam: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={altijd ? "Bedrag" : "Meerprijs"} htmlFor={`x-${r.sleutel}-prijs`} error={prijsFout?.melding}>
                <UnitInput id={`x-${r.sleutel}-prijs`} prefix="€" value={r.prijs} onChange={(e) => update(r.sleutel, { prijs: e.target.value })} />
              </Field>
              <Field label="Rekenen" htmlFor={`x-${r.sleutel}-type`}>
                <select
                  id={`x-${r.sleutel}-type`}
                  value={r.type}
                  onChange={(e) => update(r.sleutel, { type: e.target.value as ExtraRij["type"] })}
                  className="h-11 w-full rounded-md border-[1.5px] border-input bg-card px-2 text-base text-foreground"
                >
                  <option value="PER_EENHEID">Per {eenheidKort}</option>
                  <option value="PER_STUK">{altijd ? "Vast bedrag" : "Per stuk"}</option>
                </select>
              </Field>
            </div>
            <Button type="button" variant="ghost" size="sm" className="self-end" onClick={() => onChange(rijen.filter((x) => x.sleutel !== r.sleutel))}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Verwijderen
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="outline" className="h-11 self-start" onClick={() => onChange([...rijen, nieuweExtra(altijd)])}>
        <Plus className="h-4 w-4" aria-hidden="true" /> {altijd ? "Toeslag" : "Vraag"} toevoegen
      </Button>
    </div>
  );
}
