"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useToast } from "@/app/components/ui/toast";

// Zelfde client-wrapper-patroon als delete-button.tsx: een losse
// server-actie-form gaf voorheen geen enkele feedback tijdens het dupliceren
// (dat kopieert producten/branding/etc. en kan even duren) — hier zit de
// knop in een useTransition zodat hij tijdens de aanroep disabled is
// (voorkomt een dubbele indiening) en de gebruiker na afloop een toast ziet.
export function DuplicateButton({
  action,
  toolId,
  disabled,
  variant = "ghost",
  size = "sm",
}: {
  action: (formData: FormData) => Promise<void>;
  toolId: string;
  disabled?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleClick() {
    const formData = new FormData();
    formData.set("toolId", toolId);
    startTransition(async () => {
      await action(formData);
      toast("Rekentool gedupliceerd", "success");
    });
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={disabled || pending} onClick={handleClick}>
      <Copy className="h-3.5 w-3.5" />
      {pending ? "Bezig…" : "Dupliceren"}
    </Button>
  );
}
