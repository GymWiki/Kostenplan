import type { Metadata } from "next";
import { MarketingShell } from "@/app/components/landing/marketing-shell";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { SectiePrijzen } from "@/app/components/landing/sectie-prijzen";

export const metadata: Metadata = {
  title: "Prijzen voor Hoveniers",
  description:
    "Bekijk de prijzen van Kostenplan: gratis starten met tot 10 onderdelen, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",
  alternates: { canonical: "/prijzen" },
  openGraph: {
    title: "Prijzen voor Hoveniers · Kostenplan",
    description:
      "Gratis starten met tot 10 onderdelen, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",
    url: "/prijzen",
    siteName: "Kostenplan",
    locale: "nl_NL",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prijzen voor Hoveniers · Kostenplan",
    description:
      "Gratis starten met tot 10 onderdelen, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",
    images: ["/opengraph-image"],
  },
};

export default function PrijzenPage() {
  return (
    <MarketingShell>
      <Breadcrumbs items={[{ label: "Prijzen", href: "/prijzen" }]} />
      <main id="main-content" className="flex-1">
        <SectiePrijzen hoofdkop />
      </main>
    </MarketingShell>
  );
}
