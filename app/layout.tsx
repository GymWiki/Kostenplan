import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/app/components/theme-provider";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Basis-URL voor het resolven van relatieve canonical/OpenGraph-URL's (zie
  // bijv. app/page.tsx's alternates.canonical: "/"). Zet NEXT_PUBLIC_APP_URL
  // in Vercel op de echte productie-URL zodra die bekend is.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Kostenplan — Kostencalculator voor hoveniers",
    template: "%s · Kostenplan",
  },
  description:
    "Kostenplan helpt hoveniers een online kostencalculator te bouwen zodat klanten direct een duidelijke schatting krijgen van de aanlegkosten van hun tuin.",
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
