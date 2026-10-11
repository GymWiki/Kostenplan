import "server-only";
import { after } from "next/server";
import { mailGeconfigureerd, verstuurLeadMail, verwerkMailWachtrij } from "./lead-mail";

// Plant de mail van een nieuwe lead ná het antwoord aan de bezoeker, met nog
// twee snelle pogingen; daarna pakt de wachtrij (hieronder, of de dagelijkse
// controle) het op. Ruimt bij de gelegenheid ook oudere onverstuurde mails op.
export function planLeadMail(leadId: string): void {
  if (!mailGeconfigureerd()) return;
  const werk = async () => {
    for (const pauze of [0, 3000, 10000]) {
      if (pauze) await new Promise((r) => setTimeout(r, pauze));
      const uitslag = await verstuurLeadMail(leadId);
      if (uitslag !== "later") break;
    }
    await verwerkMailWachtrij(5);
  };
  try {
    after(werk);
  } catch {
    void werk();
  }
}

// Alleen de wachtrij (geen specifieke lead), hooguit eens per minuut per instantie.
let laatste = 0;
export function planLeadMailWachtrij(): void {
  if (!mailGeconfigureerd() || Date.now() - laatste < 60_000) return;
  laatste = Date.now();
  try {
    after(async () => {
      await verwerkMailWachtrij(5);
    });
  } catch {
    // buiten een request: niets te doen
  }
}
