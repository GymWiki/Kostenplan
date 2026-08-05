import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/app/components/ui/logo";
import { LinkButton } from "@/app/components/ui/button";

// Vangt elke notFound()/onbekende route af die geen eigen not-found.tsx
// heeft — met name /portaal/[slug] met een onbekende slug, de drukste
// publieke route in de app die hiervoor Next.js' kale standaardpagina liet
// zien. Geen bedrijfscontext beschikbaar (de slug bestaat niet), dus dit is
// bewust generieke Kostenplan-branding i.p.v. tenant-specifiek.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-center">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Logo />
        Kostenplan
      </Link>
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Search className="h-6 w-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">Pagina niet gevonden</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Deze pagina bestaat niet (meer), of de link klopt niet helemaal. Controleer de URL, of
            ga terug naar de homepage.
          </p>
        </div>
      </div>
      <LinkButton href="/" variant="secondary">
        Naar de homepage
      </LinkButton>
    </div>
  );
}
