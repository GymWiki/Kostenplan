import { describe, expect, it } from "vitest";
import { STANDAARD_HERINNERINGSTEKST, bouwDeelBericht, mailtoLink, vulSjabloon, whatsappDeelLink } from "./berichten";
import { voorbeeldParticulier, voorbeeldZakelijk } from "./voorbeelden";

const LINK = "https://kostenplan.nl/o/abc123";

describe("deelbericht", () => {
  it("onderwerp 'Offerte 2026-0012 – <onderwerp>' en een tekst met de link", () => {
    const b = bouwDeelBericht({ inhoud: voorbeeldParticulier(), link: LINK });
    expect(b.onderwerp).toBe("Offerte 2026-0012 – Aanleg terras en schutting");
    expect(b.tekst).toContain(LINK);
    expect(b.tekst).toContain("Geachte Mevrouw A. Jansen");
    expect(b.tekst).toContain("aanleg terras en schutting");
    expect(b.tekst).toMatch(/geldig tot 14 november 2026/);
  });
  it("een aangepaste tekst zonder link krijgt de link toch", () => {
    const b = bouwDeelBericht({ inhoud: voorbeeldParticulier(), link: LINK, sjabloon: "Hoi {naam}, zie bijlage." });
    expect(b.tekst).toContain("Hoi Mevrouw A. Jansen, zie bijlage.");
    expect(b.tekst.endsWith(LINK)).toBe(true);
  });
  it("herinnering heeft een eigen onderwerp en tekst met het totaal", () => {
    const b = bouwDeelBericht({ inhoud: voorbeeldZakelijk(), link: LINK, herinnering: true });
    expect(b.onderwerp).toMatch(/^Herinnering: offerte 2026-0013/);
    expect(b.tekst).toMatch(/excl\. btw/);
    expect(STANDAARD_HERINNERINGSTEKST).toContain("{link}");
  });
  it("onbekende aanduidingen blijven zichtbaar", () => {
    expect(vulSjabloon("Hoi {naam} {onzin}", { naam: "Jan" } as never)).toBe("Hoi Jan {onzin}");
  });
  it("mailto met onderwerp en tekst geëncodeerd", () => {
    const l = mailtoLink({ naar: "a.jansen@example.nl", onderwerp: "Offerte 1 – Terras & schutting", tekst: "Regel 1\nRegel 2" });
    expect(l.startsWith("mailto:a.jansen%40example.nl?subject=")).toBe(true);
    const q = new URLSearchParams(l.split("?")[1]);
    expect(q.get("subject")).toBe("Offerte 1 – Terras & schutting");
    expect(q.get("body")).toBe("Regel 1\r\nRegel 2");
  });
  it("WhatsApp-link met vooringevuld bericht", () => {
    const l = whatsappDeelLink(`Zie ${LINK}`, "06 87654321");
    expect(l).toMatch(/^https:\/\/wa\.me\/31687654321\?text=/);
    expect(decodeURIComponent(l)).toContain(LINK);
  });
});
