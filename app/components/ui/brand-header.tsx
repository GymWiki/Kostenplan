import Link from "next/link";
import { Logo } from "@/app/components/ui/logo";

// De "Logo + Kostenplan"-kop boven een gecentreerd, eenkolomsscherm (login,
// registreren, onboarding) — voorheen drie keer met de hand gekopieerd, met
// kleine onbedoelde verschillen tussen de kopieën. `href` maakt 'm klikbaar
// (de auth-layout linkt terug naar de homepage); zonder href is het platte
// tekst (onboarding, waar de gebruiker al ingelogd is en er niets "terug"
// is om naartoe te gaan).
export function BrandHeader({ href }: { href?: string }) {
  const className = "mb-8 flex items-center gap-2 text-lg font-semibold text-foreground";
  if (href) {
    return (
      <Link href={href} className={className}>
        <Logo />
        Kostenplan
      </Link>
    );
  }
  return (
    <div className={className}>
      <Logo />
      Kostenplan
    </div>
  );
}
