import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FactuurPubliek } from "@/app/components/factuur/factuur-publiek";
import { laadPubliekeFactuur, registreerFactuurBekeken } from "@/app/lib/factuur/publiek";
import { isWaarschijnlijkBot } from "@/app/lib/offerte/publiek";

// Nooit indexeren: een token geeft toegang tot één factuur.
export const metadata: Metadata = { title: "Jouw factuur", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PubliekeFactuurPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const f = await laadPubliekeFactuur(token);
  if (!f) notFound();
  if (!isWaarschijnlijkBot((await headers()).get("user-agent"))) await registreerFactuurBekeken(f.id);
  const a = f.inhoud.afzender;
  return <FactuurPubliek token={f.token} inhoud={f.inhoud} status={f.status} totaalInclCenten={f.totaalInclCenten} betaaldCenten={f.betaaldCenten} contact={{ naam: a.handelsnaam, telefoon: a.telefoon, email: a.email }} />;
}
