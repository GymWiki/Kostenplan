const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  await s.vondst({ area: "pricing", title: "Optionele regel 'Verlichting' (€ 250) telt mee in de aanbetaling en eindfactuur, terwijl de offerte hem niet meerekent",
    steps: ["Log in als a1 (desktop). Open offerte 2026-0105 (Ahmed Akkoord, geaccepteerd, /dashboard/leads/…/offerte).", "Lees onderaan de offerte: 'Totaal excl. btw € 3.745,63', 'Totaal incl. btw: € 4.493,47', 'Niet meegeteld: optionele regels (samen € 250,00)'. Betaling: Aanbetaling 30% € 1.123,69 excl. btw; Bij oplevering 70% € 2.621,94 excl. btw.", "Open lead Ahmed Akkoord > Factuur maken > Termijnfacturen volgens de offerte.", "Lees factuur F2026-0005 (aanbetaling): regels 'Aanbetaling 30% – … (btw 21%) € 1.101,84' en '(btw 9%) € 96,85' = totaal excl. € 1.198,69. Dat is 30% van € 3.995,63 = inclusief de optionele regel van € 250."],
    expected: "Optionele regels die de klant niet kiest tellen niet mee in de termijn- of eindfactuur. Aanbetaling = € 1.123,69 excl. btw (30% van € 3.745,63).",
    actual: "De aanbetalingsfactuur F2026-0005 is € 1.198,69 excl. btw (€ 1.438,80 incl.). De eindfactuur (concept) toont de regel 'Verlichting € 250,00' als gewone regel en komt uit op € 2.796,94 excl. btw / € 3.357,17 incl. btw, terwijl de offerte 'Bij oplevering 70% € 2.621,94 excl. btw' aangeeft.",
    confidence: 0.9 });
  await s.page.goto("http://localhost:3200/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx");
  await s.page.waitForTimeout(400);
  await s.vondst({ area: "pricing", title: "Betaling in de factuur en de PDF baseren zich op € 4.795,97; de offerte zegt € 4.493,47 incl. btw",
    steps: ["Open factuur F2026-0005 (aanbetaling) als a1, desktop.", "Lees de sectie 'Berekening': 'Aanbetaling: 30% van het offertebedrag van € 4.795,97 (offerte 2026-0105)'.", "Open offerte 2026-0105: 'Totaal incl. btw: € 4.493,47'; de klant accepteerde 'een offerte van € 3.745,63' (excl. btw)."],
    expected: "Het offertebedrag in de berekening sluit aan op de geaccepteerde offerte (€ 4.493,47 incl. btw, zonder de niet gekozen optionele regel).",
    actual: "Berekening noemt € 4.795,97. Dat is € 4.493,47 + € 302,50 (de optionele regel incl. btw). Zelfde bedrag in de PDF (pagina 1).",
    confidence: 0.85 });
  await s.vondst({ area: "pricing", title: "Drie verschillende totalen voor dezelfde aanvraag: lead € 4.537,97, offerte € 4.493,47, factuurbasis € 4.795,97 (incl. btw)",
    steps: ["Open lead Ahmed Akkoord (a1, desktop) in de drawer: 'Totaal (incl. btw) € 4.537,97'.", "Open offerte 2026-0105: 'Totaal incl. btw: € 4.493,47', 'Niet meegeteld: optionele regels (samen € 250,00)'.", "Open factuur F2026-0005: 'Aanbetaling: 30% van het offertebedrag van € 4.795,97'."],
    expected: "Eén consistent totaal voor de geaccepteerde offerte in lead, offerte, factuur en PDF.",
    actual: "Drie totalen: € 4.537,97 (lead), € 4.493,47 (offerte incl. btw), € 4.795,97 (factuur). De lead toont een bedrag dat in geen van de documenten voorkomt.",
    confidence: 0.8 });
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
