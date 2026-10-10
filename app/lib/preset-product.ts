import type { Prisma, PrismaClient, ArbeidStapEenheid } from "@/app/generated/prisma/client";
import { REKENMETHODE_SJABLOON, productiviteitVoorStapEenheid, type HovenierPreset } from "@/app/lib/presets";
import { standaardConfigVoorSjabloon } from "@/app/lib/sjablonen";

// Eén hovenier-preset → één onderdeel (Product) met voorbeeldprijzen. Gedeeld
// door de onboarding en de probeer-flow.
export function maakProductVanPreset(
  db: Pick<PrismaClient, "product">,
  toolId: string,
  preset: HovenierPreset,
  stapEenheid: ArbeidStapEenheid,
  order: number
) {
  const sjabloon = REKENMETHODE_SJABLOON[preset.rekenmethode];
  return db.product.create({
    data: {
      toolId,
      naam: preset.naam,
      omschrijving: preset.uitleg,
      eenheid: preset.eenheid,
      sjabloon,
      sjabloonConfig: standaardConfigVoorSjabloon(sjabloon) as Prisma.InputJsonValue,
      productiviteit: productiviteitVoorStapEenheid(preset, stapEenheid),
      icoon: preset.icoon,
      actief: true,
      order,
      materiaalCategorieen: {
        create: [
          {
            naam: "Materiaal",
            verplicht: true,
            order: 0,
            materialen: { create: preset.materialen.map((m, j) => ({ naam: m.naam, prijs: m.prijs, order: j, isVoorbeeld: true })) },
          },
        ],
      },
    },
  });
}
