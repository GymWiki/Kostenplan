import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/lib/actions/auth";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { MobileNav } from "./mobile-nav";
import { CompanySwitcher } from "./company-switcher";
import type { SubscriptionTier } from "@/app/generated/prisma/client";

type CompanyOption = {
  id: string;
  naam: string;
  subscriptionTier: SubscriptionTier;
  overrideTier: SubscriptionTier | null;
};

export function Topbar({
  slug,
  bedrijfsnaam,
  activeCompanyId,
  alleBedrijven,
}: {
  slug: string;
  bedrijfsnaam: string;
  activeCompanyId: string;
  alleBedrijven: CompanyOption[];
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
      <MobileNav slug={slug} />
      {alleBedrijven.length > 1 ? (
        <CompanySwitcher activeCompanyId={activeCompanyId} companies={alleBedrijven} />
      ) : (
        <p className="flex-1 truncate text-sm font-medium text-muted-foreground">
          {bedrijfsnaam}
        </p>
      )}
      <ThemeToggle />
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Uitloggen</span>
        </button>
      </form>
    </header>
  );
}
