"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

export function PhotoInput({
  currentUrl,
  name = "foto",
  label = "Foto",
  optioneel = true,
  thumbnailClassName,
  accept = "image/jpeg,image/png,image/webp,image/gif",
}: {
  currentUrl?: string | null;
  name?: string;
  label?: string;
  optioneel?: boolean;
  thumbnailClassName?: string;
  accept?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [markedForRemoval, setMarkedForRemoval] = useState(false);

  const thumbnailUrl = preview ?? (markedForRemoval ? null : currentUrl ?? null);
  const verwijderName = `verwijder${name.charAt(0).toUpperCase()}${name.slice(1)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
        <img
          src={thumbnailUrl}
          alt=""
          className={
            thumbnailClassName ??
            "h-11 w-11 shrink-0 rounded-md border border-border object-cover"
          }
        />
      ) : (
        <span
          className={
            thumbnailClassName ??
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground"
          }
        >
          <ImageIcon className="h-4 w-4" />
        </span>
      )}
      <label className="flex h-11 cursor-pointer items-center rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors hover:bg-secondary">
        {label} {currentUrl ? "wijzigen" : "toevoegen"} {optioneel && "(optioneel)"}
        <input
          type="file"
          name={name}
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setMarkedForRemoval(false);
            setPreview(URL.createObjectURL(file));
          }}
        />
      </label>
      {currentUrl && !preview && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name={verwijderName}
            checked={markedForRemoval}
            onChange={(e) => setMarkedForRemoval(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-destructive"
          />
          Verwijderen
        </label>
      )}
    </div>
  );
}
