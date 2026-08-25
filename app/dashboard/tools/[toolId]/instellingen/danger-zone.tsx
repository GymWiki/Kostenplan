"use client";

import { duplicateToolAction, softDeleteToolAction } from "@/app/lib/actions/tools";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import { DuplicateButton } from "@/app/components/dashboard/duplicate-button";

export function DangerZone({
  toolId,
  toolNaam,
  magNieuweTool,
}: {
  toolId: string;
  toolNaam: string;
  magNieuweTool: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Dupliceren</CardTitle>
          <CardDescription>
            Maakt een kopie van deze tool (producten, prijzen, huisstijl en instellingen) als nieuw
            concept. Leads, aanvragen en de publicatiestatus worden niet meegekopieerd.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DuplicateButton action={duplicateToolAction} toolId={toolId} disabled={!magNieuweTool} variant="secondary" size="md" />
          {!magNieuweTool && (
            <p className="mt-2 text-xs text-muted-foreground">
              Je hebt de limiet van rekentools voor je huidige pakket bereikt.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Rekentool verwijderen</CardTitle>
          <CardDescription>
            De openbare link en embed werken hierna niet meer. Leads en offertes van deze tool
            blijven bewaard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteButton
            action={softDeleteToolAction}
            id={toolId}
            idField="toolId"
            confirmTitle={`"${toolNaam}" verwijderen?`}
            confirmMessage="De openbare link en embed werken hierna niet meer. Leads en offertes van deze tool blijven bewaard. Dit kan niet ongedaan worden gemaakt via het dashboard."
          />
        </CardContent>
      </Card>
    </div>
  );
}
