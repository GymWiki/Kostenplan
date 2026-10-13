const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
module.exports = async function start(pad, maxStappen = 150, viewport = "mobiel") {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "a3", viewport, pad: null, maxStappen });
  const p = s.page;
  s.goto2 = async (pa) => { s.stap(); await p.goto(k.BASE + pa, { waitUntil: "networkidle" }); };
  s.wissel = async (naam) => {
    await s.goto2("/dashboard/profiel");
    s.stap(); await p.getByRole("button", { name: /^(HD|GT)\b/ }).first().click().catch(async () => p.getByRole("button", { name: /Hoveniersbedrijf De Vries|Groenstijl Tuinen/ }).first().click());
    await p.waitForTimeout(400); s.stap();
    await p.getByRole("button", { name: new RegExp(naam) }).last().click();
    await p.getByText(`Je werkt nu in ${naam}`).waitFor({ timeout: 15000 }).catch(() => console.log("GEEN toast voor", naam));
    await p.waitForLoadState("networkidle");
  };
  if (pad) await s.goto2(pad);
  return s;
};
