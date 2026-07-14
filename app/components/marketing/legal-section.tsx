export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
      <div className="mt-3 flex flex-col gap-4 text-base leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}
