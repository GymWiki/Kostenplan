import { BrandHeader } from "@/app/components/ui/brand-header";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <BrandHeader href="/" />
        {children}
      </div>
    </div>
  );
}
