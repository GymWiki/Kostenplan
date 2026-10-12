import { describe, expect, it } from "vitest";
import { herinneringNodig, isVerlopen, magNuAkkoordGeven, vandaagAmsterdam, weergaveStatusV2 } from "./status";

const nu = new Date("2026-10-20T12:00:00Z");

describe("verval (Europe/Amsterdam)", () => {
  it("geldig tot gisteren is verlopen; geldig tot vandaag nog niet", () => {
    expect(isVerlopen("2026-10-19", nu)).toBe(true);
    expect(isVerlopen("2026-10-20", nu)).toBe(false);
    expect(isVerlopen(new Date("2026-10-20T23:59:59Z"), nu)).toBe(false);
  });
  it("rekent in Nederlandse tijd: kort na middernacht in Nederland is het al de volgende dag", () => {
    const laat = new Date("2026-10-20T22:30:00Z"); // 00:30 op 21 oktober in Amsterdam
    expect(vandaagAmsterdam(laat)).toBe("2026-10-21");
    expect(isVerlopen("2026-10-20", laat)).toBe(true);
  });
  it("een openstaande offerte na de datum toont Verlopen; andere statussen blijven", () => {
    expect(weergaveStatusV2({ status: "VERSTUURD", geldigTot: "2026-10-19" }, nu)).toBe("VERLOPEN");
    expect(weergaveStatusV2({ status: "BEKEKEN", geldigTot: "2026-10-19" }, nu)).toBe("VERLOPEN");
    expect(weergaveStatusV2({ status: "GEACCEPTEERD", geldigTot: "2026-10-19" }, nu)).toBe("GEACCEPTEERD");
    expect(weergaveStatusV2({ status: "VERSTUURD", geldigTot: "2026-10-25" }, nu)).toBe("VERSTUURD");
  });
  it("akkoord geven na verloop wordt geweigerd", () => {
    expect(magNuAkkoordGeven({ status: "VERSTUURD", geldigTot: "2026-10-19" }, nu)).toEqual({ ok: false, reden: "verlopen" });
    expect(magNuAkkoordGeven({ status: "GEACCEPTEERD", geldigTot: "2026-10-25" }, nu)).toEqual({ ok: false, reden: "gesloten" });
    expect(magNuAkkoordGeven({ status: "BEKEKEN", geldigTot: "2026-10-20" }, nu)).toEqual({ ok: true });
  });
});

describe("tip: herinnering sturen", () => {
  const dagen = (n: number) => new Date(nu.getTime() - n * 86_400_000);
  it("binnen 3 dagen vóór het verlopen", () => {
    expect(herinneringNodig({ status: "VERSTUURD", geldigTot: "2026-10-23", verstuurdOp: dagen(1) }, nu)).toBe("verloopt-binnenkort");
    expect(herinneringNodig({ status: "VERSTUURD", geldigTot: "2026-10-24", verstuurdOp: dagen(1) }, nu)).toBeNull();
  });
  it("7 dagen verstuurd zonder reactie", () => {
    expect(herinneringNodig({ status: "BEKEKEN", geldigTot: "2026-11-15", verstuurdOp: dagen(7) }, nu)).toBe("geen-reactie");
    expect(herinneringNodig({ status: "BEKEKEN", geldigTot: "2026-11-15", verstuurdOp: dagen(6) }, nu)).toBeNull();
  });
  it("niet voor verlopen, geaccepteerde, afgewezen of conceptofferten", () => {
    for (const status of ["GEACCEPTEERD", "AFGEWEZEN", "CONCEPT", "VERLOPEN"] as const) expect(herinneringNodig({ status, geldigTot: "2026-10-21", verstuurdOp: dagen(9) }, nu)).toBeNull();
    expect(herinneringNodig({ status: "VERSTUURD", geldigTot: "2026-10-19", verstuurdOp: dagen(9) }, nu)).toBeNull();
  });
});
