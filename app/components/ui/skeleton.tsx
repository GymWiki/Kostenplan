import { cn } from "@/app/lib/cn";

// Audit-bevinding DS-05: er bestond geen gedeeld Skeleton-primitief — elke
// plek die een laadstatus toonde (tot nu toe alleen app/dashboard/
// loading.tsx) rolde zijn eigen `animate-pulse`-div. Eén simpel component
// i.p.v. dat overal opnieuw uit te schrijven.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-secondary", className)} {...props} />;
}
