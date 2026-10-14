// Eén plek voor datum- en tijdnotatie van momenten (Date-instanties): altijd Nederlands en altijd in de tijdzone
// Europe/Amsterdam. Zonder vaste tijdzone rendert de server (UTC) een andere tijd dan de browser, wat een
// hydratiefout geeft (React #418/#419) en op mobiel en desktop een andere datum kan tonen.
// Datums zonder tijd ("2026-10-09") staan in `app/lib/offerte/weergave.ts` (formatDatum).
const TZ = "Europe/Amsterdam";
const maak = (opties: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, ...opties });

const korte = maak({ day: "numeric", month: "short" });
const korteJaar = maak({ day: "numeric", month: "short", year: "numeric" });
const lange = maak({ day: "numeric", month: "long", year: "numeric" });
const langeTijd = maak({ day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const kortTijd = maak({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dagMaand = maak({ day: "numeric", month: "long" });
const tijdFmt = maak({ hour: "2-digit", minute: "2-digit" });
const numeriek = maak({ day: "2-digit", month: "2-digit", year: "numeric" });
const isoFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

type Moment = Date | string | number;
const naarDate = (m: Moment) => (m instanceof Date ? m : new Date(m));

/** 9 okt */
export const datumKort = (m: Moment) => korte.format(naarDate(m));
/** 9 okt 2026 */
export const datumKortJaar = (m: Moment) => korteJaar.format(naarDate(m));
/** 9 oktober 2026 */
export const datumLang = (m: Moment) => lange.format(naarDate(m));
/** 9 oktober 2026 om 14:32 */
export const datumLangTijd = (m: Moment) => `${lange.format(naarDate(m))} om ${tijdFmt.format(naarDate(m))}`;
/** 9 oktober 2026, 14:32 (zoals in lijsten en drawers) */
export const datumLangMetTijd = (m: Moment) => langeTijd.format(naarDate(m));
/** 9 okt, 14:32 */
export const datumKortTijd = (m: Moment) => kortTijd.format(naarDate(m));
/** 9 oktober */
export const datumDagMaand = (m: Moment) => dagMaand.format(naarDate(m));
/** 14:32 */
export const tijd = (m: Moment) => tijdFmt.format(naarDate(m));
/** 09-10-2026 — op mobiel en desktop dezelfde notatie */
export const datumNumeriek = (m: Moment) => numeriek.format(naarDate(m)).replace(/\//g, "-");
/** 2026-10-09 (voor invoervelden en vergelijken) */
export const datumIso = (m: Moment) => isoFmt.format(naarDate(m));
