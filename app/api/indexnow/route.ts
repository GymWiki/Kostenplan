import { NextResponse, type NextRequest } from "next/server";
import sitemap, { BASE_URL } from "@/app/sitemap";

// Getriggerd door .github/workflows/indexnow.yml na een geslaagde
// productie-deploy — niet publiek bedoeld om aan te roepen, dus beveiligd
// met een gedeeld secret (INDEXNOW_TRIGGER_SECRET) in plaats van open te
// staan voor iedereen die de URL raadt. Dit secret is iets anders dan
// INDEXNOW_KEY: die laatste is juist bewust publiek (staat ook gewoon in
// public/<key>.txt) en dient enkel om domein-eigenaarschap te bewijzen aan
// IndexNow zelf.
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.INDEXNOW_TRIGGER_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.error("IndexNow: INDEXNOW_KEY ontbreekt");
    return NextResponse.json({ error: "INDEXNOW_KEY niet geconfigureerd" }, { status: 500 });
  }

  // Zelfde databron als de publieke sitemap (inclusief actieve
  // klantportalen) — geen aparte URL-lijst om uit sync te laten raken.
  const entries = await sitemap();
  const urlList = entries.map((entry) => entry.url);
  const host = new URL(BASE_URL).host;

  let indexNowStatus: number;
  let indexNowBody: string;
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${BASE_URL}/${key}.txt`,
        urlList,
      }),
    });
    indexNowStatus = response.status;
    indexNowBody = await response.text();
  } catch (error) {
    console.error("IndexNow: submit mislukt", error);
    return NextResponse.json({ error: "IndexNow-aanvraag mislukt" }, { status: 502 });
  }

  // IndexNow retourneert 200 (of 202) zonder body bij succes, en 4xx met
  // een foutmelding erbij — beide loggen we, zodat een falende submit
  // zichtbaar is in de Vercel-functielogs zonder dat daar apart voor
  // ingelogd hoeft te worden.
  const ok = indexNowStatus >= 200 && indexNowStatus < 300;
  const logPayload = {
    ok,
    status: indexNowStatus,
    urlCount: urlList.length,
    urls: urlList,
    body: indexNowBody || null,
    timestamp: new Date().toISOString(),
  };
  if (ok) {
    console.log("IndexNow submit geslaagd", logPayload);
  } else {
    console.error("IndexNow submit mislukt", logPayload);
  }

  return NextResponse.json(logPayload, { status: ok ? 200 : 502 });
}
