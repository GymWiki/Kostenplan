// Wordt automatisch getoond zodra je naar een dashboardpagina navigeert die
// nog aan het laden is (Next.js Suspense-fallback voor dit routesegment) —
// de navigatie voelt daardoor meteen aan, ook als de server-round-trip
// (auth-check + queries) zelf nog een paar honderd ms kost. Eén generieke
// skeleton voor alle /dashboard/*-pagina's; geen enkele nested route
// definieert een eigen loading.tsx.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-secondary" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-secondary" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-secondary/50" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-border bg-secondary/50" />
    </div>
  );
}
