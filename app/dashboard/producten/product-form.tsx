"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, LinkButton } from "@/app/components/ui/button";
import { DecimalInput, Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { IconPicker } from "@/app/components/ui/icon-picker";
import { CollapsibleSection } from "@/app/components/ui/collapsible";
import { SjabloonPicker } from "./velden/sjabloon-picker";
import { VeldenRenderer } from "./velden/veld-form";
import { LiveVoorbeeld } from "./velden/live-voorbeeld";
import { StaffelsInput, type StaffelRij } from "./velden/staffels-input";
import type { ProductFormState } from "@/app/lib/actions/products";
import { arbeidEenheidEnkelvoud } from "@/app/lib/arbeid";
import { formatCurrency } from "@/app/lib/format";
import {
  coerceVeldWaarden,
  instelVeldenVoorSjabloon,
  standaardConfigVoorSjabloon,
  standaardKlantInvoerVoorSjabloon,
  vasteEenheidVoorSjabloon,
} from "@/app/lib/sjablonen";
import { CUSTOM_UNIT_VALUE, UNIT_GROUPS, isKnownUnit, unitLabel } from "@/app/lib/units";
import type { ArbeidStapEenheid, Product, ProductSjabloon, ProductStaffel } from "@/app/generated/prisma/client";

type ProductMetSjabloon = Product & { staffels?: ProductStaffel[] };

export function ProductForm({
  action,
  product,
  arbeidStapEenheid,
  arbeidTarief,
  arbeidTariefPerProduct,
  materiaalMarge,
  materiaalMargePerProduct,
  btwPercentage,
  verfijningTellingen,
  children,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  product?: ProductMetSjabloon;
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTarief: number;
  arbeidTariefPerProduct: boolean;
  materiaalMarge: number;
  materiaalMargePerProduct: boolean;
  btwPercentage: number;
  // Aantal toeslagen/materiaalcategorieën — komt van de pagina (children is
  // een ondoorzichtige ReactNode), alleen gebruikt voor de Verfijning-
  // samenvattingsregel wanneer je 'm dichtgeklapt hebt.
  verfijningTellingen?: { extraOpties: number; materiaalCategorieen: number };
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    null
  );

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
  const [klantVoorbeeldInvoer, setKlantVoorbeeldInvoer] = useState<Record<string, unknown>>(() =>
    standaardKlantInvoerVoorSjabloon(sjabloon, sjabloonConfigRaw)
  );

  const [prijsPerEenheid, setPrijsPerEenheid] = useState(
    product?.prijsPerEenheid != null ? String(product.prijsPerEenheid) : ""
  );
  const [bandbreedte, setBandbreedte] = useState(product?.prijsPerEenheidType === "BANDBREEDTE");
  const [prijsPerEenheidMin, setPrijsPerEenheidMin] = useState(
    product?.prijsPerEenheidMin != null ? String(product.prijsPerEenheidMin) : ""
  );
  const [prijsPerEenheidMax, setPrijsPerEenheidMax] = useState(
    product?.prijsPerEenheidMax != null ? String(product.prijsPerEenheidMax) : ""
  );
  const [minimumprijs, setMinimumprijs] = useState(
    product?.minimumprijs != null ? String(product.minimumprijs) : ""
  );
  const [staffels, setStaffels] = useState<StaffelRij[]>(
    () =>
      product?.staffels?.map((s) => ({ vanaf: String(s.vanaf), prijsPerEenheid: String(s.prijsPerEenheid) })) ?? []
  );

  const [verfijningOpen, setVerfijningOpen] = useState(false);

  const instelVelden = instelVeldenVoorSjabloon(sjabloon);
  const sjabloonConfig = coerceVeldWaarden(instelVelden, sjabloonConfigRaw);
  const vasteEenheid = vasteEenheidVoorSjabloon(sjabloon, sjabloonConfig);
  const isArtikelregels = sjabloon === "ARTIKELREGELS";

  const staffelsAlsGetallen = staffels
    .map((s) => ({ vanaf: Number(s.vanaf.replace(",", ".")), prijsPerEenheid: Number(s.prijsPerEenheid.replace(",", ".")) }))
    .filter((s) => Number.isFinite(s.vanaf) && Number.isFinite(s.prijsPerEenheid) && s.vanaf > 0);

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
    setKlantVoorbeeldInvoer(standaardKlantInvoerVoorSjabloon(nieuw, nieuweConfig));
    const nieuweVasteEenheid = vasteEenheidVoorSjabloon(nieuw, nieuweConfig);
    if (nieuweVasteEenheid) {
      setEenheid(nieuweVasteEenheid);
      setEigenEenheid(false);
    }
  }

  const verfijningSamenvatting = berekenVerfijningSamenvatting({
    minimumprijs,
    aantalStaffels: staffels.length,
    bandbreedte,
    extraOpties: verfijningTellingen?.extraOpties ?? 0,
    materiaalCategorieen: verfijningTellingen?.materiaalCategorieen ?? 0,
  });

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
          defaultValue={product?.naam}
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
            Materiaalprijzen en extra opties worden hiermee vermenigvuldigd.
          </p>
        </div>
      )}

      {isArtikelregels ? (
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
          Bij Artikelregels stel je hieronder per artikeltype een eigen prijs in.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prijsPerEenheid">Wat vraag je per {unitLabel(vasteEenheid ?? eenheid)}?</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <DecimalInput
              id="prijsPerEenheid"
              name="prijsPerEenheid"
              value={prijsPerEenheid}
              onChange={(e) => setPrijsPerEenheid(e.target.value)}
              placeholder="Bijv. 45"
              className="pl-7"
            />
          </div>
          {state?.fieldErrors?.prijsPerEenheid && (
            <p className="text-sm text-destructive">{state.fieldErrors.prijsPerEenheid}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Laat leeg als je de prijs liever via materiaalcategorieën instelt (bij Verfijning
            hieronder).
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Btw</Label>
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
          {btwPercentage}% — geldt voor alle producten, in te stellen bij{" "}
          <Link href="/dashboard/kosteninstellingen" className="underline hover:text-foreground">
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

        <LiveVoorbeeld
          sjabloon={sjabloon}
          sjabloonConfig={sjabloonConfig}
          klantInvoer={klantVoorbeeldInvoer}
          onKlantInvoerChange={(key, waarde) => setKlantVoorbeeldInvoer((prev) => ({ ...prev, [key]: waarde }))}
          eenheid={vasteEenheid ?? eenheid}
          prijsPerEenheid={prijsPerEenheid}
          staffels={staffelsAlsGetallen}
          minimumprijs={minimumprijs}
        />
      </div>

      <CollapsibleSection title="Verfijning" summary={verfijningSamenvatting} open={verfijningOpen} onOpenChange={setVerfijningOpen}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minimumprijs">Minimumprijs (optioneel)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <DecimalInput
              id="minimumprijs"
              name="minimumprijs"
              value={minimumprijs}
              onChange={(e) => setMinimumprijs(e.target.value)}
              placeholder="Bijv. 250"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            De prijs voor dit product komt nooit lager uit dan dit bedrag, ook niet bij een kleine
            hoeveelheid.
          </p>
        </div>

        {!isArtikelregels && (
          <>
            <input type="hidden" name="staffels" value={JSON.stringify(staffelsAlsGetallen)} />
            <StaffelsInput eenheid={vasteEenheid ?? eenheid} staffels={staffels} onChange={setStaffels} />
          </>
        )}

        {!isArtikelregels && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={bandbreedte}
                onChange={(e) => setBandbreedte(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Prijs als bandbreedte tonen (bijv. &ldquo;€ 40 – € 55&rdquo;) in plaats van een vast
              bedrag
            </label>
            <input type="hidden" name="prijsPerEenheidType" value={bandbreedte ? "BANDBREEDTE" : "VAST"} />
            {bandbreedte && (
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                  </span>
                  <DecimalInput
                    name="prijsPerEenheidMin"
                    placeholder="Min"
                    value={prijsPerEenheidMin}
                    onChange={(e) => setPrijsPerEenheidMin(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                  </span>
                  <DecimalInput
                    name="prijsPerEenheidMax"
                    placeholder="Max"
                    value={prijsPerEenheidMax}
                    onChange={(e) => setPrijsPerEenheidMax(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
              </div>
            )}
            {state?.fieldErrors?.prijsPerEenheidMax && (
              <p className="text-sm text-destructive">{state.fieldErrors.prijsPerEenheidMax}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <Label htmlFor="arbeidsCapaciteit">
            Aantal {unitLabel(vasteEenheid ?? eenheid)} per {arbeidEenheidEnkelvoud(arbeidStapEenheid)} (optioneel)
          </Label>
          <DecimalInput
            id="arbeidsCapaciteit"
            name="arbeidsCapaciteit"
            placeholder="Bijv. 5"
            defaultValue={product?.arbeidsCapaciteit ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Hoeveel {unitLabel(vasteEenheid ?? eenheid)} jij of je team plaatst per{" "}
            {arbeidEenheidEnkelvoud(arbeidStapEenheid)}. Bepaalt de arbeidskosten van dit product.
            Laat leeg als dit product geen arbeidstijd kost.
          </p>
        </div>

        <OverrideField
          label="Arbeidstarief voor dit product"
          name="arbeidTariefOverride"
          perProductEnabled={arbeidTariefPerProduct}
          defaultOverrideValue={product?.arbeidTariefOverride ?? ""}
          placeholder={`Standaard: ${formatCurrency(arbeidTarief)} per ${arbeidEenheidEnkelvoud(arbeidStapEenheid)}`}
          helperWhenEditable={`Leeg = het standaardtarief van ${formatCurrency(arbeidTarief)} per ${arbeidEenheidEnkelvoud(arbeidStapEenheid)} uit Kosteninstellingen.`}
          helperWhenFixed={`Alle producten gebruiken het arbeidstarief uit Kosteninstellingen (${formatCurrency(arbeidTarief)} per ${arbeidEenheidEnkelvoud(arbeidStapEenheid)}). Wil je voor dit product een ander tarief? Zet "Tarief per product instelbaar" aan bij Kosteninstellingen.`}
          error={state?.fieldErrors?.arbeidTariefOverride}
        />

        <OverrideField
          label="Opslag op materiaalkosten voor dit product"
          name="materiaalMargeOverride"
          perProductEnabled={materiaalMargePerProduct}
          defaultOverrideValue={product?.materiaalMargeOverride ?? ""}
          placeholder={`Standaard: ${materiaalMarge}%`}
          suffix="%"
          helperWhenEditable={`Leeg = de standaardopslag van ${materiaalMarge}% uit Kosteninstellingen.`}
          helperWhenFixed={`Alle producten gebruiken de opslag uit Kosteninstellingen (${materiaalMarge}%). Wil je voor dit product een andere opslag? Zet "Opslag per product instelbaar" aan bij Kosteninstellingen.`}
          error={state?.fieldErrors?.materiaalMargeOverride}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transportkosten">Transportkosten voor dit product</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <DecimalInput
              id="transportkosten"
              name="transportkosten"
              className="pl-7"
              defaultValue={product?.transportkosten ?? 0}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Vast bedrag om materiaal voor dit product te vervoeren. Telt één keer mee zodra de
            klant dit product kiest, en wordt bij de offerte opgeteld bij de transportkosten van
            andere gekozen producten. Standaard €0.
          </p>
          {state?.fieldErrors?.transportkosten && (
            <p className="text-sm text-destructive">{state.fieldErrors.transportkosten}</p>
          )}
        </div>
      </CollapsibleSection>

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

      {verfijningOpen && children && (
        <div className="flex flex-col gap-6 rounded-md border border-border p-4">{children}</div>
      )}

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

function berekenVerfijningSamenvatting({
  minimumprijs,
  aantalStaffels,
  bandbreedte,
  extraOpties,
  materiaalCategorieen,
}: {
  minimumprijs: string;
  aantalStaffels: number;
  bandbreedte: boolean;
  extraOpties: number;
  materiaalCategorieen: number;
}): string {
  const delen: string[] = [];
  if (minimumprijs.trim() !== "") delen.push(`minimumprijs €${minimumprijs}`);
  if (aantalStaffels > 0) delen.push(`${aantalStaffels} ${aantalStaffels === 1 ? "staffel" : "staffels"}`);
  if (bandbreedte) delen.push("bandbreedte");
  if (extraOpties > 0) delen.push(`${extraOpties} ${extraOpties === 1 ? "toeslag" : "toeslagen"}`);
  if (materiaalCategorieen > 0) {
    delen.push(`${materiaalCategorieen} materiaalcategorie${materiaalCategorieen === 1 ? "" : "ën"}`);
  }
  return delen.length > 0 ? delen.join(" · ") : "Standaardinstellingen";
}

function OverrideField({
  label,
  name,
  perProductEnabled,
  defaultOverrideValue,
  placeholder,
  suffix,
  helperWhenEditable,
  helperWhenFixed,
  error,
}: {
  label: string;
  name: string;
  perProductEnabled: boolean;
  defaultOverrideValue: number | string;
  placeholder: string;
  suffix?: string;
  helperWhenEditable: string;
  helperWhenFixed: string;
  error?: string;
}) {
  if (!perProductEnabled) {
    return (
      <>
        <input type="hidden" name={name} value={defaultOverrideValue} />
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {helperWhenFixed}
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label} (optioneel)</Label>
      <div className="relative">
        <DecimalInput
          id={name}
          name={name}
          placeholder={placeholder}
          defaultValue={defaultOverrideValue}
          className={suffix ? "pr-10" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{helperWhenEditable}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
