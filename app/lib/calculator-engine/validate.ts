import type { CalculatorField, DerivedVariable, PriceRule } from "./types";
import { RUNNING_SUBTOTAL_VARIABLE } from "./types";
import type { AnyCalculatorConfigData } from "./modulair-types";
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

// De kernvalidatie voor één "slice" ({velden, afgeleideVariabelen, regels})
// — dezelfde logica die vóór Levering B v2 rechtstreeks op een hele
// CalculatorConfigData draaide, nu geëxtraheerd zodat 'm zowel voor de
// bestaande platte calculator (versie 1, één slice) als per Onderdeel
// (versie 2, één slice per Onderdeel) hergebruikt kan worden.
function valideerOnderdeelSlice(velden: CalculatorField[], afgeleideVariabelen: DerivedVariable[], regels: PriceRule[]): ValidatieMelding[] {
  const meldingen: ValidatieMelding[] = [];

  const veldVariabelen = new Set(velden.flatMap(variabelenVoorVeld));
  const afgeleideNamen = new Set(afgeleideVariabelen.map((v) => v.id));
  const alleVariabelen = new Set([...veldVariabelen, ...afgeleideNamen, RUNNING_SUBTOTAL_VARIABLE]);
  const gebruikteVariabelen = new Set<string>();

  // Afgeleide variabelen mogen alleen naar veldvariabelen verwijzen (nooit
  // naar $subtotaal, dat bestaat pas tijdens het doorrekenen van de
  // prijsregels — ver ná het invullen van de velden).
  for (const variabele of afgeleideVariabelen) {
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

  // Conditionele velduitdrukkingen (zichtbaarAls/verplichtAls) mogen alleen
  // naar reeds bestaande veld-/afgeleide variabelen verwijzen — zelfde check
  // als voor prijsregels hieronder, nu ook voor velden zelf (was voorheen
  // een gat: deze expressies werden runtime wél geëvalueerd maar nooit
  // gevalideerd).
  for (const veld of velden) {
    for (const expr of [veld.zichtbaarAls, veld.verplichtAls]) {
      if (!expr) continue;
      const gebruikt = variabelenInExpressie(expr);
      for (const naam of gebruikt) {
        gebruikteVariabelen.add(naam);
        if (!alleVariabelen.has(naam)) {
          const label = veldLabelVoorVariabele(velden, naam) ?? naam;
          meldingen.push({
            ernst: "FOUT",
            veldId: veld.id,
            boodschap: `De voorwaarde bij "${veld.label}" gebruikt "${label}", maar die vraag bestaat niet (meer).`,
          });
        }
      }
    }
  }

  for (const regel of regels) {
    for (const { expr } of expressiesVanRegel(regel)) {
      if (!expr) continue;
      const gebruikt = variabelenInExpressie(expr);
      for (const naam of gebruikt) {
        gebruikteVariabelen.add(naam);
        if (!alleVariabelen.has(naam)) {
          const label = veldLabelVoorVariabele(velden, naam) ?? naam;
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
  for (const veld of velden) {
    const heeftInvloed = variabelenVoorVeld(veld).some((naam) => gebruikteVariabelen.has(naam));
    if (!heeftInvloed) {
      meldingen.push({
        ernst: "WAARSCHUWING",
        veldId: veld.id,
        boodschap: `De vraag "${veld.label}" heeft geen invloed op de berekening.`,
      });
    }
  }

  if (regels.filter((r) => r.actief).length === 0) {
    meldingen.push({ ernst: "FOUT", boodschap: "Er is nog geen enkele prijsregel ingesteld." });
  }

  return meldingen;
}

export function valideerCalculatorConfig(config: AnyCalculatorConfigData): ValidatieMelding[] {
  if (config.versie === 2) {
    const meldingen: ValidatieMelding[] = [];
    const actieveOnderdelen = config.onderdelen.filter((o) => o.actief);

    if (actieveOnderdelen.length === 0) {
      meldingen.push({ ernst: "FOUT", boodschap: "Deze tool heeft nog geen enkel actief onderdeel." });
    }

    for (const onderdeel of config.onderdelen) {
      if (!onderdeel.actief) continue;
      if (onderdeel.velden.length === 0) {
        meldingen.push({
          ernst: "FOUT",
          boodschap: `Onderdeel "${onderdeel.naam}" heeft nog geen enkele vraag.`,
        });
        continue;
      }
      const sliceMeldingen = valideerOnderdeelSlice(onderdeel.velden, onderdeel.afgeleideVariabelen, onderdeel.regels);
      for (const melding of sliceMeldingen) {
        meldingen.push({ ...melding, boodschap: `${onderdeel.naam}: ${melding.boodschap}` });
      }
    }

    return meldingen;
  }

  return valideerOnderdeelSlice(config.velden, config.afgeleideVariabelen, config.regels);
}

export function heeftBlokkerendeFouten(meldingen: ValidatieMelding[]): boolean {
  return meldingen.some((m) => m.ernst === "FOUT");
}
