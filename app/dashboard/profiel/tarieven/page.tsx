import type { Metadata } from "next";
import { InstellingenPagina } from "@/app/components/instellingen/instellingen-pagina";
import { laadProfiel, laadTarieven } from "@/app/lib/profiel/laad";
import { TarievenSectie } from "../tarieven-sectie";

export const metadata: Metadata = { title: "Tarieven" };

export default async function TarievenPagina() {
  const { company, tools } = await laadProfiel();
  const tarieven = await laadTarieven(company, tools[0]?.id);
  return (
    <InstellingenPagina titel="Tarieven">
      <p className="text-sm text-muted-foreground">Eén keer instellen, geldt voor al je rekentools.</p>
      <TarievenSectie start={tarieven} />
    </InstellingenPagina>
  );
}
