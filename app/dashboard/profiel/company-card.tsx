"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input, Label } from "@/app/components/ui/input";
import {
  cancelSubscriptionAction,
  deleteCompanyAction,
  switchActiveCompanyAction,
  updateCompanyDetailsAction,
  type CompanyFormState,
} from "@/app/lib/actions/companies";
import { effectiveTier, PLAN_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/app/lib/subscription";
import type { Company } from "@/app/generated/prisma/client";

const LOPEND_STATUSSEN = ["ACTIVE", "PENDING", "SUSPENDED"];

export function CompanyCard({
  company,
  isActive,
  isLastCompany,
}: {
  company: Company;
  isActive: boolean;
  isLastCompany: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const plan = effectiveTier(company);
  const isOverridden = company.overrideTier !== null;
  const heeftLopendAbonnement = LOPEND_STATUSSEN.includes(company.subscriptionStatus);
  // Ook opzegbaar bij PENDING/SUSPENDED (betaling loopt nog of is mislukt),
  // niet alleen bij ACTIVE — anders zit een gebruiker met een mislukte
  // betaling vast zonder enige manier om het abonnement te stoppen.
  const magOpzeggen = !isOverridden && heeftLopendAbonnement;
  const huidigePeriodeEindLabel = company.huidigePeriodeEind
    ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(
        company.huidigePeriodeEind
      )
    : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{company.naam}</p>
              {isActive && <Badge variant="default">Actief bedrijf</Badge>}
            </div>
            {company.kvkNummer && (
              <p className="text-xs text-muted-foreground">KvK {company.kvkNummer}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="muted">{PLAN_LABELS[plan]}</Badge>
            {!isOverridden && company.subscriptionTier !== "GRATIS" && (
              <Badge variant={company.subscriptionStatus === "ACTIVE" ? "success" : "warning"}>
                {SUBSCRIPTION_STATUS_LABELS[company.subscriptionStatus]}
              </Badge>
            )}
          </div>
        </div>

        {!isOverridden && company.subscriptionStatus === "ACTIVE" && huidigePeriodeEindLabel && (
          <p className="text-xs text-muted-foreground">
            Volgende betaling rond {huidigePeriodeEindLabel}.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!isActive && (
            <form action={switchActiveCompanyAction}>
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="redirectTo" value="dashboard" />
              <Button type="submit" variant="outline" size="sm">
                Openen
              </Button>
            </form>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            Bewerken
          </Button>
          <form action={switchActiveCompanyAction}>
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="redirectTo" value="branding" />
            <Button type="submit" variant="ghost" size="sm">
              Huisstijl &amp; logo
            </Button>
          </form>
          <form action={switchActiveCompanyAction}>
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="redirectTo" value="abonnement" />
            <Button type="submit" variant="outline" size="sm">
              Upgraden / downgraden
            </Button>
          </form>
          {magOpzeggen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelling((v) => !v)}
            >
              Abonnement opzeggen
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleting((v) => !v)}
            disabled={heeftLopendAbonnement || isLastCompany}
          >
            Bedrijf verwijderen
          </Button>
        </div>
        {(heeftLopendAbonnement || isLastCompany) && (
          <p className="text-xs text-muted-foreground">
            {isLastCompany
              ? "Je enige bedrijf kan niet worden verwijderd."
              : "Zeg eerst het abonnement op voordat je dit bedrijf kunt verwijderen."}
          </p>
        )}

        {editing && <EditForm company={company} onDone={() => setEditing(false)} />}
        {cancelling && magOpzeggen && (
          <CancelForm companyId={company.id} onCancel={() => setCancelling(false)} />
        )}
        {deleting && <DeleteForm company={company} />}
      </CardContent>
    </Card>
  );
}

function EditForm({ company, onDone }: { company: Company; onDone: () => void }) {
  const action = updateCompanyDetailsAction.bind(null, company.id);
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(action, null);

  // state start op null; wordt na een succesvolle save { error: undefined }
  // (geen fieldErrors) — sluit het formulier dan automatisch.
  useEffect(() => {
    if (state && !state.error && !state.fieldErrors) {
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`naam-${company.id}`}>Bedrijfsnaam</Label>
        <Input id={`naam-${company.id}`} name="naam" defaultValue={company.naam} required />
        {state?.fieldErrors?.naam && (
          <p className="text-sm text-destructive">{state.fieldErrors.naam}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`kvk-${company.id}`}>KvK-nummer (optioneel)</Label>
        <Input id={`kvk-${company.id}`} name="kvkNummer" defaultValue={company.kvkNummer ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`adres-${company.id}`}>Adres (optioneel)</Label>
        <Input id={`adres-${company.id}`} name="adres" defaultValue={company.adres ?? ""} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}

function CancelForm({ companyId, onCancel }: { companyId: string; onCancel: () => void }) {
  const action = cancelSubscriptionAction.bind(null, companyId);
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(action, null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm"
    >
      <p className="text-foreground">
        Weet je zeker dat je wilt opzeggen? Het betaalde pakket wordt direct beëindigd en dit
        bedrijf valt terug op Gratis.
      </p>
      {state?.error && <p className="text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Nee, terug
        </Button>
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>
          {pending ? "Bezig…" : "Ja, opzeggen"}
        </Button>
      </div>
    </form>
  );
}

function DeleteForm({ company }: { company: Company }) {
  const action = deleteCompanyAction.bind(null, company.id);
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(action, null);
  const [typed, setTyped] = useState("");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
    >
      <p className="text-foreground">
        Dit verwijdert <strong>{company.naam}</strong> definitief, inclusief alle producten,
        diensten, leads en instellingen. Dit kan niet ongedaan worden gemaakt.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`bevestig-${company.id}`}>
          Typ &ldquo;{company.naam}&rdquo; ter bevestiging
        </Label>
        <Input
          id={`bevestig-${company.id}`}
          name="bevestigingsNaam"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
      </div>
      {state?.error && <p className="text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={typed !== company.naam || pending}
        >
          {pending ? "Bezig…" : "Definitief verwijderen"}
        </Button>
      </div>
    </form>
  );
}
