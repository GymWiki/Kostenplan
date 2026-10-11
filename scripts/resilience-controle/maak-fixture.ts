import { writeFileSync, mkdirSync } from "node:fs";
import { fixtureProducten, fixtureBranding, fixtureKosten, TOOL_ID } from "/home/user/Kostenplan/app/zz-preview/fixtures";
import { zuiver, hashInhoud } from "/home/user/Kostenplan/app/lib/snapshot/bouw";
import { bouwEmbedCode, bouwIframeCode } from "/home/user/Kostenplan/app/lib/embed-code";
import { DEFAULT_EMBED_CONFIG } from "/home/user/Kostenplan/app/lib/tools";

const S = process.argv[2];
const inhoud = {
  schemaVersie: 1, toolId: TOOL_ID, beschikbaar: true,
  bedrijf: { naam: "Hovenier De Vries", telefoon: "0612345678", email: "info@devries.nl" },
  tier: "PLUS", soort: "klassiek",
  branding: zuiver({ ...fixtureBranding, toonTelefoonnummer: true, telefoonnummer: "0612345678", toonEmail: true }),
  costSettings: zuiver(fixtureKosten), producten: zuiver(fixtureProducten()),
  toelichting: null, ctaTekst: null, vraagTelefoon: true, engine: null,
};
const snap = { ...inhoud, versie: 1, gepubliceerdOp: new Date().toISOString(), inhoudHash: hashInhoud(inhoud) };
mkdirSync(`${S}/fx/s/${TOOL_ID}`, { recursive: true });
writeFileSync(`${S}/fx/s/${TOOL_ID}/latest.json`, JSON.stringify(snap));
writeFileSync(`${S}/fx/s/${TOOL_ID}/v1.json`, JSON.stringify(snap));

const opties = {
  toolId: TOOL_ID, toolNaam: "Tuinaanleg", baseUrl: "http://127.0.0.1:3100", reserveUrl: "http://127.0.0.1:4010",
  snapshotUrl: "http://127.0.0.1:4010", embedConfig: DEFAULT_EMBED_CONFIG,
  contact: { naam: "Hovenier De Vries", telefoon: "0612345678", email: "info@devries.nl", kleur: "#15803d", achtergrond: "#f7faf8" },
};
const host = (code: string) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hovenier site</title></head>
<body style="font-family:system-ui;margin:0;padding:24px"><h1>Welkom bij De Vries</h1><p>Onze tuinen zijn mooi.</p><button id="b" onclick="this.textContent=Number(this.textContent)+1">0</button>
<div style="margin-top:16px">${code}</div><p id="onder">Voettekst van de hovenier</p></body></html>`;
writeFileSync(`${S}/fx/host-nieuw.html`, host(bouwEmbedCode(opties)));
writeFileSync(`${S}/fx/host-zonder-reserve.html`, host(bouwEmbedCode({ ...opties, reserveUrl: null })));
writeFileSync(`${S}/fx/host-oud-attr.html`, host(bouwEmbedCode({ ...opties, contact: { naam: "Hovenier De Vries" } })));
writeFileSync(`${S}/fx/host-iframe.html`, host(bouwIframeCode(opties)));
// Oude embedcode, zoals die tot nu toe werd gegenereerd (iframe + resize-script).
writeFileSync(`${S}/fx/host-oudste.html`, host(`<iframe id="kostenplan-t-demo" src="http://127.0.0.1:3100/embed/t-demo" title="Rekentool" style="width: 100%; min-height: 600px; border: 1px solid #e2e8f0; border-radius: 12px;" height="600" loading="lazy"></iframe>
<script>(function(){window.addEventListener("message",function(event){if(event.origin!=="http://127.0.0.1:3100")return;var data=event.data;if(!data||data.type!=="kostenplan:resize"||data.toolId!=="t-demo")return;var iframe=document.getElementById("kostenplan-t-demo");if(iframe)iframe.style.height=Math.max(data.height,600)+"px";});})();</script>`));
console.log("fixture klaar");
