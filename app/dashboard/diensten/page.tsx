import type { Metadata } from "next";
import { Plus, Pencil, Wrench } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { formatCurrency } from "@/app/lib/format";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ActiveToggle } from "@/app/components/dashboard/active-toggle";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import {
  deleteServiceAction,
  toggleServiceActiveAction,
} from "@/app/lib/actions/services";

export const metadata: Metadata = { title: "Diensten" };

export default async function DienstenPage() {
  const user = await requireUser();

  const services = await prisma.service.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    include: { category: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Diensten</h1>
          <p className="mt-1 text-muted-foreground">
            Werkzaamheden die je aanbiedt, met arbeidsuren en materiaalkosten per eenheid.
          </p>
        </div>
        <LinkButton href="/dashboard/diensten/nieuw">
          <Plus className="h-4 w-4" />
          Nieuwe dienst
        </LinkButton>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wrench className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">Nog geen diensten</p>
              <p className="text-sm text-muted-foreground">
                Voeg je eerste dienst toe om te verschijnen in het klantenportaal.
              </p>
            </div>
            <LinkButton href="/dashboard/diensten/nieuw" variant="secondary">
              <Plus className="h-4 w-4" />
              Nieuwe dienst
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Dienst</th>
                  <th className="px-4 py-3 font-medium">Categorie</th>
                  <th className="px-4 py-3 font-medium">Arbeid</th>
                  <th className="px-4 py-3 font-medium">Materiaal</th>
                  <th className="px-4 py-3 font-medium">Actief</th>
                  <th className="px-4 py-3 font-medium text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{service.naam}</p>
                      <p className="text-xs text-muted-foreground">/ {service.eenheid}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {service.category ? (
                        <Badge variant="muted">{service.category.naam}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {service.arbeidsuren} uur
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCurrency(service.materiaalkosten)}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveToggle
                        action={toggleServiceActiveAction}
                        id={service.id}
                        idField="serviceId"
                        actief={service.actief}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <LinkButton
                          href={`/dashboard/diensten/${service.id}/bewerken`}
                          variant="ghost"
                          size="icon"
                          aria-label="Bewerken"
                        >
                          <Pencil className="h-4 w-4" />
                        </LinkButton>
                        <DeleteButton
                          action={deleteServiceAction}
                          id={service.id}
                          idField="serviceId"
                          confirmMessage="Weet je zeker dat je deze dienst wilt verwijderen?"
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
