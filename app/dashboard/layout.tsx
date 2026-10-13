import { telOngezienReacties } from "@/app/lib/offerte/tips";
import { requireActiveCompany } from "@/app/lib/dal";
import { Sidebar } from "@/app/components/dashboard/sidebar";
import { Topbar } from "@/app/components/dashboard/topbar";
import { prisma } from "@/app/lib/prisma";
import { Tabbalk } from "@/app/components/mobile/tabbalk";
import { KopProvider, MobieleKop } from "@/app/components/mobile/mobiele-kop";
import { PwaBasis } from "@/app/components/mobile/pwa-basis";
import { MobielBasis } from "@/app/components/mobile/mobiel-basis";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { ontbrekendeVerplichteGegevens } from "@/app/lib/offerte/gegevens";
import { adminFontClasses } from "@/app/lib/admin-fonts";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, alleBedrijven } = await requireActiveCompany();
  // Badge op de tabbalk (alleen mobiel). Een mislukte telling mag het
  // dashboard nooit breken.
  // Telt ook offertes met een reactie van de klant die de hovenier nog niet heeft gezien.
  const [nieuweAanvragen, offerteReacties, profielWaarschuwing] = await Promise.all([
    prisma.lead.count({ where: { companyId: company.id, status: "NIEUW" } }).catch(() => 0),
    telOngezienReacties(company.id).catch(() => 0),
    // Aantal ontbrekende verplichte gegevens voor offertes: oranje badge op Profiel.
    laadOfferteGegevens(company).then((g) => ontbrekendeVerplichteGegevens(g).length).catch(() => 0),
  ]);
  const nieuweLeads = nieuweAanvragen + offerteReacties;

  return (
    <KopProvider>
    <div data-admin-theme className={`flex min-h-screen bg-background text-foreground ${adminFontClasses}`}>
      <aside className="hidden w-64 shrink-0 border-r border-border md:flex">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobieleKop />
        <Topbar
          bedrijfsnaam={company.naam}
          activeCompanyId={company.id}
          alleBedrijven={alleBedrijven}
        />
        {/* Audit-bevinding D-03: lijst/overzichtpagina's (Tools, Leads, enz.)
            hadden geen enkele max-width en rekten op grote/ultrawide
            schermen uit tot de volledige main-breedte. Eén grens hier,
            i.p.v. per pagina, dekt elke bestaande en toekomstige pagina
            automatisch; instellingenpagina's die zelf al een nauwere
            max-w-2xl gebruiken nestelen daar gewoon binnen. */}
        <main id="main-content" className="flex-1 px-4 py-4 pb-24 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto max-w-[1800px]">{children}</div>
        </main>
      </div>
      <Tabbalk nieuweLeads={nieuweLeads} profielWaarschuwing={profielWaarschuwing} />
      <MobielBasis />
      <PwaBasis />
    </div>
    </KopProvider>
  );
}
