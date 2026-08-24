"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { useToast } from "@/app/components/ui/toast";

export function DeleteButton({
  action,
  id,
  idField,
  confirmMessage,
  confirmTitle = "Weet je het zeker?",
  toastMessage = "Verwijderd",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  idField: string;
  confirmMessage: string;
  confirmTitle?: string;
  // Sommige delete-acties navigeren na afloop weg (bijv. terug naar een
  // lijstpagina) via een server-side redirect() — in dat geval bereikt de
  // toast-aanroep hieronder nooit de client (de navigatie start eerder).
  // Geen probleem: op de plekken zonder redirect (de meerderheid) verschijnt
  // de toast gewoon.
  toastMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleConfirm() {
    const formData = new FormData();
    formData.set(idField, id);
    startTransition(async () => {
      await action(formData);
      setOpen(false);
      toast(toastMessage, "success");
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label="Verwijderen"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        pending={pending}
        title={confirmTitle}
        description={confirmMessage}
      />
    </>
  );
}
