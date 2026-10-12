// Korte, stabiele vingerafdruk van een configuratie (FNV-1a, 2 × 32 bit), zodat een momentopname kan
// zeggen met welke configuratie is gerekend. Geen beveiliging, alleen herkenning.
function stabiel(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stabiel).join(",")}]`;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stabiel(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(x) ?? "null";
}

export function hashConfig(config: unknown): string {
  const s = stabiel(config);
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b + c, 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}
