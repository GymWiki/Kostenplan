const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte", maxStappen: 20 });
  console.log("URL", s.page.url());
  console.log(await s.scherm("offerte-start"));
  const inputs = await s.page.$$eval("input,textarea,select,button", els => els.map(e => ({t:e.tagName, type:e.type||'', name:e.name||'', id:e.id||'', label:e.getAttribute('aria-label')||'', txt:(e.innerText||e.value||'').slice(0,50), disabled:e.disabled})));
  console.log(JSON.stringify(inputs, null, 0));
  console.log(s.consoleFouten);
  await s.sluit();
})();
