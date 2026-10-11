import { NextResponse } from "next/server";
import { maakLead } from "@/app/lib/lead-aanmaken";
import { planLeadMail } from "@/app/lib/mail/plan-lead-mail";
import { planReserveIngest } from "@/app/lib/reserve-ingest";

export const maxDuration = 30;

// Herhaalbare route voor het versturen van een aanvraag vanuit de rekentool
// (en voor de browser-wachtrij). Antwoorden:
//   200 { ok: true }                    lead staat erin (ook bij herhaling)
//   400/404 { ok: false, ... }          definitief: niet opnieuw proberen
//   503 { ok: false, tijdelijk: true }  tijdelijk (database weg): wél opnieuw
const MAX_BYTES = 64 * 1024;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const tekst = await request.text();
    if (tekst.length > MAX_BYTES) return NextResponse.json({ ok: false, error: "Te groot." }, { status: 413 });
    body = JSON.parse(tekst) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige aanvraag." }, { status: 400 });
  }
  if (!body || typeof body.toolId !== "string") {
    return NextResponse.json({ ok: false, error: "Ongeldige aanvraag." }, { status: 400 });
  }

  try {
    const uitslag = await maakLead({
      toolId: body.toolId,
      naam: body.naam,
      email: body.email,
      telefoonnummer: body.telefoonnummer,
      snapshot: body.snapshot,
      sleutel: body.sleutel,
    });
    if (!uitslag.ok) {
      return NextResponse.json(
        { ok: false, error: uitslag.error, fieldErrors: uitslag.fieldErrors },
        { status: uitslag.error?.includes("niet (meer) beschikbaar") ? 404 : 400 }
      );
    }
    if (!uitslag.dubbel) planLeadMail(uitslag.leadId);
    // De app werkt: dit is een goed moment om aanvragen uit de reserve binnen te halen.
    planReserveIngest();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[lead] opslaan mislukt, bezoeker probeert opnieuw", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, tijdelijk: true }, { status: 503 });
  }
}
