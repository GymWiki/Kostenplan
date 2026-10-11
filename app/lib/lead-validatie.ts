// Dezelfde regels als leadContactSchema/leadSnapshotSchema (zod), maar zonder
// afhankelijkheden zodat ook de Cloudflare-reserve (cloudflare/reserve) ze
// kan gebruiken. lead-validatie.test.ts bewaakt dat beide gelijk blijven.

export type LeadInvoerRuw = {
  toolId?: unknown;
  naam?: unknown;
  email?: unknown;
  telefoonnummer?: unknown;
  snapshot?: unknown;
  sleutel?: unknown;
};

export type SchoneLead = {
  toolId: string;
  naam: string;
  email: string;
  telefoonnummer: string;
  snapshot: unknown;
  sleutel: string;
};

export const SLEUTEL_PATROON = /^[A-Za-z0-9_-]{16,64}$/;
// zod's .email() is wat soepeler dan dit patroon op randgevallen; dit is bewust
// de strengere kant (de reserve mag niets accepteren wat de app weigert).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isGetal(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function valideerLead(invoer: LeadInvoerRuw): { ok: true; lead: SchoneLead } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const naam = typeof invoer.naam === "string" ? invoer.naam.trim() : "";
  if (naam.length < 1 || naam.length > 120) fieldErrors.naam = "Vul je naam in";
  const email = typeof invoer.email === "string" ? invoer.email.trim() : "";
  if (!EMAIL.test(email) || email.length > 254) fieldErrors.email = "Vul een geldig e-mailadres in";
  const tel = invoer.telefoonnummer == null ? "" : typeof invoer.telefoonnummer === "string" ? invoer.telefoonnummer.trim() : null;
  if (tel === null || tel.length > 30) fieldErrors.telefoonnummer = "Ongeldig telefoonnummer";
  if (typeof invoer.toolId !== "string" || invoer.toolId.length < 1 || invoer.toolId.length > 64) fieldErrors.toolId = "Ongeldige rekentool";
  if (typeof invoer.sleutel !== "string" || !SLEUTEL_PATROON.test(invoer.sleutel)) fieldErrors.sleutel = "Ongeldige aanvraag";

  const s = invoer.snapshot as Record<string, unknown> | null | undefined;
  const snapshotOk =
    !!s &&
    typeof s === "object" &&
    Array.isArray(s.regels) &&
    s.regels.length >= 1 &&
    s.regels.length <= 200 &&
    (s.regels as unknown[]).every((r) => !!r && typeof r === "object" && typeof (r as { naam?: unknown }).naam === "string") &&
    ["arbeidskosten", "materiaalkosten", "transportkosten", "voorrijkosten", "subtotaal", "btw", "totaal"].every((k) => isGetal(s[k]));
  if (!snapshotOk) fieldErrors.snapshot = "Ongeldige aanvraag";

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    lead: {
      toolId: invoer.toolId as string,
      naam,
      email,
      telefoonnummer: tel ?? "",
      snapshot: invoer.snapshot,
      sleutel: invoer.sleutel as string,
    },
  };
}
