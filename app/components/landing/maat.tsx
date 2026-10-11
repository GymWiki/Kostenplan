import { cn } from "@/app/lib/cn";

// Het vaste motief van de landingspagina: de maatlijn van een werktekening, met
// pijlpunten en een maatlabel in mono. Puur decoratief (aria-hidden); de
// informatie staat altijd ook in gewone tekst. De lijn tekent zich bij het
// laden uit (CSS, zie landing.css) en staat bij reduced motion direct.

function Pijl({ naar, className }: { naar: "l" | "r" | "o" | "b"; className?: string }) {
  const d = { l: "M8 0 L0 4 L8 8", r: "M0 0 L8 4 L0 8", o: "M0 8 L4 0 L8 8", b: "M0 0 L4 8 L8 0" }[naar];
  return (
    <svg viewBox="0 0 8 8" className={cn("lp-pijl h-2 w-2 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d={d} />
    </svg>
  );
}

export function MaatH({ label, className, lijnClass }: { label?: string; className?: string; lijnClass?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex items-center gap-1.5 font-lp-maat text-[11px] leading-none text-lp-inkt-2", className)}>
      <Pijl naar="l" />
      <span className={cn("lp-teken h-px flex-1 bg-current", lijnClass)} />
      {label && <span className="shrink-0 px-1 tracking-wide">{label}</span>}
      {label && <span className={cn("lp-teken h-px flex-1 bg-current", lijnClass)} />}
      <Pijl naar="r" />
    </div>
  );
}

export function MaatV({ label, className }: { label?: string; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col items-center gap-1.5 font-lp-maat text-[11px] leading-none text-lp-inkt-2", className)}>
      <Pijl naar="o" />
      <span className="lp-teken-v w-px flex-1 bg-current" />
      {label && <span className="shrink-0 py-1 tracking-wide [writing-mode:vertical-rl]">{label}</span>}
      {label && <span className="lp-teken-v w-px flex-1 bg-current" />}
      <Pijl naar="b" />
    </div>
  );
}

// Sectielabel: een klein genummerd bolletje met de naam van het onderdeel.
export function Positie({ nr, label, className }: { nr: string; label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 text-sm font-medium text-lp-inkt-2", className)}>
      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-lp-wit px-2 font-lp-maat text-xs font-medium text-lp-bos-800 ring-1 ring-lp-lijn">{nr}</span>
      <span>{label}</span>
    </div>
  );
}
