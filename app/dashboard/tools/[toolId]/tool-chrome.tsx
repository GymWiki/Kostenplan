"use client";

// De rekentool-editor en de overgebleven pagina's (bouwer voor op maat gebouwde
// rekentools, uitgebreide weergave) hebben geen tool-zijbalk meer: alles
// gebeurt in de editor op /dashboard/tools/[toolId].
export function ToolChrome({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0">{children}</div>;
}
