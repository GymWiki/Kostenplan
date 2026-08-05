"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";

export function DeleteButton({
  action,
  id,
  idField,
  confirmMessage,
  confirmTitle = "Weet je het zeker?",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  idField: string;
  confirmMessage: string;
  confirmTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const formData = new FormData();
    formData.set(idField, id);
    startTransition(async () => {
      await action(formData);
      setOpen(false);
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
