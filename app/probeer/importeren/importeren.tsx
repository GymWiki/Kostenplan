"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { draftOpslag } from "@/app/lib/draft-opslag";
import type { Draft } from "@/app/lib/draft";
import { importDraftAction, type ImportResultaat } from "@/app/lib/actions/draft-import";

type Scherm =
  | { soort: "bezig" }
  | { soort: "keuze" }
  | { soort: "klaar"; toolId: string; afgekapt: boolean; logoOvergeslagen: boolean }
  | { soort: "fout"; tekst: string };

// Neemt het voorbeeld uit de browser over. Het voorbeeld blijft in de browser
// staan tot het account het écht heeft; pas daarna wordt het gewist. Geen
// voorbeeld (of al gewist): geen foutmelding, je gaat gewoon verder.
export function Importeren() {
  const router = useRouter();
  const [scherm, setScherm] = useState<Scherm>({ soort: "bezig" });
  const gestart = useRef(false);
  const draftRef = useRef<Draft | null>(null);

  async function draai(modus?: "toevoegen" | "weggooien") {
    const draft = draftRef.current;
    if (!draft) return router.replace("/dashboard/tools");
    setScherm({ soort: "bezig" });
    let r: ImportResultaat;
    try {
      r = await importDraftAction(draft, modus);
    } catch {
      return setScherm({ soort: "fout", tekst: "Je voorbeeld overnemen is niet gelukt. Probeer het opnieuw." });
    }
    if (r.status === "keuze") return setScherm({ soort: "keuze" });
    if (r.status === "weggegooid") {
      draftOpslag().wis();
      return router.replace("/dashboard/tools");
    }
    if (r.status === "ongeldig") return setScherm({ soort: "fout", tekst: "We konden je voorbeeld niet overnemen. Je kunt gewoon opnieuw beginnen in je account." });
    if (r.status === "limiet") return setScherm({ soort: "fout", tekst: r.error });
    draftOpslag().wis();
    if (r.afgekapt || r.logoOvergeslagen) return setScherm({ soort: "klaar", toolId: r.toolId, afgekapt: r.afgekapt, logoOvergeslagen: r.logoOvergeslagen });
    router.replace(`/dashboard/tools/${r.toolId}?paneel=website`);
  }

  useEffect(() => {
    if (gestart.current) return;
    gestart.current = true;
    draftRef.current = draftOpslag().lees().draft;
    void draai();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (scherm.soort === "bezig") {
    return (
      <p role="status" className="text-center text-base text-foreground">
        We nemen je rekentool over in je account…
      </p>
    );
  }

  if (scherm.soort === "keuze") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h1 className="text-xl font-bold text-foreground">Je hebt al een rekentool</h1>
        <p className="text-sm text-muted-foreground">Wat wil je doen met het voorbeeld dat je net maakte? Je bestaande rekentools blijven altijd zoals ze zijn.</p>
        <Button type="button" size="lg" className="w-full" onClick={() => void draai("toevoegen")}>
          Toevoegen als nieuwe rekentool
        </Button>
        <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => void draai("weggooien")}>
          Voorbeeld weggooien
        </Button>
      </div>
    );
  }

  if (scherm.soort === "klaar") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h1 className="text-xl font-bold text-foreground">Je rekentool staat in je account</h1>
        {scherm.afgekapt && <p className="text-sm text-foreground">Niet alle onderdelen pasten in het gratis pakket. De eerste zijn meegenomen.</p>}
        {scherm.logoOvergeslagen && <p className="text-sm text-foreground">Je logo kon niet worden overgenomen. Je voegt het zo weer toe bij Uiterlijk.</p>}
        <Button type="button" size="lg" className="w-full" onClick={() => router.replace(`/dashboard/tools/${scherm.toolId}?paneel=website`)}>
          Zet op je website
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h1 className="text-xl font-bold text-foreground">Dat ging niet goed</h1>
      <p role="alert" className="text-sm text-foreground">
        {scherm.tekst}
      </p>
      <Button type="button" size="lg" className="w-full" onClick={() => void draai()}>
        Opnieuw proberen
      </Button>
      <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => router.replace("/dashboard/tools")}>
        Doorgaan zonder voorbeeld
      </Button>
    </div>
  );
}
