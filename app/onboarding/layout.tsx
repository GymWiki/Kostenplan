import { adminFontClasses } from "@/app/lib/admin-fonts";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-admin-theme className={`min-h-screen bg-background text-foreground ${adminFontClasses}`}>
      {children}
    </div>
  );
}
