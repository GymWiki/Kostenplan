"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, LinkButton } from "@/app/components/ui/button";
import { DecimalInput, Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { IconPicker } from "@/app/components/ui/icon-picker";
import { CollapsibleSection } from "@/app/components/ui/collapsible";
import { SjabloonPicker } from "./velden/sjabloon-picker";
import { VeldenRenderer, VeldInputEnkel } from "./velden/veld-form";
import { OverrideVeld, MateriaalkostenVeld, KostenUitsplitsing } from "./velden/kosten-blok";
import type { ProductFormState } from "@/app/lib/actions/products";
import { arbeidEenheidEnkelvoud } from "@/app/lib/arbeid";
import { arbeidTariefVoorStapEenheid, berekenMateriaalRegels } from "@/app/lib/calculate";
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

export function ProductForm({
  action,
  product,
  pricingSettings,
  verfijningTellingen,
  materialenSectie,
  extraOptiesSectie,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  product?: ProductMetRelaties;
  pricingSettings: PricingSettings;
  // Aantal toeslagen — voor de Verfijning-samenvattingsregel wanneer je 'm
  // dichtgeklapt hebt.
  verfijningTellingen?: { extraOpties: number };
  materialenSectie?: React.ReactNode;
  extraOptiesSectie?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    null
  );

  const [naam, setNaam] = useState(product?.naam ?? "");
  const [eenheid, setEenheid] = useState(product?.eenheid ?? "m1");
  // Een bestaand product met een eenheid die niet in de standaardlijst staat
  // (bijv. eerder via "eigen eenheid" aangemaakt) opent meteen in eigen-modus,
  // zodat de opgeslagen waarde niet stilzwijgend verandert.
  const [eigenEenheid, setEigenEenheid] = useState(
    () => Boolean(product) && !isKnownUnit(product!.eenheid)
  );

  const [sjabloon, setSjabloon] = useState<ProductSjabloon>(product?.sjabloon ?? "ENKELE_HOEVEELHEID");
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

  const [verfijningOpen, setVerfijningOpen] = useState(false);

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
    if (
      instelVeldenVoorSjabloon(sjabloon).length > 0 &&
      !confirm(
        "Wissel je van sjabloon? Je huidige instellingen voor de hoeveelheid-berekening (zoals ingevulde ruimtes of artikeltypes) gaan dan verloren. Dit kun je niet ongedaan maken."
      )
    ) {
      return;
    }
    const nieuweConfig = standaardConfigVoorSjabloon(nieuw);
    setSjabloon(nieuw);
    setSjabloonConfigRaw(nieuweConfig);
    setVoorbeeldInvoer(standaardKlantInvoerVoorSjabloon(nieuw, nieuweConfig));
    const nieuweVasteEenheid = vasteEenheidVoorSjabloon(nieuw, nieuweConfig);
    if (nieuweVasteEenheid) {
      setEenheid(nieuweVasteEenheid);
      setEigenEenheid(false);
    }
  }

  const verfijningSamenvatting =
    (verfijningTellingen?.extraOpties ?? 0) > 0
      ? `${verfijningTellingen!.extraOpties} ${verfijningTellingen!.extraOpties === 1 ? "toeslag" : "toeslagen"}`
      : "Geen toeslagen";

  return (
    <div className="flex flex-col gap-8">
      <form id="product-form" action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
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
          {pricingSettings.btwPercentage}% — geldt voor alle producten, in te stellen bij{" "}
          <Link href="/dashboard/instellingen" className="underline hover:text-foreground">
            Kosteninstellingen
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

      <div className="flex flex-col gap-4 rounded-md border border-border p-4">
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
                instellingenHref="/dashboard/instellingen"
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
                instellingenHref="/dashboard/instellingen"
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
                instellingenHref="/dashboard/instellingen"
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

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Icoon</p>
        <IconPicker name="icoon" defaultValue={product?.icoon} />
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

      <CollapsibleSection title="Verfijning" summary={verfijningSamenvatting} open={verfijningOpen} onOpenChange={setVerfijningOpen}>
        {extraOptiesSectie}
      </CollapsibleSection>

      <div className="sticky bottom-4 z-20 flex justify-end gap-2 sm:bottom-6">
        <LinkButton href="/dashboard/producten" variant="outline" className="shadow-lg">
          Annuleren
        </LinkButton>
        <Button type="submit" form="product-form" disabled={pending} className="shadow-lg">
          {pending ? "Opslaan…" : "Product opslaan"}
        </Button>
      </div>
    </div>
  );
}
