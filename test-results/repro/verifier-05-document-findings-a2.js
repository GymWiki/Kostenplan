const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");

async function main() {
  const out = {};

  // 1) Ahmed Akkoord offerte scherm
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/leads/cmv70sbxu006j9s7dg6zu1kmp", maxStappen: 60 });
    await s.page.waitForTimeout(600);
    out.ahmed_scherm = (await s.page.innerText("body")).slice(0, 5000);
    await s.scherm("ahmed-offerte-scherm");
    await s.sluit();
  }

  // 2) Getekende PDF ahmed offerte (2026-0118) id cmv70sbxy006k9s7d80287j2o
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 30 });
    const resp = await s.page.request.get("http://localhost:3200/api/offertes/cmv70sbxy006k9s7d80287j2o/pdf?getekend=1");
    out.getekend_status = resp.status();
    const buf = await resp.body();
    require("fs").writeFileSync("/tmp/verifier-05-getekend.pdf", buf);
    const resp2 = await s.page.request.get("http://localhost:3200/api/offertes/cmv70sbxy006k9s7d80287j2o/pdf");
    out.normaal_status = resp2.status();
    const buf2 = await resp2.body();
    require("fs").writeFileSync("/tmp/verifier-05-offerte-normaal.pdf", buf2);
    await s.sluit();
  }

  // 3) Groenstijl offerte Gina Groen (2026-0126) id cmv70sc5600979s7dmhpeudr4
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: "a2", viewport: "desktop", pad: "/dashboard", maxStappen: 60 });
    try {
      await s.page.getByRole("button", { name: /De Vries|Groenstijl|Bedrijf wisselen/i }).first().click({ timeout: 5000 });
      await s.page.getByText("Groenstijl Tuinen", { exact: false }).click({ timeout: 5000 });
      await s.page.waitForTimeout(800);
    } catch (e) { out.groenstijl_switch_error = String(e).slice(0, 300); }
    await s.goto("/dashboard/leads/cmv70sc5400969s7dschjtlw9");
    await s.page.waitForTimeout(600);
    out.gina_scherm = (await s.page.innerText("body")).slice(0, 4000);
    await s.scherm("groenstijl-gina-offerte-scherm");
    const resp = await s.page.request.get("http://localhost:3200/api/offertes/cmv70sc5600979s7dmhpeudr4/pdf");
    out.gina_pdf_status = resp.status();
    const buf = await resp.body();
    require("fs").writeFileSync("/tmp/verifier-05-gina.pdf", buf);
    await s.sluit();
  }

  // 4) Factuur F2026-0003 Bas Betaald id cmv70sc1f007z9s7dgf7kf0y7
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/facturen/cmv70sc1f007z9s7dgf7kf0y7", maxStappen: 60 });
    await s.page.waitForTimeout(600);
    out.factuur_betaald_scherm = (await s.page.innerText("body")).slice(0, 4000);
    await s.scherm("factuur-betaald-scherm");
    const resp = await s.page.request.get("http://localhost:3200/api/facturen/cmv70sc1f007z9s7dgf7kf0y7/pdf");
    out.factuur_betaald_pdf_status = resp.status();
    const buf = await resp.body();
    require("fs").writeFileSync("/tmp/verifier-05-factuur-betaald.pdf", buf);
    await s.sluit();
  }

  // 5) Concept offerte Cor Concept 2026-0114 id cmv70sbwu00649s7dkoarxe4c
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 30 });
    const resp = await s.page.request.get("http://localhost:3200/api/offertes/cmv70sbwu00649s7dkoarxe4c/pdf");
    out.concept_offerte_pdf_status = resp.status();
    const buf = await resp.body();
    require("fs").writeFileSync("/tmp/verifier-05-concept-offerte.pdf", buf);
    await s.sluit();
  }

  // 6) Vincent Verlopen 2026-0116 id cmv70sbxc006b9s7dm15ta35c
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 30 });
    const resp = await s.page.request.get("http://localhost:3200/api/offertes/cmv70sbxc006b9s7dm15ta35c/pdf");
    out.verlopen_offerte_pdf_status = resp.status();
    const buf = await resp.body();
    require("fs").writeFileSync("/tmp/verifier-05-verlopen-offerte.pdf", buf);
    await s.sluit();
  }

  // 7) Btw verlegd check: factuur-maken flow op Ahmed lead
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/leads/cmv70sbxu006j9s7dg6zu1kmp", maxStappen: 100 });
    await s.page.waitForTimeout(600);
    out.ahmed_lead_scherm_voor_factuur = (await s.page.innerText("body")).slice(0, 3000);
    await s.scherm("ahmed-lead-voor-factuur");
    await s.sluit();
  }

  // 8) Publieke offerte pagina + pdf voor a2's offerte-verstuurd token
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: null, viewport: "desktop", pad: null, maxStappen: 30 });
    const token = "wv015t9Fyyu9JJpQ7G2NWBh1D2-VGlHg"; // Vera Verstuurd offerte token
    const pagResp = await s.page.goto(`http://localhost:3200/o/${token}`, { waitUntil: "networkidle" });
    out.publieke_offerte_pagina_status = pagResp.status();
    await s.scherm("publieke-offerte-pagina");
    const pdfResp = await s.page.request.get(`http://localhost:3200/o/${token}/pdf?v=1`);
    out.publieke_offerte_pdf_status = pdfResp.status();
    out.publieke_offerte_pdf_contenttype = pdfResp.headers()["content-type"];
    out.publieke_offerte_pdf_body = (await pdfResp.text()).slice(0, 200);
    await s.sluit();
  }

  // 9) facturenlijst volgorde
  {
    const s = await k.open({ agent: "verifier-05", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/facturen", maxStappen: 60 });
    await s.page.waitForTimeout(600);
    out.facturen_lijst = (await s.page.innerText("body")).slice(0, 3000);
    await s.scherm("facturen-lijst");
    await s.sluit();
  }

  require("fs").writeFileSync("/tmp/verifier-05-document-results.json", JSON.stringify(out, null, 1));
  console.log("KLAAR");
}

main().catch((e) => { console.error("FOUT", e); process.exit(1); });
