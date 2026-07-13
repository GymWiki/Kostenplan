import "server-only";

import { createClient } from "@/app/lib/supabase/server";

// Must exist in Supabase Storage as a public bucket before this works — see
// README.md "Foto's voor materialen en extra opties" for the exact setup
// steps (bucket + RLS policies), which can't be scripted from here.
const BUCKET = "product-fotos";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadFoto(
  userId: string,
  file: File
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  const ext = EXTENSION_BY_TYPE[file.type];
  if (!ext) {
    return { error: "Alleen JPG, PNG, WEBP of GIF-afbeeldingen zijn toegestaan." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Afbeelding is te groot (max 5MB)." };
  }

  const supabase = await createClient();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return { error: "Uploaden is mislukt. Probeer het opnieuw." };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

// Best-effort cleanup when a photo is replaced or removed — failures here
// shouldn't block the surrounding save, they just leave an orphaned file.
export async function deleteFoto(url: string) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);

  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
