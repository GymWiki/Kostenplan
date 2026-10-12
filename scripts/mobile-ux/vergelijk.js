// Vergelijkt desktop-schermafbeeldingen (1440 px) vóór en na pixel voor pixel.
const sharp = require("sharp");
const fs = require("fs");
const dir = (l) => `${process.env.MAP || "docs/mobile-ux"}/${l}/1440`;
(async () => {
  const uit = [];
  for (const f of fs.readdirSync(dir(process.env.A || "voor")).filter((x) => x.endsWith(".png"))) {
    if (!fs.existsSync(`${dir(process.env.B || "na")}/${f}`)) { uit.push([f, "ontbreekt"]); continue; }
    const a = await sharp(`${dir(process.env.A || "voor")}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(`${dir(process.env.B || "na")}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) { uit.push([f, `andere afmeting ${a.info.width}x${a.info.height} → ${b.info.width}x${b.info.height}`]); continue; }
    let verschil = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) verschil++;
    }
    uit.push([f, `${((verschil / (a.info.width * a.info.height)) * 100).toFixed(3)}% pixels verschillen`]);
  }
  for (const [f, v] of uit) console.log(f.padEnd(24), v);
})();
