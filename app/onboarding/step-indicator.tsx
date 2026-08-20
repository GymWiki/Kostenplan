// "Stap X van Y" boven de onboarding-schermen (bedrijf, rekentool, huisstijl)
// — een eerste-keer-gebruiker had voorheen geen enkel signaal hoeveel stappen
// er nog kwamen. Vaste stappen (geen dynamische lijst nodig), dus geen aparte
// prop voor het aantal stappen per se — wel meegegeven zodat de tekst niet op
// meerdere plekken los hardcoded staat.
export function OnboardingStepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-8 rounded-full ${i < step ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        Stap {step} van {total}
      </p>
    </div>
  );
}
