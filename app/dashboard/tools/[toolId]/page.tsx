import type { Metadata } from "next";
import { RekentoolEditor } from "./editor/rekentool-editor";
import { laadEditorProps } from "./editor/laad-editor";

export const metadata: Metadata = { title: "Rekentool bewerken" };

// De rekentool-editor: één scherm waarin de hovenier zijn rekentool ziet zoals
// de klant en elk onderdeel aanpast door erop te klikken. Vervangt de oude
// tool-navigatie (Overzicht, Calculator, Bouwer, Werkzaamheden, Prijzen,
// Uiterlijk, Resultaat, Aanvraagformulier, Publiceren, Embed, Instellingen).
export default async function RekentoolEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ paneel?: string }>;
}) {
  const { toolId } = await params;
  const { paneel } = await searchParams;
  return <RekentoolEditor {...(await laadEditorProps(toolId, paneel))} />;
}
