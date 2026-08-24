"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Mail, Phone, Printer, ArrowLeft, ArrowRight } from "lucide-react";
import {
  bouwScope,
  pasAfgeleideVariabelenToe,
  evaluatePriceRules,
  bouwResultaat,
  veldIsIngevuld,
  veldIsZichtbaar,
  evalueerOnderdeel,
  combineerOnderdelen,
  type AnyCalculatorConfigData,
  type CalculatorField,
  type CalculatorStep,
  type ExpressionScope,
  type OnderdeelLineItem,
} from "@/app/lib/calculator-engine";
import { DebugPaneel } from "./debug-paneel";
import { CTA_LABELS } from "@/app/lib/tools";
import { formatCurrency } from "@/app/lib/format";
import { Card, CardContent } from "@/app/components/ui/card";
import { Logo } from "@/app/components/ui/logo";
import { Input, Label } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { fontFamilyFor, brandingFontVariables } from "@/app/lib/fonts";
import { accessibleTextColor } from "@/app/lib/color";
import { createLeadAction, type LeadFormState } from "@/app/lib/actions/leads";
import { recordPublicAnalyticsEventAction } from "@/app/lib/actions/analytics";
import type { LeadSnapshot, LeadSnapshotLine } from "@/app/lib/leads";
import { cn } from "@/app/lib/cn";
import { EngineVeld, type MateriaalOptie } from "./engine-fields";
import type { Branding, SubscriptionTier } from "@/app/generated/prisma/client";

const STANDAARD_PRIMAIRE_KLEUR = "#15803d";
const STANDAARD_ACHTERGRONDKLEUR = "#f7faf8";

// Puur presentationele vertaling van een ruwe veldwaarde naar leesbare tekst
// voor het eigenaar-only debug-paneel (Deel 10) — beïnvloedt nooit de
// daadwerkelijke berekening, die blijft volledig los via bouwScope/
// evalueerOnderdeel lopen.
function formatDebugWaarde(veld: CalculatorField, waarde: unknown, materiaalOpties: Record<string, MateriaalOptie[]>): string {
  if (waarde == null || waarde === "") return "—";
  switch (veld.soort) {
    case "JA_NEE":
    case "CHECKBOX":
      return waarde ? "Ja" : "Nee";
    case "DROPDOWN":
    case "RADIO":
      return veld.opties.find((o) => o.waarde === waarde)?.label ?? String(waarde);
    case "MEERKEUZE": {
      const geselecteerd = Array.isArray(waarde) ? waarde : [];
      const labels = veld.opties.filter((o) => geselecteerd.includes(o.waarde)).map((o) => o.label);
      return labels.length > 0 ? labels.join(", ") : "—";
    }
    case "AFMETINGEN": {
      const afmeting = waarde as { lengte?: number; breedte?: number; hoogte?: number };
      const delen = [afmeting.lengte, afmeting.breedte, afmeting.hoogte].filter(
        (n): n is number => typeof n === "number"
      );
      return delen.length > 0 ? `${delen.join(" × ")}${veld.eenheid ? ` ${veld.eenheid}` : ""}` : "—";
    }
    case "PRODUCT_KEUZE": {
      const optie = (materiaalOpties[veld.materialCategoryId] ?? []).find((o) => o.id === waarde);
      return optie?.naam ?? String(waarde);
    }
    case "NUMMER":
    case "AANTAL":
    case "OPPERVLAKTE":
    case "SLIDER":
      return `${waarde}${veld.eenheid ? ` ${veld.eenheid}` : ""}`;
    default:
      return String(waarde);
  }
}

type Props = {
  toolId: string;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  branding: Branding | null;
  config: AnyCalculatorConfigData;
  btwPercentage: number;
  materiaalOpties: Record<string, MateriaalOptie[]>;
  // Live voorbeeld in de calculator-bouwer (Deel 19: "dezelfde engine, geen
  // aparte preview-berekeningslogica" — dit ÉÉN component, alleen de
  // bijwerkingen eromheen worden onderdrukt): geen VISIT/START/COMPLETE-
  // analytics en geen echte offerte-aanvraag, ook niet als de tool zelf
  // al gepubliceerd staat (anders zou de vakman zijn eigen statistieken/
  // leads-CRM vervuilen door in zijn eigen bouwer te testen).
  previewModus?: boolean;
};

// Dezelfde <Calculator>-renderer als de publieke pagina's, embed en het
// live voorbeeld in de builder (Deel 19/38: "geen aparte calculatorlogica
// voor iframe versus publieke pagina, geen aparte preview-berekeningslogica"
// — dit ÉÉN component wordt overal ingeladen).
export function EngineCalculator({
  toolId,
  bedrijfsnaam,
  email,
  subscriptionTier,
  branding,
  config,
  btwPercentage,
  materiaalOpties,
  previewModus = false,
}: Props) {
  const isModulair = config.versie === 2;

  // v1: bestaande stappen (of één impliciete stap met alle velden). v2
  // (Levering B v2, Deel 6): elk actief Onderdeel is precies één stap, in
  // Onderdeel-volgorde — bewust geen aparte sub-stappen binnen één
  // Onderdeel (zie modulair-types.ts).
  const stappen: CalculatorStep[] = useMemo(() => {
    if (config.versie === 2) {
      return config.onderdelen
        .filter((o) => o.actief)
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((o) => ({ id: o.id, titel: o.naam, beschrijving: o.beschrijving, veldIds: o.velden.map((v) => v.id) }));
    }
    return config.stappen.length > 0
      ? config.stappen
      : [{ id: "__alles__", titel: "Jouw project", veldIds: config.velden.map((v) => v.id) }];
  }, [config]);

  const [stapIndex, setStapIndex] = useState(0);
  const [waarden, setWaarden] = useState<Record<string, unknown>>({});
  const [toonResultaat, setToonResultaat] = useState(false);

  // Namespacing (Deel 1 modulair): Onderdelen zijn zelfstandig — twee
  // Onderdelen mogen gerust allebei een veld met dezelfde id hebben. De
  // klantinvoer wordt daarom in v2 per Onderdeel genamespaced opgeslagen
  // (stapId === onderdeelId hier per constructie hierboven); in v1 blijft
  // de sleutel gewoon de kale veld-id (ongewijzigd gedrag).
  function waardeKey(stapId: string, veldId: string) {
    return isModulair ? `${stapId}::${veldId}` : veldId;
  }

  const veldenPerId = useMemo(() => {
    if (config.versie === 2) return new Map<string, (typeof config.onderdelen)[number]["velden"][number]>();
    return new Map(config.velden.map((v) => [v.id, v]));
  }, [config]);

  const materiaalPrijzen = useMemo(() => {
    const prijzen: Record<string, number> = {};
    for (const opties of Object.values(materiaalOpties)) {
      for (const optie of opties) prijzen[optie.id] = optie.prijs;
    }
    return prijzen;
  }, [materiaalOpties]);

  // v1: één globale scope over alle velden (ongewijzigd gedrag). v2: per
  // Onderdeel een geïsoleerde evaluatie (evalueerOnderdeel, modulair.ts),
  // daarna samengevoegd (combineerOnderdelen) tot hetzelfde
  // PriceRuleEvaluationResult-formaat dat bouwResultaat() al verwachtte —
  // nul wijzigingen aan de kernprijsengine.
  const scope: ExpressionScope = useMemo(() => {
    if (config.versie === 2) return {};
    const basisScope = bouwScope(config.velden, waarden, materiaalPrijzen);
    return pasAfgeleideVariabelenToe(basisScope, config.afgeleideVariabelen);
  }, [config, waarden, materiaalPrijzen]);

  const onderdeelEvaluaties = useMemo(() => {
    if (config.versie !== 2) return [];
    return config.onderdelen
      .filter((o) => o.actief)
      .map((o) => {
        const onderdeelWaarden: Record<string, unknown> = {};
        for (const veld of o.velden) onderdeelWaarden[veld.id] = waarden[waardeKey(o.id, veld.id)];
        return evalueerOnderdeel(o, onderdeelWaarden, materiaalPrijzen, { alleenPubliek: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, waarden, materiaalPrijzen]);

  const onderdeelScopePerId = useMemo(() => {
    const map = new Map<string, ExpressionScope>();
    for (const e of onderdeelEvaluaties) map.set(e.onderdeelId, e.scope);
    return map;
  }, [onderdeelEvaluaties]);

  const huidigeOnderdeel = config.versie === 2 ? config.onderdelen.find((o) => o.id === stappen[stapIndex]?.id) : null;
  const huidigeScope: ExpressionScope = isModulair ? (onderdeelScopePerId.get(stappen[stapIndex]?.id ?? "") ?? {}) : scope;

  // heeftInvoer: is er ergens al iets ingevuld? (voor de START-analytics-
  // gebeurtenis hieronder — vóór de eerste invoer is er nog niets te
  // registreren, ongeacht of er al dan niet verplichte velden zijn).
  const heeftInvoer = Object.keys(waarden).length > 0;

  const heeftAlleVerplichteVelden = useMemo(() => {
    if (config.versie === 2) return onderdeelEvaluaties.every((e) => e.heeftGeldigeInvoer);
    return config.velden.every((veld) => veldIsIngevuld(veld, waarden[veld.id], scope));
  }, [config, waarden, scope, onderdeelEvaluaties]);

  const evaluatie = useMemo(() => {
    if (config.versie === 2) return combineerOnderdelen(onderdeelEvaluaties);
    return evaluatePriceRules(config.regels, scope, { alleenPubliek: true });
  }, [config, scope, onderdeelEvaluaties]);

  const resultaat = useMemo(
    () =>
      bouwResultaat(evaluatie, {
        btwPercentage,
        resultaatInstellingen: config.resultaatInstellingen,
        heeftGeldigeInvoer: heeftAlleVerplichteVelden,
      }),
    [evaluatie, btwPercentage, config.resultaatInstellingen, heeftAlleVerplichteVelden]
  );

  // Branding/personalisatie — zelfde afleiding als de bestaande <Calculator>
  // (app/portaal/[slug]/calculator.tsx), bewust hier opnieuw (i.p.v.
  // gedeeld) om dat bestaande, al uitvoerig geteste component niet aan te
  // hoeven raken voor Levering B.
  const magPersonaliserenUiterlijk = subscriptionTier !== "GRATIS";
  const magOfferteAanvragen = subscriptionTier !== "GRATIS";
  const primaireKleur = magPersonaliserenUiterlijk ? (branding?.primaireKleur ?? STANDAARD_PRIMAIRE_KLEUR) : STANDAARD_PRIMAIRE_KLEUR;
  const achtergrondKleur = magPersonaliserenUiterlijk
    ? (branding?.achtergrondKleur ?? STANDAARD_ACHTERGRONDKLEUR)
    : STANDAARD_ACHTERGRONDKLEUR;
  const brandPrimaryForeground = accessibleTextColor(primaireKleur);
  const fontFamily = fontFamilyFor(magPersonaliserenUiterlijk ? (branding?.lettertype ?? "MODERN") : "MODERN");
  const titel = branding?.customTitel?.trim() ? branding.customTitel.replaceAll("{bedrijfsnaam}", bedrijfsnaam) : null;
  const bedankTekst = branding?.bedankTekst?.trim() || "Bedankt voor uw aanvraag! Wij nemen binnen 24 uur contact met u op.";
  const contactPositie = branding?.contactPositie ?? "BOVENAAN";
  const contact = {
    telefoonnummer: branding?.toonTelefoonnummer ? branding.telefoonnummer : null,
    email: branding?.toonEmail ? email : null,
  };
  const heeftContact = Boolean(contact.telefoonnummer || contact.email);

  // Auto-resize in een iframe — zelfde mechanisme/berichttype als de
  // bestaande <Calculator> (Deel 38: zelfde infra, geen tweede implementatie).
  useEffect(() => {
    if (window.self === window.top) return;
    function postHeight() {
      window.parent.postMessage({ type: "kostenplan:resize", toolId, height: document.body.scrollHeight }, "*");
    }
    postHeight();
    const observer = new ResizeObserver(postHeight);
    observer.observe(document.body);
    window.addEventListener("resize", postHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", postHeight);
    };
  }, [toolId]);

  // Analytics — zelfde VISIT/START/COMPLETE-patroon en dezelfde
  // useRef-guards tegen dubbeltellingen als de bestaande <Calculator>
  // (Deel 37: geen dubbele registratie, dezelfde levenscyclus-momenten).
  const visitRecorded = useRef(false);
  useEffect(() => {
    if (previewModus || visitRecorded.current) return;
    visitRecorded.current = true;
    void recordPublicAnalyticsEventAction(toolId, "VISIT");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecorded = useRef(false);
  const completeRecorded = useRef(false);
  useEffect(() => {
    if (previewModus) return;
    if (!startRecorded.current && heeftInvoer) {
      startRecorded.current = true;
      void recordPublicAnalyticsEventAction(toolId, "START");
    }
    if (!completeRecorded.current && resultaat.heeftGeldigeInvoer && resultaat.totaal > 0) {
      completeRecorded.current = true;
      void recordPublicAnalyticsEventAction(toolId, "COMPLETE");
    }
  }, [toolId, heeftInvoer, resultaat, previewModus]);

  const snapshot: LeadSnapshot = useMemo(() => {
    const zichtbareRegels = evaluatie.lineItems.filter((item) => item.toonInUitsplitsing && !item.intern);
    const regels: LeadSnapshotLine[] = (zichtbareRegels.length > 0 ? zichtbareRegels : evaluatie.lineItems).map(
      (item) => ({
        naam: item.label,
        type: "dienst",
        prijs: item.bedrag,
        onderdeel: isModulair ? (item as OnderdeelLineItem).onderdeelNaam : undefined,
      })
    );
    return {
      regels,
      arbeidskosten: resultaat.arbeid,
      materiaalkosten: resultaat.materiaal,
      transportkosten: resultaat.transport,
      voorrijkosten: 0,
      subtotaal: resultaat.subtotaal,
      btw: resultaat.btw,
      totaal: resultaat.totaal,
    };
  }, [evaluatie.lineItems, resultaat, isModulair]);

  // Alleen ooit gebruikt door het eigenaar-only debug-paneel (previewModus)
  // hieronder — puur presentationeel, geen invloed op de berekening zelf.
  const gekozenWaarden = !previewModus
    ? []
    : stappen.flatMap((stap) => {
        const veldenVanStap =
          config.versie === 2 ? (config.onderdelen.find((o) => o.id === stap.id)?.velden ?? []) : config.velden;
        return stap.veldIds.flatMap((veldId) => {
          const veld = veldenVanStap.find((v) => v.id === veldId);
          if (!veld) return [];
          const waarde = waarden[waardeKey(stap.id, veldId)];
          if (waarde == null || waarde === "") return [];
          return [{ label: veld.label, waarde: formatDebugWaarde(veld, waarde, materiaalOpties) }];
        });
      });

  const huidigeStap = stappen[Math.min(stapIndex, stappen.length - 1)];
  const isLaatsteStap = stapIndex >= stappen.length - 1;
  const huidigeStapVeldenIngevuld = (huidigeStap?.veldIds ?? []).every((id) => {
    const veld = config.versie === 2 ? huidigeOnderdeel?.velden.find((v) => v.id === id) : veldenPerId.get(id);
    return !veld || veldIsIngevuld(veld, waarden[waardeKey(huidigeStap.id, id)], huidigeScope);
  });

  const isLeeg = config.versie === 2 ? config.onderdelen.filter((o) => o.actief).length === 0 : config.velden.length === 0 || config.regels.length === 0;

  if (isLeeg) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 py-12 text-center">
        <Logo className="h-11 w-11 rounded-xl p-1.5" />
        <p className="text-muted-foreground">
          Deze calculator is nog niet ingericht. Neem contact op met {bedrijfsnaam} voor een offerte.
        </p>
      </div>
    );
  }

  return (
    <div
      data-portal-shell
      className={cn("flex min-h-screen flex-col", brandingFontVariables())}
      style={
        {
          "--brand-primary": primaireKleur,
          "--brand-primary-foreground": brandPrimaryForeground,
          backgroundColor: achtergrondKleur,
          fontFamily,
        } as React.CSSProperties
      }
    >
      <header className="border-b border-border" style={{ backgroundColor: "var(--brand-primary)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-6 sm:px-6">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
            <img src={branding.logoUrl} alt={bedrijfsnaam} className="h-11 w-auto max-w-[10rem] shrink-0 object-contain" />
          ) : (
            <Logo className="h-11 w-11 rounded-xl p-1.5" />
          )}
          <div className="min-w-0 flex-1">
            {titel ? (
              <h1 className="truncate text-xl font-semibold text-[var(--brand-primary-foreground)]">{titel}</h1>
            ) : (
              <>
                <p className="text-sm text-[var(--brand-primary-foreground)]/80">Kostencalculator van</p>
                <h1 className="truncate text-xl font-semibold text-[var(--brand-primary-foreground)]">{bedrijfsnaam}</h1>
              </>
            )}
          </div>
          <span className="print:hidden">
            <ThemeToggle />
          </span>
        </div>
      </header>

      {contactPositie === "BOVENAAN" && heeftContact && (
        <ContactBalk telefoonnummer={contact.telefoonnummer} email={contact.email} />
      )}

      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {previewModus && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-xs font-medium text-muted-foreground print:hidden">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
            Testmodus — vul waarden in zoals een klant, zie de berekening en prijscomponenten live.
          </div>
        )}
        {!toonResultaat && stappen.length > 1 && (
          <div className="mb-6 flex gap-1.5">
            {stappen.map((stap, i) => (
              <span
                key={stap.id}
                className={cn("h-1.5 flex-1 rounded-full", i <= stapIndex ? "bg-[var(--brand-primary)]" : "bg-secondary")}
              />
            ))}
          </div>
        )}

        {toonResultaat ? (
          <ResultaatKaart
            toolId={toolId}
            resultaat={resultaat}
            evaluatie={evaluatie}
            snapshot={snapshot}
            gekozenWaarden={gekozenWaarden}
            ctaTekst={config.resultaatInstellingen.ctaTekst ?? CTA_LABELS[config.resultaatInstellingen.ctaType]}
            weergave={config.resultaatInstellingen.weergave}
            bedankTekst={bedankTekst}
            magOfferteAanvragen={magOfferteAanvragen}
            previewModus={previewModus}
            onTerug={() => setToonResultaat(false)}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{huidigeStap.titel}</h2>
              {huidigeStap.beschrijving && <p className="mt-1 text-sm text-muted-foreground">{huidigeStap.beschrijving}</p>}
            </div>

            <div className="flex flex-col gap-5">
              {huidigeStap.veldIds.map((veldId) => {
                const veld = config.versie === 2 ? huidigeOnderdeel?.velden.find((v) => v.id === veldId) : veldenPerId.get(veldId);
                if (!veld) return null;
                if (!veldIsZichtbaar(veld, huidigeScope)) return null;
                const key = waardeKey(huidigeStap.id, veld.id);
                return (
                  <EngineVeld
                    key={veld.id}
                    veld={veld}
                    waarde={waarden[key]}
                    onChange={(waarde) => setWaarden((prev) => ({ ...prev, [key]: waarde }))}
                    materiaalOpties={materiaalOpties}
                  />
                );
              })}
            </div>

            <div className="flex gap-2">
              {stapIndex > 0 && (
                <Button type="button" variant="ghost" size="lg" onClick={() => setStapIndex((i) => i - 1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Vorige
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="flex-1 border-transparent bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:opacity-90"
                disabled={!huidigeStapVeldenIngevuld}
                onClick={() => (isLaatsteStap ? setToonResultaat(true) : setStapIndex((i) => i + 1))}
              >
                {isLaatsteStap ? "Bekijk resultaat" : "Volgende"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {contactPositie === "ONDERAAN" && heeftContact && (
        <ContactBalk telefoonnummer={contact.telefoonnummer} email={contact.email} />
      )}
    </div>
  );
}

function ContactBalk({ telefoonnummer, email }: { telefoonnummer: string | null; email: string | null }) {
  return (
    <div className="border-b border-border bg-secondary/40">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2.5 text-sm text-foreground sm:justify-start sm:px-6">
        {telefoonnummer && (
          <a href={`tel:${telefoonnummer.replace(/[^+\d]/g, "")}`} className="flex items-center gap-1.5 hover:underline">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            {telefoonnummer}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:underline">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {email}
          </a>
        )}
      </div>
    </div>
  );
}

function ResultaatKaart({
  toolId,
  resultaat,
  evaluatie,
  snapshot,
  gekozenWaarden,
  ctaTekst,
  weergave,
  bedankTekst,
  magOfferteAanvragen,
  previewModus,
  onTerug,
}: {
  toolId: string;
  resultaat: ReturnType<typeof bouwResultaat>;
  evaluatie: ReturnType<typeof evaluatePriceRules>;
  snapshot: LeadSnapshot;
  gekozenWaarden: { label: string; waarde: string }[];
  ctaTekst: string;
  weergave: AnyCalculatorConfigData["resultaatInstellingen"]["weergave"];
  bedankTekst: string;
  magOfferteAanvragen: boolean;
  previewModus: boolean;
  onTerug: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const action = createLeadAction.bind(null, toolId);
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(action, null);
  const [leadNaam, setLeadNaam] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadTelefoon, setLeadTelefoon] = useState("");

  const prijsTekst =
    weergave === "GEEN"
      ? null
      : resultaat.totaalMin != null && resultaat.totaalMax != null
        ? `${formatCurrency(resultaat.totaalMin)} – ${formatCurrency(resultaat.totaalMax)}`
        : weergave === "VANAF"
          ? `Vanaf ${formatCurrency(resultaat.totaal)}`
          : formatCurrency(resultaat.totaal);

  const zichtbareRegels = evaluatie.lineItems.filter((item) => item.toonInUitsplitsing && !item.intern);

  // Levering B v2 (Deel 11 "Tool-Totaal"): als de regels van een Onderdeel
  // afkomstig zijn (evaluatie kwam uit combineerOnderdelen), toon dan per
  // Onderdeel één subtotaalregel — precies het voorbeeld uit de opdracht
  // ("Bestrating €4.500 + Schutting €2.850 + ... = Totaal"). v1-tools hebben
  // nooit een onderdeelNaam op hun regels, dus die tonen gewoon de
  // bestaande, ongewijzigde platte lijst.
  const onderdeelGroepen = (() => {
    const groepen = new Map<string, number>();
    const volgorde: string[] = [];
    for (const item of zichtbareRegels) {
      const naam = (item as OnderdeelLineItem).onderdeelNaam;
      if (!naam) return null;
      if (!groepen.has(naam)) volgorde.push(naam);
      groepen.set(naam, (groepen.get(naam) ?? 0) + item.bedrag);
    }
    return volgorde.map((naam) => ({ naam, bedrag: groepen.get(naam)! }));
  })();

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="ghost" size="sm" onClick={onTerug} className="w-fit print:hidden">
        <ArrowLeft className="h-3.5 w-3.5" />
        Wijzigen
      </Button>

      <Card className="border-[var(--brand-primary)]/30">
        <CardContent className="flex flex-col gap-4">
          <h3 className="font-semibold text-foreground">Jouw kostenraming</h3>

          {state?.success ? (
            <p className="rounded-lg bg-[var(--brand-primary)]/10 px-3 py-3 text-sm text-foreground">{bedankTekst}</p>
          ) : (
            <>
              {weergave === "UITGEBREID" && zichtbareRegels.length > 0 && (
                <div className="flex flex-col gap-2 text-sm">
                  {onderdeelGroepen
                    ? onderdeelGroepen.map((groep) => (
                        <div key={groep.naam} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{groep.naam}</span>
                          <span className="font-medium text-foreground">{formatCurrency(groep.bedrag)}</span>
                        </div>
                      ))
                    : zichtbareRegels.map((item) => (
                        <div key={item.ruleId} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{formatCurrency(item.bedrag)}</span>
                        </div>
                      ))}
                  <div className="my-1 border-t border-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotaal</span>
                    <span className="font-medium text-foreground">{formatCurrency(resultaat.subtotaal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Btw</span>
                    <span className="font-medium text-foreground">{formatCurrency(resultaat.btw)}</span>
                  </div>
                </div>
              )}

              {prijsTekst && (
                <div className="flex flex-col gap-1 rounded-lg px-4 py-4" style={{ backgroundColor: "var(--brand-primary)" }}>
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--brand-primary-foreground)]/75">
                    {weergave === "VANAF" ? "Geschatte kosten" : "Totaal (incl. btw)"}
                  </span>
                  <span className="text-3xl font-bold leading-tight text-[var(--brand-primary-foreground)]">{prijsTekst}</span>
                </div>
              )}

              {previewModus && (
                <DebugPaneel gekozenWaarden={gekozenWaarden} evaluatie={evaluatie} totaal={resultaat.totaal} />
              )}

              {previewModus ? (
                <p className="rounded-md border border-dashed border-border px-3 py-2 text-center text-xs text-muted-foreground print:hidden">
                  Dit is een voorbeeld — hier kan niemand echt een aanvraag versturen.
                </p>
              ) : formOpen ? (
                <form action={formAction} noValidate className="flex flex-col gap-3">
                  <input type="hidden" name="snapshot" value={JSON.stringify(snapshot)} />
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lead-naam">Naam</Label>
                    <Input id="lead-naam" name="naam" value={leadNaam} onChange={(e) => setLeadNaam(e.target.value)} required autoFocus />
                    {state?.fieldErrors?.naam && <p className="text-xs text-destructive">{state.fieldErrors.naam}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lead-email">E-mailadres</Label>
                    <Input
                      id="lead-email"
                      name="email"
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      required
                    />
                    {state?.fieldErrors?.email && <p className="text-xs text-destructive">{state.fieldErrors.email}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lead-telefoon">Telefoonnummer (optioneel)</Label>
                    <Input
                      id="lead-telefoon"
                      name="telefoonnummer"
                      type="tel"
                      value={leadTelefoon}
                      onChange={(e) => setLeadTelefoon(e.target.value)}
                    />
                  </div>
                  {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="ghost" size="lg" className="w-full sm:flex-1" onClick={() => setFormOpen(false)} disabled={pending}>
                      Terug
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full border-transparent bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:opacity-90 sm:flex-1"
                      disabled={pending}
                    >
                      <Mail className="h-4 w-4" />
                      {pending ? "Versturen…" : "Versturen"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-2 print:hidden sm:flex-row">
                  {magOfferteAanvragen && (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-full border-transparent bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:opacity-90 sm:flex-1"
                      onClick={() => setFormOpen(true)}
                    >
                      <Mail className="h-4 w-4" />
                      {ctaTekst}
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="lg" className="w-full sm:flex-1" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Bewaar als PDF
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
