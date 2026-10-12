import { NextResponse } from "next/server";
import { offerteOnderhoud } from "@/app/lib/offerte/onderhoud";
import { getSiteUrl } from "@/app/lib/url";

export const maxDuration = 60;

// Dagelijks: verlopen offertes afsluiten en herinneringen versturen. Beschermd met CRON_SECRET.
export async function GET(request: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || request.headers.get("authorization") !== `Bearer ${geheim}`) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await offerteOnderhoud(getSiteUrl())) });
}
