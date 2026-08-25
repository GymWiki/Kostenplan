"use client";

import { useState, useTransition } from "react";
import { Rocket, PauseCircle, FileEdit } from "lucide-react";
import { updateToolStatusAction } from "@/app/lib/actions/tools";
import { UpgradeModal } from "@/app/components/dashboard/upgrade-modal";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import type { ToolStatus } from "@/app/generated/prisma/client";

const OPTIES: { status: ToolStatus; label: string; beschrijving: string; icon: typeof Rocket }[] = [
  { status: "GEPUBLICEERD", label: "Gepubliceerd", beschrijving: "Zichtbaar voor iedereen via de publieke link en embed.", icon: Rocket },
  { status: "GEPAUZEERD", label: "Gepauzeerd", beschrijving: "Niet zichtbaar voor klanten, maar alle data blijft bewaard.", icon: PauseCircle },
  { status: "CONCEPT", label: "Concept", beschrijving: "Nog in opbouw, nooit publiek zichtbaar geweest of niet meer.", icon: FileEdit },
];

export function PublicerenActions({
  toolId,
  huidigeStatus,
  magPubliceren,
  limiet,
}: {
  toolId: string;
  huidigeStatus: ToolStatus;
  magPubliceren: boolean;
  limiet: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ToolStatus | null>(null);

  function pasStatusToe(status: ToolStatus) {
    startTransition(() => {
      updateToolStatusAction(toolId, status);
    });
  }

  function kiesStatus(status: ToolStatus) {
    if (status === "GEPUBLICEERD" && huidigeStatus !== "GEPUBLICEERD" && !magPubliceren) {
      setUpgradeOpen(true);
      return;
    }
    // Een live tool direct offline halen raakt klanten die net de publieke
    // link of embed open hebben staan — dat verdient een bevestiging, in
    // tegenstelling tot elke andere statuswissel hier.
    if (huidigeStatus === "GEPUBLICEERD" && status !== "GEPUBLICEERD") {
      setPendingStatus(status);
      return;
    }
    pasStatusToe(status);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIES.map((optie) => {
          const actief = optie.status === huidigeStatus;
          return (
            <Card key={optie.status} className={actief ? "border-primary/50 ring-1 ring-primary/20" : undefined}>
              <CardContent className="flex flex-col gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <optie.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{optie.label}</p>
                  <p className="text-xs text-muted-foreground">{optie.beschrijving}</p>
                </div>
                <Button
                  type="button"
                  variant={actief ? "secondary" : "outline"}
                  size="sm"
                  disabled={actief || pending}
                  onClick={() => kiesStatus(optie.status)}
                >
                  {actief ? "Huidige status" : `Zet op ${optie.label.toLowerCase()}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        requiredPlan="PLUS"
        title="Limiet van rekentools bereikt"
        description={
          limiet
            ? `Je huidige pakket biedt plek voor maximaal ${limiet} actieve rekentool${limiet === 1 ? "" : "s"}. Upgrade of pauzeer een andere tool om deze te kunnen publiceren.`
            : "Upgrade je pakket om deze rekentool te kunnen publiceren."
        }
      />
      <ConfirmDialog
        open={pendingStatus != null}
        onClose={() => setPendingStatus(null)}
        onConfirm={() => {
          if (pendingStatus) pasStatusToe(pendingStatus);
          setPendingStatus(null);
        }}
        title="Rekentool offline halen?"
        description="Klanten kunnen de publieke link en embed vanaf nu niet meer gebruiken. Al je data blijft bewaard en je kunt de tool op elk moment weer publiceren."
      />
    </>
  );
}
