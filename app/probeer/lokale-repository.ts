import type { EditorRepository } from "@/app/dashboard/tools/[toolId]/editor/repository";
import { draftNaarProducten } from "@/app/lib/draft-editor";
import { MAX_ONDERDELEN, nieuweId, schoonTekst, werkzaamheidDraftSchema, type Draft } from "@/app/lib/draft";
import { presetById } from "@/app/lib/presets";
import { PLAN_LIMITS } from "@/app/lib/subscription";
import { parseGetal } from "@/app/lib/sjablonen";
import { valideerDraft } from "@/app/lib/werkzaamheid-db";
import type { WerkzaamheidDraft } from "@/app/lib/werkzaamheid";

// De opslagplaats van de editor voor een gast: alles gebeurt in het geheugen
// van de browser en wordt via `bewaar` (gedebounced) in localStorage gezet.
// Er gaat niets over het netwerk.
export type DraftBron = { huidig: () => Draft; wijzig: (fn: (d: Draft) => Draft) => void };

const GRATIS_LIMIET = PLAN_LIMITS.GRATIS.maxProductsPerCompany;

export function maakLokaleRepository(bron: DraftBron): EditorRepository {
  const vind = (d: Draft, id: string) => d.calculator.werkzaamheden.findIndex((w) => w.id === id);

  return {
    gast: true,

    async slaWerkzaamheidOp(productId, wd) {
      const fout = valideerDraft(wd);
      if (fout) return { ok: false, error: fout };
      const geparsed = werkzaamheidDraftSchema.safeParse(wd);
      if (!geparsed.success) return { ok: false, error: "Controleer je invoer: sommige velden zijn niet goed ingevuld." };
      if (vind(bron.huidig(), productId) < 0) return { ok: false, error: "Onderdeel niet gevonden." };
      bron.wijzig((d) => ({
        ...d,
        calculator: {
          ...d.calculator,
          werkzaamheden: d.calculator.werkzaamheden.map((w) => (w.id === productId ? { ...w, draft: geparsed.data as WerkzaamheidDraft & typeof w.draft } : w)),
        },
      }));
      const ids: Record<string, string> = {};
      for (const r of wd.materialen) ids[r.sleutel] = r.id ?? r.sleutel;
      for (const e of wd.extras ?? []) ids[e.sleutel] = e.id ?? e.sleutel;
      return { ok: true, ids };
    },

    async maakWerkzaamheid(_toolId, wd, presetId) {
      const fout = valideerDraft(wd);
      if (fout) return { ok: false, error: fout };
      if (!wd.methode) return { ok: false, error: "Kies hoe je dit rekent." };
      const geparsed = werkzaamheidDraftSchema.safeParse(wd);
      if (!geparsed.success) return { ok: false, error: "Controleer je invoer: sommige velden zijn niet goed ingevuld." };
      const aantal = bron.huidig().calculator.werkzaamheden.length;
      if ((GRATIS_LIMIET !== null && aantal >= GRATIS_LIMIET) || aantal >= MAX_ONDERDELEN) {
        return { ok: false, error: "Je voorbeeld is vol. Maak een account om verder te gaan." };
      }
      const preset = presetId ? presetById(presetId) : undefined;
      const id = `w-${nieuweId().slice(0, 12)}`;
      bron.wijzig((d) => ({
        ...d,
        calculator: {
          ...d.calculator,
          werkzaamheden: [
            ...d.calculator.werkzaamheden,
            { id, actief: true, icoon: preset?.icoon ?? null, presetId: preset?.id ?? null, draft: geparsed.data as WerkzaamheidDraft & Draft["calculator"]["werkzaamheden"][number]["draft"] },
          ],
        },
      }));
      return { ok: true, productId: id, naam: geparsed.data.naam };
    },

    async zetActief(productId, actief) {
      if (vind(bron.huidig(), productId) < 0) return { ok: false };
      bron.wijzig((d) => ({ ...d, calculator: { ...d.calculator, werkzaamheden: d.calculator.werkzaamheden.map((w) => (w.id === productId ? { ...w, actief } : w)) } }));
      return { ok: true };
    },

    async verwijderWerkzaamheid(productId) {
      if (vind(bron.huidig(), productId) < 0) return { ok: false };
      bron.wijzig((d) => ({ ...d, calculator: { ...d.calculator, werkzaamheden: d.calculator.werkzaamheden.filter((w) => w.id !== productId) } }));
      return { ok: true };
    },

    async zetVolgorde(_toolId, ids) {
      bron.wijzig((d) => {
        const perId = new Map(d.calculator.werkzaamheden.map((w) => [w.id, w]));
        const gesorteerd = ids.map((id) => perId.get(id)).filter((w): w is NonNullable<typeof w> => Boolean(w));
        const rest = d.calculator.werkzaamheden.filter((w) => !ids.includes(w.id));
        return { ...d, calculator: { ...d.calculator, werkzaamheden: [...gesorteerd, ...rest] } };
      });
      return { ok: true };
    },

    async hernoemRekentool(_toolId, naam) {
      const schoon = schoonTekst(naam).slice(0, 80);
      if (!schoon) return { ok: false, error: "Geef je rekentool een naam." };
      bron.wijzig((d) => ({ ...d, calculator: { ...d.calculator, name: schoon } }));
      return { ok: true };
    },

    async slaTarievenOp(_toolId, invoer) {
      const tarief = parseGetal(invoer.tarief, NaN);
      const voorrij = parseGetal(invoer.voorrij, NaN);
      const transport = parseGetal(invoer.transport, NaN);
      if ([tarief, voorrij, transport].some((n) => Number.isNaN(n) || n < 0 || n > 10_000)) {
        return { ok: false, error: "Vul bij elk veld een bedrag in (0 mag ook)." };
      }
      bron.wijzig((d) => ({ ...d, tarieven: { tarief, voorrijkosten: voorrij, transport } }));
      return {
        ok: true,
        tarieven: {
          arbeidStapEenheid: "DAGDEEL",
          arbeidTariefUur: Math.round((tarief / 4) * 100) / 100,
          arbeidTariefDagdeel: tarief,
          arbeidTariefDag: tarief * 2,
          voorrijTarief: voorrij,
          transportTarief: transport,
        },
      };
    },

    laadProducten: () => draftNaarProducten(bron.huidig()),
  };
}
