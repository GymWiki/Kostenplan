import type { Metadata } from "next";
import { Pencil, Package } from "lucide-react";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { getProductIcon } from "@/app/lib/icons";
import { unitLabel } from "@/app/lib/units";
import { ActiveToggle } from "@/app/components/dashboard/active-toggle";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import { NieuwItemButton } from "@/app/components/dashboard/nieuw-item-button";
import { effectiveTier, GRATIS_CATALOGUS_LIMIET } from "@/app/lib/subscription";
import {
  deleteProductAction,
  toggleProductActiveAction,
} from "@/app/lib/actions/products";

export const metadata: Metadata = { title: "Producten" };

export default async function ProductenPage() {
  const { company } = await requireActiveCompany();

  const [products, serviceCount] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: company.id },
      orderBy: { order: "asc" },
      include: { _count: { select: { materiaalCategorieen: true, extraOpties: true } } },
    }),
    prisma.service.count({ where: { companyId: company.id } }),
  ]);
  const atLimit =
    effectiveTier(company) === "GRATIS" && products.length + serviceCount >= GRATIS_CATALOGUS_LIMIET;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Producten</h1>
          <p className="mt-1 text-muted-foreground">
            Samengestelde producten met materiaalkeuzes, bijv. een schutting met palen en
            tussenbekleding, of een vloer met tegels en voegmateriaal.
          </p>
        </div>
        <NieuwItemButton href="/dashboard/producten/nieuw" label="Nieuw product" atLimit={atLimit} />
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">Nog geen producten</p>
              <p className="text-sm text-muted-foreground">
                Voeg een product toe en richt daarna de materiaalcategorieën en extra opties in.
              </p>
            </div>
            <NieuwItemButton
              href="/dashboard/producten/nieuw"
              label="Nieuw product"
              atLimit={atLimit}
              variant="secondary"
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Materiaalcategorieën</th>
                  <th className="px-4 py-3 font-medium">Extra opties</th>
                  <th className="px-4 py-3 font-medium">Actief</th>
                  <th className="px-4 py-3 font-medium text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => {
                  const ProductIcon = getProductIcon(product.icoon);
                  return (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {ProductIcon && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ProductIcon className="h-4 w-4" />
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{product.naam}</p>
                          <p className="text-xs text-muted-foreground">
                            / {unitLabel(product.eenheid)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Badge variant="muted">
                        {product._count.materiaalCategorieen}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Badge variant="muted">{product._count.extraOpties}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ActiveToggle
                        action={toggleProductActiveAction}
                        id={product.id}
                        idField="productId"
                        actief={product.actief}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <LinkButton
                          href={`/dashboard/producten/${product.id}/bewerken`}
                          variant="ghost"
                          size="icon"
                          aria-label="Bewerken"
                        >
                          <Pencil className="h-4 w-4" />
                        </LinkButton>
                        <DeleteButton
                          action={deleteProductAction}
                          id={product.id}
                          idField="productId"
                          confirmMessage="Weet je zeker dat je dit product wilt verwijderen?"
                        />
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
