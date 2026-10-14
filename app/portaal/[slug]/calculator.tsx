"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseGetal as leesGetal } from "@/app/lib/getal";
import { MAX_HOEVEELHEID } from "@/app/lib/pricing/rond";
import { LopendTotaal } from "./lopend-totaal";
import Link from "next/link";
import { Minus, Plus, Printer, Mail, Phone, Image as ImageIcon, Check } from "lucide-react";
import { bedragTop, type Bedrag, type BreakdownRange } from "@/app/lib/calculate";
import { configVanProducten, invoerVanKlant } from "@/app/lib/pricing/adapters";
import { berekenPrijs } from "@/app/lib/pricing/engine";
import { formatEuro } from "@/app/lib/pricing/format";
import { breakdownRangeVan } from "@/app/lib/pricing/weergave";
import { adresIsKlaar, adresRegel, locatieInvoerVan, type AdresKeuze } from "@/app/lib/werkgebied/adres-invoer";
import { meldingBuiten, meldingMinimumTarief, meldingOnderMinimum } from "@/app/lib/werkgebied/teksten";
import type { WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";
import { AdresVraag, LocatieBericht } from "./locatie-vragen";
import {
  klantVeldenVoorSjabloon,
  parseGetal,
  type GetalVeld,
  type JaNeeVeld,
  type KeuzeVeld,
  type RegelgroepVeld,
  type TekstVeld,
} from "@/app/lib/sjablonen";
import { formatCurrencyRange } from "@/app/lib/format";
import { Card, CardContent } from "@/app/components/ui/card";
import { Logo } from "@/app/components/ui/logo";
import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { getProductIcon } from "@/app/lib/icons";
import { voorbeeldHoeveelheidVoor as voorbeeldHoeveelheid } from "@/app/lib/werkzaamheid";
import { unitLabel } from "@/app/lib/units";
import { cn } from "@/app/lib/cn";
import { fontFamilyFor, brandingFontVariables } from "@/app/lib/fonts";
import { accessibleTextColor } from "@/app/lib/color";
import { UitgesteldMelding, useLeadVersturen } from "./lead-versturen";
import { Bewerkbaar, EditorProvider, WerkzaamheidToevoegen, useEditorHaak, type EditorHaken } from "./bewerkbaar";
import { recordPublicAnalyticsEventAction } from "@/app/lib/actions/analytics";
import type { LeadSnapshot } from "@/app/lib/leads";
import { bouwLeadSnapshot } from "@/app/lib/lead-snapshot";
import type {
  Branding,
  CostSettings,
  ExtraOption,
  MaterialCategory,
  MaterialOption,
  Product,
  SubscriptionTier,
} from "@/app/generated/prisma/client";

export type ProductWithDetails = Product & {
  materiaalCategorieen: (MaterialCategory & { materialen: MaterialOption[] })[];
  extraOpties: ExtraOption[];
};

type Props = {
  toolId: string;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  branding: Branding | null;
  costSettings: CostSettings;
  products: ProductWithDetails[];
  // Alleen gezet door de rekentool-editor: maakt delen klikbaar. Zonder editor
  // verandert er niets aan de klant-rekentool.
  editor?: EditorHaken;
  // Uit Tool.resultaatConfig / Tool.leadFormConfig (paneel Resultaat en
  // Aanvraagformulier in de editor).
  toelichting?: string | null;
  ctaTekst?: string | null;
  vraagTelefoon?: boolean;
  // Werkgebied en minimale opdracht (uit de momentopname of de database). Ontbreekt of uit = geen verandering.
  werkgebied?: WerkgebiedInstellingen | null;
};

// Moet gelijk blijven aan de Kostenplan-standaardkleuren in globals.css
// (--primary / --background, light mode) — de kleur/lettertype die een
// Gratis-tenant altijd krijgt, ongeacht wat er in Branding is opgeslagen
// (bijv. na een downgrade vanaf Plus/Pro).
const STANDAARD_PRIMAIRE_KLEUR = "#15803d";
const STANDAARD_ACHTERGRONDKLEUR = "#f7faf8";

// Kleuren en lettertype van de klant-rekentool — gedeeld door de calculator
// zelf en het live klantvoorbeeld in het dashboard (zie
// app/components/dashboard/klant-voorbeeld.tsx), zodat die nooit uit elkaar
// lopen. Personalisatie is een Plus/Pro-feature en wordt hier bij elke render
// opnieuw afgedwongen.
export function brandStijl(branding: Branding | null, subscriptionTier: SubscriptionTier) {
  const magPersonaliseren = subscriptionTier !== "GRATIS";
  const primaireKleur = magPersonaliseren
    ? (branding?.primaireKleur ?? STANDAARD_PRIMAIRE_KLEUR)
    : STANDAARD_PRIMAIRE_KLEUR;
  const achtergrondKleur = magPersonaliseren
    ? (branding?.achtergrondKleur ?? STANDAARD_ACHTERGRONDKLEUR)
    : STANDAARD_ACHTERGRONDKLEUR;
  return {
    primaireKleur,
    achtergrondKleur,
    brandPrimaryForeground: accessibleTextColor(primaireKleur),
    fontFamily: fontFamilyFor(magPersonaliseren ? (branding?.lettertype ?? "MODERN") : "MODERN"),
    fontClasses: brandingFontVariables(),
  };
}

// Klantvriendelijke weergave van een eenheid, alleen voor deze configurator.
// "m¹" is vaktaal die een consument niet meteen herkent — in het
// admin-dashboard (waar de vakman zelf uit "m¹"/"m²"/"m³" kiest) blijft
// unitLabel() uit units.ts bewust ongewijzigd, dit is puur klant-weergave.
function klantEenheidLabel(eenheid: string) {
  if (eenheid === "m1") return "meter";
  return unitLabel(eenheid);
}

export function Calculator({
  toolId,
  bedrijfsnaam,
  email,
  subscriptionTier,
  branding,
  costSettings,
  products,
  editor,
  toelichting = null,
  ctaTekst = null,
  vraagTelefoon = true,
  werkgebied = null,
}: Props) {
  const inEditor = Boolean(editor);
  // Rechtstreeks door de klant bijgehouden hoeveelheid — alleen gebruikt voor
  // sjabloon ENKELE_HOEVEELHEID (de QuantityStepper). Voor de andere
  // sjablonen (Afmetingen/Ruimtes/Artikelregels) wordt de hoeveelheid
  // afgeleid uit productSjabloonInvoer hieronder, zie effectiveProductQty.
  const [productQty, setProductQty] = useState<Record<string, number>>(() =>
    editor && products[0] && products[0].sjabloon === "ENKELE_HOEVEELHEID"
      ? { [products[0].id]: voorbeeldHoeveelheid(products[0].eenheid) }
      : {}
  );
  // Ruwe klantinvoer per sjabloon-veld (bijv. lengte/breedte, of de
  // ruimtes/artikelregels-lijst) — zie sjablonen.ts's klantVelden().
  const [productSjabloonInvoer, setProductSjabloonInvoer] = useState<
    Record<string, Record<string, unknown>>
  >(() => (editor && products[0] && products[0].sjabloon !== "ENKELE_HOEVEELHEID" ? { [products[0].id]: { lengte: 5, breedte: 4, diepte: 0.1 } } : {}));
  const [materialSelections, setMaterialSelections] = useState<Record<string, string>>(() =>
    // In de editor staat bij het eerste voorbeeld alvast het eerste materiaal gekozen.
    editor && products[0]
      ? Object.fromEntries(products[0].materiaalCategorieen.filter((c) => c.materialen[0]).map((c) => [c.id, c.materialen[0].id]))
      : {}
  );
  const [extraSelections, setExtraSelections] = useState<Record<string, number>>({});

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
    "Bedankt voor je aanvraag! Wij nemen binnen 24 uur contact met je op.";
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
        { type: "kostenplan:resize", toolId, height: document.body.scrollHeight },
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
  }, [toolId]);

  // VISIT — één keer per paginabezoek. Bewust een lege dependency-array
  // (niet [toolId]) zodat dit ook standhoudt tegen React StrictMode se
  // dubbele mount in dev; de eventuele échte tweede mount in productie is
  // hetzelfde gedrag als vóór deze analytics-toevoeging sowieso al gold voor
  // een paginabezoek.
  const visitRecorded = useRef(false);
  useEffect(() => {
    if (visitRecorded.current || inEditor) return;
    visitRecorded.current = true;
    recordPublicAnalyticsEventAction(toolId, "VISIT").catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // De ene rekenkern (app/lib/pricing): dezelfde berekening als de server bij het versturen van de
  // aanvraag en als de offerte. Hier alleen de configuratie en de keuzes van de klant erin stoppen.
  // Werkgebied: de eerste vraag is het adres. De afstand hemelsbreed tot het startadres komt hier in de invoer,
  // de kern bepaalt wat dat betekent (toeslag, melding, markering).
  const vraagAdres = Boolean(werkgebied?.werkgebied.aan);
  const [adres, setAdres] = useState<AdresKeuze>({ soort: "leeg" });
  const adresKlaar = !vraagAdres || adresIsKlaar(adres);
  const locatie = useMemo(() => (vraagAdres ? locatieInvoerVan(adres, werkgebied) : undefined), [vraagAdres, adres, werkgebied]);
  const config = useMemo(() => configVanProducten(products, costSettings, { werkgebied }), [products, costSettings, werkgebied]);
  const invoer = useMemo(
    () => invoerVanKlant({ producten: products, hoeveelheden: productQty, sjabloonInvoer: productSjabloonInvoer, materiaalKeuzes: materialSelections, extraKeuzes: extraSelections, locatie }),
    [products, productQty, productSjabloonInvoer, materialSelections, extraSelections, locatie]
  );
  const resultaat = useMemo(() => berekenPrijs(config, invoer), [config, invoer]);
  const breakdown = useMemo(() => breakdownRangeVan(resultaat), [resultaat]);
  const onderdeelPerId = useMemo(() => new Map(resultaat.onderdelen.map((o) => [o.id, o])), [resultaat]);

  // Een verplichte materiaalcategorie zonder keuze houdt de prijsindicatie
  // onvolledig — de klant mag dan geen offerte aanvragen totdat dit is opgelost.
  const heeftOntbrekendeVerplichteMaterialen = resultaat.waarschuwingen.some((w) => w.code === "ontbrekende-keuze");

  // START — zodra de klant voor het eerst iets selecteert (heeftSelectie
  // wordt al elders berekend, zie calculate.ts). COMPLETE — zodra dat leidt
  // tot een geldige, volledige prijsindicatie (een positief totaalbedrag, en
  // geen ontbrekende verplichte materiaalkeuze meer). Beide precies één keer
  // per bezoek, ongeacht hoe vaak de klant daarna nog verder wijzigt.
  const startRecorded = useRef(false);
  const completeRecorded = useRef(false);
  useEffect(() => {
    if (inEditor) return;
    if (!startRecorded.current && breakdown.heeftSelectie) {
      startRecorded.current = true;
      recordPublicAnalyticsEventAction(toolId, "START").catch(() => {});
    }
    if (!completeRecorded.current && breakdown.heeftSelectie && !heeftOntbrekendeVerplichteMaterialen && bedragTop(breakdown.totaal) > 0) {
      completeRecorded.current = true;
      recordPublicAnalyticsEventAction(toolId, "COMPLETE").catch(() => {});
    }
  }, [toolId, breakdown, heeftOntbrekendeVerplichteMaterialen, inEditor]);

  // Bevroren "wat had de klant aangevinkt" voor de leads-CRM (zie
  // app/lib/leads.ts) — meegestuurd bij "Offerte aanvragen" zodat de vakman
  // later precies kan zien waarop de prijsindicatie was gebaseerd, ook als de
  // Producten zelf intussen gewijzigd zijn.
  const snapshot: LeadSnapshot = useMemo(
    () => bouwLeadSnapshot({ config, invoer, resultaat, adres: adres.soort === "gevonden" ? { straat: adres.adres.straat, plaats: adres.adres.plaats, lat: adres.adres.lat, lon: adres.adres.lon } : null }),
    [config, invoer, resultaat, adres]
  );

  // Meldingen voor de klant (direct zichtbaar, geen pop-up): buiten het werkgebied bij het adres, het minimum bij het totaal.
  const buitenTekst = vraagAdres && !resultaat.serviceArea.allowed ? meldingBuiten(werkgebied?.werkgebied.melding) : null;
  const minimumTekst = resultaat.minimum.topUpCenten > 0 ? meldingMinimumTarief(resultaat.minimum.minimumInclCenten) : !resultaat.minimum.allowed ? meldingOnderMinimum(resultaat.minimum.minimumInclCenten) : null;
  const adresTekst = adres.soort === "gevonden" ? adresRegel({ straat: adres.adres.straat, huisnummer: adres.adres.huisnummer, postcode: adres.adres.postcode, plaats: adres.adres.plaats }) : adres.soort === "niet-gecontroleerd" ? `${adres.ruw.postcode.replace(/^(\d{4})([A-Z]{2})$/, "$1 $2")} ${adres.ruw.huisnummer}${adres.ruw.toevoeging ? ` ${adres.ruw.toevoeging}` : ""}` : null;

  const isEmpty = products.length === 0;

  return (
    <EditorProvider haak={editor}>
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
      <Bewerkbaar doel="uiterlijk" label="Uiterlijk" className="rounded-none">
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
                <p className="text-sm font-medium text-[var(--brand-primary-foreground)]">Rekentool van</p>
                <h1 className="truncate text-xl font-semibold text-[var(--brand-primary-foreground)]">{bedrijfsnaam}</h1>
              </>
            )}
          </div>
          <span className="print:hidden">
            <ThemeToggle />
          </span>
        </div>
      </header>
      </Bewerkbaar>

      {contactPositie === "BOVENAAN" && heeftContact && (
        <ContactBalk telefoonnummer={contact.telefoonnummer} email={contact.email} />
      )}

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {isEmpty ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Deze calculator is nog niet ingericht. Neem contact op met {bedrijfsnaam} voor een offerte.
              <div className="mt-4"><WerkzaamheidToevoegen /></div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-8 lg:order-1">
              <Bewerkbaar doel="uiterlijk-tekst" label="Introtekst">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Stel je project samen
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {welkomstTekst ??
                    "Geef bij de onderdelen de gewenste hoeveelheid op. Je ziet direct een schatting van de kosten hiernaast."}
                </p>
              </div>
              </Bewerkbaar>

              {vraagAdres && (
                <div className="flex flex-col gap-3">
                  <AdresVraag keuze={adres} onKeuze={setAdres} />
                  {adresKlaar && buitenTekst && <LocatieBericht soort="blokkade" tekst={buitenTekst} contact={contact} />}
                </div>
              )}

              {products.length > 0 && adresKlaar && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Onderdelen
                  </h3>
                  <div className="flex flex-col gap-3">
                    {products.map((product) => (
                      <Bewerkbaar key={product.id} doel={`werkzaamheid:${product.id}`} label={product.naam} verplaatsbaar>
                      <ProductCard
                        key={product.id}
                        product={product}
                        eigenPrijs={(onderdeelPerId.get(product.id)?.subtotaalExclCenten ?? 0) / 100}
                        qty={onderdeelPerId.get(product.id)?.hoeveelheid ?? 0}
                        onQtyChange={(qty) =>
                          setProductQty((prev) => ({ ...prev, [product.id]: qty }))
                        }
                        sjabloonInvoer={productSjabloonInvoer[product.id] ?? {}}
                        onSjabloonInvoerChange={(waarden) =>
                          setProductSjabloonInvoer((prev) => ({ ...prev, [product.id]: waarden }))
                        }
                        regelsBedrag={(onderdeelPerId.get(product.id)?.kosten.artikel ?? 0) / 100}
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
                      </Bewerkbaar>
                    ))}
                    <WerkzaamheidToevoegen />
                  </div>
                </section>
              )}
            </div>

            <div className="lg:order-2">
              <div className="flex flex-col gap-4 lg:sticky lg:top-6">
                <Summary
                  toolId={toolId}
                  bedrijfsnaam={bedrijfsnaam}
                  contact={contact}
                  breakdown={breakdown}
                  snapshot={snapshot}
                  costSettings={costSettings}
                  bedankTekst={bedankTekst}
                  magOfferteAanvragen={magOfferteAanvragen}
                  heeftOntbrekendeVerplichteMaterialen={heeftOntbrekendeVerplichteMaterialen}
                  toelichting={toelichting}
                  ctaTekst={ctaTekst}
                  vraagTelefoon={vraagTelefoon}
                  afstandskosten={resultaat.serviceArea.distanceKm}
                  aanvraagGeblokkeerd={!resultaat.requestAllowed && adresKlaar}
                  geblokkeerdTekst={buitenTekst ? "Een aanvraag is voor dit adres niet mogelijk." : null}
                  minimumTekst={minimumTekst}
                  adresTekst={adresTekst}
                  adresNog={vraagAdres && !adresKlaar}
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
    </EditorProvider>
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

export function ProductCard({
  product,
  eigenPrijs,
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
  // Het bedrag van dit onderdeel (excl. btw) uit de rekenkern: hetzelfde als in het totaal hiernaast.
  eigenPrijs: number;
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
  // Toeslagen (altijd) hebben geen keuze en staan dus niet in de lijst.
  const keuzeExtras = product.extraOpties.filter((extra) => !extra.altijd);

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
              eenheid={klantEenheidLabel(product.eenheid)}
              qty={qty}
              onChange={onQtyChange}
            />
          ) : (
            eigenPrijs > 0 && (
              <span className="shrink-0 text-sm font-semibold text-foreground">
                ≈ {formatEuro(eigenPrijs)}
              </span>
            )
          )}
        </div>

        {!isEnkeleHoeveelheid && (
          <div className="border-t border-border pt-4">
            <SjabloonInvoer product={product} invoer={sjabloonInvoer} onInvoerChange={onSjabloonInvoerChange} />
          </div>
        )}

        {active && (categoriesWithOptions.length > 0 || keuzeExtras.length > 0) && (
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
                                  width={64}
                                  height={64}
                                  className="h-16 w-16 rounded-md object-cover"
                                />
                              ) : (
                                <span className="flex h-16 w-16 items-center justify-center rounded-md bg-[var(--brand-primary)]/10 text-foreground">
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
                              {klantEenheidLabel(product.eenheid)}
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
                          / {klantEenheidLabel(product.eenheid)}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              );
            })}

            {keuzeExtras.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">Extra opties</p>
                {keuzeExtras.map((extra) =>
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
                          width={40}
                          height={40}
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <span className="block font-medium text-foreground">{extra.naam}</span>
                        {extra.omschrijving && (
                          <span className="block text-muted-foreground">{extra.omschrijving}</span>
                        )}
                        <span className="block text-muted-foreground">
                          {formatEuro(extra.prijs)} / stuk
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
                          width={40}
                          height={40}
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
                        + {formatEuro(extra.prijs)} / {klantEenheidLabel(product.eenheid)}
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
    // 2 kolommen i.p.v. één volle-breedte veld per rij: Lengte/Breedte
    // staan zo naast elkaar in plaats van met een grote lege ruimte
    // ertussen op mobiel. Velden die niet naast een ander veld horen
    // (keuze/tekst/ja-nee/regelgroep) nemen zelf col-span-2.
    <div className="grid grid-cols-2 gap-3">
      {velden.map((veld) =>
        veld.soort === "regelgroep" ? (
          <div key={veld.key} className="col-span-2">
            <SjabloonRegelgroep
              veld={veld}
              regels={Array.isArray(invoer[veld.key]) ? (invoer[veld.key] as Record<string, unknown>[]) : []}
              onChange={(regels) => setVeldWaarde(veld.key, regels)}
            />
          </div>
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`sv-${veld.key}`}>{veld.label}</Label>
        <div className="flex items-center gap-1.5">
          <DecimalField
            id={`sv-${veld.key}`}
            value={typeof waarde === "number" ? waarde : parseGetal(waarde, 0)}
            onChange={onChange}
            placeholder="0"
            className="h-11 w-full text-right"
          />
          {veld.eenheid && <span className="shrink-0 text-xs text-muted-foreground">{veld.eenheid}</span>}
        </div>
      </div>
    );
  }

  if (veld.soort === "janee") {
    return (
      <label className="col-span-2 flex items-center justify-between gap-3 text-sm">
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
      <div className="col-span-2 flex flex-col gap-1.5">
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
    <div className="col-span-2 flex flex-col gap-1.5">
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
    <div className="flex shrink-0 flex-col items-center gap-1">
      {/* Eén visueel samenhangend stepper-component i.p.v. drie losse
          vlakken — min/veld/plus delen dezelfde rand en radius, elk
          segment blijft minimaal 44x44px tikgebied. */}
      <div className="inline-flex h-11 items-stretch overflow-hidden rounded-md border border-border bg-card">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, round(qty - step)))}
          className="flex w-11 shrink-0 items-center justify-center text-foreground transition-colors hover:bg-secondary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          disabled={qty <= 0}
          aria-label={`${naam} verminderen`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <DecimalField
          value={qty}
          onChange={onChange}
          placeholder="0"
          className="h-11 w-16 rounded-none border-y-0 text-center focus-visible:z-10"
          aria-label={`Aantal ${naam}`}
        />
        <button
          type="button"
          onClick={() => onChange(round(qty + step))}
          className="flex w-11 shrink-0 items-center justify-center text-foreground transition-colors hover:bg-secondary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset cursor-pointer"
          aria-label={`${naam} toevoegen`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <span className="text-xs text-muted-foreground">{eenheid}</span>
    </div>
  );
}

function Summary({
  toolId,
  bedrijfsnaam,
  contact,
  breakdown,
  snapshot,
  costSettings,
  bedankTekst,
  magOfferteAanvragen,
  heeftOntbrekendeVerplichteMaterialen,
  toelichting,
  ctaTekst,
  vraagTelefoon,
  afstandskosten,
  aanvraagGeblokkeerd,
  geblokkeerdTekst,
  minimumTekst,
  adresTekst,
  adresNog,
}: {
  // Afstand hemelsbreed (km) voor het label van de afstandstoeslag.
  afstandskosten: number | null;
  // De aanvraag mag niet (buiten het werkgebied of onder het minimum): de prijs blijft zichtbaar.
  aanvraagGeblokkeerd: boolean;
  geblokkeerdTekst: string | null;
  minimumTekst: string | null;
  adresTekst: string | null;
  // Het adres is nog niet ingevuld: er valt nog niets te rekenen.
  adresNog: boolean;
  toelichting: string | null;
  ctaTekst: string | null;
  vraagTelefoon: boolean;
  toolId: string;
  bedrijfsnaam: string;
  contact: { telefoonnummer: string | null; email: string | null };
  breakdown: BreakdownRange;
  snapshot: LeadSnapshot;
  costSettings: CostSettings;
  bedankTekst: string;
  magOfferteAanvragen: boolean;
  heeftOntbrekendeVerplichteMaterialen: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const kaartRef = useRef<HTMLDivElement>(null);
  const testmodus = useEditorHaak() !== null;
  const [state, formAction, pending] = useLeadVersturen({ toolId, bedrijfsnaam, contact, uitgeschakeld: testmodus });
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
  // Afstandstoeslag en minimumtarief zijn nooit verborgen: de klant moet zien waar ze in de prijs zitten.
  if (typeof breakdown.afstandskosten !== "number" || breakdown.afstandskosten > 0) {
    rows.push({ label: afstandskosten != null ? `Voorrijkosten extra afstand (${String(afstandskosten).replace(".", ",")} km)` : "Voorrijkosten extra afstand", value: breakdown.afstandskosten });
  }
  if (typeof breakdown.aanvulling !== "number" || breakdown.aanvulling > 0) {
    rows.push({ label: "Aanvulling tot minimumtarief", value: breakdown.aanvulling });
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
      <div ref={kaartRef}>
      <Bewerkbaar doel="resultaat" label="Resultaat">
      <Card className="border-[var(--brand-primary)]/30">
        <CardContent className="flex flex-col gap-4">
          <h3 className="font-semibold text-foreground">Jouw kostenraming</h3>

          {adresNog ? (
            <p className="text-sm text-muted-foreground">Vul eerst je postcode en huisnummer in om een schatting te zien.</p>
          ) : !breakdown.heeftSelectie ? (
            <p className="text-sm text-muted-foreground">
              Kies een onderdeel om een schatting te zien.
            </p>
          ) : (
            <>
              {/* Na het versturen blijven de prijs en "Bewaar als PDF" staan; alleen het aanvraagformulier maakt plaats voor de bedanktekst. */}
              {state?.success && (
                <p role="status" className="rounded-lg bg-[var(--brand-primary)]/10 px-3 py-3 text-sm text-foreground">
                  {bedankTekst}
                </p>
              )}
              {rows.length > 0 && (
                <div className="flex flex-col gap-2 text-sm tabular-nums">
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

              {/* Het totaal is de belangrijkste regel op de pagina — solide
                  merkkleur-vlak (dezelfde veilige, contrastgecontroleerde
                  voorgrondkleur als de header) i.p.v. de vaste accentkleur,
                  met een duidelijk groter cijfer dan de rest van het
                  overzicht. */}
              <div
                className="flex flex-col gap-1 rounded-lg px-4 py-4"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--brand-primary-foreground)]/75">
                  Totaal (incl. btw)
                </span>
                <span className="text-3xl font-bold leading-tight tracking-tight tabular-nums text-[var(--brand-primary-foreground)]">
                  {formatCurrencyRange(breakdown.totaal)}
                </span>
                {breakdown.modus === "TOTAAL" &&
                  breakdown.margeOmlaag != null &&
                  breakdown.margeOmhoog != null && (
                    <span className="text-xs text-[var(--brand-primary-foreground)]/60">
                      Indicatie −{breakdown.margeOmlaag}% / +{breakdown.margeOmhoog}%
                    </span>
                  )}
              </div>
              {minimumTekst && <LocatieBericht soort={aanvraagGeblokkeerd ? "blokkade" : "info"} tekst={minimumTekst} contact={aanvraagGeblokkeerd ? contact : undefined} />}
              {heeftOntbrekendeVerplichteMaterialen && (
                <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                  Kies bij elke onderdeel een verplicht materiaal om een volledige prijsindicatie te
                  zien{magOfferteAanvragen ? " en een offerte te kunnen aanvragen" : ""}.
                </p>
              )}

              <Bewerkbaar doel="aanvraag" label="Aanvraagformulier">
              {formOpen && !state?.success ? (
                <form
                  action={formAction}
                  onSubmit={testmodus ? (e) => e.preventDefault() : undefined}
                  noValidate
                  className="flex flex-col gap-3"
                >
                  <input type="hidden" name="snapshot" value={JSON.stringify(snapshot)} />
                  <p className="text-sm text-muted-foreground">Vul je gegevens in en verstuur je aanvraag. Het bedrijf neemt contact met je op en stuurt je vrijblijvend een offerte; je bent niets verplicht.</p>
                  {adresTekst && (
                    <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-foreground">
                      <span className="font-semibold">Adres:</span> {adresTekst}{" "}
                      <button type="button" className="font-semibold underline" onClick={() => { setFormOpen(false); document.getElementById("wg-adres")?.focus(); }}>
                        Wijzigen
                      </button>
                    </p>
                  )}
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
                  {vraagTelefoon && (
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
                  )}
                  {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
                  {state?.uitgesteld && <UitgesteldMelding info={state.uitgesteld} bedrijfsnaam={bedrijfsnaam} />}
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
                      disabled={pending || testmodus}
                    >
                      <Mail className="h-4 w-4" />
                      {pending ? "Versturen…" : "Versturen"}
                    </Button>
                  </div>
                  {testmodus && (
                    <p role="status" className="text-sm font-medium text-foreground">
                      Testmodus: er wordt geen aanvraag verstuurd.
                    </p>
                  )}
                </form>
              ) : (
                <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap">
                  {/* Primaire actie eerst (bovenaan op mobiel, voorop in de
                      rij op desktop) — "Bewaar als PDF" is bewust ghost, zo
                      blijft de aandacht op het aanvragen liggen. */}
                  {magOfferteAanvragen && !aanvraagGeblokkeerd && !state?.success && (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-full whitespace-nowrap border-transparent bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:opacity-90 sm:flex-1"
                      onClick={() => setFormOpen(true)}
                      disabled={heeftOntbrekendeVerplichteMaterialen}
                    >
                      <Mail className="h-4 w-4" />
                      {ctaTekst ?? "Offerte aanvragen"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="w-full whitespace-nowrap sm:flex-1"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                    Bewaar als PDF
                  </Button>
                </div>
              )}
              </Bewerkbaar>
              {aanvraagGeblokkeerd && geblokkeerdTekst && !minimumTekst && <LocatieBericht soort="blokkade" tekst={geblokkeerdTekst} contact={contact} />}
              {toelichting && <p className="text-sm text-muted-foreground">{toelichting}</p>}
            </>
          )}
        </CardContent>
      </Card>
      </Bewerkbaar>
      </div>
      {breakdown.heeftSelectie && !adresNog && !state?.success && <LopendTotaal tekst={formatCurrencyRange(breakdown.totaal)} kaartRef={kaartRef} />}
    </>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function parseDecimal(raw: string) {
  const r = leesGetal(raw, { negatief: true, soort: "getal" });
  return r.ok ? r.waarde : Number.NaN;
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

  const [fout, setFout] = useState<string | null>(null);

  // Ongeldige invoer (letters, te groot) wordt gemeld bij het veld; de prijs blijft die van de laatste geldige waarde.
  // Niets wordt stil afgekapt of op 0 gezet.
  function handleChange(raw: string) {
    setText(raw);
    if (raw.trim() === "") {
      setFout(null);
      onChange(0);
      return;
    }
    const r = leesGetal(raw, { soort: "aantal", negatief: false, max: MAX_HOEVEELHEID });
    if (r.ok) {
      setFout(null);
      onChange(r.waarde);
    } else setFout(r.fout);
  }

  return (
    <>
      <DecimalInput value={text} onChange={(e) => handleChange(e.target.value)} aria-invalid={fout ? true : undefined} {...props} />
      {fout && (
        <p role="alert" className="mt-1 text-sm font-medium text-destructive">
          {fout}
        </p>
      )}
    </>
  );
}
