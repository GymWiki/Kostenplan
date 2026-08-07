"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Printer, Mail, Phone, Image as ImageIcon, Check } from "lucide-react";
import {
  arbeidTariefVoorStapEenheid,
  bedragTop,
  berekenMateriaalRegels,
  berekenProductKosten,
  calculateBreakdownRange,
  geselecteerdeMateriaalOptieId,
  type Bedrag,
} from "@/app/lib/calculate";
import {
  berekenHoeveelheidVoorSjabloon,
  coerceVeldWaarden,
  hoeveelheidUitResultaat,
  klantVeldenVoorSjabloon,
  parseGetal,
  type GetalVeld,
  type JaNeeVeld,
  type KeuzeVeld,
  type RegelgroepVeld,
  type TekstVeld,
} from "@/app/lib/sjablonen";
import { formatCurrency, formatCurrencyRange } from "@/app/lib/format";
import { Card, CardContent } from "@/app/components/ui/card";
import { Logo } from "@/app/components/ui/logo";
import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { getProductIcon } from "@/app/lib/icons";
import { unitLabel } from "@/app/lib/units";
import { cn } from "@/app/lib/cn";
import { fontFamilyFor, brandingFontVariables } from "@/app/lib/fonts";
import { accessibleTextColor } from "@/app/lib/color";
import { createLeadAction, type LeadFormState } from "@/app/lib/actions/leads";
import type { LeadSnapshot, LeadSnapshotLine } from "@/app/lib/leads";
import type {
  Branding,
  CostSettings,
  ExtraOption,
  MaterialCategory,
  MaterialOption,
  Product,
  SubscriptionTier,
} from "@/app/generated/prisma/client";

type ProductWithDetails = Product & {
  materiaalCategorieen: (MaterialCategory & { materialen: MaterialOption[] })[];
  extraOpties: ExtraOption[];
};

type Props = {
  slug: string;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  branding: Branding | null;
  costSettings: CostSettings;
  products: ProductWithDetails[];
};

// Moet gelijk blijven aan de Kostenplan-standaardkleuren in globals.css
// (--primary / --background, light mode) — de kleur/lettertype die een
// Gratis-tenant altijd krijgt, ongeacht wat er in Branding is opgeslagen
// (bijv. na een downgrade vanaf Plus/Pro).
const STANDAARD_PRIMAIRE_KLEUR = "#15803d";
const STANDAARD_ACHTERGRONDKLEUR = "#f7faf8";

export function Calculator({
  slug,
  bedrijfsnaam,
  email,
  subscriptionTier,
  branding,
  costSettings,
  products,
}: Props) {
  // Rechtstreeks door de klant bijgehouden hoeveelheid — alleen gebruikt voor
  // sjabloon ENKELE_HOEVEELHEID (de QuantityStepper). Voor de andere
  // sjablonen (Afmetingen/Ruimtes/Artikelregels) wordt de hoeveelheid
  // afgeleid uit productSjabloonInvoer hieronder, zie effectiveProductQty.
  const [productQty, setProductQty] = useState<Record<string, number>>({});
  // Ruwe klantinvoer per sjabloon-veld (bijv. lengte/breedte, of de
  // ruimtes/artikelregels-lijst) — zie sjablonen.ts's klantVelden().
  const [productSjabloonInvoer, setProductSjabloonInvoer] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [materialSelections, setMaterialSelections] = useState<Record<string, string>>({});
  const [extraSelections, setExtraSelections] = useState<Record<string, number>>({});

  // Leidt voor elk niet-ENKELE_HOEVEELHEID product de hoeveelheid (voor
  // arbeidskosten) en, alleen bij Artikelregels, het al-geprijsde
  // regelsbedrag af uit de ruwe klantinvoer — zie calculate.ts's
  // productRegelsBedrag-parameter. ENKELE_HOEVEELHEID-producten komen
  // ongewijzigd uit productQty (de QuantityStepper).
  const { effectiveProductQty, productRegelsBedrag } = useMemo(() => {
    const qtyMap: Record<string, number> = { ...productQty };
    const regelsMap: Record<string, number> = {};
    for (const product of products) {
      if (product.sjabloon === "ENKELE_HOEVEELHEID") continue;
      const config = (product.sjabloonConfig as Record<string, unknown> | null) ?? {};
      const velden = klantVeldenVoorSjabloon(product.sjabloon, config);
      const invoer = coerceVeldWaarden(velden, productSjabloonInvoer[product.id] ?? {});
      const resultaat = berekenHoeveelheidVoorSjabloon(product.sjabloon, config, invoer);
      if (resultaat.soort === "hoeveelheid") {
        qtyMap[product.id] = resultaat.waarde;
      } else {
        qtyMap[product.id] = hoeveelheidUitResultaat(resultaat);
        regelsMap[product.id] = resultaat.regels.reduce(
          (som, regel) => som + regel.aantal * regel.prijsPerEenheid,
          0
        );
      }
    }
    return { effectiveProductQty: qtyMap, productRegelsBedrag: regelsMap };
  }, [products, productQty, productSjabloonInvoer]);

  // Kleuren en lettertype zijn een Plus/Pro-feature — opnieuw afdwingen bij
  // het renderen (niet alleen in het dashboard), zodat een Gratis-tenant
  // nooit gepersonaliseerde kleuren te zien krijgt, wat er ook is opgeslagen.
  const magPersonaliserenUiterlijk = subscriptionTier !== "GRATIS";
  // Lead capture ("Offerte aanvragen") is een Plus/Pro-feature — net als de
  // personalisatie hierboven bij elke render opnieuw afgeleid, nooit
  // rechtstreeks vertrouwd vanuit opgeslagen state.
  const magOfferteAanvragen = subscriptionTier !== "GRATIS";
  const primaireKleur = magPersonaliserenUiterlijk
    ? (branding?.primaireKleur ?? STANDAARD_PRIMAIRE_KLEUR)
    : STANDAARD_PRIMAIRE_KLEUR;
  const achtergrondKleur = magPersonaliserenUiterlijk
    ? (branding?.achtergrondKleur ?? STANDAARD_ACHTERGRONDKLEUR)
    : STANDAARD_ACHTERGRONDKLEUR;
  // De accentkleur wordt door de vakman gekozen en kan licht of donker zijn —
  // bepaal de tekstkleur erop-tegen dus automatisch in plaats van wit vast
  // te hardcoden, zodat de tekst altijd leesbaar blijft.
  const brandPrimaryForeground = accessibleTextColor(primaireKleur);
  const fontFamily = fontFamilyFor(magPersonaliserenUiterlijk ? (branding?.lettertype ?? "MODERN") : "MODERN");
  const toonPoweredBy = subscriptionTier === "GRATIS";

  const titel = branding?.customTitel?.trim()
    ? branding.customTitel.replaceAll("{bedrijfsnaam}", bedrijfsnaam)
    : null;
  const welkomstTekst = branding?.welkomstTekst?.trim() || null;
  const bedankTekst =
    branding?.bedankTekst?.trim() ||
    "Bedankt voor uw aanvraag! Wij nemen binnen 24 uur contact met u op.";
  const contactPositie = branding?.contactPositie ?? "BOVENAAN";
  const contact = {
    telefoonnummer: branding?.toonTelefoonnummer ? branding.telefoonnummer : null,
    email: branding?.toonEmail ? email : null,
  };
  const heeftContact = Boolean(contact.telefoonnummer || contact.email);

  useEffect(() => {
    if (window.self === window.top) return;

    function postHeight() {
      window.parent.postMessage(
        { type: "kostenplan:resize", slug, height: document.body.scrollHeight },
        "*"
      );
    }

    postHeight();
    const observer = new ResizeObserver(postHeight);
    observer.observe(document.body);
    window.addEventListener("resize", postHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", postHeight);
    };
  }, [slug]);

  const breakdown = useMemo(
    () =>
      calculateBreakdownRange({
        products,
        productQty: effectiveProductQty,
        productRegelsBedrag,
        materialSelections,
        extraSelections,
        costSettings,
      }),
    [products, effectiveProductQty, productRegelsBedrag, materialSelections, extraSelections, costSettings]
  );

  // Een verplichte materiaalcategorie zonder keuze houdt de prijsindicatie
  // onvolledig (materiaalkosten blijven stil op €0) — de klant mag dan geen
  // offerte aanvragen totdat dit is opgelost.
  const heeftOntbrekendeVerplichteMaterialen = useMemo(
    () =>
      products.some((product) => {
        const qty = effectiveProductQty[product.id] ?? 0;
        if (qty <= 0 && (productRegelsBedrag[product.id] ?? 0) <= 0) return false;
        return product.materiaalCategorieen.some(
          (category) => category.verplicht && !geselecteerdeMateriaalOptieId(category, materialSelections)
        );
      }),
    [products, effectiveProductQty, productRegelsBedrag, materialSelections]
  );

  // Bevroren "wat had de klant aangevinkt" voor de leads-CRM (zie
  // app/lib/leads.ts) — meegestuurd bij "Offerte aanvragen" zodat de vakman
  // later precies kan zien waarop de prijsindicatie was gebaseerd, ook als de
  // Producten zelf intussen gewijzigd zijn.
  const snapshot: LeadSnapshot = useMemo(() => {
    const regels: LeadSnapshotLine[] = [];

    for (const product of products) {
      const qty = effectiveProductQty[product.id] ?? 0;
      if (qty <= 0 && (productRegelsBedrag[product.id] ?? 0) <= 0) continue;

      const materiaalNamen = product.materiaalCategorieen
        .map((category) => {
          const selectedId = geselecteerdeMateriaalOptieId(category, materialSelections);
          return category.materialen.find((m) => m.id === selectedId);
        })
        .filter((option): option is NonNullable<typeof option> => Boolean(option))
        .map((option) => option.naam);

      const extraNamen = product.extraOpties
        .filter((extra) => (extraSelections[extra.id] ?? 0) > 0)
        .map((extra) => extra.naam);

      // Eigen, volledig berekend bedrag van dit product (materiaal + arbeid
      // + transport + voorrijkosten van dít product) — zodat een offerte die
      // hieruit wordt opgebouwd elke regel zijn eigen prijs geeft in plaats
      // van alles in één restpost te proppen (zie prefillOfferteRegels in
      // app/lib/offertes.ts).
      const productRegel = breakdown.productRegels.find((regel) => regel.productId === product.id);

      regels.push({
        naam: product.naam,
        type: "product",
        aantal: qty,
        eenheid: product.eenheid,
        materiaal: materiaalNamen.length > 0 ? materiaalNamen.join(", ") : undefined,
        extras: extraNamen.length > 0 ? extraNamen : undefined,
        prijs: productRegel?.totaal,
      });
    }

    return {
      regels,
      arbeidskosten: bedragTop(breakdown.arbeidskosten),
      materiaalkosten: bedragTop(breakdown.materiaalkosten),
      transportkosten: bedragTop(breakdown.transportkosten),
      voorrijkosten: bedragTop(breakdown.voorrijkosten),
      subtotaal: bedragTop(breakdown.subtotaal),
      btw: bedragTop(breakdown.btw),
      totaal: bedragTop(breakdown.totaal),
    };
  }, [products, effectiveProductQty, productRegelsBedrag, materialSelections, extraSelections, breakdown]);

  const isEmpty = products.length === 0;

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
      <header
        className="border-b border-border"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-6 sm:px-6">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
            <img
              src={branding.logoUrl}
              alt={bedrijfsnaam}
              className="h-11 w-auto max-w-[10rem] shrink-0 object-contain"
            />
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
                  Stel je project samen
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {welkomstTekst ??
                    "Geef bij producten de gewenste hoeveelheid op. Je ziet direct een schatting van de kosten hiernaast."}
                </p>
              </div>

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
                        costSettings={costSettings}
                        qty={effectiveProductQty[product.id] ?? 0}
                        onQtyChange={(qty) =>
                          setProductQty((prev) => ({ ...prev, [product.id]: qty }))
                        }
                        sjabloonInvoer={productSjabloonInvoer[product.id] ?? {}}
                        onSjabloonInvoerChange={(waarden) =>
                          setProductSjabloonInvoer((prev) => ({ ...prev, [product.id]: waarden }))
                        }
                        regelsBedrag={productRegelsBedrag[product.id] ?? 0}
                        materialSelections={materialSelections}
                        onMaterialSelect={(categoryId, materialOptionId) =>
                          setMaterialSelections((prev) => ({
                            ...prev,
                            [categoryId]: materialOptionId,
                          }))
                        }
                        extraSelections={extraSelections}
                        onExtraChange={(extraOptionId, aantal) =>
                          setExtraSelections((prev) => ({ ...prev, [extraOptionId]: aantal }))
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
                  slug={slug}
                  breakdown={breakdown}
                  snapshot={snapshot}
                  costSettings={costSettings}
                  bedankTekst={bedankTekst}
                  magOfferteAanvragen={magOfferteAanvragen}
                  heeftOntbrekendeVerplichteMaterialen={heeftOntbrekendeVerplichteMaterialen}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {contactPositie === "ONDERAAN" && heeftContact && (
        <ContactBalk telefoonnummer={contact.telefoonnummer} email={contact.email} />
      )}

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Deze berekening is een indicatie. Aan dit overzicht kunnen geen rechten worden ontleend.
        {toonPoweredBy && (
          <>
            <br />
            <Link href="/" className="font-medium text-foreground hover:underline">
              Powered by Kostenplan
            </Link>
          </>
        )}
      </footer>
    </div>
  );
}

function ContactBalk({
  telefoonnummer,
  email,
}: {
  telefoonnummer: string | null;
  email: string | null;
}) {
  return (
    <div className="border-b border-border bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2.5 text-sm text-foreground sm:justify-start sm:px-6">
        {telefoonnummer && (
          <a
            href={`tel:${telefoonnummer.replace(/[^+\d]/g, "")}`}
            className="flex items-center gap-1.5 hover:underline"
          >
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

function materiaalPrijsWeergave(material: MaterialOption): Bedrag {
  if (material.prijsType === "BANDBREEDTE" && material.prijsMin != null && material.prijsMax != null) {
    return { min: material.prijsMin, max: material.prijsMax };
  }
  return material.prijs;
}

function ProductCard({
  product,
  costSettings,
  qty,
  onQtyChange,
  sjabloonInvoer,
  onSjabloonInvoerChange,
  regelsBedrag,
  materialSelections,
  onMaterialSelect,
  extraSelections,
  onExtraChange,
}: {
  product: ProductWithDetails;
  costSettings: CostSettings;
  qty: number;
  onQtyChange: (qty: number) => void;
  sjabloonInvoer: Record<string, unknown>;
  onSjabloonInvoerChange: (waarden: Record<string, unknown>) => void;
  regelsBedrag: number;
  materialSelections: Record<string, string>;
  onMaterialSelect: (categoryId: string, materialOptionId: string) => void;
  extraSelections: Record<string, number>;
  onExtraChange: (extraOptionId: string, aantal: number) => void;
}) {
  const isEnkeleHoeveelheid = product.sjabloon === "ENKELE_HOEVEELHEID";
  const active = isEnkeleHoeveelheid ? qty > 0 : qty > 0 || regelsBedrag > 0;
  // Categorieën met precies 1 optie hebben niets te kiezen — die optie telt
  // automatisch mee (zie geselecteerdeMateriaalOptieId in calculate.ts) en
  // wordt hier dus niet als keuze getoond.
  const categoriesWithOptions = product.materiaalCategorieen.filter(
    (category) => category.materialen.length > 1
  );
  const ProductIcon = getProductIcon(product.icoon);

  const eigenPrijs = eigenProductPrijs(product, qty, regelsBedrag, materialSelections, costSettings);

  return (
    <Card
      className={
        active ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10" : undefined
      }
    >
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {ProductIcon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-foreground">
                {/* eslint-disable-next-line react-hooks/static-components -- stable lookup from a module-level icon map, not a new component */}
                <ProductIcon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground">{product.naam}</p>
              {product.omschrijving && (
                <p className="mt-0.5 text-sm text-muted-foreground">{product.omschrijving}</p>
              )}
            </div>
          </div>
          {isEnkeleHoeveelheid ? (
            <QuantityStepper
              naam={product.naam}
              eenheid={unitLabel(product.eenheid)}
              qty={qty}
              onChange={onQtyChange}
            />
          ) : (
            eigenPrijs > 0 && (
              <span className="shrink-0 text-sm font-semibold text-foreground">
                ≈ {formatCurrency(eigenPrijs)}
              </span>
            )
          )}
        </div>

        {!isEnkeleHoeveelheid && (
          <div className="border-t border-border pt-4">
            <SjabloonInvoer product={product} invoer={sjabloonInvoer} onInvoerChange={onSjabloonInvoerChange} />
          </div>
        )}

        {active && (categoriesWithOptions.length > 0 || product.extraOpties.length > 0) && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            {categoriesWithOptions.map((category) => {
              const hasFotos = category.materialen.some((m) => m.foto);
              const ontbreektVerplichteKeuze =
                category.verplicht && !materialSelections[category.id];
              return (
                <div key={category.id} className="flex flex-col gap-1.5">
                  <Label htmlFor={`materiaal-${category.id}`}>
                    {category.naam}
                    {category.verplicht && (
                      <span className="ml-1.5 text-xs font-normal text-destructive">
                        Verplicht
                      </span>
                    )}
                  </Label>
                  {hasFotos ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {category.materialen.map((material) => {
                        const isSelected = materialSelections[category.id] === material.id;
                        return (
                          <button
                            key={material.id}
                            type="button"
                            onClick={() => onMaterialSelect(category.id, material.id)}
                            aria-pressed={isSelected}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-md border-2 p-2 text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              isSelected
                                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                                : "border-border bg-card hover:border-[var(--brand-primary)]/40 hover:bg-secondary"
                            )}
                          >
                            <div className="relative">
                              {material.foto ? (
                                // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
                                <img
                                  src={material.foto}
                                  alt=""
                                  className="h-16 w-16 rounded-md object-cover"
                                />
                              ) : (
                                <span className="flex h-16 w-16 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                                  {ProductIcon ? (
                                    <ProductIcon className="h-6 w-6" />
                                  ) : (
                                    <ImageIcon className="h-6 w-6" />
                                  )}
                                </span>
                              )}
                              {isSelected && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] ring-2 ring-card">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium text-foreground">
                              {material.naam}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrencyRange(materiaalPrijsWeergave(material))} /{" "}
                              {unitLabel(product.eenheid)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Select
                      id={`materiaal-${category.id}`}
                      value={materialSelections[category.id] ?? ""}
                      onChange={(e) => onMaterialSelect(category.id, e.target.value)}
                      className={ontbreektVerplichteKeuze ? "border-destructive" : undefined}
                    >
                      <option value="">Kies {category.naam.toLowerCase()}</option>
                      {category.materialen.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.naam} — {formatCurrencyRange(materiaalPrijsWeergave(material))}{" "}
                          / {unitLabel(product.eenheid)}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              );
            })}

            {product.extraOpties.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">Extra opties</p>
                {product.extraOpties.map((extra) =>
                  extra.type === "PER_STUK" ? (
                    <div
                      key={extra.id}
                      className="flex items-center gap-3 rounded-md border border-border p-2.5 text-sm"
                    >
                      {extra.foto && (
                        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
                        <img
                          src={extra.foto}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <span className="block font-medium text-foreground">{extra.naam}</span>
                        {extra.omschrijving && (
                          <span className="block text-muted-foreground">{extra.omschrijving}</span>
                        )}
                        <span className="block text-muted-foreground">
                          {formatCurrency(extra.prijs)} / stuk
                        </span>
                      </div>
                      <QuantityStepper
                        naam={extra.naam}
                        eenheid="stuks"
                        qty={extraSelections[extra.id] ?? 0}
                        onChange={(aantal) => onExtraChange(extra.id, aantal)}
                      />
                    </div>
                  ) : (
                    <label
                      key={extra.id}
                      className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--brand-primary)]"
                        checked={(extraSelections[extra.id] ?? 0) > 0}
                        onChange={(e) => onExtraChange(extra.id, e.target.checked ? 1 : 0)}
                      />
                      {extra.foto && (
                        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
                        <img
                          src={extra.foto}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <span className="flex-1">
                        <span className="block font-medium text-foreground">{extra.naam}</span>
                        {extra.omschrijving && (
                          <span className="block text-muted-foreground">{extra.omschrijving}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        + {formatCurrency(extra.prijs)} / {unitLabel(product.eenheid)}
                      </span>
                    </label>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Prijsindicatie van dit ene product — bij Artikelregels is het regelsbedrag
// al kant-en-klaar geprijsd per artikeltype (zie sjablonen.ts), bij de
// andere sjablonen zijn het de vier kostenblokken, net als calculate.ts
// zelf toepast (zonder stapgrootte-afronding — bewust een lichte
// benadering, puur een indicatie op de kaart zelf; de Summary hiernaast
// blijft de bron van waarheid).
function eigenProductPrijs(
  product: ProductWithDetails,
  qty: number,
  regelsBedrag: number,
  materialSelections: Record<string, string>,
  costSettings: CostSettings
): number {
  if (regelsBedrag > 0) return regelsBedrag;
  if (qty <= 0) return 0;

  const { totaal: materiaalkosten, primaireOptie } = berekenMateriaalRegels(
    product.materiaalCategorieen,
    qty,
    materialSelections
  );

  const productiviteit = primaireOptie?.productiviteitOverride ?? product.productiviteit;
  const arbeidTarief =
    product.arbeidTariefOverride ?? arbeidTariefVoorStapEenheid(costSettings, costSettings.arbeidStapEenheid);
  const transportBedrag = product.transportkostenOverride ?? costSettings.transportTarief;
  const voorrijBedrag = product.voorrijkostenOverride ?? costSettings.voorrijTarief;

  const kosten = berekenProductKosten({
    materiaalkosten,
    materiaalEnabled: costSettings.materiaalEnabled,
    hoeveelheid: qty,
    productiviteit,
    arbeidTarief,
    arbeidEnabled: costSettings.arbeidEnabled,
    arbeidAfronden: costSettings.arbeidAfronden,
    transportBedrag,
    transportMeeschalend: product.transportMeeschalend,
    transportEnabled: costSettings.transportEnabled,
    voorrijBedrag,
    voorrijMeeschalend: product.voorrijMeeschalend,
    voorrijEnabled: costSettings.voorrijEnabled,
  });
  return kosten.totaal;
}

// Rendert de klantvelden van het gekozen sjabloon (Afmetingen/Ruimtes/
// Artikelregels) — ENKELE_HOEVEELHEID heeft hier bewust geen velden (zie
// sjablonen.ts) en blijft de bestaande QuantityStepper gebruiken.
function SjabloonInvoer({
  product,
  invoer,
  onInvoerChange,
}: {
  product: ProductWithDetails;
  invoer: Record<string, unknown>;
  onInvoerChange: (waarden: Record<string, unknown>) => void;
}) {
  const config = (product.sjabloonConfig as Record<string, unknown> | null) ?? {};
  const velden = klantVeldenVoorSjabloon(product.sjabloon, config);

  function setVeldWaarde(key: string, waarde: unknown) {
    onInvoerChange({ ...invoer, [key]: waarde });
  }

  return (
    <div className="flex flex-col gap-3">
      {velden.map((veld) =>
        veld.soort === "regelgroep" ? (
          <SjabloonRegelgroep
            key={veld.key}
            veld={veld}
            regels={Array.isArray(invoer[veld.key]) ? (invoer[veld.key] as Record<string, unknown>[]) : []}
            onChange={(regels) => setVeldWaarde(veld.key, regels)}
          />
        ) : (
          <SjabloonEenvoudigVeld
            key={veld.key}
            veld={veld}
            waarde={invoer[veld.key]}
            onChange={(waarde) => setVeldWaarde(veld.key, waarde)}
          />
        )
      )}
    </div>
  );
}

function SjabloonEenvoudigVeld({
  veld,
  waarde,
  onChange,
}: {
  veld: GetalVeld | TekstVeld | KeuzeVeld | JaNeeVeld;
  waarde: unknown;
  onChange: (waarde: unknown) => void;
}) {
  if (veld.soort === "getal") {
    return (
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`sv-${veld.key}`}>{veld.label}</Label>
        <div className="flex items-center gap-1.5">
          <DecimalField
            id={`sv-${veld.key}`}
            value={typeof waarde === "number" ? waarde : parseGetal(waarde, 0)}
            onChange={onChange}
            placeholder="0"
            className="h-11 w-24 text-right"
          />
          {veld.eenheid && <span className="text-xs text-muted-foreground">{veld.eenheid}</span>}
        </div>
      </div>
    );
  }

  if (veld.soort === "janee") {
    return (
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-foreground">{veld.label}</span>
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-input accent-[var(--brand-primary)]"
          checked={Boolean(waarde)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }

  if (veld.soort === "keuze") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{veld.label}</Label>
        <Select value={typeof waarde === "string" ? waarde : ""} onChange={(e) => onChange(e.target.value)}>
          {veld.opties.map((optie) => (
            <option key={optie.waarde} value={optie.waarde}>
              {optie.label}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{veld.label}</Label>
      <Input
        value={typeof waarde === "string" ? waarde : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={veld.placeholder}
      />
    </div>
  );
}

function SjabloonRegelgroep({
  veld,
  regels,
  onChange,
}: {
  veld: RegelgroepVeld;
  regels: Record<string, unknown>[];
  onChange: (regels: Record<string, unknown>[]) => void;
}) {
  function updateRegel(index: number, kolomKey: string, waarde: unknown) {
    onChange(regels.map((regel, i) => (i === index ? { ...regel, [kolomKey]: waarde } : regel)));
  }

  function verwijderRegel(index: number) {
    onChange(regels.filter((_, i) => i !== index));
  }

  function voegRegelToe() {
    const nieuweRegel: Record<string, unknown> = {};
    for (const kolom of veld.kolommen) {
      nieuweRegel[kolom.key] = kolom.soort === "keuze" ? (kolom.standaardWaarde ?? kolom.opties[0]?.waarde ?? "") : "";
    }
    onChange([...regels, nieuweRegel]);
  }

  return (
    <div className="flex flex-col gap-2">
      {regels.map((regel, index) => (
        <div
          key={index}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3"
        >
          {veld.kolommen.map((kolom) => {
            if (veld.zichtbaarAls && !veld.zichtbaarAls(kolom.key, regel)) return null;
            return (
              <div key={kolom.key} className="flex min-w-[6.5rem] flex-1 flex-col gap-1">
                <span className="text-xs text-muted-foreground">{kolom.label}</span>
                {kolom.soort === "getal" ? (
                  <DecimalField
                    value={typeof regel[kolom.key] === "number" ? (regel[kolom.key] as number) : parseGetal(regel[kolom.key], 0)}
                    onChange={(waarde) => updateRegel(index, kolom.key, waarde)}
                    placeholder="0"
                    className="h-11"
                  />
                ) : kolom.soort === "keuze" ? (
                  <Select
                    value={typeof regel[kolom.key] === "string" ? (regel[kolom.key] as string) : ""}
                    onChange={(e) => updateRegel(index, kolom.key, e.target.value)}
                  >
                    {kolom.opties.map((optie) => (
                      <option key={optie.waarde} value={optie.waarde}>
                        {optie.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={typeof regel[kolom.key] === "string" ? (regel[kolom.key] as string) : ""}
                    onChange={(e) => updateRegel(index, kolom.key, e.target.value)}
                    placeholder={kolom.placeholder}
                  />
                )}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => verwijderRegel(index)}
            aria-label="Regel verwijderen"
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={voegRegelToe}
        className="w-full gap-1.5 border-dashed border-[var(--brand-primary)]/40 bg-transparent hover:bg-[var(--brand-primary)]/10"
      >
        <Plus className="h-4 w-4" />
        {veld.toevoegLabel}
      </Button>
    </div>
  );
}

function QuantityStepper({
  naam,
  eenheid,
  qty,
  onChange,
}: {
  naam: string;
  eenheid: string;
  qty: number;
  onChange: (qty: number) => void;
}) {
  const step = 1;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, round(qty - step)))}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
        disabled={qty <= 0}
        aria-label={`${naam} verminderen`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex flex-col items-center">
        <DecimalField
          value={qty}
          onChange={onChange}
          placeholder="0"
          className="h-11 w-20 text-center"
          aria-label={`Aantal ${naam}`}
        />
        <span className="mt-0.5 text-xs text-muted-foreground">{eenheid}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(round(qty + step))}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
        aria-label={`${naam} toevoegen`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Summary({
  slug,
  breakdown,
  snapshot,
  costSettings,
  bedankTekst,
  magOfferteAanvragen,
  heeftOntbrekendeVerplichteMaterialen,
}: {
  slug: string;
  breakdown: ReturnType<typeof calculateBreakdownRange>;
  snapshot: LeadSnapshot;
  costSettings: CostSettings;
  bedankTekst: string;
  magOfferteAanvragen: boolean;
  heeftOntbrekendeVerplichteMaterialen: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const action = createLeadAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(action, null);
  // Los bijgehouden (niet defaultValue): React reset uncontrolled velden na
  // elke form action, ook bij een fout. Zonder deze eigen state raakt de
  // klant bij bijv. een ongeldig e-mailadres ook de al ingevulde naam kwijt.
  const [leadNaam, setLeadNaam] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadTelefoon, setLeadTelefoon] = useState("");

  const rows: { label: string; value: Bedrag }[] = [];
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

  // Als een kostenpost wél meetelt in het totaal maar zijn eigen regel
  // verborgen is (CostSettings.*Zichtbaar uit), mag het Subtotaal niet
  // getoond worden: dat zou de klant alsnog in staat stellen de verborgen
  // post te herleiden door de zichtbare regels van het subtotaal af te
  // trekken. In dat geval tonen we alleen de wél-zichtbare regels en het
  // eindtotaal, zonder subtotaal/btw-tussenstap.
  const heeftVerborgenKostenpost =
    (costSettings.arbeidEnabled && !costSettings.arbeidZichtbaar) ||
    (costSettings.materiaalEnabled && !costSettings.materiaalZichtbaar) ||
    (costSettings.transportEnabled && !costSettings.transportZichtbaar) ||
    (costSettings.voorrijEnabled && !costSettings.voorrijZichtbaar);

  return (
    <>
      <Card className="border-[var(--brand-primary)]/30">
        <CardContent className="flex flex-col gap-4">
          <h3 className="font-semibold text-foreground">Jouw kostenraming</h3>

          {!breakdown.heeftSelectie ? (
            <p className="text-sm text-muted-foreground">
              Selecteer producten om een schatting te zien.
            </p>
          ) : state?.success ? (
            <p className="rounded-lg bg-[var(--brand-primary)]/10 px-3 py-3 text-sm text-foreground">
              {bedankTekst}
            </p>
          ) : (
            <>
              {rows.length > 0 && (
                <div className="flex flex-col gap-2 text-sm">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrencyRange(row.value)}
                      </span>
                    </div>
                  ))}
                  {!heeftVerborgenKostenpost && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotaal</span>
                        <span className="font-medium text-foreground">
                          {formatCurrencyRange(breakdown.subtotaal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Btw ({costSettings.btwPercentage}%)
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrencyRange(breakdown.btw)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-3">
                <span className="font-semibold text-accent-foreground">Totaal (incl. btw)</span>
                <span className="text-lg font-bold text-accent-foreground">
                  {formatCurrencyRange(breakdown.totaal)}
                </span>
              </div>
              {breakdown.modus === "TOTAAL" &&
                breakdown.margeOmlaag != null &&
                breakdown.margeOmhoog != null && (
                  <p className="text-xs text-muted-foreground">
                    Indicatie −{breakdown.margeOmlaag}% / +{breakdown.margeOmhoog}%
                  </p>
                )}

              {heeftOntbrekendeVerplichteMaterialen && (
                <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                  Kies bij elk product een verplicht materiaal om een volledige prijsindicatie te
                  zien{magOfferteAanvragen ? " en een offerte te kunnen aanvragen" : ""}.
                </p>
              )}

              {formOpen ? (
                <form action={formAction} noValidate className="flex flex-col gap-3">
                  <input type="hidden" name="snapshot" value={JSON.stringify(snapshot)} />
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lead-naam">Naam</Label>
                    <Input
                      id="lead-naam"
                      name="naam"
                      value={leadNaam}
                      onChange={(e) => setLeadNaam(e.target.value)}
                      required
                      autoFocus
                    />
                    {state?.fieldErrors?.naam && (
                      <p className="text-xs text-destructive">{state.fieldErrors.naam}</p>
                    )}
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
                    {state?.fieldErrors?.email && (
                      <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
                    )}
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      className="w-full sm:flex-1"
                      onClick={() => setFormOpen(false)}
                      disabled={pending}
                    >
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
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="w-full sm:flex-1"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                    Bewaar als PDF
                  </Button>
                  {magOfferteAanvragen && (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-full border-transparent bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:opacity-90 sm:flex-1"
                      onClick={() => setFormOpen(true)}
                      disabled={heeftOntbrekendeVerplichteMaterialen}
                    >
                      <Mail className="h-4 w-4" />
                      Offerte aanvragen
                    </Button>
                  )}
                </div>
              )}
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

function parseDecimal(raw: string) {
  return Number(raw.trim().replace(",", "."));
}

// Local text buffer, not just `value` formatted as a string: a controlled
// value derived straight from the number would snap "2," back to "2" the
// instant the comma is typed (since parsing "2," already equals 2), making
// it impossible to ever type a decimal. The buffer only gets overwritten
// when `value` changes from elsewhere (e.g. the +/- stepper buttons) and no
// longer matches what's currently typed.
function DecimalField({
  value,
  onChange,
  ...props
}: {
  value: number;
  onChange: (value: number) => void;
} & Omit<React.ComponentProps<typeof DecimalInput>, "value" | "onChange">) {
  const [text, setText] = useState(value === 0 ? "" : String(value));
  const [prevValue, setPrevValue] = useState(value);

  // Adjust state during render when `value` changes externally (e.g. the
  // +/- stepper buttons), per https://react.dev/learn/you-might-not-need-an-effect
  // — avoids the extra render pass a useEffect-based sync would cause.
  if (value !== prevValue) {
    setPrevValue(value);
    if (parseDecimal(text) !== value) {
      setText(value === 0 ? "" : String(value));
    }
  }

  function handleChange(raw: string) {
    setText(raw);
    if (raw.trim() === "") {
      onChange(0);
      return;
    }
    const parsed = parseDecimal(raw);
    if (!Number.isNaN(parsed)) {
      onChange(Math.max(0, parsed));
    }
  }

  return <DecimalInput value={text} onChange={(e) => handleChange(e.target.value)} {...props} />;
}
