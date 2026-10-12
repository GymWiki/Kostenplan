import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferteDocument } from "@/app/components/offerte/offerte-document";
import { prisma } from "@/app/lib/prisma";
import { leesPrintToken } from "@/app/lib/offerte/pdf-token";
import { VOORBEELDEN } from "@/app/lib/offerte/voorbeelden";
import type { OfferteInhoud } from "@/app/lib/offerte/model";

// Alleen voor de headless browser die de PDF maakt (ondertekende, kortlevende token).
export const metadata: Metadata = { title: "Offerte", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OffertePrintPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = leesPrintToken(token);
  if (!p) notFound();

  let inhoud: OfferteInhoud;
  let akkoord: { naam: string; tijdstip: Date } | undefined;
  let gekozen: string[] = [];
  if (p.k === "voorbeeld") {
    if (process.env.OFFERTE_VOORBEELDEN !== "1") notFound();
    const bouw = VOORBEELDEN[p.n as keyof typeof VOORBEELDEN];
    if (!bouw) notFound();
    inhoud = bouw();
    if (p.akkoord) akkoord = { naam: "A. Jansen", tijdstip: new Date("2026-10-16T14:32:00") };
    if (p.optioneel) gekozen = inhoud.secties.flatMap((s) => s.regels).filter((r) => r.type === "optioneel").map((r) => r.id);
  } else {
    const v = await prisma.offerteVersie.findFirst({ where: { offerteId: p.o, versie: p.v }, include: { akkoorden: true } });
    if (!v) notFound();
    inhoud = v.inhoud as unknown as OfferteInhoud;
    if (p.akkoord && v.akkoorden[0]) {
      akkoord = { naam: v.akkoorden[0].naam, tijdstip: v.akkoorden[0].tijdstip };
      gekozen = v.akkoorden[0].gekozenRegelIds as string[];
    }
  }
  return (
    <div style={{ background: "#fff" }}>
      <OfferteDocument inhoud={inhoud} modus="pdf" akkoord={akkoord} gekozenOptioneel={gekozen} />
    </div>
  );
}
