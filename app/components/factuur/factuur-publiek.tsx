"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { OfferteDocument } from "@/app/components/offerte/offerte-document";
import { VelSchaal } from "@/app/components/offerte/vel-schaal";
import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { formatCents, formatDatum } from "@/app/lib/offerte/weergave";
import { FACTUUR_STATUS_LABEL, titelVan, type FactuurInhoud } from "@/app/lib/factuur/model";
import type { FactuurStatus } from "@/app/generated/prisma/client";

// De online factuur voor de klant: bekijken, PDF downloaden, betaalgegevens kopiëren en de betaallink openen.
export function FactuurPubliek({ token, inhoud, status, totaalInclCenten, betaaldCenten, contact }: { token: string; inhoud: FactuurInhoud; status: FactuurStatus; totaalInclCenten: number; betaaldCenten: number; contact: { naam: string; telefoon: string; email: string } }) {
  const f = inhoud.factuur;
  const a = inhoud.afzender;
  const credit = f.soort === "creditnota";
  const t = berekenTotalen(inhoud);
  const openstaand = Math.max(0, totaalInclCenten - betaaldCenten);
  const betaald = status === "BETAALD" || (!credit && openstaand === 0);
  const [gekopieerd, setGekopieerd] = useState<string | null>(null);
  const kopieer = async (sleutel: string, tekst: string) => {
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(sleutel);
      setTimeout(() => setGekopieerd((s) => (s === sleutel ? null : s)), 2000);
    } catch {
      // klembord niet beschikbaar
    }
  };
  const rij = (sleutel: string, label: string, waarde: string) => (
    <div key={sleutel} className="flex items-center justify-between gap-3 border-b border-neutral-200 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="break-words font-semibold text-neutral-900">{waarde}</div>
      </div>
      <button type="button" onClick={() => void kopieer(sleutel, waarde)} aria-label={`${label} kopiëren`} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50">
        {gekopieerd === sleutel ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {a.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- extern logo
            <img src={a.logoUrl} alt={a.handelsnaam} className="h-10 w-auto max-w-[10rem] object-contain" />
          ) : (
            <span className="text-lg font-bold" style={{ color: a.kleur }}>{a.handelsnaam}</span>
          )}
          <span className="ml-auto text-sm text-neutral-600">{titelVan(f.soort)} {f.nummer}</span>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-bold">{credit ? "Creditnota" : "Factuur"} van {a.handelsnaam}</h1>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: betaald ? "#dcfce7" : "#f3f4f6", color: betaald ? "#166534" : "#374151" }}>{betaald && !credit ? "Betaald" : FACTUUR_STATUS_LABEL[status]}</span>
          </div>
          {credit ? (
            <p className="text-neutral-700">Dit bedrag van {formatCents(Math.abs(t.totaalIncl))} wordt met je verrekend. Je hoeft niets te betalen.</p>
          ) : betaald ? (
            <p className="text-neutral-700">Deze factuur is betaald. Dank je wel!</p>
          ) : (
            <p className="text-neutral-700">
              Graag <strong>{formatCents(openstaand)}</strong> betalen vóór <strong>{formatDatum(f.vervaldatum)}</strong>.
            </p>
          )}
          <a href={`/f/${token}/pdf`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold text-white" style={{ background: a.kleur }}>
            <Download className="h-5 w-5" aria-hidden="true" /> PDF downloaden
          </a>
        </section>

        {!credit && !betaald && (
          <section aria-label="Betaalgegevens" className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 font-bold">Betaalgegevens</h2>
            {rij("iban", "IBAN", a.iban)}
            {a.ibanTenaamstelling ? rij("naam", "Ten name van", a.ibanTenaamstelling) : null}
            {rij("bedrag", "Bedrag", (openstaand / 100).toFixed(2).replace(".", ","))}
            {rij("kenmerk", "Betalingskenmerk", f.nummer ?? "")}
            {f.betaallink.trim() ? (
              <a href={f.betaallink.trim()} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 px-5 text-base font-semibold" style={{ borderColor: a.kleur, color: a.kleur }}>
                <ExternalLink className="h-5 w-5" aria-hidden="true" /> Online betalen
              </a>
            ) : null}
          </section>
        )}

        <div className="overflow-x-hidden rounded-xl bg-neutral-200 p-2 sm:p-4">
          <VelSchaal marge={0}>
            <OfferteDocument inhoud={inhoud} />
          </VelSchaal>
        </div>
        <p className="text-center text-sm text-neutral-600">
          Vragen? Neem contact op met {contact.naam}
          {contact.telefoon ? ` · ${contact.telefoon}` : ""}
          {contact.email ? ` · ${contact.email}` : ""}.
        </p>
      </main>
    </div>
  );
}
