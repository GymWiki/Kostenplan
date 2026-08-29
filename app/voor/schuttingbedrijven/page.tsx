import type { Metadata } from "next";
import { DoelgroepLanding } from "@/app/components/marketing/doelgroep-landing";
import { getDoelgroep } from "@/app/lib/doelgroepen";

const doelgroep = getDoelgroep("schuttingbedrijven")!;

export const metadata: Metadata = {
  title: { absolute: `${doelgroep.title} | Kostenplan` },
  description: doelgroep.description,
  alternates: { canonical: "/voor/schuttingbedrijven" },
  openGraph: {
    title: `${doelgroep.title} | Kostenplan`,
    description: doelgroep.description,
    url: "/voor/schuttingbedrijven",
    siteName: "Kostenplan",
    locale: "nl_NL",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${doelgroep.title} | Kostenplan`,
    description: doelgroep.description,
    images: ["/opengraph-image"],
  },
};

export default function SchuttingbedrijvenPage() {
  return <DoelgroepLanding doelgroep={doelgroep} />;
}
