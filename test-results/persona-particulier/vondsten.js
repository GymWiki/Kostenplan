const c = require("/home/user/Kostenplan/test-results/persona-particulier/common.js");
const URL = "/t/devries-a1/tuinaanleg-a1";
(async () => {
  // A: alleen schutting 12 m, daarna terras 5x4 zonder materiaal
  let s = await c.open(URL); let p = s.page;
  await p.getByPlaceholder(/bijv/).first().fill("8011AB 5"); s.stap(); await p.waitForTimeout(800);
  await p.getByLabel("Aantal Schutting").fill("12"); s.stap(); await p.waitForTimeout(600);
  await p.getByText("Jouw kostenraming", { exact: true }).first().scrollIntoViewIfNeeded();
  const r1 = await c.raming(p);
  await s.vondst({ area: "pricing", title: "Totaal € 1.500,00 zonder gekozen materiaal, terwijl de tekst zegt dat een volledige prijs pas met materiaal komt",
    steps: ["Open /t/devries-a1/tuinaanleg-a1 (mobiel 412x915)", "Vul postcode 8011AB 5 in en kies Voorstraat 5", "Vul bij Schutting 12 in (materiaal niet gekozen)", "Scroll naar 'Jouw kostenraming'"],
    expected: "Geen totaal of een duidelijk 'onvolledig' bedrag, zolang het verplichte materiaal niet gekozen is; de tekst 'Kies bij elke onderdeel een verplicht materiaal om een volledige prijsindicatie te zien' past daarbij.",
    actual: `Het totaal staat al op € 1.500,00 (incl. btw) met Materiaalkosten € 0,00 en een 'Aanvulling tot minimumtarief' van € 1.096,67. Raming: ${r1}`, confidence: 0.6 });
  await p.locator("#sv-lengte").fill("5"); s.stap(); await p.locator("#sv-breedte").fill("4"); s.stap(); await p.waitForTimeout(600);
  const r2 = await c.raming(p);
  await s.vondst({ area: "pricing", title: "Voorrijkosten verdubbelen van € 35 naar € 70 na toevoegen van het terras, zonder uitleg",
    steps: ["Vul postcode 8011AB 5 in", "Vul Schutting 12 m in: Voorrijkosten € 35,00", "Vul Terras lengte 5 en breedte 4 in (materiaal nog niet gekozen)", "Lees 'Jouw kostenraming'"],
    expected: "Ik verwacht dat de voorrijkosten gelijk blijven, of dat staat waarom ze stijgen (een particulier kan dat niet zien).",
    actual: `Voorrijkosten € 35,00 bij alleen schutting; na het terras € 70,00. Raming na terras: ${r2}`, confidence: 0.5 });
  await s.sluit();

  // B: volledig ingevuld, daarna aanvraag versturen
  s = await c.open(URL); p = s.page;
  await c.vul(s);
  await p.getByText("Jouw kostenraming", { exact: true }).first().scrollIntoViewIfNeeded();
  const pos = await p.evaluate(() => { const e=[...document.querySelectorAll("*")].filter(x=>x.children.length && x.innerText?.startsWith("Jouw kostenraming")).sort((a,b)=>a.innerText.length-b.innerText.length)[0]; return Math.round(e.getBoundingClientRect().top + scrollY); });
  await p.evaluate(() => window.scrollTo(0, 0));
  await s.vondst({ area: "ux", title: "Totaal staat op ruim 1.800 px onder de bovenkant; geen tussenstand zichtbaar bij het invullen",
    steps: ["Open de rekentool op 412x915", "Vul postcode en huisnummer in", "Vul schutting 12 m, terras 5x4 m en beide materialen in", "Zonder te scrollen: de totaalprijs is niet zichtbaar; de kostenraming staat onderaan de onderdelen"],
    expected: "Een totaalprijs die zichtbaar blijft terwijl ik de onderdelen invul (of op een plek die ik zonder veel scrollen zie).",
    actual: `De kostenraming begint op ca. ${pos} px in de pagina (scherm is 915 px hoog). Met de bovenkant in beeld zie ik geen totaal.`, confidence: 0.6 });
  await p.getByText("Jouw kostenraming", { exact: true }).first().scrollIntoViewIfNeeded();
  await p.getByRole("button", { name: "Offerte aanvragen" }).click(); s.stap(); await p.waitForTimeout(500);
  await s.vondst({ area: "copy", title: "Aanvraagformulier zegt niet wat er gebeurt en de particulier vraagt om een afspraak, maar de knop heet 'Offerte aanvragen'",
    steps: ["Vul de rekentool volledig in (schutting 12 m, terras 5x4 m, materialen gekozen)", "Tik op 'Offerte aanvragen'", "Lees het formulier (Naam, E-mailadres, Telefoonnummer)"],
    expected: "Ik wil een afspraak of een gesprek. Ik verwacht uitleg vóór ik versturen: wat er daarna gebeurt, wanneer ik antwoord krijg en of het gratis is.",
    actual: "Het formulier heeft alleen de velden Naam, E-mailadres en Telefoonnummer (optioneel), zonder uitleg. Geen keuze voor afspraak. Het antwoord ('binnen 24 uur') komt pas na versturen.", confidence: 0.5 });
  await p.getByLabel("Naam").fill("Test Particulier"); s.stap();
  await p.getByLabel("E-mailadres").fill("persona-particulier@test.kostenplan.nl"); s.stap();
  await p.getByRole("button", { name: "Versturen" }).click(); s.stap(); await p.waitForTimeout(2000);
  await s.vondst({ area: "ux", title: "Na 'Versturen' verdwijnt de prijs en de knop 'Bewaar als PDF'; alleen de bedankt-tekst blijft",
    steps: ["Vul de rekentool volledig in en open 'Offerte aanvragen'", "Vul Naam en E-mailadres in", "Tik op 'Versturen'", "Kijk naar het kostenraming-blok"],
    expected: "Het prijsoverzicht (totaal incl. btw) en 'Bewaar als PDF' blijven staan, zodat ik de prijs kan bewaren nadat ik de aanvraag heb verstuurd.",
    actual: "Het blok 'Jouw kostenraming' toont alleen: 'Bedankt voor uw aanvraag! Wij nemen binnen 24 uur contact met u op.' Het totaalbedrag en de knop 'Bewaar als PDF' zijn weg.", confidence: 0.8 });
  await s.sluit();

  // C: Bewaar als PDF
  s = await c.open(URL); p = s.page;
  await s.ctx.addInitScript(() => { window.__log = []; window.print = () => window.__log.push("print"); });
  await s.goto(URL); await c.vul(s);
  await p.getByText("Jouw kostenraming", { exact: true }).first().scrollIntoViewIfNeeded();
  await p.getByRole("button", { name: /Bewaar als PDF/ }).first().click(); s.stap(); await p.waitForTimeout(1500);
  const log = await p.evaluate(() => window.__log);
  await s.vondst({ area: "document", title: "'Bewaar als PDF' opent geen bestand of nieuw venster; het roept de printfunctie aan",
    steps: ["Vul de rekentool volledig in", "Tik op 'Bewaar als PDF'", "Wacht 1,5 seconde"],
    expected: "Er komt een PDF-bestand (download) of een duidelijk venster waarin ik het als PDF kan opslaan, met een titel en het prijsoverzicht.",
    actual: `Geen download en geen nieuw venster. Het script registreerde alleen een aanroep van window.print() (log: ${JSON.stringify(log)}). Printweergave bevat de hele pagina (kop, invoervelden, 'Stel je project samen', de knoppen niet) en geen datum of nummer. Zie test-results/persona-particulier/bewaar-als-pdf-print.pdf.`,
    confidence: 0.5 });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
