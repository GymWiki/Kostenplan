// Kort, direct antwoord-blok bovenaan een sectie (GEO — Deel 14 van de
// opdracht: AI-antwoordmachines citeren het makkelijkst een op zichzelf
// staande, feitelijke alinea die meteen met het antwoord opent, in plaats
// van tekst waarin de kern pas na een lange inleiding volgt). Puur
// presentationeel — de tekst zelf bepaalt de feitelijke juistheid.
export function GeoAnswer({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-primary/15 bg-primary/[0.04] px-5 py-4 text-base leading-relaxed text-foreground">
      {children}
    </p>
  );
}
