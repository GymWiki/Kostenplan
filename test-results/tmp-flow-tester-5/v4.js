const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  await s.page.waitForTimeout(300);
  await s.vondst({ area: "document", title: "PDF F2026-0005 is 2 pagina's: 'Met vriendelijke groet' op p.1, de handtekening op p.2 met een lege grijze blok",
    steps: ["Download de PDF via de knop PDF op factuur F2026-0005 (a1). Het bestand: scratchpad/flow-tester-5/F2026-0005.pdf (203 KB).", "Pagina 1: t/m 'Met vriendelijke groet,' (footer 'Pagina 1 van 2').", "Pagina 2: 'Jan de Vries / Eigenaar' en daaronder een lege grijze vlak tot onderaan de pagina (footer 'Pagina 2 van 2')."],
    expected: "De ondertekening staat bij de groet op dezelfde pagina; geen lege vlakken op een extra pagina.",
    actual: "Groet en naam worden gesplitst over twee pagina's; op pagina 2 een leeg grijs vlak. Een 1-pagina-factuur is nu 2 pagina's.",
    confidence: 0.6 });
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
