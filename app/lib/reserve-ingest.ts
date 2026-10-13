import "server-only";
import { after } from "next/server";
import { maakLead } from "@/app/lib/lead-aanmaken";
import { planLeadMail } from "@/app/lib/mail/plan-lead-mail";
import { spiegelSchrijfConfig } from "@/app/lib/snapshot/opslag";

// Haalt aanvragen op die bezoekers bij de Cloudflare-reserve achterlieten
// toen de app niet bereikbaar was. Idempotent: de sleutel van de aanvraag
// voorkomt dubbele leads, en de reserve verwijdert pas na onze bevestiging.
export function ingestGeconfigureerd(): boolean {
  return Boolean(spiegelSchrijfConfig() && process.env.CF_INGEST_TOKEN);
}

export async function haalReserveLeadsOp(): Promise<{ opgehaald: number; verwerkt: number; fouten: string[] }> {
  const config = spiegelSchrijfConfig();
  const token = process.env.CF_INGEST_TOKEN;
  if (!config || !token) return { opgehaald: 0, verwerkt: 0, fouten: [] };
  const fouten: string[] = [];
  const bevestig: string[] = [];
  let opgehaald = 0;
  try {
    const res = await fetch(`${config.url}/ingest`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Reserve gaf ${res.status}`);
    const { leads } = (await res.json()) as { leads: Record<string, unknown>[] };
    opgehaald = leads.length;
    for (const lead of leads) {
      try {
        const uitslag = await maakLead({
          toolId: String(lead.toolId),
          naam: lead.naam,
          email: lead.email,
          telefoonnummer: lead.telefoonnummer,
          snapshot: lead.snapshot,
          sleutel: lead.sleutel,
          bron: "reserve",
        });
        // Definitief afgewezen (ongeldig, tool weg) blokkeert de rest niet.
        if (!uitslag.ok) fouten.push(`${String(lead.sleutel)}: definitief afgewezen`);
        else if (!uitslag.dubbel) planLeadMail(uitslag.leadId);
        console.warn("[reserve] aanvraag uit de reserve opgenomen", { sleutel: lead.sleutel, resultaat: uitslag.ok ? "ok" : "afgewezen" });
        bevestig.push(String(lead.sleutel));
      } catch (e) {
        fouten.push(`${String(lead.sleutel)}: ${e instanceof Error ? e.message : "mislukt"}`);
      }
    }
    if (bevestig.length > 0) {
      await fetch(`${config.url}/ingest/ack`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ sleutels: bevestig }),
        signal: AbortSignal.timeout(8000),
      });
    }
  } catch (e) {
    fouten.push(e instanceof Error ? e.message : "reserve onbereikbaar");
  }
  return { opgehaald, verwerkt: bevestig.length, fouten };
}

let laatste = 0;
// Haalt op de achtergrond wachtende reserve-aanvragen binnen, hooguit eens per
// minuut per server-instantie. Aangeroepen als de app bewezen werkt.
export function planReserveIngest(): void {
  if (!ingestGeconfigureerd() || Date.now() - laatste < 60_000) return;
  laatste = Date.now();
  const werk = async () => {
    await haalReserveLeadsOp();
  };
  try {
    after(werk);
  } catch {
    void werk();
  }
}
