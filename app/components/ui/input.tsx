"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Gedeelde stijl voor alle tekstvelden (Input, DecimalInput, Select, Textarea):
// rand 1.5px in de aparte invoerrandkleur (>= 3:1 tegen de achtergrond), hoogte
// 44px en 16px tekst (onder 16px zoomt iOS Safari in), duidelijke focusring.
const veldBasis =
  "flex w-full rounded-md border-[1.5px] border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:opacity-60 aria-[invalid=true]:border-destructive";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(veldBasis, "h-11", className)}
      {...props}
    />
  );
}

// Decimal number entry (prijzen, hoeveelheden, tarieven, ...). Deliberately
// NOT <input type="number">: on a phone with a Dutch (or most non-US)
// keyboard layout, typing a decimal comma into a native number input gets
// silently dropped mid-keystroke — "2,5" becomes "25", ten times too large,
// with no error and no empty-field signal to notice something went wrong.
// type="text" + inputMode="decimal" still shows a numeric keypad on mobile
// but accepts whatever the user actually types; the comma is normalized to
// a period server-side (see app/lib/validation.ts's normalizeDecimalInput).
export function DecimalInput({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cn(veldBasis, "h-11", className)}
      {...props}
    />
  );
}

export function PasswordInput({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(veldBasis, "h-11 pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Verberg wachtwoord" : "Toon wachtwoord"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(veldBasis, "min-h-20 py-2", className)}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(veldBasis, "h-11", className)}
      {...props}
    />
  );
}
