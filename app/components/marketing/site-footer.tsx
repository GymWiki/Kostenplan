import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/app/components/ui/logo";
import { DOELGROEPEN } from "@/app/lib/doelgroepen";

const snelleLinks = [
  { href: "/", label: "Home" },
  { href: "/#voorbeeld", label: "Functionaliteiten" },
  { href: "/#prijzen", label: "Prijzen" },
  { href: "/login", label: "Inloggen" },
];

const doelgroepLinks = DOELGROEPEN.map((d) => ({
  href: `/voor/${d.slug}`,
  label: `Voor ${d.naamMeervoud}`,
}));

const juridischeLinks = [
  { href: "/algemene-voorwaarden", label: "Algemene Voorwaarden" },
  { href: "/privacybeleid", label: "Privacybeleid" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <Logo />
              Kostenplan
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Kostenplan is een handelsnaam van GymWiki.
            </p>
            <dl className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
              <div className="flex gap-1.5">
                <dt className="font-medium text-foreground">KVK</dt>
                <dd>97351911</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="font-medium text-foreground">BTW</dt>
                <dd>NL005266843B58</dd>
              </div>
            </dl>
            <a
              href="mailto:gymwiki25@gmail.com"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              gymwiki25@gmail.com
            </a>
          </div>

          <FooterColumn title="Snelle links" links={snelleLinks} />
          <FooterColumn title="Voor wie" links={doelgroepLinks} />
          <FooterColumn title="Juridisch" links={juridischeLinks} />
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Kostenplan. Alle rechten voorbehouden.
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
