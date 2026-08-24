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
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
