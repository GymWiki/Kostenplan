// Nep-PDOK voor de controle (de sandbox bereikt PDOK niet): een paar vaste adressen, in dezelfde vorm als de
// Locatieserver. Draait als server (voor de app: PDOK_BASIS_URL) en als functie (voor Playwright-routes).
//   node scripts/mobile-ux/fake-pdok.js      → luistert op 127.0.0.1:3299
// Storing nabootsen: maak het bestand /tmp/pdok-down aan.
const http = require("http");
const fs = require("fs");

// Zwolle (startadres in de controle) ≈ 52.5168, 6.0830
const ADRESSEN = [
  { postcode: "8011AB", huisnummer: "5", straat: "Voorstraat", plaats: "Zwolle", lat: 52.5130, lon: 6.0900 },   // ~1 km
  { postcode: "7311AA", huisnummer: "10", straat: "Hoofdstraat", plaats: "Apeldoorn", lat: 52.2112, lon: 5.9699 }, // ~35 km
  { postcode: "3511AB", huisnummer: "12", straat: "Domplein", plaats: "Utrecht", lat: 52.0907, lon: 5.1214 },     // ~85 km
  { postcode: "8000AA", huisnummer: "1", straat: "Stationsweg", plaats: "Zwolle", lat: 52.5050, lon: 6.0911 },
];
const doc = (a) => ({
  weergavenaam: `${a.straat} ${a.huisnummer}, ${a.postcode.slice(0, 4)} ${a.postcode.slice(4)} ${a.plaats}`,
  centroide_ll: `POINT(${a.lon} ${a.lat})`, postcode: a.postcode, huis_nlt: a.huisnummer, huisnummer: Number(a.huisnummer), straatnaam: a.straat, woonplaatsnaam: a.plaats,
});

function antwoord(url) {
  if (fs.existsSync("/tmp/pdok-down")) return { status: 503, body: { error: "storing" } };
  const u = new URL(url);
  const q = (u.searchParams.get("q") || "").replace(/\s/g, "").toLowerCase();
  const fq = u.searchParams.get("fq") || "";
  let docs;
  if (fq.includes("type:postcode")) docs = ADRESSEN.filter((a) => a.postcode.startsWith(q)).slice(0, 1).map(doc);
  else docs = ADRESSEN.filter((a) => (a.postcode + a.huisnummer).toLowerCase().startsWith(q) || a.plaats.toLowerCase().startsWith(q) || a.straat.toLowerCase().startsWith(q)).map(doc);
  return { status: 200, body: { response: { numFound: docs.length, docs } } };
}

// Een grijs 256×256-vlak als achtergrondkaart, zodat de kaart zonder internet toch rendert.
const TEGEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8e/fufwAHxQMkyQ9XsgAAAABJRU5ErkJggg==", "base64");

module.exports = { antwoord, ADRESSEN, TEGEL };

if (require.main === module) {
  http.createServer((req, res) => {
    const r = antwoord(`http://x${req.url.replace(/^\/search\/v3_1/, "")}`);
    res.writeHead(r.status, { "content-type": "application/json" });
    res.end(JSON.stringify(r.body));
  }).listen(3299, "127.0.0.1", () => console.log("nep-PDOK op 3299"));
}
