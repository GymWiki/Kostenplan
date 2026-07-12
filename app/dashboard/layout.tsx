import { requireUser } from "@/app/lib/dal";
import { Sidebar } from "@/app/components/dashboard/sidebar";
import { Topbar } from "@/app/components/dashboard/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border md:flex">
        <Sidebar slug={user.slug} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar slug={user.slug} bedrijfsnaam={user.bedrijfsnaam} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
