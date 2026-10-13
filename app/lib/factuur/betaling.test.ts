import { describe, expect, it } from "vitest";
import { dagenTeLaat, openstaandCenten, statusNaMutatie, valideerBetaling, volgendeHerinnering } from "./betaling";

const s = (totaal: number, betaald = 0, credit = 0) => ({ totaalInclCenten: totaal, betaaldCenten: betaald, gecrediteerdCenten: credit });

describe("openstaand en status", () => {
  it("openstaand = totaal − betalingen − creditnota's", () => {
    expect(openstaandCenten(s(100000))).toBe(100000);
    expect(openstaandCenten(s(100000, 30000))).toBe(70000);
    expect(openstaandCenten(s(100000, 30000, 20000))).toBe(50000);
    expect(openstaandCenten(s(100000, 100000))).toBe(0);
  });
  it("deelbetaling → Deels betaald; volledig → Betaald; terug naar Verstuurd als alles is weggehaald", () => {
    expect(statusNaMutatie("VERSTUURD", s(100000, 30000), true)).toBe("DEELS_BETAALD");
    expect(statusNaMutatie("DEELS_BETAALD", s(100000, 100000), true)).toBe("BETAALD");
    expect(statusNaMutatie("DEELS_BETAALD", s(100000, 0), true)).toBe("VERSTUURD");
    expect(statusNaMutatie("DEELS_BETAALD", s(100000, 0), false)).toBe("DEFINITIEF");
  });
  it("een creditnota: deels verlaagt het openstaande bedrag, geheel geeft Gecrediteerd", () => {
    expect(statusNaMutatie("VERSTUURD", s(100000, 0, 40000), true)).toBe("VERSTUURD");
    expect(openstaandCenten(s(100000, 0, 40000))).toBe(60000);
    expect(statusNaMutatie("VERSTUURD", s(100000, 0, 100000), true)).toBe("GECREDITEERD");
    // deels crediteren en de rest betalen = betaald
    expect(statusNaMutatie("VERSTUURD", s(100000, 60000, 40000), true)).toBe("BETAALD");
  });
  it("een concept blijft een concept", () => {
    expect(statusNaMutatie("CONCEPT", s(100000, 100000), false)).toBe("CONCEPT");
  });
});

describe("betaling registreren", () => {
  it("valideert bedrag, datum en openstaand bedrag", () => {
    expect(valideerBetaling({ bedragCenten: 0, datum: "2026-10-20" }, s(1000), "VERSTUURD")).toBe("bedrag");
    expect(valideerBetaling({ bedragCenten: 10.5, datum: "2026-10-20" }, s(1000), "VERSTUURD")).toBe("bedrag");
    expect(valideerBetaling({ bedragCenten: 500, datum: "" }, s(1000), "VERSTUURD")).toBe("datum");
    expect(valideerBetaling({ bedragCenten: 1500, datum: "2026-10-20" }, s(1000), "VERSTUURD")).toBe("te-hoog");
    expect(valideerBetaling({ bedragCenten: 1000, datum: "2026-10-20" }, s(1000), "VERSTUURD")).toBeNull();
    expect(valideerBetaling({ bedragCenten: 500, datum: "2026-10-20" }, s(1000, 600), "DEELS_BETAALD")).toBe("te-hoog");
    expect(valideerBetaling({ bedragCenten: 100, datum: "2026-10-20" }, s(1000), "CONCEPT")).toBe("geen-factuur");
    expect(valideerBetaling({ bedragCenten: 100, datum: "2026-10-20" }, s(1000), "GECREDITEERD")).toBe("geen-factuur");
  });
});

describe("te laat (Europe/Amsterdam)", () => {
  const f = (vervaldatum: string, open = 1000, status: "VERSTUURD" | "BETAALD" = "VERSTUURD") => ({ vervaldatum, status, openstaandCenten: open });
  it("op de vervaldatum zelf is het nog niet te laat; een dag later wel", () => {
    expect(dagenTeLaat(f("2026-10-20"), new Date("2026-10-20T20:00:00Z"))).toBeNull(); // 22:00 Amsterdam
    expect(dagenTeLaat(f("2026-10-20"), new Date("2026-10-20T22:30:00Z"))).toBe(1); // 00:30 Amsterdam op de 21e
    expect(dagenTeLaat(f("2026-10-20"), new Date("2026-10-23T10:00:00Z"))).toBe(3);
  });
  it("niet te laat als er niets openstaat of de factuur betaald is", () => {
    expect(dagenTeLaat(f("2026-10-01", 0), new Date("2026-10-23T10:00:00Z"))).toBeNull();
    expect(dagenTeLaat(f("2026-10-01", 1000, "BETAALD"), new Date("2026-10-23T10:00:00Z"))).toBeNull();
  });
  it("herinnering → aanmaning → laatste herinnering (alleen particulier)", () => {
    expect(volgendeHerinnering({ herinneringen: 0, aanmaningen: 0, laatste: 0 }, "particulier")).toBe("herinnering");
    expect(volgendeHerinnering({ herinneringen: 1, aanmaningen: 0, laatste: 0 }, "particulier")).toBe("aanmaning");
    expect(volgendeHerinnering({ herinneringen: 1, aanmaningen: 1, laatste: 0 }, "particulier")).toBe("laatste-herinnering");
    expect(volgendeHerinnering({ herinneringen: 1, aanmaningen: 1, laatste: 0 }, "zakelijk")).toBeNull();
    expect(volgendeHerinnering({ herinneringen: 1, aanmaningen: 1, laatste: 1 }, "particulier")).toBeNull();
  });
});
