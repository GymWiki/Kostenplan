import type { Metadata } from "next";
import { Plus, Pencil, Package } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { formatCurrency } from "@/app/lib/format";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ActiveToggle } from "@/app/components/dashboard/active-toggle";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import {
  deleteProductAction,
  toggleProductActiveAction,
} from "@/app/lib/actions/products";

export const metadata: Metadata = { title: "Producten" };

export default async function ProductenPage() {
  const user = await requireUser();

  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    include: { category: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Producten</h1>
          <p className="mt-1 text-muted-foreground">
            Materialen die klanten los kunnen toevoegen aan hun kostenraming.
          </p>
        </div>
        <LinkButton href="/dashboard/producten/nieuw">
          <Plus className="h-4 w-4" />
          Nieuw product
        </LinkButton>
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
                Voeg materialen toe die klanten kunnen selecteren in de calculator.
              </p>
            </div>
            <LinkButton href="/dashboard/producten/nieuw" variant="secondary">
              <Plus className="h-4 w-4" />
              Nieuw product
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Categorie</th>
                  <th className="px-4 py-3 font-medium">Prijs</th>
                  <th className="px-4 py-3 font-medium">Actief</th>
                  <th className="px-4 py-3 font-medium text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{product.naam}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.category ? (
                        <Badge variant="muted">{product.category.naam}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCurrency(product.prijs)} / {product.eenheid}
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
