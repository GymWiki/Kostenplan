import { cn } from "@/app/lib/cn";

export function Switch({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center", className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span className="absolute inset-0 rounded-full border-[1.5px] border-input bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/35" />
      <span className="absolute left-1 h-4 w-4 rounded-full bg-muted-foreground shadow-sm transition-transform peer-checked:translate-x-5 peer-checked:bg-primary-foreground" />
    </label>
  );
}
