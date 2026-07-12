"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function DeleteButton({
  action,
  id,
  idField,
  confirmMessage,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  idField: string;
  confirmMessage: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name={idField} value={id} />
      <Button variant="ghost" size="icon" type="submit" aria-label="Verwijderen">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </form>
  );
}
