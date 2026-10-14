"use client";

import { createContext, useContext } from "react";
import { kopieerWerkzaamheidAction, hernoemRekentoolAction, slaWeergaveOpAction, zetWerkzaamhedenVolgordeAction, type Resultaat } from "@/app/lib/actions/rekentools";
import type { WeergaveConfig } from "@/app/lib/weergave/config";
import {
  createWerkzaamheidAction,
  deleteWerkzaamheidAction,
  saveTarievenAction,
  saveWerkzaamheidAction,
  setWerkzaamheidActiefAction,
  type AanmaakResultaat,
  type OpslaanResultaat,
  type TarievenResultaat,
} from "@/app/lib/actions/werkzaamheden";
import type { ProductMetRelaties, WerkzaamheidDraft } from "@/app/lib/werkzaamheid";

// Waar de editor zijn gegevens leest en schrijft. Eén editor, twee opslagplaatsen:
// ServerRepository (ingelogd: de database via server actions, zoals altijd) en
// LocalDraftRepository (gast: alleen in de browser, zie app/probeer). De editor
// zelf weet niet welke van de twee hij gebruikt.
export interface EditorRepository {
  // Gast: alles blijft in de browser; delen die iets versturen of publiek tonen zijn vergrendeld.
  readonly gast: boolean;
  slaWerkzaamheidOp(productId: string, draft: WerkzaamheidDraft): Promise<OpslaanResultaat>;
  maakWerkzaamheid(toolId: string, draft: WerkzaamheidDraft, presetId: string | null): Promise<AanmaakResultaat>;
  zetActief(productId: string, actief: boolean): Promise<{ ok: boolean }>;
  verwijderWerkzaamheid(productId: string): Promise<{ ok: boolean }>;
  zetVolgorde(toolId: string, ids: string[]): Promise<Resultaat>;
  hernoemRekentool(toolId: string, naam: string): Promise<Resultaat>;
  // Weergave en plaatsing van de klant-rekentool.
  slaWeergaveOp(toolId: string, config: WeergaveConfig): Promise<Resultaat>;
  slaTarievenOp(toolId: string, invoer: { tarief: string; voorrij: string; transport: string }): Promise<TarievenResultaat>;
  // Alleen server: kopiëren uit een andere rekentool.
  kopieerWerkzaamheid?(bronProductId: string, doelToolId: string): Promise<{ ok: true; productId: string } | { ok: false; error: string }>;
  // Alleen lokaal: de actuele onderdelen opnieuw opbouwen na een wijziging.
  laadProducten?(): ProductMetRelaties[];
}

export const serverRepository: EditorRepository = {
  gast: false,
  slaWerkzaamheidOp: (id, draft) => saveWerkzaamheidAction(id, draft),
  maakWerkzaamheid: (toolId, draft, presetId) => createWerkzaamheidAction(toolId, draft, presetId),
  zetActief: (id, actief) => setWerkzaamheidActiefAction(id, actief),
  verwijderWerkzaamheid: (id) => deleteWerkzaamheidAction(id),
  zetVolgorde: (toolId, ids) => zetWerkzaamhedenVolgordeAction(toolId, ids),
  hernoemRekentool: (toolId, naam) => hernoemRekentoolAction(toolId, naam),
  slaWeergaveOp: (toolId, config) => slaWeergaveOpAction(toolId, config),
  slaTarievenOp: (toolId, invoer) => saveTarievenAction(toolId, invoer),
  kopieerWerkzaamheid: (bron, doel) => kopieerWerkzaamheidAction(bron, doel),
};

const RepositoryContext = createContext<EditorRepository>(serverRepository);

export const RepositoryProvider = RepositoryContext.Provider;
export const useEditorRepository = () => useContext(RepositoryContext);
