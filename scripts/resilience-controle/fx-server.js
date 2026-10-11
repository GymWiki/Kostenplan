// Stand-in voor Blob/Cloudflare: serveert snapshots, het laadscript en de hostpagina's.
const http = require("http"), fs = require("fs"), path = require("path");
const FX = path.join(__dirname, "fx"), PUB = "/home/user/Kostenplan/public";
const poort = Number(process.argv[2] || 4010);
const stand = { vertraging: 0, uit: false, hits: {} };
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const tel = (k) => (stand.hits[k] = (stand.hits[k] || 0) + 1);
  const cors = { "access-control-allow-origin": "*" };
  if (u.pathname === "/__stand") { Object.assign(stand, JSON.parse(u.searchParams.get("set") || "{}")); res.writeHead(200, cors); return res.end(JSON.stringify(stand)); }
  if (u.pathname === "/__prijs") { // verhoog alle materiaalprijzen met factor
    const f = path.join(FX, "s/t-demo/latest.json"); const j = JSON.parse(fs.readFileSync(f, "utf8"));
    const factor = Number(u.searchParams.get("factor") || 2);
    for (const p of j.producten) for (const c of p.materiaalCategorieen) for (const m of c.materialen) m.prijs *= factor;
    j.versie += 1; fs.writeFileSync(f, JSON.stringify(j)); res.writeHead(200, cors); return res.end("ok");
  }
  const lever = () => {
    if (stand.uit) { res.writeHead(503, cors); return res.end("uit"); }
    let bestand = null, type = "text/plain";
    if (u.pathname.startsWith("/s/")) { bestand = path.join(FX, u.pathname); type = "application/json"; }
    else if (u.pathname.startsWith("/kp/")) { tel(u.pathname); bestand = path.join(PUB, u.pathname); type = "text/javascript"; }
    else if (u.pathname.startsWith("/host")) { bestand = path.join(FX, u.pathname.slice(1)); type = "text/html"; }
    if (!bestand || !fs.existsSync(bestand)) { res.writeHead(404, cors); return res.end("nee"); }
    res.writeHead(200, { "content-type": type, ...cors }); fs.createReadStream(bestand).pipe(res);
  };
  if (stand.vertraging && !u.pathname.startsWith("/host") && !u.pathname.startsWith("/__")) setTimeout(lever, stand.vertraging); else lever();
}).listen(poort, "127.0.0.1", () => console.log("fx op", poort));
