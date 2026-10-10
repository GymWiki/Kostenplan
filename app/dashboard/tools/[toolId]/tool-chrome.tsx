"use client";

import { usePathname } from "next/navigation";

// De werkzaamheid-schermen (aanmaken en bewerken) krijgen de volle breedte
// voor formulier + live voorbeeld; daar verdwijnen de tool-kop en de zijnavigatie
// (die staan wel op het overzicht en alle andere tool-pagina's).
export function ToolChrome({
  toolId,
  kop,
  nav,
  children,
}: {
  toolId: string;
  kop: React.ReactNode;
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const basis = `/dashboard/tools/${toolId}/producten`;
  const focus = new RegExp(`^${basis}/(nieuw|[^/]+/bewerken)(/|$)`).test(pathname);

  if (focus) return <div className="min-w-0">{children}</div>;

  return (
    <div className="flex flex-col gap-6">
      {kop}
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="sm:w-52 sm:shrink-0">{nav}</div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
