import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { CategoryList } from "./category-list";

export const metadata: Metadata = { title: "Categorieën" };

export default async function CategorieenPage() {
  const user = await requireUser();

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    include: { _count: { select: { services: true, products: true } } },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Categorieën</h1>
        <p className="mt-1 text-muted-foreground">
          Groepeer je diensten en producten zodat klanten sneller vinden wat ze zoeken.
        </p>
      </div>
      <CategoryList categories={categories} />
    </div>
  );
}
