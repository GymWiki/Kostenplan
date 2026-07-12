import { cn } from "@/app/lib/cn";

type Variant = "default" | "success" | "warning" | "outline" | "muted";

const variantClasses: Record<Variant, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-accent text-accent-foreground border-accent",
  warning: "bg-warning/10 text-warning border-warning/20",
  outline: "bg-transparent text-foreground border-border",
  muted: "bg-muted text-muted-foreground border-transparent",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
