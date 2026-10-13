// Maakt het testrapport uit de ruwe meldingen en de verifier-uitkomsten.
//   node scripts/test/rapport.mjs <datum>      → docs/test-reports/<datum>/{report.md, findings.json, rejected.json, screenshots/}
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const datum = process.argv[2] || new Date().toISOString().slice(0, 10);
const uit = path.join(root, "docs/test-reports", datum);
const lees = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f)) : []);

const ruw = lees(path.join(root, "test-results/findings-raw"), ".jsonl").flatMap((f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const ruwPerId = new Map(ruw.map((r) => [r.id, r]));
const ver = { bevestigd: [], verworpen: [], onzeker: [] };
for (const f of lees(path.join(root, "test-results/verified"), ".json")) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const k of Object.keys(ver)) ver[k].push(...(j[k] || []));
}
// Aanpassingen van de hoofdsessie na de verifier (prioriteit volgens de definitie, titel, samenvoegen), met reden; zichtbaar in het rapport.
const overrides = fs.existsSync(path.join(root, "test-results/overrides.json")) ? JSON.parse(fs.readFileSync(path.join(root, "test-results/overrides.json"), "utf8")) : {};
const verrijk = (v) => ({ ...(ruwPerId.get(v.id) || {}), ...v });
const pas = (v) => {
  const o = overrides[v.id];
  if (!o) return v;
  return { ...v, ...(o.priority ? { priority_verifier: v.priority, priority: o.priority } : {}), ...(o.title ? { title_oorspronkelijk: v.title, title: o.title } : {}), ...(o.area ? { area: o.area } : {}), ...(o.add_merged ? { merged_ids: [...(v.merged_ids || []), ...o.add_merged] } : {}), ...(o.note ? { hoofdsessie_notitie: o.note } : {}) };
};
const weg = new Set(Object.entries(overrides).filter(([, o]) => o.drop).map(([id]) => id));
const bevestigd = ver.bevestigd.filter((v) => !weg.has(v.id)).map(verrijk).map(pas);
const onzeker = ver.onzeker.map(verrijk);
const verworpen = ver.verworpen.map(verrijk);
const samengevoegd = new Set(bevestigd.flatMap((b) => b.merged_ids || []));
const nietGeverifieerd = ruw.filter((r) => ![...bevestigd, ...onzeker, ...verworpen].some((v) => v.id === r.id) && !samengevoegd.has(r.id));

fs.mkdirSync(path.join(uit, "screenshots"), { recursive: true });
const kopieer = (v) => {
  if (!v.screenshot) return null;
  const bron = path.join(root, v.screenshot);
  if (!fs.existsSync(bron)) return null;
  const doel = `${v.id}.png`;
  fs.copyFileSync(bron, path.join(uit, "screenshots", doel));
  return `screenshots/${doel}`;
};
const volgorde = { P0: 0, P1: 1, P2: 2, P3: 3 };
const prio = (v) => v.priority || "P2";
bevestigd.sort((a, b) => (volgorde[prio(a)] - volgorde[prio(b)]) || (b.confidence ?? 0) - (a.confidence ?? 0));
for (const v of [...bevestigd, ...onzeker]) v.screenshot_rapport = kopieer(v);

fs.writeFileSync(path.join(uit, "findings.json"), JSON.stringify({ datum, bevestigd, onzeker, niet_geverifieerd: nietGeverifieerd }, null, 2));
fs.writeFileSync(path.join(uit, "rejected.json"), JSON.stringify(verworpen, null, 2));

const telling = (lijst, sleutel) => lijst.reduce((m, x) => ((m[sleutel(x)] = (m[sleutel(x)] || 0) + 1), m), {});
const perPrio = telling(bevestigd, prio);
const perGebied = {};
for (const v of bevestigd) (perGebied[v.area] ||= {})[prio(v)] = (perGebied[v.area]?.[prio(v)] || 0) + 1;
const tab = (rijen, kop) => [`| ${kop.join(" | ")} |`, `| ${kop.map(() => "---").join(" | ")} |`, ...rijen.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const top = bevestigd.slice(0, 10);

let md = `# Testrapport ${datum}\n\n`;
md += `Omgeving: lokale testomgeving (zie docs/testing.md). Ruwe meldingen: ${ruw.length}. Bevestigd: ${bevestigd.length}, onzeker: ${onzeker.length}, verworpen: ${verworpen.length}, samengevoegd als dubbel: ${samengevoegd.size}, niet geverifieerd: ${nietGeverifieerd.length}.\n\n`;
md += `## Samenvatting\n\n${tab(["P0", "P1", "P2", "P3"].map((p) => [p, String(perPrio[p] || 0)]), ["Prioriteit", "Aantal"])}\n\n`;
md += `### Per gebied\n\n${tab(Object.entries(perGebied).sort().map(([g, p]) => [g, ...["P0", "P1", "P2", "P3"].map((x) => String(p[x] || 0))]), ["Gebied", "P0", "P1", "P2", "P3"])}\n\n`;
md += `## Top 10\n\n`;
for (const [i, v] of top.entries()) {
  md += `### ${i + 1}. [${prio(v)}] ${v.title}\n\n- Gebied: ${v.area} · gebruiker ${v.user} · ${v.viewport} · ${v.url}\n- Verwacht: ${esc(v.expected)}\n- Werkelijk: ${esc(v.actual)}\n- Stappen: ${(v.steps || []).map(esc).join(" → ")}\n${v.root_cause_hint ? `- Vermoedelijke oorzaak: ${esc(v.root_cause_hint)}\n` : ""}${v.hoofdsessie_notitie ? `- Toelichting prioriteit/samenvoeging: ${esc(v.hoofdsessie_notitie)}${v.priority_verifier ? ` (verifier gaf ${v.priority_verifier})` : ""}\n` : ""}${v.repro_script ? `- Herhaalscript: \`${v.repro_script}\`\n` : ""}${v.screenshot_rapport ? `\n![${esc(v.title)}](${v.screenshot_rapport})\n` : ""}\n`;
}
md += `## Alle bevestigde bevindingen\n\n${tab(bevestigd.map((v) => [prio(v), v.area, esc(v.title), esc(v.url), v.id]), ["Prio", "Gebied", "Titel", "URL", "Id"])}\n\n`;
if (onzeker.length) md += `## Onzeker (verifier kon niet bevestigen of verwerpen)\n\n${tab(onzeker.map((v) => [v.area, esc(v.title), esc(v.reden || v.notitie || "")]), ["Gebied", "Titel", "Toelichting"])}\n\n`;
if (nietGeverifieerd.length) md += `## Niet geverifieerd\n\n${tab(nietGeverifieerd.map((v) => [v.area, esc(v.title), v.id]), ["Gebied", "Titel", "Id"])}\n\n`;
md += `## Verworpen\n\n${verworpen.length} meldingen; zie \`rejected.json\` (met reden) om de agents te verbeteren.\n`;
if (fs.existsSync(path.join(root, "test-results/rapport-aanvulling.md"))) md += fs.readFileSync(path.join(root, "test-results/rapport-aanvulling.md"), "utf8");
fs.writeFileSync(path.join(uit, "report.md"), md);
console.log(`Rapport: docs/test-reports/${datum}/report.md  (P0 ${perPrio.P0 || 0}, P1 ${perPrio.P1 || 0}, P2 ${perPrio.P2 || 0}, P3 ${perPrio.P3 || 0})`);
