"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, PartyPopper } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { Card, CardContent } from "@/app/components/ui/card";
import { markPortaalBekekenAction } from "@/app/lib/actions/onboarding";
import type { OnboardingStap } from "@/app/lib/onboarding";

export function OnboardingChecklist({
  stappen,
  justCompleted,
}: {
  stappen: OnboardingStap[];
  // True op precies de render waarin de laatste stap net is voltooid — zie
  // app/dashboard/page.tsx. Daarna blijft onboardingVoltooid in de database
  // op true staan en verschijnt dit component nooit meer.
  justCompleted: boolean;
}) {
  if (justCompleted) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-4 py-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <PartyPopper className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Goed bezig, je bent helemaal klaar!</p>
            <p className="text-sm text-muted-foreground">
              Je rekentool staat live en is klaar om klanten te ontvangen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const voltooidCount = stappen.filter((stap) => stap.voltooid).length;
  const totaal = stappen.length;
  const percentage = Math.round((voltooidCount / totaal) * 100);

  return (
    <Card className="border-primary/20">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground">Aan de slag met Kostenplan</p>
            <p className="text-sm text-muted-foreground">
              Rond deze {totaal} stappen af om je rekentool klaar te maken voor klanten.
            </p>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {voltooidCount}/{totaal} voltooid
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <ul className="flex flex-col gap-2">
          {stappen.map((stap, index) => (
            <OnboardingStapItem key={stap.key} stap={stap} nummer={index + 1} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function OnboardingStapItem({ stap, nummer }: { stap: OnboardingStap; nummer: number }) {
  const [, startTransition] = useTransition();

  const rowClassName = cn(
    "flex items-center gap-3 rounded-lg border p-3 transition-colors",
    stap.voltooid
      ? "border-transparent bg-secondary/30"
      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40"
  );

  const inhoud = (
    <>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
          stap.voltooid
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-muted-foreground"
        )}
      >
        {stap.voltooid ? <Check className="h-4 w-4" /> : nummer}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium",
            stap.voltooid ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {stap.titel}
        </p>
        <p className="text-sm text-muted-foreground">{stap.beschrijving}</p>
      </div>
      {!stap.voltooid && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  );

  if (stap.voltooid) {
    return <li className={rowClassName}>{inhoud}</li>;
  }

  if (stap.extern) {
    return (
      <li>
        <a
          href={stap.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => startTransition(() => markPortaalBekekenAction())}
          className={rowClassName}
        >
          {inhoud}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link href={stap.href} className={rowClassName}>
        {inhoud}
      </Link>
    </li>
  );
}
