"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { TurnstileVeld } from "@/app/components/auth/turnstile-veld";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  gooiVoorbeeldWegAction,
  inloggenMetGoogleVoorOvernameAction,
  inloggenVoorOvernameAction,
  koppelEmailAction,
  koppelGoogleAction,
  type KoppelState,
} from "@/app/lib/actions/gast-account";

// Account maken zonder de editor te verlaten: Google, of e-mail met een link.
// Je voorbeeld blijft precies zoals het is. Bestaat het adres of Google-account
// al, dan kies je zelf wat er met het voorbeeld gebeurt.
export function PaneelAccountMaken({ googleBestaat, googleFout, overnameMogelijk }: { googleBestaat: boolean; googleFout: boolean; overnameMogelijk: boolean }) {
  const [emailState, emailAction, emailBezig] = useActionState<KoppelState, FormData>(koppelEmailAction, null);
  const [bestaandState, bestaandAction, bestaandBezig] = useActionState<KoppelState, FormData>(inloggenVoorOvernameAction, null);
  const [later, setLater] = useState(false);
  const bestaat = googleBestaat || emailState?.bestaat;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Maak een gratis account</h2>
        <p className="text-sm text-muted-foreground">Je rekentool blijft precies zoals hij nu is. Daarna zet je hem op je website.</p>
      </div>

      {googleFout && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          Doorgaan met Google lukte niet. Probeer het opnieuw of gebruik je e-mailadres.
        </p>
      )}

      {bestaat && !overnameMogelijk ? (
        <section aria-labelledby="bestaat-titel" className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <h3 id="bestaat-titel" className="font-bold text-foreground">
            Dit account bestaat al
          </h3>
          <p className="text-sm text-muted-foreground">Log in op je bestaande account. Dit voorbeeld kunnen we dan niet meenemen.</p>
          <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            Inloggen
          </Link>
        </section>
      ) : bestaat ? (
        <section aria-labelledby="bestaat-titel" className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <h3 id="bestaat-titel" className="font-bold text-foreground">
            Dit account bestaat al
          </h3>
          <p className="text-sm text-muted-foreground">Log in en voeg dit voorbeeld toe aan je account. Of gooi het voorbeeld weg.</p>
          {bestaandState?.verzonden ? (
            <p role="status" className="rounded-md bg-accent px-3 py-2 text-sm text-foreground">
              We hebben een inloglink gestuurd naar {bestaandState.email}. Open die link op dit apparaat.
            </p>
          ) : (
            <form action={bestaandAction} className="flex flex-col gap-3">
              <Field label="E-mailadres" htmlFor="bestaand-email" error={bestaandState?.error}>
                <Input id="bestaand-email" name="email" type="email" autoComplete="email" defaultValue={emailState?.email ?? ""} required />
              </Field>
              <TurnstileVeld />
              <Button type="submit" className="h-11" disabled={bestaandBezig}>
                {bestaandBezig ? "Versturen…" : "Inloggen en dit voorbeeld toevoegen"}
              </Button>
            </form>
          )}
          <form action={inloggenMetGoogleVoorOvernameAction}>
            <Button type="submit" variant="outline" className="h-11 w-full">
              Inloggen met Google en dit voorbeeld toevoegen
            </Button>
          </form>
          <form action={gooiVoorbeeldWegAction}>
            <Button type="submit" variant="ghost" className="h-11 w-full">
              Voorbeeld weggooien
            </Button>
          </form>
        </section>
      ) : (
        <>
          <form action={koppelGoogleAction}>
            <Button type="submit" size="lg" className="w-full">
              Doorgaan met Google
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <div className="h-px flex-1 bg-border" />
            of
            <div className="h-px flex-1 bg-border" />
          </div>

          {emailState?.verzonden ? (
            <p role="status" className="rounded-md bg-accent px-3 py-3 text-sm text-foreground">
              We hebben een link gestuurd naar <strong>{emailState.email}</strong>. Open die link en je gaat verder waar je was.
            </p>
          ) : (
            <form action={emailAction} className="flex flex-col gap-3">
              <input type="hidden" name="later" value={later ? "1" : "0"} />
              <Field label="Je e-mailadres" htmlFor="account-email" error={emailState?.error}>
                <Input id="account-email" name="email" type="email" autoComplete="email" placeholder="jij@jouwbedrijf.nl…" required />
              </Field>
              <Button type="submit" variant="outline" className="h-11" disabled={emailBezig}>
                {emailBezig ? "Versturen…" : later ? "Stuur mij een link" : "Stuur mij een inloglink"}
              </Button>
              {!later && (
                <button
                  type="button"
                  onClick={() => setLater(true)}
                  className="min-h-11 cursor-pointer self-start text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Stuur mij een link om later verder te gaan
                </button>
              )}
              {later && <p className="text-sm text-muted-foreground">Je maakt dan ook meteen een gratis account. Je voorbeeld staat klaar wanneer je terugkomt.</p>}
            </form>
          )}
        </>
      )}
    </div>
  );
}
