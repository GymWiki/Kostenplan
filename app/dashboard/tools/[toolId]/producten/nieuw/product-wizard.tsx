"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { DecimalInput, Input, Label } from "@/app/components/ui/input";
import { SjabloonPicker } from "../velden/sjabloon-picker";
import { VeldenRenderer, VeldInputEnkel } from "../velden/veld-form";
import { OverrideVeld, KostenUitsplitsing } from "../velden/kosten-blok";
import {
  createProductDraftAction,
  updateProductDraftAction,
  type CreateProductDraftState,
  type ProductFormState,
} from "@/app/lib/actions/products";
import { updateMaterialOptionAction } from "@/app/lib/actions/material-options";
import { arbeidTariefVoorStapEenheid, type MateriaalRegel } from "@/app/lib/calculate";
import {
  berekenHoeveelheidVoorSjabloon,
  coerceVeldWaarden,
  hoeveelheidUitResultaat,
  instelVeldenVoorSjabloon,
  klantVeldenVoorSjabloon,
  parseGetal,
  standaardConfigVoorSjabloon,
  standaardKlantInvoerVoorSjabloon,
  vasteEenheidVoorSjabloon,
} from "@/app/lib/sjablonen";
import { arbeidEenheidEnkelvoud } from "@/app/lib/arbeid";
import { unitLabel } from "@/app/lib/units";
import type { ArbeidStapEenheid, ProductSjabloon } from "@/app/generated/prisma/client";

const STAPPEN = [
  { nummer: 1, titel: "Wat voor werk is dit?" },
  { nummer: 2, titel: "Hoe reken je dit af?" },
  { nummer: 3, titel: "Wat kost het?" },
  { nummer: 4, titel: "Klaar" },
] as const;

export type WizardPricingSettings = {
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTariefUur: number;
  arbeidTariefDagdeel: number;
  arbeidTariefDag: number;
  transportTarief: number;
  voorrijTarief: number;
};

// Strikte 4-stappen wizard voor een nieuw product — na stap 3 is het product
// al bruikbaar in de calculator. Toeslagen en materiaalkeuzes staan hier
// bewust niet in; die stel je pas in bij het volledige bewerkscherm. Elke
// stap slaat meteen op (createProductDraftAction / updateProductDraftAction,
// geen redirect) zodat er nooit onopgeslagen werk verloren kan gaan.
export function ProductWizard({
  toolId,
  pricingSettings,
}: {
  toolId: string;
  pricingSettings: WizardPricingSettings;
}) {
  const [stap, setStap] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const [productId, setProductId] = useState<string | null>(null);
  const [materiaalOptieId, setMateriaalOptieId] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [sjabloon, setSjabloon] = useState<ProductSjabloon>("ENKELE_HOEVEELHEID");
  const [sjabloonConfigRaw, setSjabloonConfigRaw] = useState<Record<string, unknown>>({});
  const [voorbeeldInvoer, setVoorbeeldInvoer] = useState<Record<string, unknown>>({});

  const companyArbeidTarief = arbeidTariefVoorStapEenheid(pricingSettings, pricingSettings.arbeidStapEenheid);
  const [materiaalPrijs, setMateriaalPrijs] = useState("0");
  const [productiviteit, setProductiviteit] = useState("");
  const [arbeidTarief, setArbeidTarief] = useState(String(companyArbeidTarief));
  const [arbeidWijktAf, setArbeidWijktAf] = useState(false);
  const [transportBedrag, setTransportBedrag] = useState(String(pricingSettings.transportTarief));
  const [transportWijktAf, setTransportWijktAf] = useState(false);
  const [transportMeeschalend, setTransportMeeschalend] = useState(false);
  const [voorrijBedrag, setVoorrijBedrag] = useState(String(pricingSettings.voorrijTarief));
  const [voorrijWijktAf, setVoorrijWijktAf] = useState(false);
  const [voorrijMeeschalend, setVoorrijMeeschalend] = useState(false);

  const instelVelden = instelVeldenVoorSjabloon(sjabloon);
  const sjabloonConfig = coerceVeldWaarden(instelVelden, sjabloonConfigRaw);
  const vasteEenheid = vasteEenheidVoorSjabloon(sjabloon, sjabloonConfig);
  const eenheid = vasteEenheid ?? "m1";
  const isArtikelregels = sjabloon === "ARTIKELREGELS";
  const isEnkel = sjabloon === "ENKELE_HOEVEELHEID";
  const klantVelden = isEnkel ? [] : klantVeldenVoorSjabloon(sjabloon, sjabloonConfig);

  const voorbeeldHoeveelheid = isEnkel
    ? parseGetal(voorbeeldInvoer.hoeveelheid, 20)
    : hoeveelheidUitResultaat(
        berekenHoeveelheidVoorSjabloon(sjabloon, sjabloonConfig, coerceVeldWaarden(klantVelden, voorbeeldInvoer))
      );

  // De wizard maakt altijd precies 1 materiaalcategorie aan (zie stap 1) —
  // dus één regel, met de live-getypte prijs. Extra categorieën stel je pas
  // in het bewerkscherm in, waar het voorbeeld al zijn materiaalregels toont.
  const materiaalPrijsGetal = parseGetal(materiaalPrijs, 0);
  const materiaalRegels: MateriaalRegel[] = [
    {
      categorieId: "primair",
      categorieNaam: "Materiaal",
      optieId: materiaalOptieId ?? "",
      optieNaam: "Standaard",
      hoeveelheid: voorbeeldHoeveelheid,
      prijsPerEenheid: materiaalPrijsGetal,
      bedrag: voorbeeldHoeveelheid * materiaalPrijsGetal,
    },
  ];

  function bouwProductFormData() {
    const fd = new FormData();
    fd.set("naam", naam);
    fd.set("eenheid", eenheid);
    fd.set("sjabloon", sjabloon);
    fd.set("sjabloonConfig", JSON.stringify(sjabloonConfig));
    if (productiviteit.trim() !== "") fd.set("productiviteit", productiviteit);
    if (arbeidWijktAf) fd.set("arbeidTariefOverride", arbeidTarief);
    if (transportWijktAf) fd.set("transportkostenOverride", transportBedrag);
    if (transportMeeschalend) fd.set("transportMeeschalend", "on");
    if (voorrijWijktAf) fd.set("voorrijkostenOverride", voorrijBedrag);
    if (voorrijMeeschalend) fd.set("voorrijMeeschalend", "on");
    fd.set("actief", "on");
    return fd;
  }

  function eersteFoutmelding(result: ProductFormState | CreateProductDraftState) {
    return result?.error ?? (result?.fieldErrors ? Object.values(result.fieldErrors)[0] : undefined);
  }

  function volgendeVanuitStap1() {
    if (naam.trim() === "") {
      setError("Vul een naam in.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await createProductDraftAction(toolId, null, bouwProductFormData());
      const foutmelding = eersteFoutmelding(result);
      if (foutmelding) {
        setError(foutmelding);
        return;
      }
      if (result?.productId) {
        setProductId(result.productId);
        setMateriaalOptieId(result.materiaalOptieId ?? null);
        setStap(2);
      }
    });
  }

  function opslaanEnNaarStap(volgendeStap: number) {
    if (!productId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await updateProductDraftAction(productId, null, bouwProductFormData());
      const foutmelding = eersteFoutmelding(result);
      if (foutmelding) {
        setError(foutmelding);
        return;
      }

      if (materiaalOptieId && !isArtikelregels) {
        const materiaalFd = new FormData();
        materiaalFd.set("naam", "Standaard");
        materiaalFd.set("prijsType", "VAST");
        materiaalFd.set("prijs", materiaalPrijs);
        materiaalFd.set("actief", "on");
        const materiaalResult = await updateMaterialOptionAction(materiaalOptieId, null, materiaalFd);
        if (materiaalResult?.error) {
          setError(materiaalResult.error);
          return;
        }
      }

      setStap(volgendeStap);
    });
  }

  function handleKiesSjabloon(nieuw: ProductSjabloon) {
    if (nieuw === sjabloon) return;
    if (
      instelVeldenVoorSjabloon(sjabloon).length > 0 &&
      Object.keys(sjabloonConfigRaw).length > 0 &&
      !confirm("Wissel je van sjabloon? Je huidige instellingen hierboven gaan dan verloren.")
    ) {
      return;
    }
    const nieuweConfig = standaardConfigVoorSjabloon(nieuw);
    setSjabloon(nieuw);
    setSjabloonConfigRaw(nieuweConfig);
    setVoorbeeldInvoer(standaardKlantInvoerVoorSjabloon(nieuw, nieuweConfig));
  }

  return (
    <div className="flex flex-col gap-6">
      <StapIndicator huidigeStap={stap} />

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {stap === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wizard-naam">Naam van het product</Label>
            <Input
              id="wizard-naam"
              placeholder="Bijv. Terras aanleggen"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Alles hieronder (hoe je afrekent, de prijs) kun je later altijd aanpassen.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={volgendeVanuitStap1} disabled={pending}>
              {pending ? "Even geduld…" : "Volgende"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {stap === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Kies hoe de klant bij <strong>{naam}</strong> tot een hoeveelheid komt. Dit kun je
              later altijd aanpassen.
            </p>
          </div>
          <SjabloonPicker waarde={sjabloon} onKiesSjabloon={handleKiesSjabloon} />
          {instelVelden.length > 0 && (
            <VeldenRenderer
              velden={instelVelden}
              waarden={sjabloonConfigRaw}
              onChange={(key, waarde) => setSjabloonConfigRaw((prev) => ({ ...prev, [key]: waarde }))}
              idPrefix="wizard-instel"
            />
          )}
          <WizardNavigatie
            pending={pending}
            onTerug={() => setStap(1)}
            onVolgende={() => opslaanEnNaarStap(3)}
          />
        </div>
      )}

      {stap === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Voorbeeld
            </p>
            {isEnkel ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wizard-voorbeeld-hoeveelheid">Hoeveelheid ({unitLabel(eenheid)})</Label>
                <VeldInputEnkel
                  id="wizard-voorbeeld-hoeveelheid"
                  veld={{ key: "hoeveelheid", soort: "getal", label: "Hoeveelheid" }}
                  waarde={voorbeeldInvoer.hoeveelheid ?? "20"}
                  onChange={(w) => setVoorbeeldInvoer((prev) => ({ ...prev, hoeveelheid: w }))}
                />
              </div>
            ) : (
              klantVelden.length > 0 && (
                <VeldenRenderer
                  velden={klantVelden}
                  waarden={voorbeeldInvoer}
                  onChange={(key, waarde) => setVoorbeeldInvoer((prev) => ({ ...prev, [key]: waarde }))}
                  idPrefix="wizard-voorbeeld"
                />
              )
            )}
          </div>

          {isArtikelregels ? (
            <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              Bij Artikelregels stel je per artikeltype een eigen prijs in — dat deed je hierboven
              bij Hoeveelheid.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">1. Materiaalkosten</p>
                <Label htmlFor="wizard-materiaalprijs">Wat vraag je per {unitLabel(eenheid)}?</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                  </span>
                  <DecimalInput
                    id="wizard-materiaalprijs"
                    placeholder="Bijv. 28"
                    value={materiaalPrijs}
                    onChange={(e) => setMateriaalPrijs(e.target.value)}
                    className="pl-7"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Dit is wat je de klant rekent voor het materiaal — inclusief jouw marge.
                </p>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">2. Arbeidskosten</p>
                <OverrideVeld
                  titel="Tarief"
                  name="arbeidTariefOverride"
                  companyWaarde={companyArbeidTarief}
                  companyWaardeTekst={`per ${arbeidEenheidEnkelvoud(pricingSettings.arbeidStapEenheid)}`}
                  defaultOverrideValue={null}
                  instellingenHref={`/dashboard/tools/${toolId}/prijzen`}
                  waarde={arbeidTarief}
                  onWaardeChange={setArbeidTarief}
                  onWijktAfChange={setArbeidWijktAf}
                />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wizard-productiviteit">
                    Hoeveel {unitLabel(eenheid)} zet je per{" "}
                    {arbeidEenheidEnkelvoud(pricingSettings.arbeidStapEenheid)}?
                  </Label>
                  <DecimalInput
                    id="wizard-productiviteit"
                    placeholder="Bijv. 5"
                    value={productiviteit}
                    onChange={(e) => setProductiviteit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Laat leeg als dit product geen arbeidstijd kost.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">3. Transportkosten</p>
                <OverrideVeld
                  titel="Transportkosten"
                  name="transportkostenOverride"
                  companyWaarde={pricingSettings.transportTarief}
                  companyWaardeTekst="per project"
                  defaultOverrideValue={null}
                  instellingenHref={`/dashboard/tools/${toolId}/prijzen`}
                  waarde={transportBedrag}
                  onWaardeChange={setTransportBedrag}
                  onWijktAfChange={setTransportWijktAf}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={transportMeeschalend}
                    onChange={(e) => setTransportMeeschalend(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Schaalt mee met de hoeveelheid (in plaats van een vaste post per project)
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">4. Voorrijkosten</p>
                <OverrideVeld
                  titel="Voorrijkosten"
                  name="voorrijkostenOverride"
                  companyWaarde={pricingSettings.voorrijTarief}
                  companyWaardeTekst="per project"
                  defaultOverrideValue={null}
                  instellingenHref={`/dashboard/tools/${toolId}/prijzen`}
                  waarde={voorrijBedrag}
                  onWaardeChange={setVoorrijBedrag}
                  onWijktAfChange={setVoorrijWijktAf}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={voorrijMeeschalend}
                    onChange={(e) => setVoorrijMeeschalend(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Schaalt mee met de hoeveelheid (in plaats van een vaste post per project)
                </label>
              </div>

              <div className="border-t border-border pt-4">
                <KostenUitsplitsing
                  naam={naam}
                  hoeveelheid={voorbeeldHoeveelheid}
                  eenheid={eenheid}
                  materiaalRegels={materiaalRegels}
                  materiaalEnabled
                  productiviteit={parseGetal(productiviteit, 0) > 0 ? parseGetal(productiviteit, 0) : null}
                  arbeidTarief={parseGetal(arbeidTarief, 0)}
                  arbeidEnabled
                  arbeidAfronden={false}
                  transportBedrag={parseGetal(transportBedrag, 0)}
                  transportMeeschalend={transportMeeschalend}
                  transportEnabled
                  voorrijBedrag={parseGetal(voorrijBedrag, 0)}
                  voorrijMeeschalend={voorrijMeeschalend}
                  voorrijEnabled
                />
              </div>
            </>
          )}

          <WizardNavigatie
            pending={pending}
            onTerug={() => setStap(2)}
            onVolgende={() => opslaanEnNaarStap(4)}
            volgendeLabel="Opslaan en klaar"
          />
        </div>
      )}

      {stap === 4 && productId && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-foreground">{naam} staat live</p>
              <p className="text-sm text-muted-foreground">
                Klanten kunnen dit product nu al kiezen in je calculator.
              </p>
            </div>
          </div>

          {!isArtikelregels && (
            <KostenUitsplitsing
              naam={naam}
              hoeveelheid={voorbeeldHoeveelheid}
              eenheid={eenheid}
              materiaalRegels={materiaalRegels}
              materiaalEnabled
              productiviteit={parseGetal(productiviteit, 0) > 0 ? parseGetal(productiviteit, 0) : null}
              arbeidTarief={parseGetal(arbeidTarief, 0)}
              arbeidEnabled
              arbeidAfronden={false}
              transportBedrag={parseGetal(transportBedrag, 0)}
              transportMeeschalend={transportMeeschalend}
              transportEnabled
              voorrijBedrag={parseGetal(voorrijBedrag, 0)}
              voorrijMeeschalend={voorrijMeeschalend}
              voorrijEnabled
            />
          )}

          <p className="text-sm text-muted-foreground">
            Wil je nog toeslagen of extra materiaalkeuzes toevoegen? Dat kan in het bewerkscherm.
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <LinkButton href={`/dashboard/tools/${toolId}/producten`} variant="outline">
              Terug naar producten
            </LinkButton>
            <LinkButton href={`/dashboard/tools/${toolId}/producten/${productId}/bewerken`}>
              Naar bewerkscherm
            </LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardNavigatie({
  pending,
  onTerug,
  onVolgende,
  volgendeLabel = "Volgende",
}: {
  pending: boolean;
  onTerug: () => void;
  onVolgende: () => void;
  volgendeLabel?: string;
}) {
  return (
    <div className="flex justify-between gap-2">
      <Button type="button" variant="outline" onClick={onTerug} disabled={pending}>
        <ArrowLeft className="h-4 w-4" />
        Terug
      </Button>
      <Button type="button" onClick={onVolgende} disabled={pending}>
        {pending ? "Even geduld…" : volgendeLabel}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function StapIndicator({ huidigeStap }: { huidigeStap: number }) {
  return (
    <div className="flex items-center gap-2">
      {STAPPEN.map((s, i) => (
        <div key={s.nummer} className="flex flex-1 items-center gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <div
              className={
                s.nummer <= huidigeStap
                  ? "h-1.5 rounded-full bg-primary"
                  : "h-1.5 rounded-full bg-border"
              }
            />
            <p
              className={
                s.nummer === huidigeStap
                  ? "text-xs font-medium text-foreground"
                  : "text-xs text-muted-foreground"
              }
            >
              {s.nummer}. {s.titel}
            </p>
          </div>
          {i < STAPPEN.length - 1 && <span className="sr-only">,</span>}
        </div>
      ))}
    </div>
  );
}
