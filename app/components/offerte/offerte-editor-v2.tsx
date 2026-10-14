"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Download, FilePlus2, Loader2, Plus, TriangleAlert } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { KopActie, KopInstellen } from "@/app/components/mobile/mobiele-kop";
import { MobieleSheet } from "@/app/components/mobile/mobiele-sheet";
import { SegmentedControl } from "@/app/components/mobile/segmented-control";
import { StickyActiebalk } from "@/app/components/mobile/sticky-actiebalk";
import { useIsMobiel } from "@/app/components/mobile/use-mobiel";
import { FactuurBeheerPaneel, type BeheerData } from "@/app/components/factuur/factuur-beheer";
import { HERINNERING_LABEL, type HerinneringStap } from "@/app/lib/factuur/betaling";
import type { BerichtSoort } from "@/app/lib/factuur/berichten";
import { bewaarFactuurAction, laadFactuurConceptAction } from "@/app/lib/actions/facturen-bewerken";
import { controleerFactuur } from "@/app/lib/factuur/controle";
import type { FactuurInhoud } from "@/app/lib/factuur/model";
import { factuurStatusKop } from "@/app/lib/factuur/status-kop";
import { normaliseerFactuur, voegMeerwerkToe } from "@/app/lib/factuur/maak";
import { FactuurMetaPaneel } from "@/app/components/factuur/factuur-paneel";
import { bevestigVerstuurdAction, bewaarOfferteAction, laadOfferteConceptAction, nieuweVersieAction, slaStandaardRegelOpAction, verwijderStandaardRegelAction, type StandaardRegelDto } from "@/app/lib/actions/offerte-v2";
import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { controleerOfferte, type ControlePunt } from "@/app/lib/offerte/controle";
import type { RegelSoort } from "@/app/lib/offerte/btw-config";
import type { OfferteInhoud, OfferteRegel } from "@/app/lib/offerte/model";
import { OFFERTE_V2_STATUS_LABEL, type HerinneringReden } from "@/app/lib/offerte/status";
import { formatCents, formatDatum } from "@/app/lib/offerte/weergave";
import * as w from "@/app/lib/offerte/wijzig";
import { DeelDialoog, type DeelOps } from "./deel-dialoog";
import { bevestigFactuurVerstuurdAction, definitiefMakenAction, maakFactuurDeelklaarAction, volgendFactuurnummerAction } from "@/app/lib/actions/facturen-versturen";
import { OfferteDocument, type Selectie } from "./offerte-document";
import { BetalingPaneel, KlantPaneel, MetaPaneel, PlanningPaneel, RegelPaneel, SectiePaneel, TekstPaneel, VoorwaardenPaneel, type Wijzig } from "./offerte-paneel";
import { VelSchaal } from "./vel-schaal";
import type { FactuurStatus, OfferteV2Status } from "@/app/generated/prisma/client";
import { datumKortTijd, datumLang, datumNumeriek } from "@/app/lib/datum";
import { meervoud } from "@/app/lib/meervoud";

type Props = {
  offerteId: string;
  // Stand van het opgeslagen concept (optimistic locking): elke opslag stuurt die mee.
  revisie: number;
  status: OfferteV2Status;
  vergrendeld: boolean;
  begin: OfferteInhoud;
  versies: { versie: number; vergrendeld: boolean; verstuurdOp: string | null }[];
  standaardRegels: StandaardRegelDto[];
  btwStandaard: Partial<Record<RegelSoort, number>> | null;
  // De huidige versie is als PDF klaargezet om te delen, maar nog niet als verstuurd gemarkeerd.
  deelklaar?: boolean;
  startHerinnering?: boolean;
  // Factuur: opent meteen de herinneringsdialoog voor deze stap (vanuit "Stuur een herinnering" bij de lead).
  startFactuurHerinnering?: HerinneringStap | null;
  herinnering?: HerinneringReden | null;
  activiteit?: { id: string; soort: string; tekst: string | null; op: string }[];
  heeftGetekend?: boolean;
  // De optionele regels die de klant bij het akkoord koos (zie geldend.ts); zonder akkoord telt er geen mee.
  gekozenOptioneel?: string[];
  // Factuur in plaats van offerte: dezelfde editor, het document en de panelen, met factuurspecifieke velden.
  factuur?: { id: string; status: FactuurStatus; verstuurdOp?: string | null; terug: string; beheer?: BeheerData };
};

const ACTIVITEIT_LABEL: Record<string, string> = {
  VERZONDEN: "Als verstuurd gemarkeerd",
  BEKEKEN: "Door de klant bekeken",
  VRAAG: "Vraag van de klant",
  AFGEWEZEN: "Afgewezen door de klant",
  AKKOORD: "Akkoord van de klant",
  INGETROKKEN: "Ingetrokken",
  HERINNERING: "Herinnering verstuurd",
};

type Opslag = "klaar" | "wijzigingen" | "opslaan" | "fout";

const PANEEL_TITEL: Record<Selectie["soort"], string> = {
  afzender: "Jouw gegevens",
  klant: "Klant en projectadres",
  meta: "Nummer en datums",
  onderwerp: "Onderwerp",
  intro: "Introductie",
  sectie: "Sectie",
  regel: "Regel",
  totaal: "Totaal",
  betaling: "Betaling",
  planning: "Planning",
  voorwaarden: "Voorwaarden",
  herroeping: "Voorwaarden en herroepingsrecht",
  slot: "Slottekst",
};

// Buitenste laag: laat de editor opnieuw opbouwen met de verse serverdata nadat de
// verzend-bevestiging is gesloten (zolang die open staat mag er niets verdwijnen).
export function OfferteEditorV2(props: Props) {
  const [opnieuw, setOpnieuw] = useState(0);
  return <OfferteEditorBinnen key={`${props.offerteId}-${props.begin.versie}-${opnieuw}`} {...props} naVerzenden={() => setOpnieuw((n) => n + 1)} />;
}

const GEEN_KEUZE: string[] = [];

function OfferteEditorBinnen({ offerteId, revisie: beginRevisie, status, vergrendeld, begin, versies, standaardRegels: startStandaard, btwStandaard, deelklaar = false, startHerinnering = false, startFactuurHerinnering = null, herinnering = null, activiteit = [], heeftGetekend = false, gekozenOptioneel = GEEN_KEUZE, factuur: factuurCfg, naVerzenden }: Props & { naVerzenden: () => void }) {
  const router = useRouter();
  const isMobiel = useIsMobiel();
  const [inhoud, setInhoud] = useState<OfferteInhoud>(begin);
  // Na "Definitief maken" levert de server een nieuwe stand (nummer, definitieve inhoud): die overnemen,
  // zodat kop, titel en watermerk meteen kloppen zonder het openstaande deel-dialoogvenster te sluiten.
  const [vorigeFactuurStatus, setVorigeFactuurStatus] = useState(factuurCfg?.status);
  if (factuurCfg && factuurCfg.status !== vorigeFactuurStatus) {
    setVorigeFactuurStatus(factuurCfg.status);
    setInhoud(begin);
  }
  const [selectie, setSelectie] = useState<Selectie | null>(null);
  const [opslag, setOpslag] = useState<Opslag>("klaar");
  const [opslagFout, setOpslagFout] = useState<string | null>(null);
  const [standaardRegels, setStandaardRegels] = useState(startStandaard);
  const client = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [deelModus, setDeelModus] = useState<"offerte" | "herinnering">(startHerinnering ? "herinnering" : "offerte");
  const [controleOpen, setControleOpen] = useState(startHerinnering || Boolean(startFactuurHerinnering));
  const [mobielModus, setMobielModus] = useState<"bewerken" | "voorbeeld">("bewerken");
  const [sheet, setSheet] = useState<null | "klant" | "meta" | "onderdelen" | "voorwaarden" | "betaling" | "teksten">(null);
  const [regelSheet, setRegelSheet] = useState<{ sectieId: string; regelId: string } | null>(null);
  const [sectieSheet, setSectieSheet] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [pasVerstuurd, setPasVerstuurd] = useState(false);

  const isFactuur = Boolean(factuurCfg);
  const alleenLezen = isFactuur ? factuurCfg!.status !== "CONCEPT" : vergrendeld || status === "GEACCEPTEERD";
  const laatste = useRef(inhoud);
  const eerste = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wijzig: Wijzig = useCallback((fn) => {
    // Factuur: een stelpost waarvan de hoeveelheid of prijs is ingevuld, is niet langer "te bepalen".
    setInhoud((i) => (isFactuur ? normaliseerFactuur(i as FactuurInhoud, fn(i) as FactuurInhoud) : fn(i)));
    setOpslag("wijzigingen");
  }, [isFactuur]);

  // ── Opslaan ──
  // Eén opslag tegelijk (de revisie van de vorige is nodig voor de volgende); fouten (ook "offline") worden
  // opgevangen: status "Niet opgeslagen" met "Opnieuw proberen", automatisch opnieuw bij `online` en met
  // oplopende wachttijd. Wijzigingen blijven in de editor en als vangnet in sessionStorage tot ze bevestigd zijn.
  const revisieRef = useRef(beginRevisie);
  const bezig = useRef(false);
  const wachtOpnieuw = useRef(false);
  const conflictRef = useRef(false);
  const pogingen = useRef(0);
  const herpoging = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [conflict, setConflict] = useState(false);
  const [laadt, setLaadt] = useState(false);
  const backupSleutel = `kp-concept:${factuurCfg ? "f" : "o"}:${factuurCfg?.id ?? offerteId}`;
  const wisBackup = useCallback(() => {
    try {
      sessionStorage.removeItem(backupSleutel);
    } catch {}
  }, [backupSleutel]);

  const bewaarRef = useRef<() => Promise<void>>(async () => {});
  const plannHerpoging = useCallback(() => {
    if (herpoging.current) clearTimeout(herpoging.current);
    const wacht = Math.min(30000, 2000 * 2 ** pogingen.current);
    pogingen.current += 1;
    herpoging.current = setTimeout(() => void bewaarRef.current(), wacht);
  }, []);
  const bewaar = useCallback(async () => {
    if (conflictRef.current) return;
    if (bezig.current) {
      wachtOpnieuw.current = true;
      return;
    }
    bezig.current = true;
    try {
      do {
        wachtOpnieuw.current = false;
        const verstuurd = laatste.current;
        setOpslag("opslaan");
        let r: Awaited<ReturnType<typeof bewaarOfferteAction>>;
        try {
          r = factuurCfg ? await bewaarFactuurAction(factuurCfg.id, verstuurd, revisieRef.current) : await bewaarOfferteAction(offerteId, verstuurd, revisieRef.current);
        } catch {
          setOpslag("fout");
          setOpslagFout("Geen verbinding. Je wijzigingen staan nog in dit scherm.");
          plannHerpoging();
          return;
        }
        if (r.ok) {
          revisieRef.current = r.revisie;
          pogingen.current = 0;
          setOpslagFout(null);
          if (laatste.current === verstuurd) {
            setOpslag("klaar");
            wisBackup();
          } else setOpslag("wijzigingen");
        } else if (r.conflict) {
          conflictRef.current = true;
          setConflict(true);
          setOpslag("fout");
          setOpslagFout(r.error);
          return;
        } else {
          setOpslag("fout");
          setOpslagFout(r.error);
          return;
        }
      } while (wachtOpnieuw.current);
    } finally {
      bezig.current = false;
    }
  }, [offerteId, factuurCfg, plannHerpoging, wisBackup]);
  useEffect(() => {
    bewaarRef.current = bewaar;
  }, [bewaar]);

  async function laadNieuwste() {
    setLaadt(true);
    try {
      const r = factuurCfg ? await laadFactuurConceptAction(factuurCfg.id) : await laadOfferteConceptAction(offerteId);
      if (!r.ok) {
        setMelding(r.error);
        return;
      }
      revisieRef.current = r.revisie;
      conflictRef.current = false;
      setConflict(false);
      laatste.current = r.inhoud;
      eerste.current = true; // de geladen stand is al opgeslagen: niet opnieuw bewaren
      setInhoud(r.inhoud);
      setOpslag("klaar");
      setOpslagFout(null);
      wisBackup();
    } catch {
      setMelding("Laden is niet gelukt. Controleer je verbinding en probeer het opnieuw.");
    } finally {
      setLaadt(false);
    }
  }

  const opslagRef = useRef(opslag);
  useEffect(() => {
    opslagRef.current = opslag;
  }, [opslag]);
  // Terug online: meteen opnieuw proberen.
  useEffect(() => {
    const f = () => {
      if (!conflictRef.current && opslagRef.current !== "klaar") void bewaarRef.current();
    };
    window.addEventListener("online", f);
    return () => window.removeEventListener("online", f);
  }, []);
  useEffect(
    () => () => {
      if (herpoging.current) clearTimeout(herpoging.current);
    },
    []
  );

  // Vangnet: niet-bevestigde wijzigingen overleven een verversing van de pagina.
  const hersteld = useRef(false);
  useEffect(() => {
    if (hersteld.current) return;
    hersteld.current = true;
    try {
      const ruw = sessionStorage.getItem(backupSleutel);
      if (!ruw) return;
      const b = JSON.parse(ruw) as { inhoud: OfferteInhoud; revisie: number };
      if (JSON.stringify(b.inhoud) === JSON.stringify(begin)) return wisBackup();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage bestaat alleen in de browser: herstellen kan pas na het mounten
      setInhoud(b.inhoud);
      setOpslag("wijzigingen");
      if (b.revisie !== beginRevisie) {
        conflictRef.current = true;
        setConflict(true);
      }
    } catch {}
  }, [backupSleutel, begin, beginRevisie, wisBackup]);

  useEffect(() => {
    laatste.current = inhoud;
    if (eerste.current) {
      eerste.current = false;
      return;
    }
    if (alleenLezen) return;
    try {
      sessionStorage.setItem(backupSleutel, JSON.stringify({ inhoud, revisie: revisieRef.current }));
    } catch {}
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void bewaar(), 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [inhoud, alleenLezen, bewaar, backupSleutel]);

  // Waarschuwing bij verlaten met niet-opgeslagen wijzigingen.
  useEffect(() => {
    if (opslag === "klaar") return;
    const f = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [opslag]);

  const totalen = useMemo(() => berekenTotalen(inhoud, gekozenOptioneel), [inhoud, gekozenOptioneel]);
  const controle: { blokkerend: { id: string; bericht: string; actie?: ControlePunt["actie"]; href?: string }[]; waarschuwingen: { id: string; bericht: string; actie?: ControlePunt["actie"]; href?: string }[] } = useMemo(
    () => (isFactuur ? controleerFactuur(inhoud as FactuurInhoud) : controleerOfferte(inhoud)),
    [inhoud, isFactuur]
  );
  const eind = totalen.toonIncl || totalen.kor ? totalen.totaalIncl : totalen.totaalExcl;
  const aantalProblemen = controle.blokkerend.length;

  const slaStandaardOp = useCallback(async (r: OfferteRegel) => {
    const res = await slaStandaardRegelOpAction({ omschrijving: r.omschrijving, eenheid: r.eenheid, prijsCenten: r.prijsCenten, btw: r.btw, soort: r.soort });
    if (res.ok) {
      setStandaardRegels((l) => [res.regel, ...l]);
      setMelding("Opgeslagen als standaardregel. Je vindt hem terug bij elke sectie.");
    } else setMelding(res.error);
  }, []);
  const verwijderStandaard = useCallback(async (id: string) => {
    await verwijderStandaardRegelAction(id);
    setStandaardRegels((l) => l.filter((x) => x.id !== id));
  }, []);

  // De pagina pas verversen als de bevestiging is gesloten, anders verdwijnt die meteen.
  function openDelen(modus: "offerte" | "herinnering") {
    setDeelModus(modus);
    setControleOpen(true);
  }

  async function markeerVerstuurd() {
    const r = await bevestigVerstuurdAction(offerteId, "link");
    if (r.ok) naVerzenden();
    else setMelding(r.error);
  }

  function sluitControle() {
    setControleOpen(false);
    if (pasVerstuurd) naVerzenden();
  }

  async function nieuweVersie() {
    const r = await nieuweVersieAction(offerteId);
    if (r.ok) router.refresh();
    else setMelding(r.error);
  }

  function gaNaar(actie: NonNullable<ControlePunt["actie"]>) {
    if (actie === "klant") {
      if (isMobiel) setSheet("klant");
      else setSelectie({ soort: "klant" });
    } else if (actie === "meta") {
      if (isMobiel) setSheet("meta");
      else setSelectie({ soort: "meta" });
    } else if (actie === "regels") {
      if (isMobiel) setSheet("onderdelen");
      else setSelectie(null);
    }
  }

  // Factuur: eerst definitief maken (controle, nummer, vastleggen), daarna delen; een definitieve factuur gaat direct naar het delen.
  const [verwachtNummer, setVerwachtNummer] = useState<string | null>(null);
  const [nieuwNummer, setNieuwNummer] = useState<string | null>(null);
  const [berichtSoort, setBerichtSoort] = useState<BerichtSoort>(startFactuurHerinnering ?? "factuur");
  const stuurHerinnering = (stap: HerinneringStap) => {
    setBerichtSoort(stap);
    openDelen("offerte");
  };
  const isHerinnering = berichtSoort !== "factuur" && berichtSoort !== "creditnota";
  useEffect(() => {
    if (!factuurCfg || factuurCfg.status !== "CONCEPT" || !controleOpen) return;
    let weg = false;
    void volgendFactuurnummerAction(factuurCfg.id).then((n) => !weg && setVerwachtNummer(n));
    return () => {
      weg = true;
    };
  }, [factuurCfg, controleOpen]);
  const fSoort = isFactuur ? (inhoud as FactuurInhoud).factuur.soort : "factuur";
  const woord = fSoort === "creditnota" ? "creditnota" : "factuur";
  const factuurOps: DeelOps | undefined = factuurCfg
    ? {
        startStap: factuurCfg.status === "CONCEPT" ? "controle" : "delen",
        controle: { blokkerend: controle.blokkerend, waarschuwingen: controle.waarschuwingen, ok: [] },
        controleTitel: `${woord === "creditnota" ? "Creditnota" : "Factuur"} definitief maken`,
        controleToelichting: `Na definitief maken krijgt deze ${woord} ${verwachtNummer ? `nummer ${verwachtNummer}` : "een nummer"} en kun je hem niet meer wijzigen. Correcties gaan via een creditnota.`,
        controleKnop: "Definitief maken",
        terugKnop: "Terug naar de factuur",
        naControle: async () => {
          const r = await definitiefMakenAction(factuurCfg.id);
          if (r.ok) {
            setPasVerstuurd(true);
            setNieuwNummer(r.nummer);
            router.refresh(); // kop, nummer en titel meteen bijwerken (geen concept-watermerk meer)
          }
          return r.ok ? { ok: true } : { ok: false, error: r.error };
        },
        titelDelen: isHerinnering ? `${HERINNERING_LABEL[berichtSoort as HerinneringStap].replace(" sturen", "").replace(" (14 dagen)", "")} voor factuur ${(inhoud as FactuurInhoud).factuur.nummer} versturen` : `${woord === "creditnota" ? "Creditnota" : "Factuur"} ${(inhoud as FactuurInhoud).factuur.nummer ?? nieuwNummer ?? ""} van ${formatCents(Math.abs(totalen.totaalIncl))} versturen`.replace("  ", " "),
        maakKlaar: () => maakFactuurDeelklaarAction(factuurCfg.id, berichtSoort),
        bevestig: (kanaal) => bevestigFactuurVerstuurdAction(factuurCfg.id, kanaal, berichtSoort),
        woord: isHerinnering ? "herinnering" : woord,
        vraag: `Is de ${isHerinnering ? "herinnering" : woord} verstuurd?`,
        verstuurdTitel: isHerinnering ? "Herinnering is vastgelegd in de tijdlijn" : `${woord === "creditnota" ? "Creditnota" : "Factuur"} staat op Verstuurd`,
        verstuurdTekst: `Verstuurd op ${datumLang(new Date())}. Je ziet in de tijdlijn wanneer de klant de ${woord} bekijkt. Registreer een betaling zodra het geld binnen is.`,
        neeTekst: `De ${woord} is niet als verstuurd gemarkeerd. Je kunt hem later opnieuw delen via Versturen.`,
        wachtTekst: `Even geduld, de ${woord} wordt klaargezet…`,
      }
    : undefined;

  const statusBlok = (
    <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {alleenLezen && isFactuur ? null : alleenLezen ? (
        <>
          <Check className="h-4 w-4 text-primary" aria-hidden="true" /> Verstuurd
        </>
      ) : opslag === "fout" ? (
        <>
          <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
          <span className="text-destructive">Niet opgeslagen</span>
          <button type="button" className="font-semibold underline" onClick={() => void bewaar()}>
            Opnieuw proberen
          </button>
        </>
      ) : opslag === "klaar" ? (
        <>
          <Check className="h-4 w-4 text-primary" aria-hidden="true" /> Alles opgeslagen
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opslaan…
        </>
      )}
    </span>
  );

  const conflictBanner = conflict && !alleenLezen && (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-foreground">
      <span>
        Deze {isFactuur ? "factuur" : "offerte"} is in een ander tabblad of door iemand anders gewijzigd. Laad de nieuwste versie. Je eigen wijziging staat nog in beeld tot je dat doet.
      </span>
      <Button type="button" size="sm" onClick={() => void laadNieuwste()} disabled={laadt}>
        {laadt ? "Laden…" : "Nieuwste versie laden"}
      </Button>
    </div>
  );
  const banner = alleenLezen && isFactuur && (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent px-4 py-2.5 text-sm text-foreground">
      <span>Deze factuur is definitief en kan niet meer worden gewijzigd. Correcties gaan via een creditnota.</span>
    </div>
  );
  const beheerPaneel = alleenLezen && isFactuur && factuurCfg?.beheer && (
    <FactuurBeheerPaneel data={factuurCfg.beheer} onHerinnering={stuurHerinnering} />
  );
  const offerteBanner = alleenLezen && !isFactuur && (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent px-4 py-2.5 text-sm text-foreground">
      <span>
        {status === "GEACCEPTEERD"
          ? "Deze offerte is geaccepteerd en definitief vergrendeld."
          : `Versie ${inhoud.versie} is verstuurd en kan niet meer worden gewijzigd.`}
      </span>
      {status !== "GEACCEPTEERD" && (
        <Button type="button" size="sm" onClick={() => void nieuweVersie()}>
          <FilePlus2 className="h-4 w-4" aria-hidden="true" /> Nieuwe versie maken
        </Button>
      )}
    </div>
  );
  const toonKlaar = !isFactuur && deelklaar && !alleenLezen && inhoud === begin;
  const klaarBanner = toonKlaar && (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent px-4 py-2.5 text-sm text-foreground">
      <span>De PDF staat klaar om te delen, maar de offerte is nog niet als verstuurd gemarkeerd.</span>
      <span className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => openDelen("offerte")}>Opnieuw delen</Button>
        <Button type="button" size="sm" onClick={() => void markeerVerstuurd()}>Markeer als verstuurd</Button>
      </span>
    </div>
  );
  const herinneringBanner = !isFactuur && alleenLezen && herinnering && status !== "GEACCEPTEERD" && (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-warning/10 px-4 py-2.5 text-sm text-foreground">
      <span>{herinnering === "verloopt-binnenkort" ? "Deze offerte verloopt binnenkort." : "De klant heeft al een week niet gereageerd."}</span>
      <Button type="button" size="sm" onClick={() => openDelen("herinnering")}>Herinnering sturen</Button>
    </div>
  );
  const activiteitLijst = activiteit.length > 0 && (
    <div>
      <h3 className="mb-1 font-bold text-foreground">Activiteit</h3>
      <ul className="flex flex-col gap-1 text-muted-foreground">
        {activiteit.map((a) => (
          <li key={a.id}>
            <span className="text-foreground">{ACTIVITEIT_LABEL[a.soort] ?? a.soort}</span> · {datumKortTijd(a.op)}
            {a.tekst ? <span className="block whitespace-pre-wrap">“{a.tekst}”</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
  const getekendLink = heeftGetekend && (
    <a href={`/api/offertes/${offerteId}/pdf?getekend=1`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline">
      <Download className="h-4 w-4" aria-hidden="true" /> Getekende PDF
    </a>
  );
  const fouttekst = opslagFout && opslag === "fout" && !conflict ? <p role="alert" className="px-4 py-2 text-sm font-medium text-destructive">{opslagFout}</p> : null;

  const paneelInhoud = (sel: Selectie | null) => {
    if (!sel) {
      return (
        <div className="flex flex-col gap-4 text-sm">
          <p className="rounded-lg bg-accent px-3 py-2.5 text-foreground">Klik op een deel van de {isFactuur ? "factuur" : "offerte"} om het aan te passen. Wijzigingen worden automatisch opgeslagen.</p>
          <div>
            <h3 className="mb-2 font-bold text-foreground">{isFactuur ? "Voor je definitief maakt" : "Voor je verstuurt"}</h3>
            {controle.blokkerend.length === 0 && controle.waarschuwingen.length === 0 ? (
              <p className="text-muted-foreground">{isFactuur ? "Alles klopt. Je kunt de factuur definitief maken." : "Alles klopt. Je kunt de offerte controleren en versturen."}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {controle.blokkerend.map((p) => (
                  <li key={p.id} className="flex gap-2 text-foreground">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    <span>
                      {p.bericht}
                      {p.href ? (
                        <>
                          {" "}
                          <Link href={p.href} className="font-semibold underline">
                            Aanpassen
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
                {controle.waarschuwingen.map((p) => (
                  <li key={p.id} className="flex gap-2 text-foreground">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    <span>
                      {p.bericht}
                      {p.href ? (
                        <>
                          {" "}
                          <Link href={p.href} className="font-semibold underline">
                            Aanpassen
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!isFactuur && inhoud.bron?.totaalRekentoolInclCenten ? (
            <p className="text-muted-foreground">
              In de rekentool zag de klant {formatCents(inhoud.bron.totaalRekentoolInclCenten)} incl. btw. Deze offerte: {formatCents(totalen.totaalIncl)}.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { const r = w.voegSectieToe(inhoud); wijzig(() => r.inhoud); setSelectie({ soort: "sectie", id: r.id }); }}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Sectie toevoegen
            </Button>
            {isFactuur && (
              <Button type="button" variant="outline" size="sm" onClick={() => { const r = voegMeerwerkToe(inhoud as FactuurInhoud, { omschrijving: "", aantal: 1, eenheid: "post", prijsCenten: 0, btw: 21 }); const sectie = r.secties.find((s) => s.titel === "Meerwerk")!; const regel = sectie.regels[sectie.regels.length - 1]; wijzig(() => r); setSelectie({ soort: "regel", id: regel.id, sectieId: sectie.id }); }}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Meerwerk toevoegen
              </Button>
            )}
          </div>
          {getekendLink}
          {activiteitLijst}
          {!isFactuur && versies.length > 1 && (
            <div>
              <h3 className="mb-1 font-bold text-foreground">Versies</h3>
              <ul className="text-muted-foreground">
                {versies.map((v) => (
                  <li key={v.versie}>
                    Versie {v.versie}: {v.vergrendeld ? `verstuurd${v.verstuurdOp ? ` op ${datumNumeriek(v.verstuurdOp)}` : ""}` : "concept"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    switch (sel.soort) {
      case "afzender":
        return (
          <p className="text-sm text-foreground">
            Je bedrijfsgegevens, logo en voorwaarden komen uit je profiel en worden bij het versturen bijgewerkt.{" "}
            <Link href="/dashboard/profiel/bedrijfsgegevens" className="font-semibold underline">
              Aanpassen bij Bedrijfsgegevens
            </Link>
          </p>
        );
      case "klant":
        return <KlantPaneel inhoud={inhoud} wijzig={wijzig} />;
      case "meta":
        return isFactuur ? <FactuurMetaPaneel inhoud={inhoud as FactuurInhoud} wijzig={wijzig} /> : <MetaPaneel inhoud={inhoud} wijzig={wijzig} />;
      case "onderwerp":
        return <TekstPaneel inhoud={inhoud} wijzig={wijzig} veld="onderwerp" />;
      case "intro":
        return <TekstPaneel inhoud={inhoud} wijzig={wijzig} veld="introductie" />;
      case "slot":
        return <TekstPaneel inhoud={inhoud} wijzig={wijzig} veld="slottekst" />;
      case "sectie":
        return sel.id ? <SectiePaneel inhoud={inhoud} sectieId={sel.id} wijzig={wijzig} standaardRegels={standaardRegels} onVerwijderStandaard={verwijderStandaard} onSelect={(s) => (isMobiel ? (s.soort === "regel" && s.id && s.sectieId ? setRegelSheet({ sectieId: s.sectieId, regelId: s.id }) : null) : setSelectie(s))} btwStandaard={btwStandaard} /> : null;
      case "regel":
        return sel.id && sel.sectieId ? <RegelPaneel inhoud={inhoud} sectieId={sel.sectieId} regelId={sel.id} wijzig={wijzig} standaardRegels={standaardRegels} onSlaStandaardOp={slaStandaardOp} onKlaar={(s) => (isMobiel ? (s ? setRegelSheet(s.soort === "regel" && s.id && s.sectieId ? { sectieId: s.sectieId, regelId: s.id } : null) : setRegelSheet(null)) : setSelectie(s))} /> : null;
      case "betaling":
        return isFactuur ? null : <BetalingPaneel inhoud={inhoud} wijzig={wijzig} />;
      case "planning":
        return isFactuur ? null : <PlanningPaneel inhoud={inhoud} wijzig={wijzig} />;
      case "voorwaarden":
      case "herroeping":
        return isFactuur ? null : <VoorwaardenPaneel inhoud={inhoud} wijzig={wijzig} toonHerroeping={inhoud.klant.type === "particulier"} />;
      case "totaal":
        return (
          <div className="flex flex-col gap-2 text-sm text-foreground">
            <p>
              Totaal excl. btw: <strong>{formatCents(totalen.totaalExcl)}</strong>
            </p>
            {totalen.btwGroepen.map((g) => (
              <p key={g.tarief}>
                Btw {g.tarief}% over {formatCents(g.grondslag)}: <strong>{formatCents(g.btw)}</strong>
              </p>
            ))}
            <p>
              Totaal incl. btw: <strong>{formatCents(totalen.totaalIncl)}</strong>
            </p>
            <p className="text-muted-foreground">De bedragen worden per regel afgerond op centen; de btw staat per tarief. Pas prijzen aan bij de regels.</p>
          </div>
        );
    }
  };

  const doc = (
    <OfferteDocument
      gekozenOptioneel={gekozenOptioneel}
      inhoud={inhoud}
      bewerk={
        alleenLezen
          ? undefined
          : {
              selectie,
              onSelect: (s) => (isMobiel ? undefined : setSelectie(s)),
              onRegel: (sid, rid, patch) => wijzig((i) => w.wijzigRegel(i, sid, rid, patch)),
              onSectieTitel: (sid, titel) => wijzig((i) => w.wijzigSectieTitel(i, sid, titel)),
              onTekst: (veld, waarde) => wijzig((i) => ({ ...i, [veld]: waarde })),
            }
      }
    />
  );

  const factuurKop = factuurCfg ? factuurStatusKop({ status: factuurCfg.status, verstuurdOp: factuurCfg.verstuurdOp, dagenTeLaat: factuurCfg.beheer?.dagenTeLaat }) : null;
  const statusBadge = factuurKop ? <Badge variant={factuurKop.toon === "goed" ? "success" : factuurKop.toon === "let-op" ? "warning" : "muted"}>{factuurKop.tekst}</Badge> : <Badge variant={status === "GEACCEPTEERD" ? "success" : "muted"}>{OFFERTE_V2_STATUS_LABEL[status]}</Badge>;
  // Mobiel staat er geen badge naast de titel: de echte status komt dan in de kopbalk.
  const statusBlokMobiel =
    alleenLezen && factuurKop ? (
      <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {factuurKop.toon === "goed" ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : <TriangleAlert className="h-4 w-4 text-warning" aria-hidden="true" />}
        {factuurKop.tekst}
      </span>
    ) : (
      statusBlok
    );
  const pdfHref = factuurCfg ? `/api/facturen/${factuurCfg.id}/pdf` : heeftGetekend ? `/api/offertes/${offerteId}/pdf?getekend=1` : `/api/offertes/${offerteId}/pdf?versie=${inhoud.versie}`;
  const titelTekst = isFactuur ? `${(inhoud as FactuurInhoud).factuur.soort === "creditnota" ? "Creditnota" : "Factuur"} ${(inhoud as FactuurInhoud).factuur.nummer ?? "(concept)"}` : `Offerte ${inhoud.nummer}`;
  const terug = factuurCfg?.terug ?? "/dashboard/leads";

  // ── Mobiel ──
  if (isMobiel) {
    const klantSamenvatting = [inhoud.klant.naam, inhoud.klant.adres.plaats].filter(Boolean).join(" · ") || "Nog niet ingevuld";
    const aantalRegels = inhoud.secties.reduce((n, s) => n + s.regels.length, 0);
    const rij = (titel: string, samenvatting: string, onClick: () => void, waarschuwing?: boolean) => (
      <li className="border-b border-border last:border-b-0">
        <button type="button" onClick={onClick} className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-foreground">{titel}</span>
            <span className={`block truncate text-sm ${waarschuwing ? "font-medium text-destructive" : "text-muted-foreground"}`}>{samenvatting}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </li>
    );
    return (
      <div className="flex flex-col gap-4 pb-28 md:hidden">
        <KopInstellen titel={titelTekst} terug={terug} />
        <KopActie>{statusBlokMobiel}</KopActie>
        {conflictBanner}
        {banner}
        {beheerPaneel}
        {offerteBanner}
        {klaarBanner}
        {herinneringBanner}
        {fouttekst}
        <SegmentedControl label="Weergave" waarde={mobielModus} onChange={setMobielModus} opties={[{ waarde: "bewerken", label: "Bewerken" }, { waarde: "voorbeeld", label: "Voorbeeld" }]} />
        {mobielModus === "voorbeeld" ? (
          <div className="-mx-4 overflow-x-hidden bg-muted p-3">
            <VelSchaal marge={0}>
              <OfferteDocument inhoud={inhoud} gekozenOptioneel={gekozenOptioneel} />
            </VelSchaal>
          </div>
        ) : (
          <>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {rij("Klant", klantSamenvatting, () => setSheet("klant"), controle.blokkerend.some((p) => p.id === "klant"))}
              {rij("Onderdelen", `${meervoud(inhoud.secties.length, "sectie", "secties")} · ${meervoud(aantalRegels, "regel", "regels")} · ${formatCents(eind)}`, () => setSheet("onderdelen"), controle.blokkerend.some((p) => p.id === "nulregels" || p.id === "geenregels"))}
              {rij("Onderwerp en teksten", inhoud.onderwerp || "Nog geen onderwerp", () => setSheet("teksten"))}
              {!isFactuur && rij("Voorwaarden", `${inhoud.voorwaarden.length} voorwaarden${inhoud.klant.type === "particulier" && inhoud.herroeping.aan ? " · herroepingsrecht" : ""}`, () => setSheet("voorwaarden"))}
              {!isFactuur && rij("Betaling en planning", inhoud.betaaltermijnen.map((t) => `${t.percentage}%`).join(" / ") + (inhoud.planning.startweek ? " · start gepland" : ""), () => setSheet("betaling"))}
              {isFactuur
                ? rij("Datums en btw", `Vervalt ${formatDatum((inhoud as FactuurInhoud).factuur.vervaldatum)}${(inhoud as FactuurInhoud).factuur.btwModus === "verlegd" ? " · btw verlegd" : ""}`, () => setSheet("meta"), controle.blokkerend.some((p) => ["datum", "uitvoering", "uitvoering-periode", "vervaldatum", "verlegd-btwid", "verlegd-klant"].includes(p.id)))
                : rij("Nummer en datums", `Geldig tot ${formatDatum(inhoud.geldigTot)}`, () => setSheet("meta"), controle.blokkerend.some((p) => p.id === "geldig"))}
            </ul>
            {melding && <p role="status" className="rounded-lg bg-accent px-3 py-2 text-sm text-foreground">{melding}</p>}
            {(activiteit.length > 0 || heeftGetekend) && <div className="flex flex-col gap-3 text-sm">{getekendLink}{activiteitLijst}</div>}
            <a href={pdfHref} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-semibold text-foreground">
              <Download className="h-5 w-5" aria-hidden="true" /> PDF bekijken
            </a>
          </>
        )}

        <StickyActiebalk>
          <div className="min-w-0 flex-1">
            <span className="block text-sm text-muted-foreground">Totaal {totalen.toonIncl || totalen.kor ? "incl. btw" : "excl. btw"}</span>
            <span className="block text-lg font-bold tabular-nums text-foreground">{formatCents(eind)}</span>
          </div>
          {alleenLezen ? (
            isFactuur ? (
              <Button type="button" size="lg" onClick={() => openDelen("offerte")}>
                Versturen
              </Button>
            ) : status === "GEACCEPTEERD" ? null : (
              <Button type="button" size="lg" onClick={() => void nieuweVersie()}>
                Nieuwe versie
              </Button>
            )
          ) : (
            <Button type="button" size="lg" onClick={() => openDelen("offerte")}>
              {isFactuur ? "Definitief maken" : "Versturen"}{aantalProblemen > 0 ? ` (${aantalProblemen})` : ""}
            </Button>
          )}
        </StickyActiebalk>

        <MobieleSheet open={sheet === "klant"} onClose={() => setSheet(null)} titel="Klant en projectadres" beginStand="volledig">
          <KlantPaneel inhoud={inhoud} wijzig={wijzig} />
        </MobieleSheet>
        <MobieleSheet open={sheet === "meta"} onClose={() => setSheet(null)} titel={isFactuur ? "Datums, btw en betaling" : "Nummer en datums"} beginStand={isFactuur ? "volledig" : "half"}>
          {isFactuur ? <FactuurMetaPaneel inhoud={inhoud as FactuurInhoud} wijzig={wijzig} /> : <MetaPaneel inhoud={inhoud} wijzig={wijzig} />}
        </MobieleSheet>
        <MobieleSheet open={sheet === "teksten"} onClose={() => setSheet(null)} titel="Onderwerp en teksten" beginStand="volledig">
          <div className="flex flex-col gap-4">
            <TekstPaneel inhoud={inhoud} wijzig={wijzig} veld="onderwerp" />
            <TekstPaneel inhoud={inhoud} wijzig={wijzig} veld="introductie" />
            <TekstPaneel inhoud={inhoud} wijzig={wijzig} veld="slottekst" />
          </div>
        </MobieleSheet>
        <MobieleSheet open={sheet === "voorwaarden"} onClose={() => setSheet(null)} titel="Voorwaarden" beginStand="volledig">
          <VoorwaardenPaneel inhoud={inhoud} wijzig={wijzig} toonHerroeping={inhoud.klant.type === "particulier"} />
        </MobieleSheet>
        <MobieleSheet open={sheet === "betaling"} onClose={() => setSheet(null)} titel="Betaling en planning" beginStand="volledig">
          <div className="flex flex-col gap-6">
            <BetalingPaneel inhoud={inhoud} wijzig={wijzig} />
            <PlanningPaneel inhoud={inhoud} wijzig={wijzig} />
          </div>
        </MobieleSheet>
        <MobieleSheet open={sheet === "onderdelen"} onClose={() => setSheet(null)} titel="Onderdelen" beginStand="volledig">
          <div className="flex flex-col gap-4">
            {inhoud.secties.map((s) => (
              <section key={s.id} className="rounded-xl border border-border">
                <button type="button" onClick={() => setSectieSheet(s.id)} className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 border-b border-border px-3 text-left font-bold text-foreground">
                  <span className="min-w-0 truncate">{s.titel || "Zonder titel"}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
                <ul>
                  {s.regels.map((r) => (
                    <li key={r.id} className="border-b border-border last:border-b-0">
                      <button type="button" onClick={() => setRegelSheet({ sectieId: s.id, regelId: r.id })} className="flex min-h-14 w-full cursor-pointer items-center gap-2 px-3 py-2 text-left">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{r.omschrijving || "Zonder omschrijving"}</span>
                          <span className="block text-xs text-muted-foreground">
                            {r.type === "tekst" ? "Tekstregel" : `${r.aantal} ${r.eenheid} × ${formatCents(r.prijsCenten)}${r.type === "stelpost" ? " · stelpost" : r.type === "optioneel" ? " · optioneel" : ""}`}
                          </span>
                        </span>
                        {r.type !== "tekst" && <span className="text-sm font-semibold tabular-nums text-foreground">{formatCents(totalen.regels[r.id]?.excl ?? 0)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="p-2">
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => { const r = w.nieuweRegel("materiaal", btwStandaard); wijzig((i) => w.voegRegelToe(i, s.id, r)); setRegelSheet({ sectieId: s.id, regelId: r.id }); }}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Regel toevoegen
                  </Button>
                </div>
              </section>
            ))}
            <Button type="button" variant="outline" onClick={() => { const r = w.voegSectieToe(inhoud); wijzig(() => r.inhoud); setSectieSheet(r.id); }}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Sectie toevoegen
            </Button>
          </div>
        </MobieleSheet>
        <MobieleSheet open={regelSheet !== null} onClose={() => setRegelSheet(null)} titel="Regel bewerken" beginStand="volledig">
          {regelSheet && <RegelPaneel inhoud={inhoud} sectieId={regelSheet.sectieId} regelId={regelSheet.regelId} wijzig={wijzig} standaardRegels={standaardRegels} onSlaStandaardOp={slaStandaardOp} onKlaar={(s) => setRegelSheet(s && s.soort === "regel" && s.id && s.sectieId ? { sectieId: s.sectieId, regelId: s.id } : null)} />}
        </MobieleSheet>
        <MobieleSheet open={sectieSheet !== null} onClose={() => setSectieSheet(null)} titel="Sectie" beginStand="volledig">
          {sectieSheet && <SectiePaneel inhoud={inhoud} sectieId={sectieSheet} wijzig={wijzig} standaardRegels={standaardRegels} onVerwijderStandaard={verwijderStandaard} onSelect={(s) => (s.soort === "regel" && s.id && s.sectieId ? setRegelSheet({ sectieId: s.sectieId, regelId: s.id }) : setSectieSheet(s.id ?? null))} btwStandaard={btwStandaard} />}
        </MobieleSheet>

        <DeelDialoog modus={deelModus} open={client && controleOpen} onSluit={sluitControle} offerteId={offerteId} inhoud={inhoud} onGaNaar={gaNaar} onVerstuurd={() => setPasVerstuurd(true)} ops={factuurOps} />
      </div>
    );
  }

  // ── Desktop ──
  return (
    <div className="-mx-4 -my-6 hidden h-[calc(100dvh-4rem)] min-h-[32rem] flex-col md:-mx-8 md:-my-8 md:flex">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Link href={terug} className="flex h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-foreground hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {isFactuur ? "Terug" : "Leads"}
        </Link>
        <h1 className="min-w-0 truncate text-base font-bold text-foreground">{titelTekst}</h1>
        {statusBadge}
        {!isFactuur && inhoud.versie > 1 && <span className="text-sm text-muted-foreground">versie {inhoud.versie}</span>}
        <div className="ml-auto flex items-center gap-3">
          {statusBlok}
          {(!isFactuur || alleenLezen) && (
            <a href={pdfHref} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-secondary">
              <Download className="h-4 w-4" aria-hidden="true" /> PDF
            </a>
          )}
          {!alleenLezen && (
            <Button type="button" onClick={() => openDelen("offerte")}>
              {isFactuur ? "Definitief maken" : "Versturen"}{aantalProblemen > 0 ? ` (${aantalProblemen})` : ""}
            </Button>
          )}
          {isFactuur && alleenLezen && (
            <Button type="button" onClick={() => openDelen("offerte")}>
              Versturen
            </Button>
          )}
        </div>
      </header>
      {conflictBanner}
      {banner}
      {beheerPaneel}
      {offerteBanner}
      {klaarBanner}
      {herinneringBanner}
      {fouttekst}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto bg-muted p-6" tabIndex={0} role="region" aria-label="Voorbeeld van het document" onClick={(e) => { if (e.target === e.currentTarget) setSelectie(null); }}>
          <VelSchaal marge={24}>{doc}</VelSchaal>
        </div>
        <aside aria-label="Aanpassen" className="w-[400px] shrink-0 overflow-y-auto overscroll-contain border-l border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-foreground">{selectie ? PANEEL_TITEL[selectie.soort] : isFactuur ? "Factuur" : "Offerte"}</h2>
            {selectie && (
              <button type="button" className="min-h-9 text-sm font-semibold underline" onClick={() => setSelectie(null)}>
                Sluiten
              </button>
            )}
          </div>
          {melding && <p role="status" className="mb-3 rounded-lg bg-accent px-3 py-2 text-sm text-foreground">{melding}</p>}
          {alleenLezen ? <div className="flex flex-col gap-4 text-sm"><p className="text-muted-foreground">{isFactuur ? "Deze factuur is definitief. Betalingen en creditnota’s beheer je bovenaan de pagina." : "Deze versie is verstuurd. Maak een nieuwe versie om te wijzigen."}</p>{getekendLink}{activiteitLijst}</div> : paneelInhoud(selectie)}
        </aside>
      </div>
      <DeelDialoog modus={deelModus} open={client && controleOpen} onSluit={sluitControle} offerteId={offerteId} inhoud={inhoud} onGaNaar={gaNaar} onVerstuurd={() => setPasVerstuurd(true)} ops={factuurOps} />
    </div>
  );
}
