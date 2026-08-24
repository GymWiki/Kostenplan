import { requireActiveCompany } from "@/app/lib/dal";
import { Sidebar } from "@/app/components/dashboard/sidebar";
import { Topbar } from "@/app/components/dashboard/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, alleBedrijven } = await requireActiveCompany();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border md:flex">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
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
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1800px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
