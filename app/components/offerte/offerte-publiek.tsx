"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Download, FileText, Loader2, X } from "lucide-react";
import { Overlay } from "@/app/components/ui/overlay";
import { useIsMobiel } from "@/app/components/mobile/use-mobiel";
import { geefAkkoordAction, stelVraagAction, wijsOfferteAfAction } from "@/app/lib/actions/offerte-publiek";
import { berekenTotalen, prijsPerEenheidWeergave } from "@/app/lib/offerte/bereken";
import type { OfferteInhoud } from "@/app/lib/offerte/model";
import { formatAantal, formatCents, formatDatum, formatDatumTijd, formatWeek, termijnBedragen } from "@/app/lib/offerte/weergave";
import type { OfferteV2Status } from "@/app/generated/prisma/client";
import { OfferteDocument } from "./offerte-document";
import { VelSchaal } from "./vel-schaal";

type Props = {
  token: string;
  inhoud: OfferteInhoud;
  status: OfferteV2Status;
  versie: number;
  laatsteVersie: number;
  nieuwer: boolean;
  akkoord: { naam: string; tijdstip: string; versieNummer: number; heeftPdf: boolean; gekozenRegelIds: string[] } | null;
  contact: { naam: string; telefoon: string; email: string };
};

// De online offerte voor de klant: mobielvriendelijk, in de huisstijl van de hovenier, met
// optionele regels, akkoord geven, een vraag stellen en afwijzen.
export function OffertePubliek({ token, inhoud, status, versie, laatsteVersie, nieuwer, akkoord, contact }: Props) {
  const router = useRouter();
  const mobiel = useIsMobiel();
  const [gekozen, setGekozen] = useState<string[]>(akkoord?.gekozenRegelIds ?? []);
  const [dialoog, setDialoog] = useState<null | "akkoord" | "vraag" | "afwijzen">(null);
  const [, start] = useTransition();
  const a = inhoud.afzender;
  const kleur = a.kleur;
  const t = berekenTotalen(inhoud, gekozen);
  const eind = t.toonIncl || t.kor ? t.totaalIncl : t.totaalExcl;
  const kanReageren = (status === "VERSTUURD" || status === "BEKEKEN") && !nieuwer;
  const toggle = (id: string) => setGekozen((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  const heeftOptioneel = inhoud.secties.some((s) => s.regels.some((r) => r.type === "optioneel"));
  const pdfLink = `/o/${token}/pdf?v=${versie}`;

  const melding = (() => {
    if (status === "INGETROKKEN") return { soort: "fout", tekst: `Deze offerte is door ${contact.naam} ingetrokken. Neem contact op voor een nieuwe offerte.` };
    if (nieuwer) return { soort: "info", tekst: `Er is een nieuwere versie van deze offerte (versie ${laatsteVersie}).`, link: `/o/${token}` };
    if (status === "GEACCEPTEERD" && akkoord) return { soort: "ok", tekst: `Akkoord gegeven door ${akkoord.naam} op ${formatDatumTijd(new Date(akkoord.tijdstip))}. Hartelijk dank!` };
    if (status === "AFGEWEZEN") return { soort: "info", tekst: "Je hebt deze offerte afgewezen. Wil je toch nog reageren? Neem contact op." };
    if (status === "VERLOPEN") return { soort: "fout", tekst: `Deze offerte is verlopen. Neem contact op met ${contact.naam}.` };
    return null;
  })();

  const knoppen = kanReageren && (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setDialoog("akkoord")} className="min-h-12 cursor-pointer rounded-lg px-5 text-base font-semibold text-white shadow-sm" style={{ background: kleur }}>
        Akkoord geven
      </button>
      <button type="button" onClick={() => setDialoog("vraag")} className="min-h-11 cursor-pointer rounded-lg border border-border bg-white px-5 text-sm font-semibold text-neutral-900">
        Vraag of wijziging
      </button>
      <button type="button" onClick={() => setDialoog("afwijzen")} className="min-h-11 cursor-pointer text-sm font-medium text-neutral-600 underline">
        Offerte afwijzen
      </button>
    </div>
  );

  const contactBlok = (
    <p className="text-sm text-neutral-600">
      Vragen? Neem contact op met {contact.naam}
      {contact.telefoon ? (
        <>
          {" "}
          op{" "}
          <a href={`tel:${contact.telefoon.replace(/\s/g, "")}`} className="font-semibold underline">
            {contact.telefoon}
          </a>
        </>
      ) : null}
      {contact.email ? (
        <>
          {" "}
          of via{" "}
          <a href={`mailto:${contact.email}`} className="font-semibold underline">
            {contact.email}
          </a>
        </>
      ) : null}
      .
    </p>
  );

  return (
    <main className="min-h-dvh bg-neutral-100 text-neutral-900" style={{ ["--og-kleur" as string]: kleur }}>
      <header className="border-b-4 bg-white" style={{ borderColor: kleur }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          {a.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- extern logo
            <img src={a.logoUrl} alt={a.handelsnaam} className="max-h-10 w-auto max-w-[12rem] object-contain" />
          ) : (
            <span className="text-lg font-bold" style={{ color: kleur }}>
              {a.handelsnaam}
            </span>
          )}
          <span className="text-sm text-neutral-600">Offerte {inhoud.nummer}</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-32 pt-5">
        {melding && (
          <div role="status" className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${melding.soort === "ok" ? "border-green-300 bg-green-50 text-green-900" : melding.soort === "fout" ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
            {melding.tekst}{" "}
            {"link" in melding && melding.link ? (
              <Link href={melding.link} className="font-semibold underline">
                Nieuwste versie bekijken
              </Link>
            ) : null}
            {(status === "VERLOPEN" || status === "INGETROKKEN") && contact.telefoon ? (
              <span className="mt-1 block font-normal">
                {contact.naam} · {contact.telefoon}
                {contact.email ? ` · ${contact.email}` : ""}
              </span>
            ) : null}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{inhoud.onderwerp || "Offerte"}</h1>
            <p className="text-sm text-neutral-600">
              Geldig tot {formatDatum(inhoud.geldigTot)}
              {versie > 1 ? ` · versie ${versie}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={pdfLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold">
              <Download className="h-4 w-4" aria-hidden="true" /> PDF downloaden
            </a>
            {akkoord?.heeftPdf && (
              <a href={`/o/${token}/pdf?getekend=1`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold">
                <FileText className="h-4 w-4" aria-hidden="true" /> Getekende PDF
              </a>
            )}
          </div>
        </div>

        {mobiel ? (
          <MobieleWeergave inhoud={inhoud} gekozen={gekozen} onToggle={toggle} kanKiezen={kanReageren} kleur={kleur} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="overflow-x-auto rounded-lg bg-neutral-200 p-4">
              <VelSchaal marge={32}>
                <OfferteDocument inhoud={inhoud} gekozenOptioneel={gekozen} optioneelKeuze={kanReageren ? { onToggle: toggle } : undefined} akkoord={akkoord ? { naam: akkoord.naam, tijdstip: new Date(akkoord.tijdstip) } : undefined} />
              </VelSchaal>
            </div>
            <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-4">
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-600">Totaal {t.kor || t.toonIncl ? "incl. btw" : "excl. btw"}</p>
                <p className="text-3xl font-bold tabular-nums" style={{ color: kleur }}>
                  {formatCents(eind)}
                </p>
                {heeftOptioneel && kanReageren && <p className="mt-1 text-xs text-neutral-600">Vink optionele regels aan; het totaal rekent mee.</p>}
                <div className="mt-4">{knoppen}</div>
              </div>
              {contactBlok}
            </aside>
          </div>
        )}
        {mobiel && <div className="mt-6">{contactBlok}</div>}
      </div>

      {mobiel && kanReageren && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <span className="block text-xs text-neutral-600">Totaal {t.kor || t.toonIncl ? "incl. btw" : "excl. btw"}</span>
              <span className="block text-lg font-bold tabular-nums">{formatCents(eind)}</span>
            </div>
            <button type="button" onClick={() => setDialoog("akkoord")} className="min-h-12 shrink-0 cursor-pointer rounded-lg px-5 font-semibold text-white" style={{ background: kleur }}>
              Akkoord geven
            </button>
            <button type="button" onClick={() => setDialoog("vraag")} className="min-h-12 shrink-0 cursor-pointer rounded-lg border border-neutral-300 px-3 text-sm font-semibold">
              Vraag
            </button>
          </div>
          <p className="mt-1 text-center">
            <button type="button" onClick={() => setDialoog("afwijzen")} className="min-h-9 cursor-pointer text-xs text-neutral-600 underline">
              Offerte afwijzen
            </button>
          </p>
        </div>
      )}

      {dialoog === "akkoord" && <AkkoordDialoog inhoud={inhoud} versie={versie} token={token} gekozen={gekozen} totaal={eind} kor={t.kor} inclusief={t.toonIncl} kleur={kleur} onSluit={() => setDialoog(null)} onKlaar={() => { setDialoog(null); start(() => router.refresh()); }} />}
      {dialoog === "vraag" && <TekstDialoog titel="Vraag of wijziging" label="Wat wil je vragen of laten aanpassen?" knop="Versturen" kleur={kleur} onSluit={() => setDialoog(null)} onVerstuur={(tekst) => stelVraagAction(token, tekst)} klaarTekst={`Bedankt, ${contact.naam} neemt contact met je op.`} />}
      {dialoog === "afwijzen" && <TekstDialoog titel="Offerte afwijzen" label="Wil je kort laten weten waarom? (niet verplicht)" knop="Offerte afwijzen" kleur="#b91c1c" optioneel onSluit={() => { setDialoog(null); start(() => router.refresh()); }} onVerstuur={(tekst) => wijsOfferteAfAction(token, tekst)} klaarTekst="Je hebt de offerte afgewezen. Bedankt voor je reactie." />}
    </main>
  );
}

function MobieleWeergave({ inhoud, gekozen, onToggle, kanKiezen, kleur }: { inhoud: OfferteInhoud; gekozen: string[]; onToggle: (id: string) => void; kanKiezen: boolean; kleur: string }) {
  const t = berekenTotalen(inhoud, gekozen);
  const a = inhoud.afzender;
  const eind = t.toonIncl || t.kor ? t.totaalIncl : t.totaalExcl;
  const termijnen = termijnBedragen(inhoud.betaaltermijnen, eind);
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
        <p className="font-semibold">{inhoud.klant.bedrijfsnaam || inhoud.klant.naam}</p>
        {inhoud.klant.adres.straat && (
          <p className="text-neutral-600">
            {inhoud.klant.adres.straat}, {inhoud.klant.adres.postcode} {inhoud.klant.adres.plaats}
          </p>
        )}
        <p className="mt-2 whitespace-pre-line text-neutral-700">{inhoud.introductie}</p>
      </section>

      {inhoud.secties.map((s) => (
        <section key={s.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <h2 className="flex items-baseline justify-between gap-2 border-b-2 px-4 py-3 text-base font-bold" style={{ borderColor: kleur }}>
            <span className="min-w-0">{s.titel}</span>
            <span className="shrink-0 tabular-nums">{formatCents(t.toonIncl ? (t.secties.find((x) => x.id === s.id)?.incl ?? 0) : (t.secties.find((x) => x.id === s.id)?.excl ?? 0))}</span>
          </h2>
          <ul>
            {s.regels.map((r) => {
              const u = t.regels[r.id];
              return (
                <li key={r.id} className={`border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 ${r.type === "optioneel" && !gekozen.includes(r.id) ? "text-neutral-500" : ""}`}>
                  <div className="flex items-start gap-3">
                    {r.type === "optioneel" && kanKiezen ? <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: kleur }} checked={gekozen.includes(r.id)} onChange={() => onToggle(r.id)} aria-label={`${r.omschrijving} kiezen`} /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {r.omschrijving}
                        {r.type === "stelpost" && <span className="ml-1.5 rounded border border-amber-400 bg-amber-50 px-1.5 text-[11px] font-semibold text-amber-800">Stelpost</span>}
                        {r.type === "optioneel" && <span className="ml-1.5 rounded border border-blue-300 bg-blue-50 px-1.5 text-[11px] font-semibold text-blue-800">Optioneel</span>}
                      </p>
                      {r.type !== "tekst" && (
                        <p className="text-xs text-neutral-600">
                          {formatAantal(r.aantal)} {r.eenheid} × {formatCents(prijsPerEenheidWeergave(r, t.toonIncl, t.kor))}
                          {t.kor ? "" : ` · btw ${r.btw}%`}
                        </p>
                      )}
                      {r.type === "stelpost" && <p className="text-xs text-neutral-600">{r.toelichting || "Geschat bedrag, wordt op nacalculatie afgerekend."}</p>}
                      {r.toelichting && r.type !== "stelpost" ? <p className="text-xs text-neutral-600">{r.toelichting}</p> : null}
                    </div>
                    {r.type !== "tekst" && <p className="shrink-0 font-semibold tabular-nums">{formatCents(t.toonIncl ? u.incl : u.excl)}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
        {!t.kor && (
          <>
            <div className="flex justify-between"><span className="text-neutral-600">Totaal excl. btw</span><span className="tabular-nums">{formatCents(t.totaalExcl)}</span></div>
            {t.btwGroepen.map((g) => (
              <div key={g.tarief} className="flex justify-between"><span className="text-neutral-600">Btw {g.tarief}% over {formatCents(g.grondslag)}</span><span className="tabular-nums">{formatCents(g.btw)}</span></div>
            ))}
          </>
        )}
        <div className="mt-2 flex items-baseline justify-between border-t-2 pt-2 text-lg font-bold" style={{ borderColor: kleur }}>
          <span>{t.kor ? "Totaal" : t.toonIncl ? "Totaal incl. btw" : "Totaal excl. btw"}</span>
          <span className="tabular-nums" style={{ color: kleur }}>{formatCents(eind)}</span>
        </div>
        {t.kor && <p className="mt-1 text-xs text-neutral-600">{a.korTekst}</p>}
      </section>

      {termijnen.length > 0 && (
        <details className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <summary className="min-h-9 cursor-pointer font-semibold">Betaling</summary>
          <ul className="mt-2">
            {termijnen.map((x, i) => (
              <li key={i} className="flex justify-between border-b border-neutral-100 py-1.5 last:border-b-0"><span>{x.label} ({formatAantal(x.percentage)}%)</span><span className="tabular-nums">{formatCents(x.bedrag)}</span></li>
            ))}
          </ul>
        </details>
      )}
      {(inhoud.planning.startweek || inhoud.planning.doorlooptijd) && (
        <details className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <summary className="min-h-9 cursor-pointer font-semibold">Planning</summary>
          <p className="mt-2 text-neutral-700">
            {inhoud.planning.startweek ? `Verwachte start: ${formatWeek(inhoud.planning.startweek)}. ` : ""}
            {inhoud.planning.doorlooptijd ? `Verwachte doorlooptijd: ${inhoud.planning.doorlooptijd}. ` : ""}Dit is een indicatie.
          </p>
        </details>
      )}
      <details className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
        <summary className="min-h-9 cursor-pointer font-semibold">Voorwaarden</summary>
        <ul className="mt-2 list-disc pl-5 text-neutral-700">
          {inhoud.voorwaarden.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
        {inhoud.bijlagen[0] && (
          <p className="mt-2">
            <a href={inhoud.bijlagen[0].url} target="_blank" rel="noreferrer" className="font-semibold underline">
              Algemene voorwaarden (PDF)
            </a>
          </p>
        )}
        {inhoud.klant.type === "particulier" && inhoud.herroeping.aan && <p className="mt-3 whitespace-pre-line text-neutral-700">{inhoud.herroeping.tekst}</p>}
      </details>
    </div>
  );
}

function AkkoordDialoog({ inhoud, versie, token, gekozen, totaal, kor, inclusief, kleur, onSluit, onKlaar }: { inhoud: OfferteInhoud; versie: number; token: string; gekozen: string[]; totaal: number; kor: boolean; inclusief: boolean; kleur: string; onSluit: () => void; onKlaar: () => void }) {
  const [naam, setNaam] = useState(inhoud.klant.naam);
  const [vinkje, setVinkje] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  async function bevestig() {
    setBezig(true);
    setFout(null);
    const r = await geefAkkoordAction(token, { naam, vinkje, gekozen, versie });
    setBezig(false);
    if (r.ok) onKlaar();
    else setFout(r.error);
  }
  return (
    <Overlay open onClose={onSluit} ariaLabelledBy="akk-titel" className="flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 text-neutral-900 shadow-lg sm:rounded-2xl">
        <button type="button" aria-label="Sluiten" onClick={onSluit} className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-neutral-100">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 id="akk-titel" className="pr-10 text-xl font-bold">
          Akkoord geven
        </h2>
        <p className="text-sm text-neutral-700">
          Offerte {inhoud.nummer} van {formatCents(totaal)} {kor ? "" : inclusief ? "incl. btw" : "excl. btw"}.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Je volledige naam
          <input value={naam} onChange={(e) => setNaam(e.target.value)} autoComplete="name" className="h-12 rounded-md border-[1.5px] border-neutral-400 px-3 text-base font-normal" />
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={vinkje} onChange={(e) => setVinkje(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: kleur }} />
          <span>Ik ga akkoord met deze offerte en de algemene voorwaarden.</span>
        </label>
        {fout && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
            {fout}
          </p>
        )}
        <button type="button" disabled={bezig} onClick={bevestig} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 font-semibold text-white disabled:opacity-60" style={{ background: kleur }}>
          {bezig ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />} Bevestigen
        </button>
        <p className="text-xs text-neutral-600">We leggen je naam, het tijdstip en je IP-adres vast als bewijs van je akkoord. Na je akkoord kun je de getekende offerte direct downloaden.</p>
      </div>
    </Overlay>
  );
}

function TekstDialoog({ titel, label, knop, kleur, optioneel, onSluit, onVerstuur, klaarTekst }: { titel: string; label: string; knop: string; kleur: string; optioneel?: boolean; onSluit: () => void; onVerstuur: (tekst: string) => Promise<{ ok: true } | { ok: false; error: string }>; klaarTekst: string }) {
  const [tekst, setTekst] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  async function verstuur() {
    setBezig(true);
    setFout(null);
    const r = await onVerstuur(tekst);
    setBezig(false);
    if (r.ok) setKlaar(true);
    else setFout(r.error);
  }
  return (
    <Overlay open onClose={onSluit} ariaLabelledBy="txt-titel" className="flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 text-neutral-900 shadow-lg sm:rounded-2xl">
        <button type="button" aria-label="Sluiten" onClick={onSluit} className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-neutral-100">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 id="txt-titel" className="pr-10 text-xl font-bold">
          {titel}
        </h2>
        {klaar ? (
          <>
            <p role="status" className="text-sm text-neutral-800">{klaarTekst}</p>
            <button type="button" onClick={onSluit} className="min-h-12 cursor-pointer rounded-lg border border-neutral-300 px-5 font-semibold">Sluiten</button>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {label}
              <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={5} className="rounded-md border-[1.5px] border-neutral-400 p-3 text-base font-normal" />
            </label>
            {fout && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">{fout}</p>}
            <button type="button" disabled={bezig || (!optioneel && tekst.trim().length < 3)} onClick={verstuur} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 font-semibold text-white disabled:opacity-60" style={{ background: kleur }}>
              {bezig ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} {knop}
            </button>
          </>
        )}
      </div>
    </Overlay>
  );
}
