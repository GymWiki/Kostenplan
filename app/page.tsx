import Link from "next/link";
import {
  ArrowRight,
  Truck,
  Wrench,
  MapPin,
  Package,
  Link2,
  SlidersHorizontal,
  Sprout,
} from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="h-4 w-4" />
            </span>
            Kostenplan
          </Link>
          <div className="flex items-center gap-2">
            <LinkButton href="/login" variant="ghost">
              Inloggen
            </LinkButton>
            <LinkButton href="/registreren">Gratis starten</LinkButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Kostencalculators voor hoveniers
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Geef klanten direct een duidelijke prijsindicatie voor hun tuin
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Kostenplan helpt hoveniersbedrijven een eigen online kostencalculator te bouwen.
              Jij bepaalt de diensten, producten en tarieven — je klanten zien meteen een
              realistische schatting van de aanlegkosten.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton href="/registreren" size="lg">
                Gratis je calculator maken
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/login" size="lg" variant="outline">
                Ik heb al een account
              </LinkButton>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Volledige controle over vier kostenposten
              </h2>
              <p className="mt-3 text-muted-foreground">
                Schakel elke kostenpost aan of uit en stel je eigen tarieven in — de calculator
                rekent live mee voor je klanten.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={Wrench}
                title="Arbeidskosten"
                description="Stel je uurtarief in en koppel arbeidsuren aan elke dienst."
              />
              <FeatureCard
                icon={Truck}
                title="Transportkosten"
                description="Reken een vast bedrag of een tarief per kilometer."
              />
              <FeatureCard
                icon={MapPin}
                title="Voorrijkosten"
                description="Breng eenvoudig een vast bedrag in rekening om langs te komen."
              />
              <FeatureCard
                icon={Package}
                title="Materiaalkosten"
                description="Prijs materialen en producten, met optionele opslag."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Zo werkt het
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Step
              number={1}
              icon={SlidersHorizontal}
              title="Stel je calculator in"
              description="Bepaal je tarieven en voeg je eigen diensten en producten toe, volledig naar jouw wensen."
            />
            <Step
              number={2}
              icon={Link2}
              title="Deel de link"
              description="Elk account krijgt een persoonlijke klantenportaal-link die je eenvoudig kunt delen."
            />
            <Step
              number={3}
              icon={Sprout}
              title="Klanten rekenen zelf"
              description="Klanten stellen hun tuinproject samen en zien direct een heldere kostenraming."
            />
          </div>
        </section>

        <section className="border-t border-border bg-primary/5 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Klaar om jouw kostencalculator te maken?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Binnen een paar minuten heb je een calculator die je kunt delen met klanten.
            </p>
            <div className="mt-8 flex justify-center">
              <LinkButton href="/registreren" size="lg">
                Gratis starten
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Kostenplan. Alle rechten voorbehouden.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="h-6 w-6" />
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-card text-xs font-bold text-foreground shadow ring-1 ring-border">
          {number}
        </span>
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
