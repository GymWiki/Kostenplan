import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/app/components/theme-provider";
import { ToastProvider } from "@/app/components/ui/toast";
import { getSiteUrl } from "@/app/lib/url";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Basis-URL voor het resolven van relatieve canonical/OpenGraph-URL's (zie
  // bijv. app/page.tsx's alternates.canonical: "/"). getSiteUrl() valt op
  // Vercel automatisch terug op het echte productiedomein, ook als
  // NEXT_PUBLIC_APP_URL niet gezet is — zie app/lib/url.ts.
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Kostenplan — Offertecalculator voor vakmensen",
    template: "%s · Kostenplan",
  },
  description:
    "Kostenplan helpt vakmensen een online kostencalculator te bouwen zodat klanten direct een duidelijke schatting krijgen van de kosten van hun project.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      data-scroll-behavior="smooth"
      className={`${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Audit-bevinding D-04 (WCAG 2.4.1 bypass-blocks): nergens in de
            app bestond een manier om met het toetsenbord de herhaalde
            header/nav over te slaan. Onzichtbaar totdat het via Tab
            focus krijgt; springt naar het eerste element met
            id="main-content" op elke pagina (marketing, dashboard,
            portaal). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[300] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
        >
          Direct naar de inhoud
        </a>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
