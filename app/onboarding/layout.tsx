import { adminFontClasses } from "@/app/lib/admin-fonts";
import { requireVolledigAccount } from "@/app/lib/dal";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Gasten (probeer-flow) hebben geen onboarding: die werken in /probeer/editor.
  await requireVolledigAccount();
  return (
    <div data-admin-theme className={`min-h-screen bg-background text-foreground ${adminFontClasses}`}>
      {children}
    </div>
  );
}
