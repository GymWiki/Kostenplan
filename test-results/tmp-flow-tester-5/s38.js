const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fs = require("fs");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  const dir = "/tmp/claude-0/-home-user-Kostenplan/01bd42ce-f1f2-516d-9a1c-de269bf67bee/scratchpad/flow-tester-5";
  fs.mkdirSync(dir, { recursive: true });
  const r = await s.ctx.request.get("http://localhost:3200/api/facturen/cmv6wukg3006g7b7dob4sn2wx/pdf");
  console.log("status", r.status(), r.headers()["content-type"]);
  const buf = await r.body();
  fs.writeFileSync(dir + "/F2026-0005.pdf", buf);
  console.log("bytes", buf.length);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
