import { cn } from "@/app/lib/cn";

// Zachte instap bij het scrollen voor onderdelen onder de vouw. Alleen CSS
// (`animation-timeline: view()`, zie landing.css): de inhoud is altijd gewoon
// zichtbaar en wordt niet verborgen tot JavaScript draait; browsers zonder
// ondersteuning en gebruikers met prefers-reduced-motion zien geen animatie.
export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  // Bewaard voor bestaande aanroepen; bij scroll-gestuurde animatie niet meer nodig.
  delay?: number;
}) {
  return <div className={cn("lp-onthul", className)}>{children}</div>;
}
