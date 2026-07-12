"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Sprout, Printer, Mail } from "lucide-react";
import { calculateBreakdown } from "@/app/lib/calculate";
import { formatCurrency } from "@/app/lib/format";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input, Label, Select } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import type {
  CostSettings,
  ExtraOption,
  MaterialCategory,
  MaterialOption,
  Product,
  Service,
} from "@/app/generated/prisma/client";

type ProductWithDetails = Product & {
  materiaalCategorieen: (MaterialCategory & { materialen: MaterialOption[] })[];
  extraOpties: ExtraOption[];
};

type Props = {
  bedrijfsnaam: string;
  email: string;
  costSettings: CostSettings;
  services: Service[];
  products: ProductWithDetails[];
};

const wholeUnits = new Set(["stuks", "uur", "dag", "pallet", "zak"]);

export function Calculator({ bedrijfsnaam, email, costSettings, services, products }: Props) {
  const [serviceQty, setServiceQty] = useState<Record<string, number>>({});
  const [productQty, setProductQty] = useState<Record<string, number>>({});
  const [materialSelections, setMaterialSelections] = useState<Record<string, string>>({});
  const [extraSelections, setExtraSelections] = useState<Record<string, boolean>>({});
  const [afstandKm, setAfstandKm] = useState(0);

  const breakdown = useMemo(
    () =>
      calculateBreakdown({
        services,
        products,
        serviceQty,
        productQty,
        materialSelections,
        extraSelections,
        afstandKm,
        costSettings,
      }),
    [
      services,
      products,
      serviceQty,
      productQty,
      materialSelections,
      extraSelections,
      afstandKm,
      costSettings,
    ]
  );

  const isEmpty = services.length === 0 && products.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-6 sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sprout className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Kostencalculator van</p>
            <h1 className="text-xl font-semibold text-foreground">{bedrijfsnaam}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {isEmpty ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Deze calculator is nog niet ingericht. Neem contact op met {bedrijfsnaam} voor een offerte.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-8 lg:order-1">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Stel je tuinproject samen
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kies diensten en producten en geef de gewenste hoeveelheid op. Je ziet direct een
                  schatting van de kosten hiernaast.
                </p>
              </div>

              {services.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Diensten
                  </h3>
                  <div className="flex flex-col gap-3">
                    {services.map((service) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        costSettings={costSettings}
                        qty={serviceQty[service.id] ?? 0}
                        onChange={(qty) =>
                          setServiceQty((prev) => ({ ...prev, [service.id]: qty }))
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {products.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Producten
                  </h3>
                  <div className="flex flex-col gap-3">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        qty={productQty[product.id] ?? 0}
                        onQtyChange={(qty) =>
                          setProductQty((prev) => ({ ...prev, [product.id]: qty }))
                        }
                        materialSelections={materialSelections}
                        onMaterialSelect={(categoryId, materialOptionId) =>
                          setMaterialSelections((prev) => ({
                            ...prev,
                            [categoryId]: materialOptionId,
                          }))
                        }
                        extraSelections={extraSelections}
                        onExtraToggle={(extraOptionId, checked) =>
                          setExtraSelections((prev) => ({ ...prev, [extraOptionId]: checked }))
                        }
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="lg:order-2">
              <div className="flex flex-col gap-4 lg:sticky lg:top-6">
                <Summary
                  breakdown={breakdown}
                  costSettings={costSettings}
                  afstandKm={afstandKm}
                  onAfstandChange={setAfstandKm}
                  bedrijfsnaam={bedrijfsnaam}
                  email={email}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Deze berekening is een indicatie. Aan dit overzicht kunnen geen rechten worden ontleend.
        <br />
        Gemaakt met Kostenplan.
      </footer>
    </div>
  );
}

function ServiceRow({
  service,
  costSettings,
  qty,
  onChange,
}: {
  service: Service;
  costSettings: CostSettings;
  qty: number;
  onChange: (qty: number) => void;
}) {
  const step = wholeUnits.has(service.eenheid) ? 1 : 0.1;
  const active = qty > 0;
  const indicatiePrijs =
    (costSettings.arbeidEnabled ? service.arbeidsuren * costSettings.arbeidTarief : 0) +
    (costSettings.materiaalEnabled ? service.materiaalkosten : 0);

  return (
    <Card className={active ? "border-primary/40 bg-accent/40" : undefined}>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{service.naam}</p>
          {service.omschrijving && (
            <p className="mt-0.5 text-sm text-muted-foreground">{service.omschrijving}</p>
          )}
          {indicatiePrijs > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              ≈ {formatCurrency(indicatiePrijs)} / {service.eenheid}
            </p>
          )}
        </div>
        <QuantityStepper
          naam={service.naam}
          eenheid={service.eenheid}
          qty={qty}
          step={step}
          onChange={onChange}
        />
      </CardContent>
    </Card>
  );
}

function ProductCard({
  product,
  qty,
  onQtyChange,
  materialSelections,
  onMaterialSelect,
  extraSelections,
  onExtraToggle,
}: {
  product: ProductWithDetails;
  qty: number;
  onQtyChange: (qty: number) => void;
  materialSelections: Record<string, string>;
  onMaterialSelect: (categoryId: string, materialOptionId: string) => void;
  extraSelections: Record<string, boolean>;
  onExtraToggle: (extraOptionId: string, checked: boolean) => void;
}) {
  const step = wholeUnits.has(product.eenheid) ? 1 : 0.1;
  const active = qty > 0;
  const categoriesWithOptions = product.materiaalCategorieen.filter(
    (category) => category.materialen.length > 0
  );

  return (
    <Card className={active ? "border-primary/40 bg-accent/40" : undefined}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-foreground">{product.naam}</p>
            {product.omschrijving && (
              <p className="mt-0.5 text-sm text-muted-foreground">{product.omschrijving}</p>
            )}
          </div>
          <QuantityStepper
            naam={product.naam}
            eenheid={product.eenheid}
            qty={qty}
            step={step}
            onChange={onQtyChange}
          />
        </div>

        {active && (categoriesWithOptions.length > 0 || product.extraOpties.length > 0) && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            {categoriesWithOptions.map((category) => (
              <div key={category.id} className="flex flex-col gap-1.5">
                <Label htmlFor={`materiaal-${category.id}`}>{category.naam}</Label>
                <Select
                  id={`materiaal-${category.id}`}
                  value={materialSelections[category.id] ?? ""}
                  onChange={(e) => onMaterialSelect(category.id, e.target.value)}
                >
                  <option value="">Kies {category.naam.toLowerCase()}</option>
                  {category.materialen.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.naam} — {formatCurrency(material.prijs)} / {product.eenheid}
                    </option>
                  ))}
                </Select>
              </div>
            ))}

            {product.extraOpties.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">Extra opties</p>
                {product.extraOpties.map((extra) => (
                  <label
                    key={extra.id}
                    className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                      checked={extraSelections[extra.id] ?? false}
                      onChange={(e) => onExtraToggle(extra.id, e.target.checked)}
                    />
                    <span className="flex-1">
                      <span className="block font-medium text-foreground">{extra.naam}</span>
                      {extra.omschrijving && (
                        <span className="block text-muted-foreground">{extra.omschrijving}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      + {formatCurrency(extra.prijs)} / {product.eenheid}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuantityStepper({
  naam,
  eenheid,
  qty,
  step,
  onChange,
}: {
  naam: string;
  eenheid: string;
  qty: number;
  step: number;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, round(qty - step)))}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
        disabled={qty <= 0}
        aria-label={`${naam} verminderen`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex flex-col items-center">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={qty === 0 ? "" : qty}
          placeholder="0"
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="h-9 w-20 text-center"
        />
        <span className="mt-0.5 text-xs text-muted-foreground">{eenheid}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(round(qty + step))}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary"
        aria-label={`${naam} toevoegen`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Summary({
  breakdown,
  costSettings,
  afstandKm,
  onAfstandChange,
  bedrijfsnaam,
  email,
}: {
  breakdown: ReturnType<typeof calculateBreakdown>;
  costSettings: CostSettings;
  afstandKm: number;
  onAfstandChange: (value: number) => void;
  bedrijfsnaam: string;
  email: string;
}) {
  const rows: { label: string; value: number }[] = [];
  if (costSettings.arbeidEnabled && costSettings.arbeidZichtbaar) {
    rows.push({ label: "Arbeidskosten", value: breakdown.arbeidskosten });
  }
  if (costSettings.materiaalEnabled && costSettings.materiaalZichtbaar) {
    rows.push({ label: "Materiaalkosten", value: breakdown.materiaalkosten });
  }
  if (costSettings.transportEnabled && costSettings.transportZichtbaar) {
    rows.push({ label: "Transportkosten", value: breakdown.transportkosten });
  }
  if (costSettings.voorrijEnabled && costSettings.voorrijZichtbaar) {
    rows.push({ label: "Voorrijkosten", value: breakdown.voorrijkosten });
  }

  const mailBody = encodeURIComponent(
    `Hallo ${bedrijfsnaam},\n\nIk heb via de kostencalculator een schatting gemaakt van ${formatCurrency(
      breakdown.totaal
    )} (incl. btw) en ontvang graag een officiële offerte.\n\nMet vriendelijke groet,`
  );

  return (
    <>
      {costSettings.transportEnabled && costSettings.transportType === "PER_KM" && (
        <Card>
          <CardContent className="flex flex-col gap-1.5">
            <Label htmlFor="afstand">Afstand tot jouw locatie (km)</Label>
            <Input
              id="afstand"
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              value={afstandKm === 0 ? "" : afstandKm}
              placeholder="0"
              onChange={(e) => onAfstandChange(Math.max(0, Number(e.target.value) || 0))}
            />
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30">
        <CardContent className="flex flex-col gap-4">
          <h3 className="font-semibold text-foreground">Jouw kostenraming</h3>

          {!breakdown.heeftSelectie ? (
            <p className="text-sm text-muted-foreground">
              Selecteer diensten of producten om een schatting te zien.
            </p>
          ) : (
            <>
              {rows.length > 0 && (
                <div className="flex flex-col gap-2 text-sm">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotaal</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(breakdown.subtotaal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Btw ({costSettings.btwPercentage}%)
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(breakdown.btw)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-3">
                <span className="font-semibold text-accent-foreground">Totaal (incl. btw)</span>
                <span className="text-lg font-bold text-accent-foreground">
                  {formatCurrency(breakdown.totaal)}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  Bewaar als PDF
                </Button>
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(
                    `Offerte-aanvraag via kostencalculator`
                  )}&body=${mailBody}`}
                  className="flex-1"
                >
                  <Button type="button" variant="primary" className="w-full">
                    <Mail className="h-4 w-4" />
                    Offerte aanvragen
                  </Button>
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
