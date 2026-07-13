"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

export function PhotoInput({ currentUrl }: { currentUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [markedForRemoval, setMarkedForRemoval] = useState(false);

  const thumbnailUrl = preview ?? (markedForRemoval ? null : currentUrl ?? null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
        <img
          src={thumbnailUrl}
          alt=""
          className="h-11 w-11 shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
        </span>
      )}
      <label className="flex h-11 cursor-pointer items-center rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors hover:bg-secondary">
        Foto {currentUrl ? "wijzigen" : "toevoegen"} (optioneel)
        <input
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp,image/gif"
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
            name="verwijderFoto"
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
