import { prisma } from "@/app/lib/prisma";

// Een query-client: de globale `prisma` of de `tx` van een lopende transactie.
// Binnen `prisma.$transaction` moet altijd `tx` worden doorgegeven: de pool heeft
// maar één verbinding, dus een query via de globale client wacht tot de
// transactie-timeout (P2028).
type SlugDb = {
  company: { findUnique: (a: { where: { slug: string } }) => PromiseLike<unknown> };
  tool: { findUnique: (a: { where: { companyId_slug: { companyId: string; slug: string } } }) => PromiseLike<unknown> };
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function generateUniqueSlug(bedrijfsnaam: string, db: SlugDb = prisma) {
  const base = slugify(bedrijfsnaam) || "vakman";
  let slug = base;
  let suffix = 1;

  while (await db.company.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

// Toolslugs zijn uniek per bedrijf, niet globaal (zie Levering A) — de
// publieke URL is /t/[bedrijfsslug]/[toolslug], dus alleen de combinatie
// hoeft uniek te zijn.
export async function generateUniqueToolSlug(companyId: string, naam: string, db: SlugDb = prisma) {
  const base = slugify(naam) || "rekentool";
  let slug = base;
  let suffix = 1;

  while (await db.tool.findUnique({ where: { companyId_slug: { companyId, slug } } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}
