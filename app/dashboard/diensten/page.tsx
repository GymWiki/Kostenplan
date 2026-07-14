import type { Metadata } from "next";
import { Pencil, Wrench } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { formatCurrency, formatCurrencyRange } from "@/app/lib/format";
import { getProductIcon } from "@/app/lib/icons";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ActiveToggle } from "@/app/components/dashboard/active-toggle";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import { NieuwItemButton } from "@/app/components/dashboard/nieuw-item-button";
import { effectiveTier, GRATIS_CATALOGUS_LIMIET } from "@/app/lib/subscription";
import {
  deleteServiceAction,
  toggleServiceActiveAction,
} from "@/app/lib/actions/services";

export const metadata: Metadata = { title: "Diensten" };

export default async function DienstenPage() {
  const user = await requireUser();

  const [services, productCount] = await Promise.all([
    prisma.service.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    }),
    prisma.product.count({ where: { userId: user.id } }),
  ]);
  const atLimit =
    effectiveTier(user) === "GRATIS" && services.length + productCount >= GRATIS_CATALOGUS_LIMIET;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Diensten</h1>
          <p className="mt-1 text-muted-foreground">
            Werkzaamheden die draaien om arbeid: een uurtarief of een vaste projectprijs.
          </p>
        </div>
        <NieuwItemButton href="/dashboard/diensten/nieuw" label="Nieuwe dienst" atLimit={atLimit} />
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
            <NieuwItemButton
              href="/dashboard/diensten/nieuw"
              label="Nieuwe dienst"
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
                  <th className="px-4 py-3 font-medium">Dienst</th>
                  <th className="px-4 py-3 font-medium">Prijsvorm</th>
                  <th className="px-4 py-3 font-medium">Actief</th>
                  <th className="px-4 py-3 font-medium text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map((service) => {
                  const ServiceIcon = getProductIcon(service.icoon);
                  return (
                  <tr key={service.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {ServiceIcon && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ServiceIcon className="h-4 w-4" />
                          </span>
                        )}
                        <p className="font-medium text-foreground">{service.naam}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {service.prijsType === "UURTARIEF" ? (
                        service.bandbreedteType === "BANDBREEDTE" &&
                        service.geschatteUrenMin != null &&
                        service.geschatteUrenMax != null ? (
                          `${formatCurrency(service.uurtarief)}/uur × ${service.geschatteUrenMin}–${service.geschatteUrenMax} uur`
                        ) : (
                          `${formatCurrency(service.uurtarief)}/uur × ${service.geschatteUren} uur`
                        )
                      ) : service.bandbreedteType === "BANDBREEDTE" &&
                        service.vastePrijsMin != null &&
                        service.vastePrijsMax != null ? (
                        `Vaste prijs: ${formatCurrencyRange({ min: service.vastePrijsMin, max: service.vastePrijsMax })}`
                      ) : (
                        `Vaste prijs: ${formatCurrency(service.vastePrijs)}`
                      )}
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
