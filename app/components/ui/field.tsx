import { cn } from "@/app/lib/cn";

// Eén manier om een formulierveld te tonen: label ALTIJD boven het veld (nooit
// een placeholder als label), optionele helptekst eronder, en een foutmelding
// die de helptekst vervangt. `htmlFor` moet naar het id van het invoerveld
// wijzen; bij een groep velden (keuzeknoppen) gebruik je `as="fieldset"`.
export function Field({
  label,
  htmlFor,
  hint,
  error,
  as = "div",
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  as?: "div" | "fieldset";
  className?: string;
  children: React.ReactNode;
}) {
  const Wrapper = as;
  const foutId = htmlFor ? `${htmlFor}-fout` : undefined;
  return (
    <Wrapper className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {as === "fieldset" ? (
        <legend className="mb-1.5 text-sm font-semibold text-foreground">{label}</legend>
      ) : (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={foutId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </Wrapper>
  );
}
