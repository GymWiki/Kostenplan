import type { ToolEmbedConfig } from "@/app/lib/tools";

// Huidige versie van het laadscript. Een nieuwe versie krijgt een nieuw
// bestand (public/kp/v2.js); bestaande embedcodes blijven naar hun eigen
// versie wijzen, dus een kapotte uitrol raakt alleen codes die nieuw gekopieerd
// worden en is terug te draaien door deze constante terug te zetten.
export const LAADSCRIPT_VERSIE = 1;
export const laadscriptPad = (versie = LAADSCRIPT_VERSIE) => `/kp/v${versie}.js`;

export type EmbedContact = {
  naam: string;
  telefoon?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  kleur?: string | null;
  achtergrond?: string | null;
};

export type EmbedCodeOpties = {
  toolId: string;
  toolNaam: string;
  baseUrl: string;
  // Reserve-adres voor het laadscript (niveau 2, bijv. Cloudflare), optioneel.
  reserveUrl?: string | null;
  // Publieke basis-URL van de snapshot-opslag, voor de nieuwste contactgegevens.
  snapshotUrl?: string | null;
  embedConfig: ToolEmbedConfig;
  contact: EmbedContact;
};

function esc(waarde: string) {
  return waarde.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attr(naam: string, waarde: string | null | undefined) {
  return waarde ? `\n  data-${naam}="${esc(waarde)}"` : "";
}

function containerStijl(c: ToolEmbedConfig) {
  return [
    `width:${c.breedte === "VAST" ? `${c.vasteBreedtePx}px` : "100%"}`,
    "max-width:100%",
    `min-height:${c.minimaleHoogtePx}px`,
    `border:${c.toonBorder ? "1px solid #e2e8f0" : "0"}`,
    `border-radius:${c.radiusPx}px`,
    "overflow:hidden",
    c.transparanteAchtergrond ? "background:transparent" : null,
  ]
    .filter(Boolean)
    .join(";");
}

// Het kleine inline script (< 2 KB): laadt het versie-bestand, probeert na
// 4 seconden het reserve-adres, en toont anders zelf een eenvoudige
// contactkaart. Zonder laadscript blijft de pagina van de hovenier dus
// gewoon werken. Het laden begint pas als de pagina klaar is (`load`, of
// uiterlijk 2,5 s na het inlezen), zodat het de laadtijd van de site zelf
// niet beïnvloedt, ook niet als onze server traag is.
function inlineScript(id: string, bronnen: string[]) {
  return (
    `(function(d){var c=d.getElementById(${JSON.stringify(id)}),i=0,t,L=${JSON.stringify(bronnen)};` +
    `function g(){if(!c||c.firstChild)return;var a=c.dataset,h=a.tel,m=a.mail,x=d.createElement("div"),p=d.createElement("p");` +
    `x.style.cssText="text-align:center;font:16px system-ui,sans-serif;padding:24px;box-sizing:border-box;min-height:"+a.hoogte+"px";` +
    `p.textContent=h||m?"Bereken je prijs telefonisch of per mail":"Deze rekentool is tijdelijk niet beschikbaar.";x.appendChild(p);` +
    `[[h,"tel:"+h,"Bel "+h],[m,"mailto:"+m,"Mail ons"]].forEach(function(r){if(r[0]){var e=d.createElement("a");e.href=r[1];e.textContent=r[2];` +
    `e.style.cssText="display:block;margin:10px auto;max-width:300px;padding:12px;border:2px solid "+(a.kleur||"#15803d")+";border-radius:10px;color:#111;text-decoration:none";x.appendChild(e)}});c.appendChild(x)}` +
    `function l(){if(i>=L.length)return g();var e=d.createElement("script"),o=0;e.async=1;e.src=L[i++];` +
    `function n(){if(o)return;o=1;clearTimeout(t);e.parentNode&&e.parentNode.removeChild(e);l()}` +
    `e.onerror=n;t=setTimeout(n,4000);e.onload=function(){o=1;clearTimeout(t)};d.head.appendChild(e)}` +
    `function s(){if(c&&!i&&!t){l()}}` +
    `document.readyState==="complete"?s():(window.addEventListener("load",s),setTimeout(s,2500));` +
    `})(document);`
  );
}

export function bouwEmbedCode(o: EmbedCodeOpties): string {
  const id = `kp-${o.toolId}`;
  const pad = laadscriptPad();
  const bronnen = [`${o.baseUrl}${pad}`, ...(o.reserveUrl ? [`${o.reserveUrl.replace(/\/$/, "")}${pad}`] : [])];
  const c = o.contact;
  return (
    `<div id="${id}" class="kostenplan-embed" style="${containerStijl(o.embedConfig)}"\n` +
    `  data-kp="${esc(o.toolId)}"\n  data-app="${esc(o.baseUrl)}"\n  data-hoogte="${o.embedConfig.minimaleHoogtePx}"\n  data-radius="${o.embedConfig.radiusPx}"` +
    (o.embedConfig.transparanteAchtergrond ? `\n  data-transparant="1"` : "") +
    attr("snap", o.snapshotUrl) +
    attr("naam", c.naam) +
    attr("tel", c.telefoon) +
    attr("mail", c.email) +
    attr("wa", c.whatsapp) +
    attr("kleur", c.kleur) +
    attr("bg", c.achtergrond) +
    `></div>\n<script>${inlineScript(id, bronnen)}</script>`
  );
}

// Alternatief voor websitebouwers die scripts weghalen: alleen een iframe,
// plus (zichtbaar zodra de rekentool binnen 4 seconden niet laadt) de
// contactgegevens uit deze code. Dit variant heeft een klein script nodig
// voor het omschakelen; werkt dat niet, dan blijft de gewone iframe staan.
export function bouwIframeCode(o: EmbedCodeOpties): string {
  const id = `kostenplan-${o.toolId}`;
  const c = o.contact;
  const tel = (c.telefoon ?? "").replace(/[^0-9+]/g, "");
  const knoppen = [
    tel ? `<a href="tel:${esc(tel)}" style="display:block;margin:10px auto;max-width:300px;padding:12px;border:2px solid ${esc(c.kleur || "#15803d")};border-radius:10px;color:#111;text-decoration:none">Bel ${esc(c.telefoon ?? "")}</a>` : "",
    c.email ? `<a href="mailto:${esc(c.email)}" style="display:block;margin:10px auto;max-width:300px;padding:12px;border:2px solid ${esc(c.kleur || "#15803d")};border-radius:10px;color:#111;text-decoration:none">Mail ons</a>` : "",
  ].join("");
  const kaart = `<div id="${id}-kaart" hidden style="text-align:center;font:16px system-ui,sans-serif;padding:24px;min-height:${o.embedConfig.minimaleHoogtePx}px;box-sizing:border-box"><p>${
    tel || c.email ? "Bereken je prijs telefonisch of per mail" : "Deze rekentool is tijdelijk niet beschikbaar."
  }</p>${knoppen}</div>`;
  return (
    `<iframe id="${id}" src="${o.baseUrl}/embed/${esc(o.toolId)}" title="${esc(`Rekentool ${o.toolNaam}`)}"\n` +
    `  style="${containerStijl(o.embedConfig)};display:block" height="${o.embedConfig.minimaleHoogtePx}"></iframe>\n` +
    `${kaart}\n` +
    `<script>(function(d,w){var f=d.getElementById(${JSON.stringify(id)}),k=d.getElementById(${JSON.stringify(id + "-kaart")}),ok=0,H=${o.embedConfig.minimaleHoogtePx};` +
    `w.addEventListener("message",function(e){var m=e.data;if(!f||e.source!==f.contentWindow||!m||m.toolId!==${JSON.stringify(o.toolId)})return;` +
    `if(m.type==="kostenplan:fout"){s()}else if(m.type==="kostenplan:klaar"||m.type==="kostenplan:resize"){ok=1;if(m.type==="kostenplan:resize")f.style.height=Math.max(m.height,H)+"px"}});` +
    `function s(){if(ok&&arguments.length===0)return;f.style.display="none";k.hidden=false}setTimeout(function(){if(!ok)s()},4000)})(document,window);</script>`
  );
}
