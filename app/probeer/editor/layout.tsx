import { adminFontClasses } from "@/app/lib/admin-fonts";

// De gast ziet alleen de editor: geen hoofdmenu, geen dashboard.
export default function GastEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-admin-theme className={`min-h-dvh bg-background text-foreground ${adminFontClasses}`}>
      {children}
    </div>
  );
}
