"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { parseGetal } from "@/app/lib/sjablonen";
import { slaBasisTarievenOp } from "@/app/lib/basis-tarieven-server";

export type BedrijfTarievenResultaat = { ok: true; overgeslagen: string[] } | { ok: false; error: string };

// "Tarieven" in Profiel: één keer instellen, geldt voor alle rekentools van
// dit bedrijf. Rekentools die al werkzaamheden hebben met een andere
// arbeidseenheid worden overgeslagen (anders zou hun werktempo ineens iets
// anders betekenen); die worden teruggemeld.
export async function saveBedrijfTarievenAction(invoer: {
  eenheid: "UUR" | "DAGDEEL" | "DAG";
  tarief: string;
  voorrij: string;
  transport: string;
}): Promise<BedrijfTarievenResultaat> {
  const { company } = await requireActiveCompany();
  const tarief = parseGetal(invoer.tarief, NaN);
  const voorrij = parseGetal(invoer.voorrij, NaN);
  const transport = parseGetal(invoer.transport, NaN);
  if ([tarief, voorrij, transport].some((n) => Number.isNaN(n) || n < 0)) {
    return { ok: false, error: "Vul bij elk veld een bedrag in (0 mag ook)." };
  }

  const tools = await prisma.tool.findMany({ where: { companyId: company.id, deletedAt: null }, select: { id: true, naam: true, slug: true } });
  const overgeslagen: string[] = [];
  let opgeslagen = 0;
  for (const tool of tools) {
    const r = await slaBasisTarievenOp(company.id, tool.id, {
      arbeidStapEenheid: invoer.eenheid,
      arbeidTarief: tarief,
      voorrijTarief: voorrij,
      transportTarief: transport,
    });
    if ("error" in r) overgeslagen.push(tool.naam);
    else {
      opgeslagen++;
      revalidatePath(`/t/${company.slug}/${tool.slug}`);
    }
  }
  if (tools.length === 0) {
    await prisma.company.update({
      where: { id: company.id },
      data: { standaardVoorrijTarief: voorrij, ...(invoer.eenheid === "UUR" ? { standaardArbeidTariefUur: tarief } : {}) },
    });
  } else if (opgeslagen === 0) {
    return { ok: false, error: "Je rekentools rekenen al met een andere eenheid. Die kun je niet in één keer wijzigen." };
  }
  revalidatePath("/dashboard/profiel", "layout");
  revalidatePath(`/portaal/${company.slug}`);
  return { ok: true, overgeslagen };
}
