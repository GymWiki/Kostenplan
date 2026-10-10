"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { parseGetal } from "@/app/lib/sjablonen";
import { extractBranding } from "@/app/lib/branding-extract";
import { slaBasisTarievenOp } from "@/app/lib/basis-tarieven-server";
import { generateUniqueSlug, generateUniqueToolSlug } from "@/app/lib/slug";
import { beperk } from "@/app/lib/rate-limit";
import { verifieerTurnstile } from "@/app/lib/turnstile";
import { isOwnStorageUrl } from "@/app/lib/storage";
import {
  GAST_BEDRIJFSNAAM,
  GAST_BEWAAR_DAGEN,
  GAST_GEBEURTENISSEN,
  GAST_TOOLNAAM,
  bepaalBron,
  ipHash,
  normaliseerSite,
  type GastGebeurtenisType,
} from "@/app/lib/gast";
import { logGastGebeurtenis } from "@/app/lib/gast-log";
import { GAST_EMAIL_DOMEIN } from "@/app/lib/dal";
import { BASIS_TARIEVEN_DEFAULTS } from "@/app/lib/presets/basis-tarieven";
import { HOVENIER_PRESETS } from "@/app/lib/presets";
import { maakProductVanPreset } from "@/app/lib/preset-product";
import type { Prisma } from "@/app/generated/prisma/client";

export type GastStartState = { error?: string } | null;

const EXTRACTIE_TIMEOUT_MS = 12_000;

// "Maak mijn rekentool" op /probeer: gast-sessie (anonieme Supabase-gebruiker)
// + concept-bedrijf + één rekentool met de gekozen onderdelen, het tarief en
// (als er een website is ingevuld) logo en kleuren daarvan. Pas hier start de
// sessie: niet bij elk paginabezoek, en pas na een geslaagde Turnstile-check.
export async function startGastAction(_prev: GastStartState, formData: FormData): Promise<GastStartState> {
  const kopteksten = await headers();
  const ip = ipHash(kopteksten);

  const bronInfo = bepaalBron({
    utm_source: formData.get("utm_source"),
    utm_medium: formData.get("utm_medium"),
    utm_campaign: formData.get("utm_campaign"),
    metSiteParam: formData.get("metSiteParam") === "1",
  });

  // Heeft deze browser al een gast-sessie met een rekentool? Dan gewoon verder.
  const supabase = await createClient();
  const {
    data: { user: bestaand },
  } = await supabase.auth.getUser();
  if (bestaand?.is_anonymous) {
    const heeft = await prisma.companyMember.findFirst({ where: { userId: bestaand.id, company: { gastVerlooptOp: { not: null } } }, select: { id: true } });
    if (heeft) redirect("/probeer/editor");
  } else if (bestaand) {
    redirect("/dashboard");
  }

  const gekozen = new Set(formData.getAll("preset").map(String));
  const presets = HOVENIER_PRESETS.filter((p) => gekozen.has(p.id));
  if (presets.length === 0) return { error: "Kies minstens één onderdeel dat je doet." };

  const tarief = parseGetal(formData.get("tarief"), NaN);
  if (!Number.isFinite(tarief) || tarief <= 0 || tarief > 10000) return { error: "Vul in wat je rekent per dagdeel, bijvoorbeeld 180." };

  const siteRuw = String(formData.get("site") ?? "").trim();
  const site = normaliseerSite(siteRuw);
  // Een ongeldige site breekt de flow nooit: gewoon zonder logo en kleuren verder.

  const limiet = await beperk(`gast-start:${ip}`, 5, 3600);
  if (!limiet.toegestaan) return { error: "Je hebt het al een paar keer geprobeerd. Probeer het over een uur opnieuw." };

  const captchaToken = String(formData.get("captchaToken") ?? "");
  if (!(await verifieerTurnstile(captchaToken, undefined))) {
    return { error: "We konden niet controleren dat je geen robot bent. Ververs de pagina en probeer het opnieuw." };
  }

  const { data: sessie, error: sessieFout } = await supabase.auth.signInAnonymously({
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (sessieFout || !sessie.user) {
    console.error("Gast-sessie starten mislukt", sessieFout);
    return { error: "Starten lukt nu even niet. Probeer het zo nog eens." };
  }
  const userId = sessie.user.id;

  // Bedrijf, rekentool, tarieven en onderdelen. Zonder afhankelijkheid van de
  // sessie-cookie in dit verzoek: we gebruiken direct de user-id.
  await prisma.user.upsert({ where: { id: userId }, create: { id: userId, email: `gast-${userId}@${GAST_EMAIL_DOMEIN}` }, update: {} });
  const company = await prisma.company.create({
    data: {
      naam: GAST_BEDRIJFSNAAM,
      slug: await generateUniqueSlug(`${GAST_BEDRIJFSNAAM} ${userId.slice(0, 6)}`),
      createdBy: userId,
      members: { create: { userId, rol: "owner" } },
      gastVerlooptOp: new Date(Date.now() + GAST_BEWAAR_DAGEN * 24 * 60 * 60 * 1000),
      gastBron: bronInfo as unknown as Prisma.InputJsonValue,
    },
  });
  const tool = await prisma.tool.create({
    data: {
      companyId: company.id,
      naam: GAST_TOOLNAAM,
      slug: await generateUniqueToolSlug(company.id, GAST_TOOLNAAM),
      costSettings: { create: {} },
      branding: { create: {} },
    },
  });
  await slaBasisTarievenOp(company.id, tool.id, {
    arbeidStapEenheid: "DAGDEEL",
    arbeidTarief: tarief,
    voorrijTarief: BASIS_TARIEVEN_DEFAULTS.voorrijTarief,
    transportTarief: BASIS_TARIEVEN_DEFAULTS.transportTarief,
  });
  await prisma.$transaction(presets.map((preset, i) => maakProductVanPreset(prisma, tool.id, preset, "DAGDEEL", i)));
  await logGastGebeurtenis("probeer_gestart", { userId, bron: bronInfo.bron, metSite: bronInfo.metSite });

  // Logo en kleuren van de website (nooit blokkerend).
  let brandingGelukt: boolean | null = null;
  if (site) {
    brandingGelukt = await pasBrandingToe(site, company.id, tool.id);
    await logGastGebeurtenis(brandingGelukt ? "branding_gelukt" : "branding_mislukt", { userId, bron: bronInfo.bron, metSite: true });
  }

  redirect(`/probeer/editor${brandingGelukt === false ? "?logo=mislukt" : ""}`);
}

async function pasBrandingToe(site: string, companyId: string, toolId: string): Promise<boolean> {
  try {
    const result = await Promise.race([
      extractBranding(site, companyId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), EXTRACTIE_TIMEOUT_MS)),
    ]);
    if (!result || !result.success) return false;
    const logoUrl = result.logoUrl && isOwnStorageUrl(result.logoUrl) ? result.logoUrl : null;
    await prisma.branding.update({
      where: { toolId },
      data: {
        primaireKleur: result.primaryColor,
        lettertype: result.lettertype,
        ...(logoUrl ? { logoUrl } : {}),
        ...(result.title ? { customTitel: result.title } : {}),
        ...(result.subtitle ? { welkomstTekst: result.subtitle } : {}),
      },
    });
    if (result.companyName && result.companyName.trim().length >= 2) {
      await prisma.company.update({ where: { id: companyId }, data: { naam: result.companyName.trim().slice(0, 80) } });
    }
    // Logo of kleuren: "gelukt" als er minstens één van beide is gevonden.
    return Boolean(logoUrl) || Boolean(result.primaryColor);
  } catch (error) {
    console.error("Gast-branding mislukt", error);
    return false;
  }
}

// Funnel vanuit de browser (bekeken, editor geopend, prijs aangepast, …).
// Zonder persoonsgegevens; voor ingelogde gasten komt de bron van hun bedrijf.
export async function meldGastGebeurtenisAction(
  type: string,
  bronParams?: { utm_source?: string; utm_medium?: string; utm_campaign?: string; metSiteParam?: boolean }
): Promise<void> {
  if (!(GAST_GEBEURTENISSEN as readonly string[]).includes(type)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let bron = bepaalBron(bronParams ?? {});
  let userId: string | undefined;
  if (user?.is_anonymous) {
    userId = user.id;
    const c = await prisma.company.findFirst({ where: { members: { some: { userId: user.id } }, gastVerlooptOp: { not: null } }, select: { gastBron: true } });
    const b = c?.gastBron as { bron?: string; metSite?: boolean } | null;
    if (b?.bron) bron = { ...bron, bron: b.bron, metSite: Boolean(b.metSite) };
  } else if (user) {
    return; // gewone gebruikers horen niet in de funnel
  }
  await logGastGebeurtenis(type as GastGebeurtenisType, { userId, bron: bron.bron, metSite: bron.metSite });
}
