import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstellingenPagina } from "@/app/components/instellingen/instellingen-pagina";
import { pushBeschikbaar } from "@/app/lib/push/versturen";
import { MeldingenPaneel } from "../meldingen-paneel";

export const metadata: Metadata = { title: "Meldingen" };

export default function MeldingenPagina() {
  if (!pushBeschikbaar()) notFound();
  return (
    <InstellingenPagina titel="Meldingen">
      <MeldingenPaneel />
    </InstellingenPagina>
  );
}
