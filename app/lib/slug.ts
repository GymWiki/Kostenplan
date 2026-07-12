import { prisma } from "@/app/lib/prisma";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function generateUniqueSlug(bedrijfsnaam: string) {
  const base = slugify(bedrijfsnaam) || "hovenier";
  let slug = base;
  let suffix = 1;

  while (await prisma.user.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}
