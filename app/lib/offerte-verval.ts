import type { Offerte } from "@/app/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";

// Bewust GEEN "use server": een action die een client-object vertrouwt zou van buitenaf aanroepbaar zijn.
// Lazy verval-check — wordt aangeroepen op de momenten die ertoe doen (de
// publieke pagina openen, de concept-editor openen), niet bij elke
// kanban-render. Zie weergaveOfferteStatus() in app/lib/offertes.ts voor de
// puur-berekende variant die wél overal (incl. lijsten) gebruikt wordt.
export async function syncOfferteVerval(offerte: Offerte): Promise<Offerte> {
  if (offerte.status !== "VERSTUURD" || offerte.geldigTot.getTime() >= Date.now()) {
    return offerte;
  }
  return prisma.offerte.update({ where: { id: offerte.id }, data: { status: "VERLOPEN" } });
}
