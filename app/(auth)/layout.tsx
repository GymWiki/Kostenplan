import { lpFontClasses } from "@/app/components/landing/fonts";
import { BrandHeader } from "@/app/components/ui/brand-header";

// Inloggen, registreren en wachtwoord: dezelfde groene, zachte stijl als de
// marketingpagina's (tokens via .lp).
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-lp className={`lp ${lpFontClasses} lp-licht relative flex min-h-screen flex-col`}>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <BrandHeader href="/" />
        {children}
      </div>
    </div>
  );
}
