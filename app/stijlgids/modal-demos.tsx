"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { UpgradeModal } from "@/app/components/dashboard/upgrade-modal";

// Losse client-wrapper zodat de stijlgids-pagina zelf een server component
// kan blijven — deze twee modals zijn admin-only en volledig zelfstandig
// (geen database nodig), dus prima om hier los te triggeren voor QA.
export function ModalDemos() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => setConfirmOpen(true)}>
        Open ConfirmDialog
      </Button>
      <Button variant="outline" onClick={() => setUpgradeOpen(true)}>
        Open UpgradeModal
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="Materiaal verwijderen?"
        description="Dit verwijdert de materiaaloptie definitief uit de categorie."
      />
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        requiredPlan="PLUS"
        title="Deze functie is onderdeel van Plus"
        description="Upgrade om huisstijl en leads te ontgrendelen."
      />
    </div>
  );
}
