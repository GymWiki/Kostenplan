import "server-only";
import { revalidatePath } from "next/cache";
import { prismaBasis } from "@/app/lib/prisma";
import { getMateriaalOptiesVoorEngineVelden, getToolForSnapshot } from "@/app/lib/dal";
import { alleVeldenVanConfig } from "@/app/lib/calculator-engine";
import { bouwSnapshotInhoud, hashInhoud, maakSnapshot } from "./bouw";
import { blobGeconfigureerd, schrijfSnapshot } from "./opslag";

export type PublicatieUitslag =
  | { ok: true; versie: number; ongewijzigd: boolean; spiegelFout: string | null }
  | { ok: false; fout: string };

function foutTekst(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 300);
}

// Publiceert de snapshot van één tool. Gooit nooit: het resultaat vertelt wat
// er gebeurd is, en bij een fout blijft `snapshotVuil` staan zodat de editor
// "Nog niet gepubliceerd" kan tonen en een latere poging het oppakt.
export async function publiceerTool(toolId: string, opties: { forceer?: boolean } = {}): Promise<PublicatieUitslag> {
  if (!blobGeconfigureerd()) return { ok: false, fout: "Opslag voor de rekentool-kopie is niet ingesteld." };
  try {
    const tool = await getToolForSnapshot(toolId);
    if (!tool) return { ok: true, versie: 0, ongewijzigd: true, spiegelFout: null };

    let materiaalOpties = {};
    if (tool.activeCalculatorConfig) {
      const { parseCalculatorConfig, publicCalculatorConfig } = await import("@/app/lib/calculator-engine");
      const config = publicCalculatorConfig(parseCalculatorConfig(tool.activeCalculatorConfig.config));
      const ids = alleVeldenVanConfig(config)
        .filter((veld) => veld.soort === "PRODUCT_KEUZE")
        .map((veld) => veld.materialCategoryId);
      materiaalOpties = await getMateriaalOptiesVoorEngineVelden(tool.id, ids);
    }

    const inhoud = bouwSnapshotInhoud(tool, materiaalOpties);
    const hash = hashInhoud(inhoud);
    if (!opties.forceer && tool.snapshotHash === hash && !tool.snapshotVuil && tool.snapshotVersie > 0) {
      return { ok: true, versie: tool.snapshotVersie, ongewijzigd: true, spiegelFout: null };
    }

    // Versienummer eerst atomair claimen: twee gelijktijdige publicaties
    // schrijven zo nooit naar hetzelfde onveranderlijke bestand.
    const geclaimd = await prismaBasis.tool.update({
      where: { id: toolId },
      data: { snapshotVersie: { increment: 1 } },
      select: { snapshotVersie: true },
    });
    const snapshot = maakSnapshot(inhoud, geclaimd.snapshotVersie, new Date());
    const { spiegelFout } = await schrijfSnapshot(snapshot);

    // Alleen "schoon" zetten als er sindsdien geen nieuwere claim is.
    await prismaBasis.tool.updateMany({
      where: { id: toolId, snapshotVersie: geclaimd.snapshotVersie },
      data: { snapshotHash: hash, snapshotOp: new Date(), snapshotFout: spiegelFout, snapshotVuil: false },
    });
    try {
      revalidatePath(`/embed/${toolId}`);
    } catch {
      // buiten een request-context: de pagina verloopt vanzelf binnen een minuut
    }
    return { ok: true, versie: geclaimd.snapshotVersie, ongewijzigd: false, spiegelFout };
  } catch (e) {
    const fout = foutTekst(e);
    console.error("[snapshot] publiceren mislukt", { toolId, fout });
    try {
      await prismaBasis.tool.updateMany({ where: { id: toolId }, data: { snapshotVuil: true, snapshotFout: fout } });
    } catch {
      // database ook weg: de vlag blijft zoals ze was
    }
    return { ok: false, fout };
  }
}

const PAUZES_MS = [0, 1500, 4000];

// Publiceert met maximaal drie pogingen met oplopende wachttijd.
export async function publiceerMetHerhaling(toolId: string): Promise<PublicatieUitslag> {
  let laatste: PublicatieUitslag = { ok: false, fout: "Niet geprobeerd" };
  for (const pauze of PAUZES_MS) {
    if (pauze) await new Promise((r) => setTimeout(r, pauze));
    laatste = await publiceerTool(toolId);
    if (laatste.ok) return laatste;
    if (!blobGeconfigureerd()) return laatste;
  }
  return laatste;
}
