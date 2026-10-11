import { lpFontClasses } from "@/app/components/landing/fonts";
import { LpHeader } from "@/app/components/landing/lp-header";
import { LpFooter } from "@/app/components/landing/lp-footer";

// Gemeenschappelijke schil voor alle publieke marketingpagina's: dezelfde
// groene, zachte stijl als de landingspagina (tokens in app/globals.css en
// landing.css), met de hoofdnavigatie van de site en de landingsfooter. De
// bestaande paginacomponenten (bg-background, text-foreground, border-border, …)
// nemen binnen .lp vanzelf de nieuwe kleuren over.
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-lp className={`lp ${lpFontClasses} flex min-h-screen flex-col`}>
      <LpHeader variant="site" />
      {children}
      <LpFooter />
    </div>
  );
}
