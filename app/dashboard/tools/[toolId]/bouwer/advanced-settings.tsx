"use client";

import { ChevronRight } from "lucide-react";

// Progressive disclosure (UI/UX-herontwerp, Deel 22): minder gebruikte
// instellingen (voorwaardelijke zichtbaarheid/verplichting e.d.) blijven
// standaard ingeklapt, zodat de editor rustig oogt voor wie alleen de
// basisvelden nodig heeft. Native <details>/<summary> — geen eigen
// open/dicht-state nodig, gratis toegankelijk (toetsenbord, screenreaders).
export function AdvancedSettings({ children }: { children: React.ReactNode }) {
  return (
    <details className="group border-t border-border pt-3 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
        Geavanceerde instellingen
      </summary>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </details>
  );
}
