const start = require("./lib.js");
(async () => {
  const s = await start("/dashboard/profiel/meldingen", 30, "mobiel");
  await s.vondst({ area: "ux", title: "Meldingen-pagina geeft 'Pagina niet gevonden' zonder link vanaf Profiel", confidence: 0.4,
    steps: ["Open Profiel als a3 (mobiel)", "Geen 'Meldingen'-rij zichtbaar onder Account", "Ga direct naar /dashboard/profiel/meldingen"],
    expected: "Of de pagina werkt, of de URL geeft een uitleg dat meldingen hier niet beschikbaar zijn.",
    actual: "Pagina toont 'Pagina niet gevonden. Deze pagina bestaat niet (meer)'. Oorzaak niet onderzocht; de rij is op de Profielpagina niet zichtbaar." });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
