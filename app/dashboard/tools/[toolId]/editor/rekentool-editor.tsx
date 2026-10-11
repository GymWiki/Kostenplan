"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Globe, Monitor, Pencil, Play, Settings2, Smartphone, Trash2, X } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Logo } from "@/app/components/ui/logo";
import { BottomSheet } from "@/app/components/ui/bottom-sheet";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { DropdownMenu } from "@/app/components/ui/dropdown-menu";
import { Input } from "@/app/components/ui/input";
import { Overlay } from "@/app/components/ui/overlay";
import { cn } from "@/app/lib/cn";
import { duplicateToolAction } from "@/app/lib/actions/tools";
import { verwijderRekentoolAction } from "@/app/lib/actions/rekentools";
import type { ProductMetRelaties } from "@/app/lib/werkzaamheid";
import type { Branding, CostSettings, SubscriptionTier, ToolStatus } from "@/app/generated/prisma/client";
import type { ToolEmbedConfig } from "@/app/lib/tools";
import type { NaarVoorbeeld, VanVoorbeeld } from "@/app/voorbeeld/[toolId]/voorbeeld-client";
import type { Waarschuwing } from "@/app/portaal/[slug]/bewerkbaar";
import { useEditorRepository } from "./repository";
import { OpslaanStatus } from "../producten/editor/opslaan-status";
import type { AutosaveStatus } from "../producten/editor/use-autosave";
import { useTarieven } from "../tarieven-context";
import { PaneelStart } from "./paneel-start";
import { PaneelToevoegen, type AndereRekentool } from "./paneel-toevoegen";
import {
  PaneelAangepast,
  PaneelAanvraag,
  PaneelResultaat,
  PaneelUiterlijk,
  PaneelWebsite,
  type AanvraagStart,
  type ResultaatStart,
} from "./paneel-instellingen";
import { WerkzaamheidPaneel } from "./werkzaamheid-paneel";
import { PublicatieStatusLabel } from "./publicatie-status";
import type { PublicatieStatus } from "@/app/lib/actions/publicatie";

export type EditorProps = {
  toolId: string;
  toolNaam: string;
  toolStatus: ToolStatus;
  isAangepast: boolean;
  products: ProductMetRelaties[];
  branding: Branding;
  tier: SubscriptionTier;
  email: string;
  resultaat: ResultaatStart;
  aanvraag: AanvraagStart;
  website: {
    toolUrl: string;
    embedCode: string | null;
    iframeCode?: string | null;
    heeftContact?: boolean;
    embedConfig: ToolEmbedConfig;
    magEmbedden: boolean;
    magPubliceren: boolean;
    limiet: number | null;
  };
  anderen: AndereRekentool[];
  magNieuweTool: boolean;
  startPaneel: string;
  // Stand van de gepubliceerde kopie voor de embed (alleen bij een echt account).
  publicatie?: PublicatieStatus;
  // Alleen voor de probeer-flow (gast): dezelfde editor, met een
  // account-maken-paneel in plaats van publiceren en embed.
  gast?: { logoMislukt: boolean; opslagMelding: string | null; accountPaneel: React.ReactNode; uiterlijkPaneel: React.ReactNode; bedrijfsnaam: string };
  // Standaard de voorbeeld-route van deze rekentool; de gast-flow en tests
  // geven hier een eigen bron.
  voorbeeldUrl?: string;
};

type Opslag = { status: AutosaveStatus; fout: string | null; ongeldig: boolean; opnieuw: () => void };
const KLAAR: Opslag = { status: "klaar", fout: null, ongeldig: false, opnieuw: () => {} };

const mobielQuery = "(max-width: 767px)";
function useIsMobiel() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(mobielQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(mobielQuery).matches,
    () => false
  );
}

const PANEEL_TITEL = (p: string, products: ProductMetRelaties[]) => {
  if (p.startsWith("werkzaamheid:")) return products.find((x) => x.id === p.slice(13))?.naam || "Onderdeel";
  return (
    { start: "Aan de slag", uiterlijk: "Uiterlijk", resultaat: "Resultaat", aanvraag: "Aanvraagformulier", website: "Zet op mijn website", account: "Account maken", toevoegen: "Onderdeel toevoegen", aangepast: "Aangepaste rekentool" } as Record<string, string>
  )[p] ?? "Aan de slag";
};

// De rekentool-editor: de echte klant-rekentool in het midden (iframe, echte
// breakpoints), het bewerkpaneel rechts (desktop) of als bottom sheet
// (mobiel). Alle gegevens komen via props/EditorBron-achtige data binnen en
// alle wijzigingen gaan via losse server actions, zodat dezelfde component
// later in de gast-flow (andere sessie, andere actions) hergebruikt kan worden.
export function RekentoolEditor(props: EditorProps) {
  const { toolId, branding, tier, email, website, anderen, isAangepast } = props;
  const router = useRouter();
  const { costSettings: tarieven } = useTarieven();
  const isMobiel = useIsMobiel();

  const [naam, setNaam] = useState(props.toolNaam);
  const [producten, setProducten] = useState(props.products);
  const bewerkt = useRef(new Set<string>());
  const [paneel, setPaneelState] = useState(props.startPaneel);
  const [sheetOpen, setSheetOpen] = useState(props.startPaneel !== "start");
  const gast = props.gast;
  // Een gast begint in Uitproberen: meteen een prijs zien.
  const [modus, setModusState] = useState<"bewerken" | "uitproberen">(gast ? "uitproberen" : "bewerken");
  const setModus = setModusState;
  const repo = useEditorRepository();
  const [apparaat, setApparaat] = useState<"desktop" | "mobiel">("desktop");
  const [opslag, setOpslag] = useState<Opslag>(KLAAR);
  const [volgordeBezig, setVolgordeBezig] = useState(false);
  // Telt hoe vaak er een opslag is afgerond, zodat het publicatielabel weet
  // wanneer het de stand moet gaan ophalen.
  const [opgeslagenTeller, setOpgeslagenTeller] = useState(0);
  const vorigeOpslag = useRef(opslag.status);
  useEffect(() => {
    if (vorigeOpslag.current !== "klaar" && opslag.status === "klaar") setOpgeslagenTeller((n) => n + 1);
    vorigeOpslag.current = opslag.status;
  }, [opslag.status]);
  const [melding, setMelding] = useState<string | null>(null);
  const [hernoemOpen, setHernoemOpen] = useState(false);
  const [hernoemTekst, setHernoemTekst] = useState("");
  const [hernoemFout, setHernoemFout] = useState<string | null>(null);
  const [verwijderTool, setVerwijderTool] = useState(false);
  const [verwijderProduct, setVerwijderProduct] = useState<string | null>(null);
  const [weggaan, setWeggaan] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [resultaat, setResultaat] = useState(props.resultaat);
  const [aanvraag, setAanvraag] = useState(props.aanvraag);

  // Verse serverdata (na router.refresh of een nieuwe werkzaamheid) samenvoegen
  // met wat hier lokaal al is aangepast.
  useEffect(() => {
    setProducten((huidig) => {
      const lokaal = new Map(huidig.map((p) => [p.id, p]));
      const volgorde = huidig.map((p) => p.id);
      const nieuw = props.products.map((p) => (bewerkt.current.has(p.id) ? (lokaal.get(p.id) ?? p) : p));
      const bekend = new Set(props.products.map((p) => p.id));
      const behouden = volgorde.filter((id) => bekend.has(id));
      const toegevoegd = props.products.filter((p) => !volgorde.includes(p.id)).map((p) => p.id);
      return [...behouden, ...toegevoegd].map((id) => nieuw.find((p) => p.id === id)!);
    });
  }, [props.products]);

  // Een recent bezochte pagina kan uit de router-cache komen; haal bij het
  // openen eenmalig verse gegevens op.
  useEffect(() => {
    if (!repo.gast) router.refresh();
  }, [router, repo]);

  const setPaneel = useCallback((p: string) => {
    if (p === "account") {
      setModusState("bewerken");
    }
    setPaneelState(p);
    setOpslag(KLAAR);
    setSheetOpen(true);
    const url = new URL(window.location.href);
    if (p === "start") url.searchParams.delete("paneel");
    else url.searchParams.set("paneel", p);
    window.history.replaceState(null, "", url);
  }, []);

  // --- Gegevens voor de rekentool in het midden
  const costSettings: CostSettings = useMemo(() => ({ ...tarieven, ...resultaat }), [tarieven, resultaat]);
  const waarschuwingen = useMemo(() => {
    const w: Record<string, Waarschuwing> = {};
    for (const p of producten) {
      const mats = p.materiaalCategorieen.flatMap((c) => c.materialen.filter((m) => m.actief));
      if (mats.length === 0) w[`werkzaamheid:${p.id}`] = { soort: "blokkade", tekst: `${p.naam} heeft nog geen materiaal. Voeg een materiaal toe of verberg het onderdeel.` };
      else if (mats.some((m) => m.isVoorbeeld)) w[`werkzaamheid:${p.id}`] = { soort: "voorbeeld", tekst: `${p.naam} heeft nog voorbeeldprijzen. Pas ze aan naar wat jij rekent.` };
    }
    return w;
  }, [producten]);

  // --- Berichten met de iframe
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKlaar, setIframeKlaar] = useState(false);

  const kiesDoel = useCallback(
    (doel: string) => setPaneel(doel === "uiterlijk-tekst" ? "uiterlijk" : doel),
    [setPaneel]
  );

  const verplaats = useCallback(
    (id: string, richting: -1 | 1) => {
      setProducten((lijst) => {
        const i = lijst.findIndex((p) => p.id === id);
        const j = i + richting;
        if (i < 0 || j < 0 || j >= lijst.length) return lijst;
        const kopie = [...lijst];
        [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
        void bewaarVolgorde(kopie.map((p) => p.id));
        return kopie;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const sleep = useCallback((van: string, naar: string) => {
    setProducten((lijst) => {
      const i = lijst.findIndex((p) => p.id === van);
      const j = lijst.findIndex((p) => p.id === naar);
      if (i < 0 || j < 0 || i === j) return lijst;
      const kopie = [...lijst];
      const [verplaatst] = kopie.splice(i, 1);
      kopie.splice(j, 0, verplaatst);
      void bewaarVolgorde(kopie.map((p) => p.id));
      return kopie;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bewaarVolgorde(ids: string[]) {
    setVolgordeBezig(true);
    const r = await repo.zetVolgorde(toolId, ids);
    setVolgordeBezig(false);
    if (!r.ok) setMelding("De volgorde opslaan is niet gelukt.");
  }

  useEffect(() => {
    function ontvang(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== iframeRef.current?.contentWindow) return;
      const m = e.data as VanVoorbeeld;
      if (m.type === "kp:ready") setIframeKlaar(true);
      else if (m.type === "kp:select") kiesDoel(m.doel);
      else if (m.type === "kp:verplaats") verplaats(m.doel.replace("werkzaamheid:", ""), m.richting);
      else if (m.type === "kp:sleep") sleep(m.van.replace("werkzaamheid:", ""), m.naar.replace("werkzaamheid:", ""));
      else if (m.type === "kp:toevoegen") setPaneel("toevoegen");
    }
    window.addEventListener("message", ontvang);
    return () => window.removeEventListener("message", ontvang);
  }, [kiesDoel, verplaats, sleep, setPaneel]);

  useEffect(() => {
    if (!iframeKlaar) return;
    const bericht: NaarVoorbeeld = {
      type: "kp:state",
      products: producten,
      branding,
      costSettings,
      modus,
      geselecteerd: modus === "bewerken" ? paneel : null,
      waarschuwingen,
      toelichting: resultaat.toelichting.trim() || null,
      ctaTekst: resultaat.ctaTekst.trim() || null,
      vraagTelefoon: aanvraag.vraagTelefoon,
      bedrijfsnaam: gast?.bedrijfsnaam,
    };
    iframeRef.current?.contentWindow?.postMessage(bericht, window.location.origin);
  }, [iframeKlaar, producten, branding, costSettings, modus, paneel, waarschuwingen, resultaat, aanvraag, gast?.bedrijfsnaam]);

  const updateProduct = useCallback((p: ProductMetRelaties) => {
    bewerkt.current.add(p.id);
    setProducten((lijst) => lijst.map((x) => (x.id === p.id ? p : x)));
  }, []);

  // --- Acties
  async function hernoem() {
    setBezig(true);
    const r = await repo.hernoemRekentool(toolId, hernoemTekst);
    setBezig(false);
    if (r.ok) {
      setNaam(hernoemTekst.trim());
      setHernoemOpen(false);
    } else setHernoemFout(r.error);
  }

  async function verwijderRekentool() {
    setBezig(true);
    const r = await verwijderRekentoolAction(toolId);
    if (r.ok) router.push(`/dashboard/tools?verwijderd=${toolId}&naam=${encodeURIComponent(naam)}`);
    else setBezig(false);
  }

  async function verwijderWerkzaamheid() {
    if (!verwijderProduct) return;
    setBezig(true);
    const r = await repo.verwijderWerkzaamheid(verwijderProduct);
    setBezig(false);
    if (r.ok) {
      setProducten((l) => l.filter((p) => p.id !== verwijderProduct));
      setVerwijderProduct(null);
      setPaneel("start");
    } else setMelding("Verwijderen is niet gelukt.");
  }

  async function zetZichtbaar(id: string, aan: boolean) {
    setProducten((l) => l.map((p) => (p.id === id ? { ...p, actief: aan } : p)));
    bewerkt.current.add(id);
    const r = await repo.zetActief(id, aan);
    if (!r.ok) {
      setProducten((l) => l.map((p) => (p.id === id ? { ...p, actief: !aan } : p)));
      setMelding("Wijzigen is niet gelukt.");
    }
  }

  function nieuwToegevoegd(productId: string) {
    const lokaal = repo.laadProducten?.();
    if (lokaal) setProducten((cur) => [...cur, ...lokaal.filter((p) => !cur.some((c) => c.id === p.id))]);
    else router.refresh();
    setPaneel(`werkzaamheid:${productId}`);
  }

  const menu = gast ? [{ label: "Naam wijzigen", icon: Pencil, onSelect: () => { setHernoemTekst(naam); setHernoemFout(null); setHernoemOpen(true); } }] : [
    { label: "Naam wijzigen", icon: Pencil, onSelect: () => { setHernoemTekst(naam); setHernoemFout(null); setHernoemOpen(true); } },
    {
      label: "Dupliceren",
      icon: Copy,
      disabled: !props.magNieuweTool,
      onSelect: () => {
        const fd = new FormData();
        fd.set("toolId", toolId);
        void duplicateToolAction(fd);
      },
    },
    { label: "Btw en andere prijsinstellingen", icon: Settings2, onSelect: () => router.push(`/dashboard/tools/${toolId}/prijzen`) },
    { label: "Verwijderen", icon: Trash2, destructive: true, onSelect: () => setVerwijderTool(true) },
  ];
  const mobielMenu = [
    { label: modus === "bewerken" ? "Uitproberen" : "Bewerken", icon: Play, onSelect: () => setModus((m) => (m === "bewerken" ? "uitproberen" : "bewerken")) },
    { label: gast ? "Account maken" : "Zet op mijn website", icon: Globe, onSelect: () => setPaneel(gast ? "account" : "website") },
    ...menu,
  ];

  const checklist = [
    { id: "logo", label: "Logo ingesteld", klaar: Boolean(branding.logoUrl), paneel: "uiterlijk" },
    { id: "wz", label: "Minstens één onderdeel", klaar: producten.some((p) => p.actief), paneel: producten.length ? "start" : "toevoegen" },
    { id: "prijzen", label: "Geen voorbeeldprijzen meer", klaar: producten.length > 0 && Object.values(waarschuwingen).every((w) => w.soort !== "voorbeeld"), paneel: "start" },
    { id: "web", label: "Op je website gezet", klaar: props.toolStatus === "GEPUBLICEERD", paneel: gast ? "account" : "website" },
  ];

  const geselecteerdProduct = paneel.startsWith("werkzaamheid:") ? producten.find((p) => p.id === paneel.slice(13)) : undefined;

  const paneelInhoud = (
    <div key={paneel} className="flex flex-col gap-4">
      {paneel !== "start" && (
        <button
          type="button"
          onClick={() => setPaneel("start")}
          className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-1 text-sm font-semibold text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Terug naar overzicht
        </button>
      )}
      {paneel === "start" && isAangepast && (
        <button
          type="button"
          onClick={() => setPaneel("aangepast")}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-example bg-example/15 px-3 py-2 text-left text-sm font-semibold text-foreground"
        >
          Deze rekentool is op maat gebouwd (Aangepast)
          <span className="underline">Bekijken</span>
        </button>
      )}
      {paneel === "start" && (
        <PaneelStart
          werkzaamheden={producten.map((p) => ({ id: p.id, naam: p.naam, actief: p.actief, heeftVoorbeeld: waarschuwingen[`werkzaamheid:${p.id}`]?.soort === "voorbeeld" }))}
          checklist={checklist}
          onKies={(id) => setPaneel(`werkzaamheid:${id}`)}
          onVerplaats={verplaats}
          onZichtbaar={zetZichtbaar}
          onToevoegen={() => setPaneel("toevoegen")}
          onChecklistKlik={(p) => setPaneel(p)}
        />
      )}
      {geselecteerdProduct && (
        <WerkzaamheidPaneel
          key={geselecteerdProduct.id}
          toolId={toolId}
          product={geselecteerdProduct}
          onPreview={updateProduct}
          onStatus={setOpslag}
          onVerwijder={() => setVerwijderProduct(geselecteerdProduct.id)}
          onGekopieerd={nieuwToegevoegd}
        />
      )}
      {paneel.startsWith("werkzaamheid:") && !geselecteerdProduct && <p className="text-sm text-muted-foreground">Laden…</p>}
      {paneel === "toevoegen" && (
        <PaneelToevoegen
          toolId={toolId}
          stapEenheid={tarieven.arbeidStapEenheid}
          anderen={anderen}
          bestaandeNamen={producten.map((p) => p.naam)}
          onToegevoegd={nieuwToegevoegd}
        />
      )}
      {paneel === "uiterlijk" && (gast ? gast.uiterlijkPaneel : <PaneelUiterlijk toolId={toolId} branding={branding} tier={tier} email={email} />)}
      {paneel === "resultaat" && !gast && <PaneelResultaat toolId={toolId} start={resultaat} onStatus={setOpslag} onWijzig={setResultaat} />}
      {paneel === "aanvraag" && !gast && <PaneelAanvraag toolId={toolId} start={aanvraag} onStatus={setOpslag} onWijzig={setAanvraag} />}
      {gast && (paneel === "resultaat" || paneel === "aanvraag") && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-bold text-foreground">{paneel === "resultaat" ? "Resultaat" : "Aanvraagformulier"}</h2>
          <p className="text-sm text-muted-foreground">Maak een gratis account om dit te gebruiken.</p>
          <Button type="button" className="h-11 w-fit" onClick={() => setPaneel("account")}>
            Account maken
          </Button>
        </div>
      )}
      {paneel === "account" && gast && gast.accountPaneel}
      {paneel === "website" && !gast && (
        <PaneelWebsite
          toolId={toolId}
          toolNaam={naam}
          status={props.toolStatus}
          toolUrl={website.toolUrl}
          embedCode={website.embedCode}
          iframeCode={website.iframeCode ?? null}
          heeftContact={website.heeftContact ?? false}
          embedConfig={website.embedConfig}
          magEmbedden={website.magEmbedden}
          magPubliceren={website.magPubliceren}
          limiet={website.limiet}
        />
      )}
      {paneel === "aangepast" && <PaneelAangepast toolId={toolId} onOmgezet={() => window.location.assign(`/dashboard/tools/${toolId}`)} />}
    </div>
  );

  const nietOpgeslagen = opslag.status === "fout" || opslag.ongeldig;

  return (
    <div className={cn("flex min-h-[32rem] flex-col", gast ? "h-dvh" : "-mx-4 -my-6 h-[calc(100dvh-4rem)] md:-mx-8 md:-my-8")}>
      {gast && (
        <div role="status" className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-accent px-4 py-2 text-sm text-foreground">
          <p className="min-w-0 flex-1">
            Je voorbeeld staat alleen in deze browser en verdwijnt als je je browsergegevens wist. Maak een gratis account om hem te bewaren.
          </p>
          <Button type="button" className="h-11 shrink-0" onClick={() => setPaneel("account")}>
            Account maken
          </Button>
        </div>
      )}
      {gast?.opslagMelding && (
        <p role="status" className="shrink-0 bg-example/15 px-4 py-2 text-sm text-foreground">
          {gast.opslagMelding}
        </p>
      )}
      {gast?.logoMislukt && (
        <p className="shrink-0 bg-example/15 px-4 py-2 text-sm text-foreground">
          We konden je logo niet ophalen. Je kunt het zelf toevoegen:{" "}
          <button type="button" onClick={() => setPaneel("uiterlijk")} className="font-semibold underline">
            Logo toevoegen
          </button>
        </p>
      )}
      {/* Bovenbalk */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:gap-3 sm:px-4">
        <Link
          href={gast ? "/" : "/dashboard/tools"}
          onClick={(e) => {
            if (nietOpgeslagen) {
              e.preventDefault();
              setWeggaan(true);
            }
          }}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-semibold text-foreground hover:bg-secondary"
          aria-label={gast ? "Naar de homepage van Kostenplan" : "Terug naar Rekentools"}
        >
          {gast ? <Logo className="h-7 w-7 rounded-md p-1" /> : <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          <span className="hidden sm:inline">{gast ? "Kostenplan" : "Rekentools"}</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold text-foreground sm:flex-none sm:max-w-[16rem]">{naam}</h1>
        <Badge variant={props.toolStatus === "GEPUBLICEERD" ? "success" : "muted"} className={cn("hidden shrink-0", !gast && "sm:inline-flex")}>
          {props.toolStatus === "GEPUBLICEERD" ? "Live" : props.toolStatus === "GEPAUZEERD" ? "Gepauzeerd" : "Concept"}
        </Badge>
        <div aria-live="polite" className="ml-auto min-w-0 shrink-0 text-xs sm:ml-0 sm:flex-1 sm:text-sm">
          <OpslaanStatus
            status={volgordeBezig && opslag.status === "klaar" ? "opslaan" : opslag.status}
            ongeldig={opslag.ongeldig}
            fout={opslag.fout}
            onOpnieuw={opslag.opnieuw}
          />
          {props.publicatie && (
            <PublicatieStatusLabel toolId={toolId} begin={props.publicatie} opgeslagenTeller={opgeslagenTeller} />
          )}
        </div>

        <div role="group" aria-label="Weergave" className="hidden shrink-0 rounded-lg border border-border p-0.5 md:flex">
          {(["bewerken", "uitproberen"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modus === m}
              onClick={() => setModus(m)}
              className={cn(
                "h-9 cursor-pointer rounded-md px-3 text-sm font-semibold",
                modus === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
              )}
            >
              {m === "bewerken" ? "Bewerken" : "Uitproberen"}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Schermgrootte" className="hidden shrink-0 rounded-lg border border-border p-0.5 lg:flex">
          {([["desktop", Monitor, "Computer"], ["mobiel", Smartphone, "Telefoon"]] as const).map(([k, Icoon, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={apparaat === k}
              aria-label={label}
              onClick={() => setApparaat(k)}
              className={cn("flex h-9 w-9 cursor-pointer items-center justify-center rounded-md", apparaat === k ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary")}
            >
              <Icoon className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="hidden md:block">
          <DropdownMenu ariaLabel="Meer acties voor deze rekentool" items={menu} className="h-11 w-11" />
        </div>
        <div className="md:hidden">
          <DropdownMenu ariaLabel="Meer acties voor deze rekentool" items={mobielMenu} className="h-11 w-11" />
        </div>
        <Button type="button" className="hidden h-11 shrink-0 md:inline-flex" onClick={() => setPaneel(gast ? "account" : "website")}>
          <Globe className="h-4 w-4" aria-hidden="true" /> Zet op mijn website
        </Button>
        {gast && (
          <Link href="/login" className="hidden h-11 shrink-0 items-center rounded-md px-3 text-sm font-semibold text-foreground hover:bg-secondary md:inline-flex">
            Inloggen
          </Link>
        )}
      </header>

      {melding && (
        <p role="alert" className="flex items-center justify-between gap-2 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
          {melding}
          <button type="button" aria-label="Melding sluiten" onClick={() => setMelding(null)} className="flex h-9 w-9 cursor-pointer items-center justify-center">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Canvas */}
        <div
          style={isMobiel && sheetOpen && modus === "bewerken" ? { paddingBottom: "62dvh" } : undefined}
          className={cn("relative min-w-0 flex-1 bg-muted", apparaat === "mobiel" && !isMobiel && "flex justify-center p-4")}
        >
          <iframe
            ref={iframeRef}
            title={`Voorbeeld van ${naam}`}
            src={props.voorbeeldUrl ?? `/voorbeeld/${toolId}`}
            className={cn(
              "h-full border-0 bg-white",
              apparaat === "mobiel" && !isMobiel ? "w-[390px] max-w-full rounded-2xl border border-border shadow-lg" : "w-full"
            )}
          />
        </div>

        {/* Paneel (desktop) */}
        {!isMobiel && modus === "bewerken" && (
          <aside aria-label="Aanpassen" className="hidden w-[400px] shrink-0 overflow-y-auto overscroll-contain border-l border-border bg-background p-4 md:block">
            {paneelInhoud}
          </aside>
        )}
        {!isMobiel && modus === "uitproberen" && (
          <aside aria-label="Testmodus" className="hidden w-[280px] shrink-0 border-l border-border bg-background p-4 md:block">
            <h2 className="font-bold text-foreground">Je probeert je rekentool uit</h2>
            <p className="mt-1 text-sm text-muted-foreground">Zo ziet je klant het. Testmodus: er wordt geen aanvraag verstuurd.</p>
            <Button type="button" variant="outline" className="mt-3 h-11" onClick={() => setModus("bewerken")}>
              {gast ? "Prijzen aanpassen" : "Terug naar bewerken"}
            </Button>
          </aside>
        )}
      </div>

      {isMobiel && modus === "bewerken" && !sheetOpen && (
        <div className="shrink-0 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" className="h-11 w-full" onClick={() => setSheetOpen(true)}>
            Checklist en onderdelen
          </Button>
        </div>
      )}

      {/* Bottom sheet (mobiel) */}
      {isMobiel && modus === "bewerken" && (
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} titel={PANEEL_TITEL(paneel, producten)} className="h-[62dvh]">
          {paneelInhoud}
        </BottomSheet>
      )}
      {isMobiel && modus === "uitproberen" && (
        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-center text-sm font-medium text-foreground">Testmodus: er wordt geen aanvraag verstuurd.</p>
          {gast && (
            <Button type="button" className="h-11 w-full" onClick={() => setModus("bewerken")}>
              Prijzen aanpassen
            </Button>
          )}
        </div>
      )}

      {/* Dialogen */}
      <Overlay open={hernoemOpen} onClose={() => setHernoemOpen(false)} ariaLabelledBy="hernoem-titel" className="flex items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void hernoem();
          }}
          className="relative flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-lg"
        >
          <h2 id="hernoem-titel" className="text-lg font-bold text-foreground">
            Naam wijzigen
          </h2>
          <label htmlFor="hernoem-naam" className="text-sm font-semibold text-foreground">
            Naam van je rekentool
          </label>
          <Input id="hernoem-naam" value={hernoemTekst} maxLength={80} onChange={(e) => setHernoemTekst(e.target.value)} aria-invalid={hernoemFout ? true : undefined} />
          {hernoemFout && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {hernoemFout}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setHernoemOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" className="h-11" disabled={bezig}>
              Opslaan
            </Button>
          </div>
        </form>
      </Overlay>
      <ConfirmDialog
        open={verwijderTool}
        onClose={() => setVerwijderTool(false)}
        onConfirm={() => void verwijderRekentool()}
        pending={bezig}
        title={`“${naam}” verwijderen?`}
        description="De link en de code op je website werken daarna niet meer. Je leads blijven bewaard. Je kunt dit direct ongedaan maken."
      />
      <ConfirmDialog
        open={verwijderProduct !== null}
        onClose={() => setVerwijderProduct(null)}
        onConfirm={() => void verwijderWerkzaamheid()}
        pending={bezig}
        title="Onderdeel verwijderen?"
        description="Het onderdeel verdwijnt uit je rekentool. Dit kun je niet ongedaan maken."
      />
      <ConfirmDialog
        open={weggaan}
        onClose={() => setWeggaan(false)}
        onConfirm={() => router.push("/dashboard/tools")}
        title="Niet alles is opgeslagen"
        description={opslag.fout ? `Opslaan is niet gelukt: ${opslag.fout}` : "Een paar velden zijn nog niet goed ingevuld, daardoor zijn je laatste wijzigingen niet opgeslagen."}
        confirmLabel="Toch weggaan"
        cancelLabel="Blijven"
      />
    </div>
  );
}
