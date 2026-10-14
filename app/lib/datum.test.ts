import { describe, expect, it } from "vitest";
import { datumIso, datumKort, datumKortJaar, datumKortTijd, datumLang, datumLangMetTijd, datumLangTijd, datumNumeriek, tijd } from "./datum";

// 9 oktober 2026 22:30 UTC = 10 oktober 00:30 in Amsterdam (zomertijd, UTC+2)
const moment = new Date("2026-10-09T22:30:00Z");

describe("datum (altijd nl-NL en Europe/Amsterdam)", () => {
  it("rekent in de tijdzone van Amsterdam, niet in die van de server", () => {
    expect(datumLang(moment)).toBe("10 oktober 2026");
    expect(datumKort(moment)).toBe("10 okt");
    expect(datumKortJaar(moment)).toBe("10 okt 2026");
    expect(tijd(moment)).toBe("00:30");
    expect(datumLangTijd(moment)).toBe("10 oktober 2026 om 00:30");
    expect(datumKortTijd(moment)).toMatch(/^10 okt\.?,? 00:30$/);
    expect(datumLangMetTijd(moment)).toMatch(/^10 oktober 2026( om|,)? 00:30$/);
    expect(datumNumeriek(moment)).toBe("10-10-2026");
    expect(datumIso(moment)).toBe("2026-10-10");
  });
  it("wintertijd (UTC+1)", () => {
    expect(tijd(new Date("2026-12-01T23:30:00Z"))).toBe("00:30");
    expect(datumLang("2026-12-01T23:30:00Z")).toBe("2 december 2026");
  });
  it("geeft in elke procestijdzone hetzelfde (geen hydratieverschil tussen server en browser)", () => {
    const voor = process.env.TZ;
    const uitkomsten = new Set<string>();
    for (const tz of ["UTC", "America/New_York", "Asia/Tokyo", "Europe/Amsterdam"]) {
      process.env.TZ = tz;
      uitkomsten.add(`${datumLangTijd(moment)}|${datumKortTijd(moment)}|${datumNumeriek(moment)}`);
    }
    process.env.TZ = voor;
    expect(uitkomsten.size).toBe(1);
  });
});
