const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const P = "test-results/screens/document-checker-1/";
const PDF = P + "document-checker-1-";
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  const v = [
    { area: "document", confidence: 0.9, screenshot: P + "ui-ahmed-offerte.png", title: "Getekende offerte 2026-0118 toont ander totaal dan het scherm",
      steps: ["Log in als a2, open lead Ahmed Akkoord, offerte 2026-0118 (status Geaccepteerd).", "Lees het scherm: Totaal excl. btw € 3.745,63, Totaal incl. btw € 4.493,47, 'Niet meegeteld: optionele regels (samen € 250,00)', akkoord-tekst 'van € 3.745,63'.", "Open 'Getekende PDF' (/api/offertes/<id>/pdf?getekend=1) en lees de tekst (document-checker-1-offerte-akkoord-getekend.pdf)."],
      expected: "De getekende PDF toont dezelfde bedragen als het scherm voor deze geaccepteerde offerte.",
      actual: "Getekende PDF: Verlichting 'Gekozen: telt mee in het totaal', Totaal excl. btw € 3.995,63, incl. btw € 4.795,97, akkoord-tekst 'van € 3.995,63', ondertekend door 'Ahmed Akkoord, 13 oktober 2026 om 16:42'. Het scherm van dezelfde offerte toont € 3.745,63 / € 4.493,47. Ook de lead-kaart 'Wat de klant koos' toont € 4.537,97 incl. btw. Drie verschillende totalen voor één offerte." },
    { area: "document", confidence: 0.9, screenshot: P + "ui-groenstijl-offerte-scherm.png", title: "Groenstijl-offerte toont De Vries als afzender, geen KOR",
      steps: ["Log in als a2, wissel naar bedrijf 'Groenstijl Tuinen' (knop toont die naam).", "Open lead Gina Groen, offerte 2026-0126 (Verstuurd), bekijk scherm en PDF (/api/offertes/cmv6wsw9r00979c7dhr58ox4l/pdf?versie=1)."],
      expected: "Afzender en voettekst tonen Groenstijl Tuinen; bij KOR (korActief aan, geen btw-id) staat de KOR-tekst en geen btw-kolom.",
      actual: "Scherm en PDF tonen als afzender 'Hoveniersbedrijf De Vries, Dennenlaan 1, 3511 AB Utrecht', voettekst 'KvK 12345678 · Btw-id NL123456789B01'. Btw-kolommen 21% en 9% met 'Btw 21% over' en 'Btw 9% over', geen KOR-tekst. Database: bedrijf groenstijl-a2 heeft korActief=t, handelsnaam 'Groenstijl Tuinen', btwId leeg." },
    { area: "document", confidence: 0.7, screenshot: P + "ui-factuur-betaald.png", title: "Factuur F2026-0003: aantal x prijs wijkt af van totaalregel",
      steps: ["Open factuur F2026-0003 (Bas Betaald) op het scherm en in de PDF (/api/facturen/<id>/pdf).", "Reken per regel: aantal x prijs, vergelijk met TOTAAL."],
      expected: "Aantal x prijs = regeltotaal (bij afronding in centen zichtbaar kloppend).",
      actual: "24 m² x € 88,87 = € 2.132,88, regeltotaal € 2.132,99. 17 stuks x € 20,70 = € 351,90, regeltotaal € 351,88. De prijs 88,87 is 73,45 x 1,21 (zie offerte 2026-0118 excl. € 73,45), dus de factuurprijs lijkt incl. btw, terwijl de kop 'PRIJS' niets zegt over excl./incl. btw." },
    { area: "document", confidence: 0.8, screenshot: P + "ui-ahmed-offerte.png", title: "Offerte: 'Totaal excl. btw' dubbel op PDF",
      steps: ["Open offerte 2026-0118 PDF (/api/offertes/cmv6wsvzm006k9c7de5rn4uqe/pdf) en lees de totaalblok."],
      expected: "Totaalblok met elke regel één keer.",
      actual: "'Totaal excl. btw € 3.745,63' staat twee keer, en 'Totaal incl. btw: € 4.493,47' is een andere opmaak dan de andere totaalregels. Zelfde op de getekende PDF en op de factuur Ahmed (concept, excl. € 3.995,63 twee keer)." },
    { area: "document", confidence: 0.7, screenshot: P + "ui-factuur-concept.png", title: "Concept-offerte 2026-0114 zonder 'concept'-markering",
      steps: ["Open offerte 2026-0114 (Cor Concept, status Concept) en lees de PDF (/api/offertes/cmv6wsvy800649c7dnoo7bupt/pdf)."],
      expected: "Een concept is als concept herkenbaar, zoals de factuur-concept ('Factuur (concept)', 'nog geen nummer').",
      actual: "Offerte-concept heeft offertenummer 2026-0114, de koptekst en voettekst zeggen niets over concept, en de PDF heeft het blok 'Akkoord opdrachtgever' met 'Ik ga akkoord met deze offerte van € 3.745,63'." },
    { area: "document", confidence: 0.8, screenshot: P + "ui-ahmed-offerte.png", title: "Offerte 2026-0116 'Geldig tot' ligt voor de datum",
      steps: ["Open offerte 2026-0116 (Vincent Verlopen) PDF (/api/offertes/cmv6wsvyv006b9c7dbdtj9u1p/pdf)."],
      expected: "Geldig tot ligt na de offertedatum.",
      actual: "Datum 20 oktober 2026, Geldig tot 8 oktober 2026. Alle offertes van a2 staan op datum 20 oktober 2026, terwijl vandaag 13 oktober 2026 is." },
    { area: "document", confidence: 0.6, screenshot: P + "ui-factuur-een-totaal.png", title: "Btw verlegd niet te kiezen voor zakelijke klant",
      steps: ["Maak via lead Ahmed Akkoord (Jansen Bouw BV, zakelijk) met 'Factuur maken' -> 'Eén factuur voor het totaal'.", "Zoek in de klantgegevens en in de regelinstellingen naar 'Btw verlegd' of een btw-id van de klant; controleer de PDF (/api/facturen/cmv6x0zz3008l7b7dfzjelyuy/pdf)."],
      expected: "Bij een zakelijke klant is 'Btw verlegd' te kiezen, met btw-id van de klant op de factuur (of duidelijk als niet van toepassing).",
      actual: "Klantblok heeft Soort klant (Particulier/Zakelijk), naam, adres, e-mail, telefoon en geen btw-id-veld. Btw-keuze per regel is 21% / 9% / 0%, zonder 'Btw verlegd'. De PDF toont 21%- en 9%-btw en geen 'Btw verlegd'." },
    { area: "document", confidence: 0.5, screenshot: P + "ui-factuur-betaald.png", title: "Pagina-aantal op scherm wijkt af van PDF",
      steps: ["Open factuur F2026-0003 op het scherm en in de PDF.", "Lees de voettekst 'Factuur F2026-0003 · Pagina x van y'."],
      expected: "Scherm en PDF geven hetzelfde paginaaantal.",
      actual: "Scherm: 'Pagina 1 van 1'. PDF: 'Pagina 1 van 2' en 'Pagina 2 van 2' (pagina 2 bevat alleen naam en functie). Zelfde bij offerte 2026-0118 en factuur Ahmed-concept." },
    { area: "document", confidence: 0.5, screenshot: P + "ui-factuur-betaald.png", title: "Factuurnummers niet in datumvolgorde",
      steps: ["Lees facturen F2026-0001 t/m F2026-0004 in de lijst en de PDF's."],
      expected: "Nummers oplopend in datum (aaneengesloten en chronologisch).",
      actual: "F2026-0001 dd. 9 oktober, F2026-0002 dd. 13 september, F2026-0003 dd. 18 september, F2026-0004 dd. 28 september. Nummers zijn aaneengesloten, niet chronologisch." },
    { area: "bug", confidence: 0.6, title: "Publieke offerte-PDF geeft 404",
      steps: ["Open publieke offerte /o/Z2iBUtamEwUeN3TmSQjJwbHDwplbO-H2 (status Verstuurd); de pagina linkt naar /o/<token>/pdf?v=1.", "Haal /o/<token>/pdf?v=1 op."],
      expected: "PDF van de offerte.", actual: "HTTP 404, text/plain (13 bytes). De pagina zelf geeft 200." , screenshot: P + "ui-ahmed-offerte.png" },
  ];
  for (const f of v) { const r = await s.vondst({ ...f, url: undefined }); }
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
