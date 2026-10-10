"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RekentoolEditor, type EditorProps } from "@/app/dashboard/tools/[toolId]/editor/rekentool-editor";
import { RepositoryProvider } from "@/app/dashboard/tools/[toolId]/editor/repository";
import { TarievenProvider } from "@/app/dashboard/tools/[toolId]/tarieven-context";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input, Textarea } from "@/app/components/ui/input";
import { RegisterForm } from "@/app/(auth)/registreren/register-form";
import { draftOpslag, maakGedebounced, type OpslagStatus } from "@/app/lib/draft-opslag";
import { draftNaarBranding, draftNaarKosten, draftNaarProducten, GAST_TOOL_ID } from "@/app/lib/draft-editor";
import { verkleinLogo } from "@/app/lib/logo-verklein";
import type { Draft } from "@/app/lib/draft";
import { IMPORT_PAD } from "./importeren-pad";
import { maakLokaleRepository } from "./lokale-repository";

const OPSLAG_MELDING = "Je voorbeeld kan in deze browser niet bewaard worden. Het blijft staan zolang je dit tabblad open houdt. Maak een gratis account om hem te bewaren.";
const LOGO_WEGGELATEN_MELDING = "Je logo is te groot om in deze browser te bewaren en is weggelaten. Maak een gratis account om alles te bewaren.";

const geenAbonnement = () => () => {};
function useIsClient() {
  return useSyncExternalStore(geenAbonnement, () => true, () => false);
}

// Het scherm /probeer/editor: dezelfde RekentoolEditor als voor ingelogde
// hoveniers, maar met een lokale opslagplaats. Er gaat niets over het netwerk.
export function GastEditor() {
  const client = useIsClient();
  if (!client) return <p className="p-6 text-sm text-muted-foreground">Even laden…</p>;
  return <GastEditorBinnen />;
}

function GastEditorBinnen() {
  const router = useRouter();
  const [begin] = useState(() => draftOpslag().lees());
  const [logoMislukt] = useState(() => new URLSearchParams(window.location.search).get("logo") === "mislukt");
  useEffect(() => {
    if (!begin.draft) router.replace("/probeer");
  }, [begin.draft, router]);
  if (!begin.draft) return <p className="p-6 text-sm text-muted-foreground">Even laden…</p>;
  return <GastEditorMetDraft beginDraft={begin.draft} beginGeheugen={begin.opslag === "geheugen"} logoMislukt={logoMislukt} />;
}

function GastEditorMetDraft({ beginDraft, beginGeheugen, logoMislukt }: { beginDraft: Draft; beginGeheugen: boolean; logoMislukt: boolean }) {
  const [winkel] = useState(() => {
    let d = beginDraft;
    return { huidig: () => d, zet: (fn: (x: Draft) => Draft) => (d = fn(d)), debounced: maakGedebounced(draftOpslag()) };
  });
  const debounced = winkel.debounced;
  const [status, setStatus] = useState<OpslagStatus>({ soort: beginGeheugen ? "geheugen" : "ok" });
  const [branding, setBranding] = useState(() => draftNaarBranding(beginDraft));
  const [bedrijfsnaam, setBedrijfsnaam] = useState(beginDraft.company.name);
  const [producten] = useState(() => draftNaarProducten(beginDraft));
  const [kosten] = useState(() => draftNaarKosten(beginDraft));

  const wijzig = useCallback(
    (fn: (d: Draft) => Draft) => {
      debounced.plan(winkel.zet(fn), setStatus);
    },
    [debounced, winkel]
  );
  // Bij het verlaten van het scherm meteen wegschrijven wat nog wacht.
  useEffect(() => {
    const nu = () => debounced.nu();
    window.addEventListener("pagehide", nu);
    return () => {
      window.removeEventListener("pagehide", nu);
      debounced.nu();
    };
  }, [debounced]);

  const repo = useMemo(() => maakLokaleRepository({ huidig: winkel.huidig, wijzig }), [wijzig, winkel]);

  const wijzigBedrijf = useCallback(
    (fn: (c: Draft["company"]) => Draft["company"]) => {
      wijzig((d) => ({ ...d, company: fn(d.company) }));
      setBranding(draftNaarBranding(winkel.huidig()));
      setBedrijfsnaam(winkel.huidig().company.name);
    },
    [wijzig, winkel]
  );

  const props: EditorProps = {
    toolId: GAST_TOOL_ID,
    toolNaam: beginDraft.calculator.name,
    toolStatus: "CONCEPT",
    isAangepast: false,
    products: producten,
    branding,
    tier: "GRATIS",
    email: "",
    resultaat: { arbeidZichtbaar: true, materiaalZichtbaar: true, transportZichtbaar: true, voorrijZichtbaar: true, toelichting: "", ctaTekst: "" },
    aanvraag: { vraagTelefoon: false, bedankTekst: branding.bedankTekst ?? "" },
    website: { toolUrl: "", embedCode: null, embedConfig: {} as EditorProps["website"]["embedConfig"], magEmbedden: false, magPubliceren: false, limiet: 1 },
    anderen: [],
    magNieuweTool: false,
    startPaneel: "start",
    voorbeeldUrl: "/probeer/voorbeeld",
    gast: {
      logoMislukt: logoMislukt && !branding.logoUrl,
      opslagMelding: status.soort === "geheugen" ? OPSLAG_MELDING : status.soort === "logo-weggelaten" ? LOGO_WEGGELATEN_MELDING : null,
      bedrijfsnaam,
      accountPaneel: <AccountPaneel />,
      uiterlijkPaneel: <UiterlijkPaneel bedrijf={beginDraft.company} onWijzig={wijzigBedrijf} />,
    },
  };

  return (
    <RepositoryProvider value={repo}>
      <TarievenProvider toolId={GAST_TOOL_ID} costSettings={kosten}>
        <RekentoolEditor {...props} />
      </TarievenProvider>
    </RepositoryProvider>
  );
}

function UiterlijkPaneel({ bedrijf, onWijzig }: { bedrijf: Draft["company"]; onWijzig: (fn: (c: Draft["company"]) => Draft["company"]) => void }) {
  const [naam, setNaam] = useState(bedrijf.name);
  const [kleur, setKleur] = useState(bedrijf.colors.primair);
  const [titel, setTitel] = useState(bedrijf.titel ?? "");
  const [welkomst, setWelkomst] = useState(bedrijf.welkomst ?? "");
  const [logo, setLogo] = useState(bedrijf.logoDataUrl ?? null);
  const [fout, setFout] = useState<string | null>(null);

  async function kiesLogo(bestand: File | undefined) {
    if (!bestand) return;
    setFout(null);
    const r = await verkleinLogo(bestand);
    if (!r.ok) return setFout(r.error);
    setLogo(r.dataUrl);
    onWijzig((c) => ({ ...c, logoDataUrl: r.dataUrl }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Uiterlijk</h2>
        <p className="text-sm text-muted-foreground">Je logo, kleur en teksten. Je ziet meteen wat je klant ziet.</p>
      </div>
      <Field label="Bedrijfsnaam" htmlFor="gast-naam">
        <Input
          id="gast-naam"
          value={naam}
          maxLength={80}
          onChange={(e) => {
            setNaam(e.target.value);
            onWijzig((c) => ({ ...c, name: e.target.value }));
          }}
        />
      </Field>
      <Field label="Logo" htmlFor="gast-logo" hint="Png, jpg, webp of svg. Wij maken hem automatisch klein genoeg." error={fout ?? undefined}>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Je huidige logo" className="h-16 w-auto max-w-full self-start rounded-md border border-border bg-white object-contain p-1" />
        )}
        <input
          id="gast-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => void kiesLogo(e.target.files?.[0])}
          className="min-h-11 w-full cursor-pointer rounded-md border border-input bg-background p-2 text-base"
        />
        {logo && (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-fit"
            onClick={() => {
              setLogo(null);
              onWijzig((c) => ({ ...c, logoDataUrl: undefined }));
            }}
          >
            Logo verwijderen
          </Button>
        )}
      </Field>
      <Field label="Kleur" htmlFor="gast-kleur">
        <input
          id="gast-kleur"
          type="color"
          value={kleur}
          onChange={(e) => {
            setKleur(e.target.value);
            onWijzig((c) => ({ ...c, colors: { ...c.colors, primair: e.target.value } }));
          }}
          className="h-11 w-24 cursor-pointer rounded-md border border-input bg-background p-1"
        />
      </Field>
      <Field label="Kop boven je rekentool" htmlFor="gast-titel">
        <Input
          id="gast-titel"
          value={titel}
          maxLength={120}
          onChange={(e) => {
            setTitel(e.target.value);
            onWijzig((c) => ({ ...c, titel: e.target.value || undefined }));
          }}
        />
      </Field>
      <Field label="Welkomsttekst" htmlFor="gast-welkomst">
        <Textarea
          id="gast-welkomst"
          value={welkomst}
          maxLength={500}
          rows={3}
          onChange={(e) => {
            setWelkomst(e.target.value);
            onWijzig((c) => ({ ...c, welkomst: e.target.value || undefined }));
          }}
        />
      </Field>
    </div>
  );
}

// "Account maken": Google of e-mail, precies zoals de gewone registratie. Het
// voorbeeld blijft in de browser staan en wordt na het inloggen overgenomen
// op /probeer/importeren.
function AccountPaneel() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Zet op mijn website</h2>
        <p className="text-sm text-muted-foreground">
          Maak een gratis account om je rekentool te bewaren en op je website te zetten. Alles wat je hier hebt ingesteld nemen we mee.
        </p>
      </div>
      <RegisterForm volgende={IMPORT_PAD} />
      <p className="text-center text-sm text-muted-foreground">
        Heb je al een account?{" "}
        <Link href={`/login?next=${encodeURIComponent(IMPORT_PAD)}`} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
