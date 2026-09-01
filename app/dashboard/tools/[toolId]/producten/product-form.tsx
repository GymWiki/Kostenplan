"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LinkButton } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { DecimalInput, Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { IconPicker } from "@/app/components/ui/icon-picker";
import { SjabloonPicker } from "./velden/sjabloon-picker";
import { VeldenRenderer, VeldInputEnkel } from "./velden/veld-form";
import { OverrideVeld, MateriaalkostenVeld, KostenUitsplitsing } from "./velden/kosten-blok";
import type { ProductFormState } from "@/app/lib/actions/products";
import { arbeidEenheidEnkelvoud } from "@/app/lib/arbeid";
import { arbeidTariefVoorStapEenheid, berekenMateriaalRegels } from "@/app/lib/calculate";
import { cn } from "@/app/lib/cn";
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
import { CUSTOM_UNIT_VALUE, UNIT_GROUPS, isKnownUnit, unitLabel } from "@/app/lib/units";
import type {
  ArbeidStapEenheid,
  MaterialCategory,
  MaterialOption,
  Product,
  ProductSjabloon,
} from "@/app/generated/prisma/client";

type ProductMetRelaties = Product & {
  materiaalCategorieen: (MaterialCategory & { materialen: MaterialOption[] })[];
};

export type PricingSettings = {
  arbeidEnabled: boolean;
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTariefUur: number;
  arbeidTariefDagdeel: number;
  arbeidTariefDag: number;
  arbeidAfronden: boolean;
  transportEnabled: boolean;
  transportTarief: number;
  voorrijEnabled: boolean;
  voorrijTarief: number;
  materiaalEnabled: boolean;
  btwPercentage: number;
};

// Punt 4 van de UX-audit: het bewerkscherm is één lange verticale scroll
// (naam → eenheid → btw → afrekenmethode → kosten → rekenvoorbeeld → icoon →
// materiaalcategorieën). Geen functionaliteit gaat achter een wizard of
// tab schuil — alleen navigatie ERdoorheen wordt korter, met sectie-ankers
// (vgl. de sticky ToolNav ernaast, zie tool-nav.tsx). Sticky vlak onder de
// Topbar (die zelf sticky top-0 h-16 is, zie components/dashboard/topbar.tsx)
// — top-16 hier voorkomt overlap; de scroll-mt-28 op elke sectie hieronder
// compenseert weer voor deze balk zodat een gesprongen sectie niet half
// achter de sticky balken verdwijnt.
const SECTIE_ANKERS = [
  { id: "sectie-basis", label: "Basis" },
  { id: "sectie-kosten", label: "Kosten" },
  { id: "sectie-materialen", label: "Materialen" },
] as const;

function ProductFormSectieNav() {
  const [actief, setActief] = useState<string>(SECTIE_ANKERS[0].id);

  useEffect(() => {
    const elementen = SECTIE_ANKERS.map((sectie) => document.getElementById(sectie.id)).filter(
      (el): el is HTMLElement => el != null
    );
    if (elementen.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const zichtbaar = entries.filter((entry) => entry.isIntersecting);
        if (zichtbaar.length === 0) return;
        const bovenste = zichtbaar.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
        setActief(bovenste.target.id);
      },
      { rootMargin: "-112px 0px -70% 0px", threshold: 0 }
    );
    elementen.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Secties in dit product"
      className="sticky top-16 z-20 -mx-1 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 py-2 backdrop-blur"
    >
      {SECTIE_ANKERS.map((sectie) => (
        <a
          key={sectie.id}
          href={`#${sectie.id}`}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            actief === sectie.id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {sectie.label}
        </a>
      ))}
    </nav>
  );
}

export function ProductForm({
  toolId,
  action,
  product,
  pricingSettings,
  materialenSectie,
  extraOptiesSectie,
}: {
  toolId: string;
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  product?: ProductMetRelaties;
  pricingSettings: PricingSettings;
  materialenSectie?: React.ReactNode;
  extraOptiesSectie?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    null
  );

  // Autosave: elke wijziging in dit formulier slaat na een korte pauze
  // vanzelf op — net als Materialen/Extra opties eronder. Vóór deze
  // opzet spaarde alleen dit formulier NIET automatisch op, terwijl de
  // rest van het scherm dat wel deed; wie alleen iets bij Materialen
  // wijzigde en wegnavigeerde verloor zo stilzwijgend een niet-opgeslagen
  // naam-/tariefwijziging hierboven (zie UX-audit). De meeste velden zijn
  // gewone form-controls waarvan een change-event vanzelf naar het
  // <form>-element bubbelt (zie onChange hieronder); sjabloon-wissel en
  // icoonkeuze verlopen via een knop-klik i.p.v. een form-control-change
  // en roepen dit daarom expliciet zelf aan.
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleAutosave() {
    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    autosaveTimeout.current = setTimeout(() => {
      if (formRef.current) formAction(new FormData(formRef.current));
    }, 800);
  }

  const [naam, setNaam] = useState(product?.naam ?? "");
  const [eenheid, setEenheid] = useState(product?.eenheid ?? "m1");
  // Een bestaand product met een eenheid die niet in de standaardlijst staat
  // (bijv. eerder via "eigen eenheid" aangemaakt) opent meteen in eigen-modus,
  // zodat de opgeslagen waarde niet stilzwijgend verandert.
  const [eigenEenheid, setEigenEenheid] = useState(
    () => Boolean(product) && !isKnownUnit(product!.eenheid)
  );

  const [sjabloon, setSjabloon] = useState<ProductSjabloon>(product?.sjabloon ?? "ENKELE_HOEVEELHEID");
  const [pendingSjabloon, setPendingSjabloon] = useState<ProductSjabloon | null>(null);
  const [sjabloonConfigRaw, setSjabloonConfigRaw] = useState<Record<string, unknown>>(
    () => (product?.sjabloonConfig as Record<string, unknown> | null) ?? standaardConfigVoorSjabloon(sjabloon)
  );
  const [voorbeeldInvoer, setVoorbeeldInvoer] = useState<Record<string, unknown>>(() =>
    standaardKlantInvoerVoorSjabloon(sjabloon, sjabloonConfigRaw)
  );

  const primaireCategorie = product?.materiaalCategorieen?.[0];
  const primaireOptie = primaireCategorie?.materialen?.[0];
  const [materiaalPrijs, setMateriaalPrijs] = useState(primaireOptie ? String(primaireOptie.prijs) : "0");

  const [productiviteit, setProductiviteit] = useState(
    product?.productiviteit != null ? String(product.productiviteit) : ""
  );
  const companyArbeidTarief = arbeidTariefVoorStapEenheid(pricingSettings, pricingSettings.arbeidStapEenheid);
  const [arbeidTarief, setArbeidTarief] = useState(
    String(product?.arbeidTariefOverride ?? companyArbeidTarief)
  );
  const [transportBedrag, setTransportBedrag] = useState(
    String(product?.transportkostenOverride ?? pricingSettings.transportTarief)
  );
  const [transportMeeschalend, setTransportMeeschalend] = useState(product?.transportMeeschalend ?? false);
  const [voorrijBedrag, setVoorrijBedrag] = useState(
    String(product?.voorrijkostenOverride ?? pricingSettings.voorrijTarief)
  );
  const [voorrijMeeschalend, setVoorrijMeeschalend] = useState(product?.voorrijMeeschalend ?? false);

  const instelVelden = instelVeldenVoorSjabloon(sjabloon);
  const sjabloonConfig = coerceVeldWaarden(instelVelden, sjabloonConfigRaw);
  const vasteEenheid = vasteEenheidVoorSjabloon(sjabloon, sjabloonConfig);
  const effectieveEenheid = vasteEenheid ?? eenheid;
  const isArtikelregels = sjabloon === "ARTIKELREGELS";
  const isEnkel = sjabloon === "ENKELE_HOEVEELHEID";
  const klantVelden = isEnkel ? [] : klantVeldenVoorSjabloon(sjabloon, sjabloonConfig);

  const voorbeeldHoeveelheid = isEnkel
    ? parseGetal(voorbeeldInvoer.hoeveelheid, 20)
    : hoeveelheidUitResultaat(
        berekenHoeveelheidVoorSjabloon(sjabloon, sjabloonConfig, coerceVeldWaarden(klantVelden, voorbeeldInvoer))
      );

  // Eén regel per materiaalcategorie (niet alleen de eerste) — de primaire
  // categorie (blok 1 hierboven) reflecteert de nog niet opgeslagen,
  // live-getypte materiaalPrijs; de overige categorieën gebruiken hun
  // opgeslagen prijs, met een fallback op de eerste optie zodat een
  // categorie zonder eenduidige keuze niet uit het voorbeeld verdwijnt.
  const materiaalRegels = berekenMateriaalRegels(
    product?.materiaalCategorieen ?? [],
    voorbeeldHoeveelheid,
    {},
    { valtTerugOpEersteOptie: true }
  ).regels.map((regel) =>
    primaireCategorie && regel.categorieId === primaireCategorie.id
      ? { ...regel, prijsPerEenheid: parseGetal(materiaalPrijs, 0), bedrag: regel.hoeveelheid * parseGetal(materiaalPrijs, 0) }
      : regel
  );

  function handleKiesSjabloon(nieuw: ProductSjabloon) {
    if (nieuw === sjabloon) return;
    if (instelVeldenVoorSjabloon(sjabloon).length > 0) {
      setPendingSjabloon(nieuw);
      return;
    }
    voerSjabloonwisselUit(nieuw);
  }

  function voerSjabloonwisselUit(nieuw: ProductSjabloon) {
    const nieuweConfig = standaardConfigVoorSjabloon(nieuw);
    setSjabloon(nieuw);
    setSjabloonConfigRaw(nieuweConfig);
    setVoorbeeldInvoer(standaardKlantInvoerVoorSjabloon(nieuw, nieuweConfig));
    const nieuweVasteEenheid = vasteEenheidVoorSjabloon(nieuw, nieuweConfig);
    if (nieuweVasteEenheid) {
      setEenheid(nieuweVasteEenheid);
      setEigenEenheid(false);
    }
    scheduleAutosave();
  }

  return (
    <div className="flex flex-col gap-8">
      <ProductFormSectieNav />
      <form
        id="product-form"
        ref={formRef}
        action={formAction}
        onChange={scheduleAutosave}
        className="flex flex-col gap-5"
      >
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" aria-live="polite">
          {state.error}
        </p>
      )}

      <div id="sectie-basis" className="scroll-mt-28 flex flex-col gap-1.5">
        <Label htmlFor="naam">Naam van het product</Label>
        <Input
          id="naam"
          name="naam"
          placeholder="Bijv. Vloertegels"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          required
        />
        {state?.fieldErrors?.naam && (
          <p className="text-sm text-destructive">{state.fieldErrors.naam}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="omschrijving">Omschrijving (optioneel)</Label>
        <Textarea
          id="omschrijving"
          name="omschrijving"
          placeholder="Korte toelichting die klanten zien in de calculator"
          defaultValue={product?.omschrijving ?? ""}
        />
      </div>

      {vasteEenheid ? (
        <div className="flex flex-col gap-1.5">
          <Label>Eenheid</Label>
          <input type="hidden" name="eenheid" value={vasteEenheid} />
          <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
            {unitLabel(vasteEenheid)} — dit sjabloon rekent altijd in {unitLabel(vasteEenheid)}.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="eenheid">Eenheid</Label>
          <Select
            id="eenheid"
            name={eigenEenheid ? undefined : "eenheid"}
            value={eigenEenheid ? CUSTOM_UNIT_VALUE : eenheid}
            onChange={(e) => {
              if (e.target.value === CUSTOM_UNIT_VALUE) {
                setEigenEenheid(true);
                setEenheid("");
              } else {
                setEigenEenheid(false);
                setEenheid(e.target.value);
              }
            }}
          >
            {UNIT_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.opties.map((optie) => (
                  <option key={optie.value} value={optie.value}>
                    {optie.label}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={CUSTOM_UNIT_VALUE}>Eigen eenheid…</option>
          </Select>
          {eigenEenheid && (
            <Input
              id="eenheid-eigen"
              name="eenheid"
              placeholder="Bijv. strekkende voet"
              value={eenheid}
              onChange={(e) => setEenheid(e.target.value)}
              maxLength={20}
              required
              autoFocus
            />
          )}
          <p className="text-xs text-muted-foreground">
            De hoeveelheid die de klant opgeeft, bijv. m² beplanting of uur timmerwerk.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Btw</Label>
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
          {pricingSettings.btwPercentage}% — geldt voor alle producten van deze tool, in te stellen bij{" "}
          <Link href={`/dashboard/tools/${toolId}/prijzen`} className="underline hover:text-foreground">
            Prijzen
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-md border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Hoe reken je dit af?</p>
          <p className="text-xs text-muted-foreground">
            Kies hoe de klant tot een hoeveelheid komt. Dit kun je later altijd aanpassen.
          </p>
        </div>

        <SjabloonPicker waarde={sjabloon} onKiesSjabloon={handleKiesSjabloon} />
        <input type="hidden" name="sjabloon" value={sjabloon} />
        <input type="hidden" name="sjabloonConfig" value={JSON.stringify(sjabloonConfig)} />

        {instelVelden.length > 0 && (
          <VeldenRenderer
            velden={instelVelden}
            waarden={sjabloonConfigRaw}
            onChange={(key, waarde) => setSjabloonConfigRaw((prev) => ({ ...prev, [key]: waarde }))}
            idPrefix="instel"
          />
        )}
      </div>

      <div id="sectie-kosten" className="scroll-mt-28 flex flex-col gap-4 rounded-md border border-border p-4">
        <p className="text-sm font-medium text-foreground">Kosten</p>

        {isArtikelregels ? (
          <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
            Artikelregels heeft per artikeltype een eigen prijs, ingesteld bij Hoeveelheid hierboven.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Voorbeeld
              </p>
              {isEnkel ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="voorbeeld-hoeveelheid">Hoeveelheid ({unitLabel(effectieveEenheid)})</Label>
                  <VeldInputEnkel
                    id="voorbeeld-hoeveelheid"
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
                    idPrefix="voorbeeld"
                  />
                )
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">1. Materiaalkosten</p>
              <MateriaalkostenVeld
                eenheid={effectieveEenheid}
                primaireCategorie={primaireCategorie}
                prijs={materiaalPrijs}
                onPrijsChange={setMateriaalPrijs}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">2. Arbeidskosten</p>
              <OverrideVeld
                titel="Tarief"
                name="arbeidTariefOverride"
                companyWaarde={companyArbeidTarief}
                companyWaardeTekst={`per ${arbeidEenheidEnkelvoud(pricingSettings.arbeidStapEenheid)}`}
                defaultOverrideValue={product?.arbeidTariefOverride ?? null}
                instellingenHref={`/dashboard/tools/${toolId}/prijzen`}
                waarde={arbeidTarief}
                onWaardeChange={setArbeidTarief}
                error={state?.fieldErrors?.arbeidTariefOverride}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="productiviteit">
                  Hoeveel {unitLabel(effectieveEenheid)} zet je per{" "}
                  {arbeidEenheidEnkelvoud(pricingSettings.arbeidStapEenheid)}?
                </Label>
                <DecimalInput
                  id="productiviteit"
                  name="productiviteit"
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
                defaultOverrideValue={product?.transportkostenOverride ?? null}
                instellingenHref={`/dashboard/tools/${toolId}/prijzen`}
                waarde={transportBedrag}
                onWaardeChange={setTransportBedrag}
                error={state?.fieldErrors?.transportkostenOverride}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="transportMeeschalend"
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
                defaultOverrideValue={product?.voorrijkostenOverride ?? null}
                instellingenHref={`/dashboard/tools/${toolId}/prijzen`}
                waarde={voorrijBedrag}
                onWaardeChange={setVoorrijBedrag}
                error={state?.fieldErrors?.voorrijkostenOverride}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="voorrijMeeschalend"
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
                eenheid={effectieveEenheid}
                materiaalRegels={materiaalRegels}
                materiaalEnabled={pricingSettings.materiaalEnabled}
                productiviteit={parseGetal(productiviteit, 0) > 0 ? parseGetal(productiviteit, 0) : null}
                arbeidTarief={parseGetal(arbeidTarief, 0)}
                arbeidEnabled={pricingSettings.arbeidEnabled}
                arbeidAfronden={pricingSettings.arbeidAfronden}
                transportBedrag={parseGetal(transportBedrag, 0)}
                transportMeeschalend={transportMeeschalend}
                transportEnabled={pricingSettings.transportEnabled}
                voorrijBedrag={parseGetal(voorrijBedrag, 0)}
                voorrijMeeschalend={voorrijMeeschalend}
                voorrijEnabled={pricingSettings.voorrijEnabled}
              />
            </div>
          </>
        )}
      </div>

      <div id="sectie-materialen" className="scroll-mt-28 flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Icoon</p>
        <IconPicker name="icoon" defaultValue={product?.icoon} onChange={scheduleAutosave} />
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border p-3">
        <Switch name="actief" defaultChecked={product?.actief ?? true} />
        <div>
          <p className="text-sm font-medium text-foreground">Actief</p>
          <p className="text-sm text-muted-foreground">
            Alleen actieve producten zijn zichtbaar in het klantenportaal.
          </p>
        </div>
      </div>

      </form>

      {materialenSectie && (
        <div className="flex flex-col gap-4 rounded-md border border-border p-4">{materialenSectie}</div>
      )}

      {extraOptiesSectie && (
        <div className="flex flex-col gap-4 rounded-md border border-border p-4">{extraOptiesSectie}</div>
      )}

      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-2 sm:bottom-6">
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lg">
          {pending ? "Bezig met opslaan…" : "Wijzigingen worden automatisch opgeslagen"}
        </span>
        <LinkButton href={`/dashboard/tools/${toolId}/producten`} variant="outline" className="shadow-lg">
          Terug naar producten
        </LinkButton>
      </div>

      <ConfirmDialog
        open={pendingSjabloon != null}
        onClose={() => setPendingSjabloon(null)}
        onConfirm={() => {
          if (pendingSjabloon) voerSjabloonwisselUit(pendingSjabloon);
          setPendingSjabloon(null);
        }}
        title="Wissel je van sjabloon?"
        description="Je huidige instellingen voor de hoeveelheid-berekening (zoals ingevulde ruimtes of artikeltypes) gaan dan verloren. Dit kun je niet ongedaan maken."
      />
    </div>
  );
}
