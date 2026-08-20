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
  const base = slugify(bedrijfsnaam) || "vakman";
  let slug = base;
  let suffix = 1;

  while (await prisma.company.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

// Toolslugs zijn uniek per bedrijf, niet globaal (zie Levering A) — de
// publieke URL is /t/[bedrijfsslug]/[toolslug], dus alleen de combinatie
// hoeft uniek te zijn.
export async function generateUniqueToolSlug(companyId: string, naam: string) {
  const base = slugify(naam) || "rekentool";
  let slug = base;
  let suffix = 1;

  while (await prisma.tool.findUnique({ where: { companyId_slug: { companyId, slug } } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}
