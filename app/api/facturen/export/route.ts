import { NextResponse } from "next/server";
import { zipSync, strToU8 } from "fflate";
import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";
import { factuurCsv, factuurUbl } from "@/app/lib/factuur/export";
import { laadExportFacturen } from "@/app/lib/factuur/export-server";
import { zorgVoorFactuurPdf } from "@/app/lib/factuur/pdf";
import { bestandsnaam } from "@/app/lib/offerte/weergave";

export const runtime = "nodejs";
export const maxDuration = 120;

// Export van definitieve facturen per periode:  ?formaat=csv | zip  &van=YYYY-MM-DD &tot=YYYY-MM-DD &status=… &ubl=1
// De ZIP bevat de PDF's zoals vastgelegd, de CSV en (met ubl=1) per factuur een UBL 2.1-bestand. Een export zonder
// periode of status geldt als volledige export (nodig voordat een bedrijf met facturen verwijderd kan worden).
export async function GET(req: Request) {
  const { company } = await requireActiveCompany();
  const q = new URL(req.url).searchParams;
  const formaat = q.get("formaat") === "zip" ? "zip" : "csv";
  const van = q.get("van");
  const tot = q.get("tot");
  const status = q.get("status");
  const rijen = await laadExportFacturen(company.id, { van, tot, status });
  const volledig = !van && !tot && !status;
  const stempel = new Date().toISOString().slice(0, 10);
  const naam = `facturen-${company.slug ?? "export"}-${van ?? "begin"}-${tot ?? stempel}`;

  if (formaat === "csv") {
    return new NextResponse(factuurCsv(rijen), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${naam}.csv"`, "cache-control": "private, no-store" } });
  }

  const bestanden: Record<string, Uint8Array> = { "facturen.csv": strToU8(factuurCsv(rijen)) };
  const origin = new URL(req.url).origin;
  for (const r of rijen) {
    const pdf = await zorgVoorFactuurPdf(origin, r.id, company.id).catch(() => null);
    if (pdf) bestanden[`pdf/${bestandsnaam(r.inhoud)}`] = new Uint8Array(pdf.pdf);
    if (q.get("ubl") === "1") bestanden[`ubl/${r.nummer}.xml`] = strToU8(factuurUbl(r));
  }
  if (volledig) await prismaBasis.company.update({ where: { id: company.id }, data: { factuurExportOp: new Date() } });
  return new NextResponse(new Uint8Array(zipSync(bestanden)), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${naam}.zip"`, "cache-control": "private, no-store" } });
}
