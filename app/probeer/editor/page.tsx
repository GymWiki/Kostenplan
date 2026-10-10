import type { Metadata } from "next";
import { GastEditor } from "../gast-editor";

export const metadata: Metadata = { title: "Je rekentool uitproberen", robots: { index: false, follow: false } };

// Publiek, zonder inlog en zonder database: het voorbeeld leeft in de browser.
export default function GastEditorPage() {
  return <GastEditor />;
}
