// Maakt van wat iemand intikt of in ?site= meekrijgt een nette hostnaam
// ("https://www.Voorbeeld.nl/over-ons" -> "www.voorbeeld.nl"), of "" als het
// geen website lijkt. Puur en zonder Node-API's, dus ook in de browser te
// gebruiken. De echte veiligheidscontrole (geen intern adres) staat op de
// server, bij het ophalen.
export function normaliseerSite(ruw: string | null | undefined): string {
  if (!ruw) return "";
  let s = ruw.trim().slice(0, 300);
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return ""; // javascript:, file:, …
  s = s.replace(/^https?:\/\//i, "");
  s = s.split(/[/?#]/)[0] ?? "";
  s = s.replace(/^[^@]*@/, "").replace(/:\d+$/, "").replace(/\.$/, "").toLowerCase();
  if (s.length < 4 || s.length > 253) return "";
  if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(s)) return "";
  return s;
}
