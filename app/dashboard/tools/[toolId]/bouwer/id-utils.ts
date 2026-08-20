// Genereert een stabiele, leesbare id uit een label (bijv. "Oude schutting
// verwijderen" -> "oudeSchuttingVerwijderen") — deze id is de variabelenaam
// die de rest van de configuratie (afgeleide variabelen, prijsregels,
// condities) gebruikt om naar dit veld te verwijzen. `bestaandeIds` voorkomt
// botsingen (twee velden met hetzelfde label krijgen -2/-3 etc.).
export function genereerId(label: string, bestaandeIds: Set<string>): string {
  const basis =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/[\s-]+/)
      .map((woord, i) => (i === 0 ? woord : woord.charAt(0).toUpperCase() + woord.slice(1)))
      .join("") || "veld";

  if (!bestaandeIds.has(basis)) return basis;
  let i = 2;
  while (bestaandeIds.has(`${basis}${i}`)) i += 1;
  return `${basis}${i}`;
}
