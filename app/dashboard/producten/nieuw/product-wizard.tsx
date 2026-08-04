"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { DecimalInput, Input, Label } from "@/app/components/ui/input";
import { SjabloonPicker } from "../velden/sjabloon-picker";
import { VeldenRenderer } from "../velden/veld-form";
import { LiveVoorbeeld } from "../velden/live-voorbeeld";
import {
  createProductDraftAction,
  updateProductDraftAction,
  type CreateProductDraftState,
  type ProductFormState,
} from "@/app/lib/actions/products";
import {
  coerceVeldWaarden,
  instelVeldenVoorSjabloon,
  standaardConfigVoorSjabloon,
  standaardKlantInvoerVoorSjabloon,
  vasteEenheidVoorSjabloon,
} from "@/app/lib/sjablonen";
import { unitLabel } from "@/app/lib/units";
import type { ProductSjabloon } from "@/app/generated/prisma/client";

const STAPPEN = [
  { nummer: 1, titel: "Wat voor werk is dit?" },
  { nummer: 2, titel: "Hoe reken je dit af?" },
  { nummer: 3, titel: "Wat kost het?" },
  { nummer: 4, titel: "Klaar" },
] as const;

// Strikte 4-stappen wizard voor een nieuw product — na stap 3 is het product
// al bruikbaar in de calculator. Toeslagen, staffels en minimumprijs staan
// hier bewust niet in; die stel je pas in bij het volledige bewerkscherm.
// Elke stap slaat meteen op (createProductDraftAction / updateProductDraftAction,
// geen redirect) zodat er nooit onopgeslagen werk verloren kan gaan.
export function ProductWizard() {
  const [stap, setStap] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const [productId, setProductId] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [sjabloon, setSjabloon] = useState<ProductSjabloon>("ENKELE_HOEVEELHEID");
  const [sjabloonConfigRaw, setSjabloonConfigRaw] = useState<Record<string, unknown>>({});
  const [klantVoorbeeldInvoer, setKlantVoorbeeldInvoer] = useState<Record<string, unknown>>({});
  const [prijsPerEenheid, setPrijsPerEenheid] = useState("");

  const instelVelden = instelVeldenVoorSjabloon(sjabloon);
  const sjabloonConfig = coerceVeldWaarden(instelVelden, sjabloonConfigRaw);
  const vasteEenheid = vasteEenheidVoorSjabloon(sjabloon, sjabloonConfig);
  const eenheid = vasteEenheid ?? "m1";
  const isArtikelregels = sjabloon === "ARTIKELREGELS";

  function bouwFormData() {
    const fd = new FormData();
    fd.set("naam", naam);
    fd.set("eenheid", eenheid);
    fd.set("sjabloon", sjabloon);
    fd.set("sjabloonConfig", JSON.stringify(sjabloonConfig));
    fd.set("prijsPerEenheid", prijsPerEenheid);
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
      const result = await createProductDraftAction(null, bouwFormData());
      const foutmelding = eersteFoutmelding(result);
      if (foutmelding) {
        setError(foutmelding);
        return;
      }
      if (result?.productId) {
        setProductId(result.productId);
        setStap(2);
      }
    });
  }

  function opslaanEnNaarStap(volgendeStap: number) {
    if (!productId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await updateProductDraftAction(productId, null, bouwFormData());
      const foutmelding = eersteFoutmelding(result);
      if (foutmelding) {
        setError(foutmelding);
        return;
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
    setKlantVoorbeeldInvoer(standaardKlantInvoerVoorSjabloon(nieuw, nieuweConfig));
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
          {isArtikelregels ? (
            <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              Bij Artikelregels heb je in de vorige stap al een prijs per artikeltype ingesteld.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wizard-prijs">
                Wat vraag je voor {naam.toLowerCase() || "dit product"}? (per {unitLabel(eenheid)})
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
                <DecimalInput
                  id="wizard-prijs"
                  placeholder="Bijv. 45"
                  value={prijsPerEenheid}
                  onChange={(e) => setPrijsPerEenheid(e.target.value)}
                  className="pl-7"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Toeslagen, staffels en een minimumprijs stel je straks in bij het bewerkscherm.
              </p>
            </div>
          )}

          <LiveVoorbeeld
            sjabloon={sjabloon}
            sjabloonConfig={sjabloonConfig}
            klantInvoer={klantVoorbeeldInvoer}
            onKlantInvoerChange={(key, waarde) => setKlantVoorbeeldInvoer((prev) => ({ ...prev, [key]: waarde }))}
            eenheid={eenheid}
            prijsPerEenheid={prijsPerEenheid}
            staffels={[]}
            minimumprijs=""
          />

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
            <LiveVoorbeeld
              sjabloon={sjabloon}
              sjabloonConfig={sjabloonConfig}
              klantInvoer={klantVoorbeeldInvoer}
              onKlantInvoerChange={(key, waarde) => setKlantVoorbeeldInvoer((prev) => ({ ...prev, [key]: waarde }))}
              eenheid={eenheid}
              prijsPerEenheid={prijsPerEenheid}
              staffels={[]}
              minimumprijs=""
            />
          )}

          <p className="text-sm text-muted-foreground">
            Wil je nog een minimumprijs, staffels, toeslagen of materiaalkeuzes toevoegen? Dat kan
            in het bewerkscherm.
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <LinkButton href="/dashboard/producten" variant="outline">
              Terug naar producten
            </LinkButton>
            <LinkButton href={`/dashboard/producten/${productId}/bewerken`}>
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
