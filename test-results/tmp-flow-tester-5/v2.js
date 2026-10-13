const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 250 });
  await s.page.getByText("Ahmed Akkoord").first().click();
  await s.page.waitForTimeout(700);
  await s.vondst({ area: "bug", title: "Eindfactuur-blokkade 'stelpost heeft nog geen werkelijke hoeveelheid' is niet op te lossen; de knop 'Definitief maken' blijft actief",
    steps: ["Open lead Ahmed Akkoord > Factuur maken > Eindfactuur (trekt de termijnen af) (a1, desktop). Concept F2026-…(nog geen nummer) ontstaat.", "Rechter paneel: 'Vul de uitvoeringsdatum van het werk in' (niet klikbaar; de link is de veld 'nog invullen' in het document) en 'De stelpost \"Grondwerk en afvoer\" heeft nog geen werkelijke hoeveelheid'.", "Vul de uitvoeringsdatum in (13-10-2026): blokkade 1 verdwijnt, blokkade 2 blijft.", "Klik de regel Grondwerk en afvoer, probeer: Aantal = 1 (ingevuld); Soort regel = Stelpost; Soort regel = Normaal. Na elke stap, en na herladen: blokkade 2 blijft.", "Klik 'Definitief maken (1)' (rechtsboven): de bevestigingsdialoog opent gewoon (niet bevestigd door mij)."],
    expected: "Een stelpost waarvan de werkelijke hoeveelheid nog ontbreekt wordt herkenbaar gemaakt met een invulveld of link, en 'Definitief maken' is pas actief als de blokkade is opgelost.",
    actual: "Geen invulveld voor de 'werkelijke hoeveelheid' gevonden, de blokkade-tekst is geen link. Geen van de drie aanpassingen lost de blokkade op. De knop 'Definitief maken' is klikbaar en opent de bevestigingsdialoog ondanks de blokkade.",
    confidence: 0.75 });
  await s.vondst({ area: "ux", title: "Termijn-knop 'Termijnfacturen volgens de offerte' maakt één concept (30%), niet de termijnen uit de offerte",
    steps: ["Lead Ahmed Akkoord (Akkoord, geaccepteerde offerte 30%/70%) > Factuur maken > 'Termijnfacturen volgens de offerte' (a1, desktop).", "Direct wordt één concept geopend: 'Aanbetaling 30%'. Geen keuze of overzicht van de termijnen.", "Lead-drawer: Facturen toont alleen 'Concept · termijn € 1.438,80'. Het 70%-deel verschijnt pas later als 'Eindfactuur' keuze."],
    expected: "Duidelijk welke termijnfacturen aangemaakt worden (30% en 70%, of een duidelijke uitleg dat de 70% bij oplevering volgt).",
    actual: "Eén concept, geen uitleg waarom de 70% ontbreekt. Het meervoud in de knop klopt niet met het resultaat.",
    confidence: 0.4 });
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
