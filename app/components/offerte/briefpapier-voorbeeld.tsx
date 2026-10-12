import type { OfferteGegevensWaarden } from "@/app/lib/offerte/gegevens";
import { heeftStatutaireGegevens } from "@/app/lib/offerte/gegevens";

// Klein voorbeeld van het briefpapier (kop en voettekst), live meebewegend met de
// ingevulde gegevens. Alleen voor de wizard; het echte document staat in
// app/components/offerte/offerte-document.tsx.
export function BriefpapierVoorbeeld({ g, kleur = "#15803d" }: { g: Partial<OfferteGegevensWaarden>; kleur?: string }) {
  const leeg = <span className="rounded bg-muted px-1 text-muted-foreground">…</span>;
  const voet = [
    g.handelsnaam,
    g.kvkNummer ? `KvK ${g.kvkNummer}` : null,
    g.korActief ? null : g.btwId ? `Btw ${g.btwId}` : null,
    g.iban ? `IBAN ${g.iban}` : null,
    g.telefoon,
    g.email,
  ].filter(Boolean);
  return (
    <div aria-label="Voorbeeld van je briefpapier" role="img" className="aspect-[210/297] w-full max-w-xs rounded-md border border-border bg-white p-4 text-[9px] leading-snug text-neutral-800 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        {g.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- extern logo
          <img src={g.logoUrl} alt="" className="h-8 w-auto max-w-[40%] object-contain" />
        ) : (
          <span className="text-[11px] font-bold" style={{ color: kleur }}>
            {g.handelsnaam || "Je bedrijf"}
          </span>
        )}
        <div className="text-right">
          <p className="font-semibold">{g.handelsnaam || leeg}</p>
          {g.rechtsvorm && heeftStatutaireGegevens(g.rechtsvorm) && g.statutaireNaam ? <p>{g.statutaireNaam}</p> : null}
          <p>{g.adresRegel || leeg}</p>
          <p>{[g.postcode, g.plaats].filter(Boolean).join(" ") || leeg}</p>
          <p>{g.telefoon || leeg}</p>
          <p>{g.email || leeg}</p>
        </div>
      </div>
      <div className="mt-6 h-px w-full" style={{ background: kleur }} />
      <p className="mt-3 text-[13px] font-bold">Offerte</p>
      <div className="mt-2 space-y-1">
        {[80, 95, 70, 88].map((w, i) => (
          <div key={i} className="h-1 rounded bg-neutral-200" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="absolute" />
      <div className="mt-[38%] border-t border-neutral-300 pt-1 text-[7.5px] text-neutral-500">
        {voet.length > 0 ? voet.join(" · ") : leeg}
        {g.korActief ? <span> · {g.korTekst}</span> : null}
      </div>
    </div>
  );
}
