import Link from "next/link";
import { Building2, Check, ChevronRight, CreditCard, FileText, MapPin, Palette, Plus, Repeat, TriangleAlert } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { switchActiveCompanyAction } from "@/app/lib/actions/companies";
import { initialen, type AbonnementRegel } from "@/app/lib/profiel/samenvattingen";
import { BedrijfVerwijderen } from "./bedrijf-verwijderen";

// Profiel → Bedrijf als gegroepeerde lijst (zoals de iOS-instellingen). Op de telefoon openen de regels een eigen
// scherm (?scherm=…), op desktop springen ze naar dezelfde sectie op de pagina (#…). Alleen indeling en teksten.

export type BedrijfOverzichtProps = {
  modus: "mobiel" | "desktop";
  actief: { id: string; naam: string; logoUrl: string | null; domein: string | null };
  bedrijven: { id: string; naam: string }[];
  samenvatting: { werkgebied: string; kleuren: string[]; logoUrl: string | null; offertegegevensOntbreken: boolean };
  abonnement: AbonnementRegel;
  abonnementLoopt: boolean;
};

const href = (modus: "mobiel" | "desktop", scherm: string, anker: string) => (modus === "mobiel" ? `/dashboard/profiel?scherm=${scherm}` : `#${anker}`);

function Groep({ kop, children, className }: { kop: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={kop} className={cn("flex flex-col gap-1.5", className)}>
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kop}</h2>
      <ul className="overflow-hidden rounded-xl border border-border bg-card">{children}</ul>
    </section>
  );
}

const rijKlasse = "flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left";
const icoonVak = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary";

function LinkRij({ href, icoon: Icoon, titel, samenvatting, extra, letOp }: { href: string; icoon: React.ComponentType<{ className?: string }>; titel: string; samenvatting?: React.ReactNode; extra?: React.ReactNode; letOp?: boolean }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link href={href} className={cn(rijKlasse, "hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring")}>
        <span className={icoonVak}>
          <Icoon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">{titel}</span>
          {samenvatting && <span className="block truncate text-sm text-muted-foreground">{samenvatting}</span>}
        </span>
        {extra}
        {letOp && (
          <span className="flex shrink-0 items-center" role="img" aria-label="Let op">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
          </span>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

function Logo({ url, naam, grootte = 48 }: { url: string | null; naam: string; grootte?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- extern logo, afmetingen onbekend
    <img src={url} alt="" width={grootte} height={grootte} className="shrink-0 rounded-lg border border-border bg-white object-contain" style={{ width: grootte, height: grootte }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary" style={{ width: grootte, height: grootte }} aria-hidden="true">
      {initialen(naam)}
    </span>
  );
}

export function BedrijfOverzicht({ modus, actief, bedrijven, samenvatting, abonnement, abonnementLoopt }: BedrijfOverzichtProps) {
  const meerdere = bedrijven.length > 1;
  const bedrijvenGroep = (
    <Groep kop="Bedrijven">
      {bedrijven.map((b) => (
        <li key={b.id} className="border-b border-border last:border-b-0">
          <form action={switchActiveCompanyAction}>
            <input type="hidden" name="companyId" value={b.id} />
            <input type="hidden" name="redirectTo" value="profiel" />
            <button type="submit" aria-current={b.id === actief.id ? "true" : undefined} className={cn(rijKlasse, "cursor-pointer hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring")}>
              <span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">{b.naam}</span>
              {b.id === actief.id && <Check className="h-5 w-5 shrink-0 text-primary" aria-label="Actief bedrijf" />}
            </button>
          </form>
        </li>
      ))}
      <li>
        <Link href="/dashboard/bedrijven/nieuw" className={cn(rijKlasse, "text-base font-medium text-primary hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring")}>
          <Plus className="h-5 w-5" aria-hidden="true" /> Bedrijf toevoegen
        </Link>
      </li>
    </Groep>
  );

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-6">
      {meerdere && bedrijvenGroep}

      <Link
        href={href(modus, "bedrijfsgegevens", "bedrijfsgegevens")}
        className="flex min-h-[72px] items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Logo url={actief.logoUrl} naam={actief.naam} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold text-foreground">{actief.naam}</span>
          {actief.domein && <span className="block truncate text-sm text-muted-foreground">{actief.domein}</span>}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      <Groep kop="Bedrijf">
        <LinkRij href={href(modus, "bedrijfsgegevens", "bedrijfsgegevens")} icoon={Building2} titel="Bedrijfsgegevens" samenvatting="Naam, adres, KvK, contact" />
        <LinkRij
          href={href(modus, "uiterlijk", "uiterlijk")}
          icoon={Palette}
          titel="Huisstijl & logo"
          extra={
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              {samenvatting.kleuren.slice(0, 3).map((k) => (
                <span key={k} className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: k }} />
              ))}
              {samenvatting.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- extern logo
                <img src={samenvatting.logoUrl} alt="" width={28} height={28} className="h-7 w-7 rounded border border-border bg-white object-contain" />
              )}
            </span>
          }
        />
        <LinkRij href={href(modus, "offertegegevens", "offertegegevens")} icoon={FileText} titel="Offertegegevens" samenvatting="KvK, btw, IBAN, voorwaarden" letOp={samenvatting.offertegegevensOntbreken} />
        <LinkRij href={href(modus, "werkgebied", "werkgebied")} icoon={MapPin} titel="Werkgebied & minimum" samenvatting={samenvatting.werkgebied} />
      </Groep>

      <section aria-label="Abonnement" className="flex flex-col gap-3">
        <Groep kop="Abonnement">
          <li className="border-b border-border">
            <div className={rijKlasse}>
              <span className={icoonVak}>
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 text-base font-semibold text-foreground">{abonnement.tekst}</span>
              {abonnement.letOp && (
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-warning">
                  <TriangleAlert className="h-4 w-4" aria-hidden="true" /> <span className="sr-only">Let op</span>
                </span>
              )}
            </div>
          </li>
          <LinkRij href={href(modus, "abonnement", "abonnement")} icoon={Repeat} titel="Abonnement wijzigen" />
        </Groep>
        {abonnement.opnieuwAbonneren && (
          <Link href={href(modus, "abonnement", "abonnement")} className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Opnieuw abonneren
          </Link>
        )}
      </section>

      {!meerdere && (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          <li>
            <Link href="/dashboard/bedrijven/nieuw" className={cn(rijKlasse, "text-base font-medium text-primary hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring")}>
              <Plus className="h-5 w-5" aria-hidden="true" /> Bedrijf toevoegen
            </Link>
          </li>
        </ul>
      )}

      {meerdere && <BedrijfVerwijderen company={{ id: actief.id, naam: actief.naam }} abonnementLoopt={abonnementLoopt} />}
    </div>
  );
}
