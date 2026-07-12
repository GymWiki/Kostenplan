"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable; ignore silently
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleCopy}
      className="shrink-0"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Gekopieerd
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Kopieer link
        </>
      )}
    </Button>
  );
}
