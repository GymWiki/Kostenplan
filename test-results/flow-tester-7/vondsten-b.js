const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "b", viewport: "mobiel", pad: "/dashboard/profiel", maxStappen: 40 });
  await s.vondst({ area: "ux", title: "Profiel meldt '5 gegevens ontbreken' zonder te zeggen welke", confidence: 0.5,
    steps: ["Open Profiel als b (Gratis)", "Lees de regel onder Bedrijfsgegevens", "Open Bedrijfsgegevens"],
    expected: "De melding noemt de ontbrekende velden, of het formulier markeert ze.",
    actual: "Profiel: '5 gegevens ontbreken voor offertes'. Het formulier markeert geen velden; KvK, straat, postcode, plaats en IBAN zijn leeg, maar tonen grijze voorbeeldwaarden ('12345678', '1234 AB', 'NL123456789B01') die op ingevulde waarden lijken." });
  await s.goto("/dashboard/leads");
  await s.vondst({ area: "ux", title: "Gratis-gebruiker kan geen offerte of factuur maken; geen leads", confidence: 0.6,
    steps: ["Open Leads als b (Gratis)", "Open Facturen"],
    expected: "Duidelijk of wat er nodig is om offertes te maken.",
    actual: "Leads: 'Leads ontvangen? Vanaf Plus ...'. Facturen: 'Een factuur maak je vanuit de lead.' Er is geen lead, dus de offerte-flow en de meldingen over ontbrekende gegevens zijn niet bereikbaar. Ontbrekende velden blokkeren dus niet wat er daarna gebeurt." });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
