// Terugkeerpad na inloggen/registreren: alleen interne paden, anders is het
// een open redirect.
export function veiligVolgende(ruw: unknown, standaard = "/dashboard"): string {
  if (typeof ruw !== "string") return standaard;
  if (!ruw.startsWith("/") || ruw.startsWith("//") || ruw.includes("\\") || /[\u0000-\u001f]/.test(ruw)) return standaard;
  return ruw.length > 200 ? standaard : ruw;
}
