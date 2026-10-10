import { cn } from "@/app/lib/cn";

// Eén blok van het bewerkscherm: icoon + titel + korte uitleg (+ optionele
// actie rechtsboven), daaronder de inhoud. `id` is het anker voor de sticky
// snelnavigatie; scroll-mt houdt ruimte vrij onder de vaste kop.
export function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: {
  id?: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-titel` : undefined}
      className={cn("scroll-mt-36 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}
    >
      <header className="mb-4 flex items-start gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 id={id ? `${id}-titel` : undefined} className="text-lg font-bold leading-tight text-foreground">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}
