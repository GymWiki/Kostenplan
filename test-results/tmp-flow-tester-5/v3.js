const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  await s.vondst({ area: "ux", title: "Factuur F2026-0005 toont 'Verstuurd' met vinkje terwijl niemand heeft bevestigd dat de factuur is verstuurd",
    steps: ["Maak definitief via Definitief maken (a1, desktop) op het concept aanbetaling.", "Direct na definitief maken staat rechtsboven 'Verstuurd' met vinkje, en de knop 'Versturen'.", "De versturen-dialoog 'Is de factuur verstuurd? Ja, verstuurd / Nee, nog niet' is nog niet beantwoord."],
    expected: "Status blijft 'Definitief' tot de hovenier bevestigt dat de factuur is verstuurd.",
    actual: "Rechtsboven staat 'Verstuurd' met vinkje terwijl de factuur niet is verstuurd. Zie screenshot 01-f2026-0005-na-definitief.png (de chip 'Definitief' staat links).",
    screenshot: "test-results/screens/flow-tester-5/01-f2026-0005-na-definitief.png",
    confidence: 0.5 });
  await s.vondst({ area: "bug", title: "Na 'Definitief maken' toont de pagina tot herladen nog 'Factuur (concept)' en 'Concept – nog geen nummer'",
    steps: ["Open concept aanbetaling-factuur (a1, desktop), klik Definitief maken, dan in de bevestigingsdialoog Definitief maken.", "Lees de pagina direct na de bevestiging (zonder herladen): titel 'Factuur (concept)', badge 'Concept', 'Factuurnummer: nog geen nummer', watermerk 'Concept – nog geen nummer', naast de melding 'Deze factuur is definitief'.", "Herlaad de pagina: titel 'Factuur F2026-0005', nummer F2026-0005, badge 'Definitief'."],
    expected: "Na bevestigen direct de definitieve weergave met nummer F2026-0005.",
    actual: "Tot herladen toont de pagina nog de concept-weergave. Na herladen klopt alles.",
    confidence: 0.5 });
  await s.page.goto("http://localhost:3200/dashboard/leads/cmv6wsvff001w9c7d8e212z9o/offerte").catch(()=>{});
  await s.page.goto("http://localhost:3200/dashboard/leads/cmv6wsvff001w9c7d8e212z9o/offerte");
  await s.page.waitForTimeout(600);
  await s.vondst({ area: "bug", title: "Console-fout React #418 (tekst-mismatch bij hydratie) op offertepagina en factuurpagina",
    steps: ["Open /dashboard/leads/<lead Ahmed Akkoord>/offerte (a1, desktop), geaccepteerde offerte 2026-0105.", "Laad de pagina; de console toont 'pageerror: Minified React error #418 ... text'.", "Zelfde fout op /dashboard/facturen/<id> (concept en definitief)."],
    expected: "Geen console-fouten op de offerte- en factuurpagina.",
    actual: "Elke keer minstens één React #418-fout in de console. Zichtbaar effect: geen; de pagina werkt.",
    confidence: 0.7 });
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
