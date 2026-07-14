import Link from "next/link";
import { Logo } from "@/app/components/ui/logo";
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
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <Logo />
          Kostenplan
        </Link>
        {children}
      </div>
    </div>
  );
}
