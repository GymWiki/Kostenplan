"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { HelpTip } from "@/app/components/ui/help-tip";
import { switchActiveCompanyAction } from "@/app/lib/actions/companies";
import { effectiveTier, PLAN_LABELS } from "@/app/lib/subscription";
import type { SubscriptionTier } from "@/app/generated/prisma/client";

type CompanyOption = {
  id: string;
  naam: string;
  subscriptionTier: SubscriptionTier;
  overrideTier: SubscriptionTier | null;
};

export function CompanySwitcher({
  activeCompanyId,
  companies,
}: {
  activeCompanyId: string;
  companies: CompanyOption[];
}) {
  const [open, setOpen] = useState(false);
  const actief = companies.find((c) => c.id === activeCompanyId) ?? companies[0];

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Bedrijf wisselen"
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-secondary cursor-pointer"
      >
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{actief.naam}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <HelpTip contentKey="dashboard.companySwitcher" />

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0" onClick={() => setOpen(false)} />
            <div className="absolute left-4 top-14 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-1.5 shadow-lg">
              {companies.map((company) => (
                <form key={company.id} action={switchActiveCompanyAction}>
                  <input type="hidden" name="companyId" value={company.id} />
                  <button
                    type="submit"
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      company.id === actief.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="min-w-0 truncate">{company.naam}</span>
                    <Badge variant={company.id === actief.id ? "default" : "muted"}>
                      {PLAN_LABELS[effectiveTier(company)]}
                    </Badge>
                  </button>
                </form>
              ))}

              <div className="mt-1 border-t border-border pt-1">
                <Link
                  href="/dashboard/bedrijven/nieuw"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Nieuw bedrijf toevoegen
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
