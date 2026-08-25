import { cn } from "@/app/lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Twee lagen i.p.v. Tailwinds platte shadow-sm: een scherpe 1px
        // contactschaduw houdt de rand strak, een brede/zachte tweede laag
        // geeft de kaart optisch gewicht zonder zwaar te ogen. In dark mode
        // valt een zwarte shadow tegen een al donkere achtergrond nauwelijks
        // op — daar draagt de border het contrast, hier puur een subtiele
        // toevoeging.
        "rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-16px_rgba(15,23,42,0.18)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props} />
  );
}

export function CardTitle({
  as: Component = "h3",
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" }) {
  return (
    <Component
      className={cn("text-base font-semibold leading-none", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
