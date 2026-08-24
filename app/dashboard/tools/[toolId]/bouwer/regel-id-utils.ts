// Gedeeld tussen RegelFormModal (v1) en RegelSettingsForm (v2) — prijsregels
// krijgen (anders dan velden) geen op-het-label-gebaseerde id, gewoon een
// oplopend "regelN".
export function nieuwRegelId(bestaandeIds: Set<string>): string {
  let i = 1;
  while (bestaandeIds.has(`regel${i}`)) i += 1;
  return `regel${i}`;
}
