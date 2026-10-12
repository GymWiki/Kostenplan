import { describe, expect, it } from "vitest";
import { bouwOfferteMail, whatsappDeelLink } from "./mail";
import { voorbeeldParticulier, voorbeeldZakelijk } from "./voorbeelden";

describe("offerte-mail", () => {
  it("noemt nummer, handelsnaam, totaal en de link; geen tracking-pixels", () => {
    const m = bouwOfferteMail({ inhoud: voorbeeldParticulier(), link: "https://kostenplan.nl/o/abc" });
    expect(m.onderwerp).toBe("Offerte 2026-0012 van Hoveniersbedrijf De Vries");
    expect(m.tekst).toContain("https://kostenplan.nl/o/abc");
    expect(m.html).toContain("Offerte bekijken");
    expect(m.html).not.toMatch(/<img[^>]*(1x1|pixel|track)/i);
    expect(m.tekst).toMatch(/Totaal: €/);
  });
  it("zakelijk: totaal excl. btw", () => {
    expect(bouwOfferteMail({ inhoud: voorbeeldZakelijk(), link: "x" }).tekst).toMatch(/excl\. btw/);
  });
  it("herinnering heeft een eigen onderwerp", () => {
    expect(bouwOfferteMail({ inhoud: voorbeeldParticulier(), link: "x", herinnering: true }).onderwerp).toMatch(/^Herinnering/);
  });
  it("escapet gevaarlijke tekst in de html", () => {
    const i = voorbeeldParticulier();
    i.klant.naam = '<script>alert(1)</script>';
    expect(bouwOfferteMail({ inhoud: i, link: "x" }).html).not.toContain("<script>");
  });
  it("WhatsApp-link met vooringevuld bericht", () => {
    const l = whatsappDeelLink(voorbeeldParticulier(), "https://kostenplan.nl/o/abc", "06 87654321");
    expect(l).toMatch(/^https:\/\/wa\.me\/31687654321\?text=/);
    expect(decodeURIComponent(l)).toContain("https://kostenplan.nl/o/abc");
  });
});
