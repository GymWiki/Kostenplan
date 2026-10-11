import { NextResponse } from "next/server";
import { verwerkMailWachtrij } from "@/app/lib/mail/lead-mail";

export const maxDuration = 60;

// Verstuurt mails die nog openstaan (Brevo was even weg). Beschermd met CRON_SECRET.
export async function GET(request: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || request.headers.get("authorization") !== `Bearer ${geheim}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await verwerkMailWachtrij(25)) });
}
