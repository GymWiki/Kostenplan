import type { Metadata } from "next";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { Input, DecimalInput, Label, Select, Textarea } from "@/app/components/ui/input";
import { IconPicker } from "@/app/components/ui/icon-picker";
import { ModalDemos } from "./modal-demos";
import { TriangleAlert, RefreshCw } from "lucide-react";
import { Calculator } from "@/app/portaal/[slug]/calculator";
import { OffertePresentatie } from "@/app/offerte/[token]/offerte-presentatie";
import type {
  Branding,
  CostSettings,
  ExtraOption,
  MaterialCategory,
  MaterialOption,
  Product,
} from "@/app/generated/prisma/client";

// Interne QA-pagina, geen onderdeel van het product — bevat geen
// databasequery's zodat hij ook zonder ingelogde sessie of Postgres-
// verbinding gerenderd (en gescreenshot) kan worden. Toont de gedeelde
// componenten uit app/components/ui naast de échte portal-Calculator, twee
// keer met een andere merkkleur, om maatvoering en automatisch tekstcontrast
// te controleren — zie het fase 1-stijlvoorstel.
export const metadata: Metadata = {
  title: "Stijlgids (intern)",
  robots: { index: false, follow: false },
};

const NU = new Date("2026-01-01T00:00:00.000Z");

// Inline SVG i.p.v. een externe URL, zodat de materiaal-tegel-preview geen
// netwerktoegang nodig heeft — puur om de "met foto naast zonder foto"
// tegel-inconsistentie te kunnen screenshotten.
const PLACEHOLDER_FOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#94a89b"/><rect x="8" y="8" width="48" height="48" fill="#5d6b75"/></svg>'
  );

function maakCostSettings(): CostSettings {
  return {
    id: "stijlgids-cost-settings",
    companyId: "stijlgids-company",
    arbeidEnabled: true,
    arbeidZichtbaar: true,
    arbeidStapEenheid: "UUR",
    arbeidTariefUur: 45,
    arbeidTariefDagdeel: 180,
    arbeidTariefDag: 360,
    arbeidAfronden: false,
    transportEnabled: true,
    transportZichtbaar: true,
    transportTarief: 25,
    voorrijEnabled: true,
    voorrijZichtbaar: true,
    voorrijTarief: 35,
    materiaalEnabled: true,
    materiaalZichtbaar: true,
    btwPercentage: 21,
    bandbreedteModus: "GEEN",
    bandbreedteMargeOmlaag: 10,
    bandbreedteMargeOmhoog: 10,
    updatedAt: NU,
  };
}

function maakMateriaalOptie(overrides: Partial<MaterialOption> & Pick<MaterialOption, "id" | "naam" | "prijs">): MaterialOption {
  return {
    materialCategoryId: "cat-palen",
    prijsType: "VAST",
    prijsMin: null,
    prijsMax: null,
    stapgrootte: null,
    productiviteitOverride: null,
    foto: null,
    actief: true,
    order: 0,
    createdAt: NU,
    ...overrides,
  };
}

function maakProducten(): (Product & {
  materiaalCategorieen: (MaterialCategory & { materialen: MaterialOption[] })[];
  extraOpties: ExtraOption[];
})[] {
  return [
    {
      id: "product-schutting",
      companyId: "stijlgids-company",
      naam: "Schutting",
      omschrijving: "Op maat gemaakte tuinschutting, inclusief plaatsing.",
      eenheid: "m1",
      productiviteit: 5,
      arbeidTariefOverride: null,
      transportkostenOverride: null,
      transportMeeschalend: false,
      voorrijkostenOverride: null,
      voorrijMeeschalend: false,
      icoon: "Fence",
      actief: true,
      order: 0,
      sjabloon: "ENKELE_HOEVEELHEID",
      sjabloonConfig: null,
      createdAt: NU,
      updatedAt: NU,
      materiaalCategorieen: [
        {
          id: "cat-palen",
          productId: "product-schutting",
          naam: "Palen",
          order: 0,
          verplicht: true,
          createdAt: NU,
          materialen: [
            // Bewust één met en één zonder foto — test de icoon-fallback
            // van een tegel zonder foto naast een tegel mét foto.
            maakMateriaalOptie({ id: "mat-beton", naam: "Betonnen palen", prijs: 18, foto: PLACEHOLDER_FOTO }),
            maakMateriaalOptie({ id: "mat-hout", naam: "Houten palen", prijs: 12, foto: null }),
          ],
        },
      ],
      extraOpties: [
        {
          id: "extra-poort",
          productId: "product-schutting",
          naam: "Poort toevoegen",
          omschrijving: "Inclusief scharnieren en slot",
          prijs: 145,
          type: "PER_STUK",
          foto: null,
          actief: true,
          order: 0,
          createdAt: NU,
        },
      ],
    },
    {
      id: "product-kozijnen",
      companyId: "stijlgids-company",
      naam: "Kozijnen",
      omschrijving: "Per stuk geprijsde kozijnen, op afmeting.",
      eenheid: "stuk",
      productiviteit: null,
      arbeidTariefOverride: null,
      transportkostenOverride: null,
      transportMeeschalend: false,
      voorrijkostenOverride: null,
      voorrijMeeschalend: false,
      icoon: "Square",
      actief: true,
      order: 1,
      sjabloon: "ARTIKELREGELS",
      sjabloonConfig: {
        artikelTypes: [
          { id: "type-draaikiep", naam: "Draaikiepraam", prijsPerEenheid: 320, berekening: "m2" },
          { id: "type-vast", naam: "Vast raam", prijsPerEenheid: 210, berekening: "m2" },
        ],
      },
      createdAt: NU,
      updatedAt: NU,
      materiaalCategorieen: [
        {
          id: "cat-kozijn-materiaal",
          productId: "product-kozijnen",
          naam: "Materiaal",
          order: 0,
          verplicht: false,
          createdAt: NU,
          materialen: [maakMateriaalOptie({ id: "mat-kunststof", naam: "Kunststof", prijs: 0 })],
        },
      ],
      extraOpties: [],
    },
    {
      id: "product-terras",
      companyId: "stijlgids-company",
      naam: "Terras aanleggen",
      omschrijving: "Lengte × breedte, geprijsd per m².",
      eenheid: "m2",
      productiviteit: 8,
      arbeidTariefOverride: null,
      transportkostenOverride: null,
      transportMeeschalend: false,
      voorrijkostenOverride: null,
      voorrijMeeschalend: false,
      icoon: "LayoutGrid",
      actief: true,
      order: 2,
      sjabloon: "AFMETINGEN",
      sjabloonConfig: { metDiepte: false },
      createdAt: NU,
      updatedAt: NU,
      materiaalCategorieen: [
        {
          id: "cat-terras-materiaal",
          productId: "product-terras",
          naam: "Bestrating",
          order: 0,
          verplicht: false,
          createdAt: NU,
          materialen: [
            maakMateriaalOptie({ id: "mat-beton-tegel", naam: "Betontegel", prijs: 22 }),
            maakMateriaalOptie({ id: "mat-natuursteen", naam: "Natuursteen", prijs: 45 }),
          ],
        },
      ],
      extraOpties: [],
    },
  ];
}

function maakBranding(primaireKleur: string, achtergrondKleur: string): Branding {
  return {
    id: "stijlgids-branding",
    companyId: "stijlgids-company",
    logoUrl: null,
    primaireKleur,
    achtergrondKleur,
    lettertype: "MODERN",
    customTitel: null,
    welkomstTekst: null,
    bedankTekst: "Bedankt voor uw aanvraag! Wij nemen binnen 24 uur contact met u op.",
    toonTelefoonnummer: true,
    telefoonnummer: "0612345678",
    toonEmail: true,
    contactPositie: "BOVENAAN",
    offerteIntroTekst: null,
    offerteVoorwaardenTekst: null,
    offerteGeldigheidsdagen: 30,
    updatedAt: NU,
  };
}

function PortalPreview({
  naam,
  primaireKleur,
  achtergrondKleur,
}: {
  naam: string;
  primaireKleur: string;
  achtergrondKleur: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: primaireKleur }}
        />
        <p className="text-sm font-medium text-foreground">
          {naam} — <code className="text-xs text-muted-foreground">{primaireKleur}</code>
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <Calculator
          slug="stijlgids-preview"
          bedrijfsnaam="Voorbeeldbedrijf"
          email="voorbeeld@kostenplan.nl"
          subscriptionTier="PRO"
          branding={maakBranding(primaireKleur, achtergrondKleur)}
          costSettings={maakCostSettings()}
          products={maakProducten()}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <OffertePresentatie
          deelToken="stijlgids-preview"
          bedrijfsnaam="Voorbeeldbedrijf"
          klantNaam="J. de Vries"
          logoUrl={null}
          primaireKleur={primaireKleur}
          achtergrondKleur={achtergrondKleur}
          fontFamily="var(--font-plus-jakarta-sans)"
          regels={[
            { id: "regel-1", omschrijving: "Schutting (Betonnen palen)", aantal: 10, eenheid: "m1", prijsPerEenheid: 236 },
            { id: "regel-2", omschrijving: "Poort toevoegen", aantal: 1, eenheid: "stuk", prijsPerEenheid: 145 },
          ]}
          introTekst="Bedankt voor uw aanvraag. Hierbij ontvangt u onze offerte."
          voorwaardenTekst={null}
          geldigTot={new Date("2026-02-01")}
          gereageerdOp={null}
          btwPercentage={21}
          status="VERSTUURD"
          contactEmail="voorbeeld@kostenplan.nl"
          contactTelefoonnummer="0612345678"
        />
      </div>
    </div>
  );
}

export default function StijlgidsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 border-b border-border pb-8">
        <Badge variant="outline" className="w-fit">
          Intern — niet in productienavigatie
        </Badge>
        <h1 className="text-2xl font-semibold text-foreground">Stijlgids</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Controlepagina voor het stijlsysteem-voorstel: toont de gedeelde admin-componenten en de
          échte klantenportaal-Calculator met twee merkkleuren, zodat maatvoering en automatisch
          tekstcontrast in één oogopslag te controleren zijn.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-foreground">Knoppen</h2>
        <Card>
          <CardContent className="flex flex-col gap-6 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium (default)</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Icoon-knop">
                +
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Disabled</Button>
              <LinkButton href="#" variant="outline">
                LinkButton
              </LinkButton>
            </div>
            <p className="text-xs text-muted-foreground">
              Focus met Tab om de zichtbare focus-ring te controleren.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-foreground">Formuliervelden</h2>
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sg-input">Tekstveld</Label>
              <Input id="sg-input" placeholder="Bijv. Jan Jansen" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sg-decimal">Decimaal getal</Label>
              <DecimalInput id="sg-decimal" placeholder="0,00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sg-select">Keuzelijst</Label>
              <Select id="sg-select" defaultValue="a">
                <option value="a">Optie A</option>
                <option value="b">Optie B</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sg-switch">Aan/uit</Label>
              <Switch id="sg-switch" defaultChecked />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="sg-textarea">Meerdere regels</Label>
              <Textarea id="sg-textarea" placeholder="Vrije tekst..." rows={3} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-foreground">Icon-picker (219 icons)</h2>
        <Card>
          <CardContent className="pt-5">
            <IconPicker name="sg-icoon" defaultValue="Fence" />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-foreground">Admin-modals (actieknoppen)</h2>
        <Card>
          <CardContent className="pt-5">
            <ModalDemos />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-foreground">Verouderde-offerteberekening-melding</h2>
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Deze offerte is berekend met verouderde prijzen
                </p>
                <p className="text-sm text-muted-foreground">
                  De aanvraag waarop dit concept is gebaseerd gaf geen prijs per productregel mee,
                  waardoor alle kosten in één post staan. Bereken de regels opnieuw met de huidige
                  logica.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              Opnieuw berekenen
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-foreground">Kaarten en badges</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Voorbeeldkaart</CardTitle>
              <CardDescription>Standaard kaart uit app/components/ui/card.tsx</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tweede kaart</CardTitle>
              <CardDescription>Zelfde radius/border/shadow-schaal</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="outline">Outline</Badge>
              <Badge variant="muted">Muted</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Derde kaart</CardTitle>
              <CardDescription>rounded-xl, border-border, shadow-sm</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline">
                Actie
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Klantenportaal — twee merkkleuren</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dezelfde echte Calculator-component, eenmaal met een lichte en eenmaal met een donkere
            merkkleur. De tekst op de header en de knoppen moet in beide gevallen goed leesbaar
            blijven — automatisch bepaald door accessibleTextColor() in app/lib/color.ts.
          </p>
        </div>
        <div className="flex flex-col gap-10">
          <PortalPreview naam="Lichte merkkleur" primaireKleur="#fde68a" achtergrondKleur="#fffbeb" />
          <PortalPreview naam="Donkere merkkleur" primaireKleur="#1e1b4b" achtergrondKleur="#f5f5f7" />
          <PortalPreview naam="Kostenplan-standaard" primaireKleur="#15803d" achtergrondKleur="#f7faf8" />
        </div>
      </section>
    </div>
  );
}
