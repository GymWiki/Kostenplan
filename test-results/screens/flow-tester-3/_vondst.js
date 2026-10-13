const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-3", gebruiker: null, viewport: "desktop", pad: "/test-embed?tool=cmv6wdxux004qq47dowifa9j4&modus=iframe", maxStappen: 10 });
  const ax = await k.axe(s.page).catch(() => null);
  await s.vondst({
    area: "ux", title: "Knoppen 'Offerte aanvragen' en 'Bewaar als PDF' breken over twee regels in de prijskaart (embed, 1440 px)",
    steps: ["Open /test-embed?tool=cmv6wdxux004qq47dowifa9j4&modus=iframe op 1440x900", "Vul postcode 8011AB 5 in en kies het adres", "Vul 30 meter Schutting in met materiaal Douglas schutting", "Kijk naar de knoppen onder 'Totaal (incl. btw)'"],
    expected: "Knoppen tonen hun label op een regel, of de rij past zich aan zodat de tekst niet breekt.",
    actual: "'Offerte aanvragen' en 'Bewaar als PDF' staan elk op twee regels (labels breken). Visueel onrustig; geen functionele fout.",
    confidence: 0.5,
  });
  console.log("AXE ernstig", JSON.stringify(ax && ax.ernstig));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 300)); process.exit(1); });
