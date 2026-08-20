import type { CalculatorConfigData, CalculatorField, PriceRule } from "./types";
import { RUNNING_SUBTOTAL_VARIABLE } from "./types";
import { variabelenInExpressie } from "./expression";
import { afmetingenSubvariabelen, productKeuzePrijsVariabele } from "./fields";

// ---------------------------------------------------------------------------
// Builder-validatie (Deel 32 van de opdracht) — vroegtijdig, begrijpelijke
// foutmeldingen in mensentaal, geen technisch jargon ("JSON"/"expression"/
// "variable"). Draait bij elke wijziging in de builder (Fase 9/10) en
// vóór publiceren (Fase 11): een DRAFT met ERROR-meldingen mag niet
// gepubliceerd worden, WARNING-meldingen blokkeren niets.
// ---------------------------------------------------------------------------

export type ValidatieMelding = {
  ernst: "FOUT" | "WAARSCHUWING";
  boodschap: string;
  // Optioneel: waar dit vandaan komt, voor de builder om naar te
  // scrollen/highlighten — nooit getoond als los technisch veld aan de
  // vakman, alleen gebruikt om de juiste plek te markeren.
  veldId?: string;
  regelId?: string;
};

// Alle variabelenamen die een AFMETINGEN/PRODUCT_KEUZE-veld daadwerkelijk
// oplevert (zie fields.ts) — voor de gewone veldsoorten is dat gewoon de
// veld-id zelf.
function variabelenVoorVeld(veld: CalculatorField): string[] {
  switch (veld.soort) {
    case "AFMETINGEN": {
      const namen = afmetingenSubvariabelen(veld.id, veld.metHoogte);
      return [namen.lengte, namen.breedte, namen.hoogte, namen.oppervlakte, namen.volume].filter(
        (n): n is string => n != null
      );
    }
    case "PRODUCT_KEUZE":
      return [veld.id, productKeuzePrijsVariabele(veld.id)];
    default:
      return [veld.id];
  }
}

function veldLabelVoorVariabele(velden: CalculatorField[], naam: string): string | undefined {
  for (const veld of velden) {
    if (variabelenVoorVeld(veld).includes(naam)) return veld.label;
  }
  return undefined;
}

function expressiesVanRegel(regel: PriceRule): { expr: import("./types").Expression | undefined }[] {
  const lijst: { expr: import("./types").Expression | undefined }[] = [{ expr: regel.voorwaarde }];
  switch (regel.type) {
    case "VAST":
    case "TOESLAG":
      lijst.push({ expr: regel.bedrag });
      break;
    case "PER_EENHEID":
      lijst.push({ expr: regel.hoeveelheid }, { expr: regel.prijsPerEenheid });
      break;
    case "PERCENTAGE":
      lijst.push({ expr: regel.basis }, { expr: regel.percentage });
      break;
    case "KORTING":
      lijst.push({ expr: regel.percentage }, { expr: regel.bedrag });
      break;
    case "STAFFEL":
      lijst.push({ expr: regel.hoeveelheid });
      break;
    case "FORMULE":
      lijst.push({ expr: regel.formule });
      break;
  }
  return lijst;
}

export function valideerCalculatorConfig(config: CalculatorConfigData): ValidatieMelding[] {
  const meldingen: ValidatieMelding[] = [];

  const veldVariabelen = new Set(config.velden.flatMap(variabelenVoorVeld));
  const afgeleideNamen = new Set(config.afgeleideVariabelen.map((v) => v.id));
  const alleVariabelen = new Set([...veldVariabelen, ...afgeleideNamen, RUNNING_SUBTOTAL_VARIABLE]);
  const gebruikteVariabelen = new Set<string>();

  // Afgeleide variabelen mogen alleen naar veldvariabelen verwijzen (nooit
  // naar $subtotaal, dat bestaat pas tijdens het doorrekenen van de
  // prijsregels — ver ná het invullen van de velden).
  for (const variabele of config.afgeleideVariabelen) {
    const gebruikt = variabelenInExpressie(variabele.expression);
    for (const naam of gebruikt) {
      gebruikteVariabelen.add(naam);
      if (!veldVariabelen.has(naam)) {
        meldingen.push({
          ernst: "FOUT",
          boodschap: `De berekening voor "${variabele.label}" gebruikt een vraag die niet bestaat.`,
        });
      }
    }
  }

  for (const regel of config.regels) {
    for (const { expr } of expressiesVanRegel(regel)) {
      if (!expr) continue;
      const gebruikt = variabelenInExpressie(expr);
      for (const naam of gebruikt) {
        gebruikteVariabelen.add(naam);
        if (!alleVariabelen.has(naam)) {
          const label = veldLabelVoorVariabele(config.velden, naam) ?? naam;
          meldingen.push({
            ernst: "FOUT",
            regelId: regel.id,
            boodschap: `Prijsregel "${regel.label}" gebruikt "${label}", maar die vraag bestaat niet (meer).`,
          });
        }
      }
    }

    if (regel.type === "KORTING" && !regel.bedrag && !regel.percentage) {
      meldingen.push({
        ernst: "FOUT",
        regelId: regel.id,
        boodschap: `Korting "${regel.label}" heeft geen bedrag of percentage ingevuld.`,
      });
    }
    if (regel.type === "PER_EENHEID" && !regel.eenheid) {
      meldingen.push({
        ernst: "WAARSCHUWING",
        regelId: regel.id,
        boodschap: `Prijsregel "${regel.label}" heeft geen eenheid gekozen.`,
      });
    }
    if (regel.type === "STAFFEL" && regel.schijven.length === 0) {
      meldingen.push({
        ernst: "FOUT",
        regelId: regel.id,
        boodschap: `Staffel "${regel.label}" heeft nog geen schijven.`,
      });
    }
  }

  // "Deze vraag heeft geen invloed op de berekening" — een veld waarvan
  // geen enkele variabele ergens in een afgeleide variabele of prijsregel
  // voorkomt.
  for (const veld of config.velden) {
    const heeftInvloed = variabelenVoorVeld(veld).some((naam) => gebruikteVariabelen.has(naam));
    if (!heeftInvloed) {
      meldingen.push({
        ernst: "WAARSCHUWING",
        veldId: veld.id,
        boodschap: `De vraag "${veld.label}" heeft geen invloed op de berekening.`,
      });
    }
  }

  if (config.regels.filter((r) => r.actief).length === 0) {
    meldingen.push({ ernst: "FOUT", boodschap: "Er is nog geen enkele prijsregel ingesteld." });
  }

  return meldingen;
}

export function heeftBlokkerendeFouten(meldingen: ValidatieMelding[]): boolean {
  return meldingen.some((m) => m.ernst === "FOUT");
}
