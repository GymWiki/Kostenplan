import { describe, expect, it } from "vitest";
import { extractBranding } from "./branding-extract";

// Deze adressen moeten geweigerd worden voordat er ook maar één verzoek de deur
// uit gaat (IP-adressen worden niet eens opgezocht).
describe("extractBranding weigert interne adressen", () => {
  for (const url of [
    "http://localhost",
    "http://localhost:3000/admin",
    "http://127.0.0.1",
    "http://127.1.2.3/x",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5",
    "http://172.16.0.1",
    "http://192.168.1.1",
    "http://[::1]/",
    "http://0.0.0.0",
    "http://2130706433/",
    "ftp://voorbeeld.nl",
    "file:///etc/passwd",
    "javascript:alert(1)",
  ]) {
    it(`weigert ${url}`, async () => {
      const r = await extractBranding(url, null);
      expect(r.success).toBe(false);
    });
  }
});
