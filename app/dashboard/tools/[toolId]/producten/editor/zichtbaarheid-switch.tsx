"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/app/components/ui/switch";
import { setWerkzaamheidActiefAction } from "@/app/lib/actions/werkzaamheden";

// "Op je website / Verborgen": direct opslaan, met terugdraaien als het niet lukt.
export function ZichtbaarheidSwitch({
  productId,
  naam,
  actief: start,
}: {
  productId: string;
  naam: string;
  actief: boolean;
}) {
  const [actief, setActief] = useState(start);
  const [fout, setFout] = useState(false);
  const [, startTransition] = useTransition();

  function wissel(nieuw: boolean) {
    setActief(nieuw);
    setFout(false);
    startTransition(async () => {
      const r = await setWerkzaamheidActiefAction(productId, nieuw);
      if (!r.ok) {
        setActief(!nieuw);
        setFout(true);
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-foreground">
        <Switch checked={actief} onChange={(e) => wissel(e.target.checked)} aria-label={`${naam} op je website tonen`} />
        {actief ? "Op je website" : "Verborgen"}
      </label>
      {fout && (
        <span role="alert" className="text-xs font-medium text-destructive">
          Wijzigen is niet gelukt.
        </span>
      )}
    </div>
  );
}
