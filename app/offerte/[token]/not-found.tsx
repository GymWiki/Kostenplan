import Link from "next/link";
import { FileX2 } from "lucide-react";
import { Logo } from "@/app/components/ui/logo";
import { LinkButton } from "@/app/components/ui/button";

// Een onbekend/verwijderd offerte-token heeft geen bedrijf om de branding
// (kleur/logo) van te lenen — anders dan de VERLOPEN-status hierboven, die
// wél bij een bestaande offerte hoort en dus de eigen huisstijl van de
// ondernemer kan tonen (zie offerte-presentatie.tsx). Dit vangt alleen het
// "bestaat niet (meer)"-geval af, met tekst die uitlegt wat een klant nu kan
// doen — in plaats van Next.js' kale standaardpagina.
export default function OfferteNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-center">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Logo />
        Kostenplan
      </Link>
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileX2 className="h-6 w-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">Deze offerte bestaat niet (meer)</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            De link klopt niet, of de offerte is ingetrokken. Neem contact op met de ondernemer
            die &apos;m verstuurd heeft voor een geldige link.
          </p>
        </div>
      </div>
      <LinkButton href="/" variant="secondary">
        Naar de homepage
      </LinkButton>
    </div>
  );
}
