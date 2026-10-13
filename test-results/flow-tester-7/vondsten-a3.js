const start = require("./lib.js");
(async () => {
  const s = await start(null, 60, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/leads/cmv6wswoi00dt9c7dih0fwy39/offerte?herinnering=1");
  await s.vondst({ area: "document", title: "Verstuurde offerte Groenstijl toont gegevens van De Vries", confidence: 0.6,
    steps: ["Wissel als a3 naar Groenstijl Tuinen", "Open lead Gina Groen, offerte 2026-0139 (verstuurd, versie 1)", "Open PDF bekijken (/api/offertes/cmv6wswon00du9c7dnf9z32ig/pdf?versie=1)"],
    expected: "Afzender en bankgegevens zijn Groenstijl Tuinen (KOR, geen btw).",
    actual: "PDF toont 'Hoveniersbedrijf De Vries' met KvK 12345678, Btw-id NL123456789B01, IBAN NL91 ABNA 0417 1643 00, en btw 21%/9%. Bewijs: test-results/flow-tester-7/pdf/groen-offerte.pdf. Een nieuw concept (offerte 2026-0001 voor Hans Heg) toont wel Groenstijl Tuinen en de KOR-tekst." });
  await s.goto2("/dashboard/profiel/abonnement");
  await s.vondst({ area: "copy", title: "Verwijder-melding verwijst naar 'Abonnement wijzigen' dat op de abonnementpagina niet bestaat", confidence: 0.8,
    steps: ["Wissel naar Groenstijl Tuinen", "Profiel > Bedrijfsgegevens > Bedrijf verwijderen (paneel)", "Lees: 'Zeg het eerst op via Abonnement wijzigen'", "Open Profiel > Abonnement"],
    expected: "De genoemde knop of link staat op de abonnementpagina.",
    actual: "Op de abonnementpagina staat geen 'Abonnement wijzigen'. Knoppen: 'Downgrade naar Gratis', 'Kies Plus', 'Wijzig naar maandelijks'." });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
