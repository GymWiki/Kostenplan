const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "b", viewport: "mobiel", pad: "/dashboard/profiel/bedrijfsgegevens", maxStappen: 80 });
  const p = s.page;
  const txt = (n = 900) => p.locator("body").innerText().then((t) => t.replace(/\n+/g, " | ").slice(0, n));
  console.log("url", p.url());
  console.log("velden:\n" + await p.evaluate(() => [...document.querySelectorAll("input, textarea, select")].map((el) => { const lab = el.labels && el.labels[0] ? el.labels[0].innerText : (el.getAttribute("aria-label") || el.name); return `${lab.replace(/\s+/g, " ").slice(0, 40)} = ${el.type === "checkbox" ? el.checked : (el.value || "").slice(0, 40)}`; }).filter((x) => !x.startsWith("$")).join("\n")));
  console.log("tekst:", await txt(1300));
  await s.scherm("b-bedrijfsgegevens");
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
