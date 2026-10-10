import { adminFontClasses } from "@/app/lib/admin-fonts";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-admin-theme className={`min-h-dvh bg-background text-foreground ${adminFontClasses}`}>
      {children}
    </div>
  );
}
