import type { Metadata } from "next";
import Link from "next/link";
import { ArticleShell } from "@/app/components/marketing/article-shell";
import { getKennisbankArtikel } from "@/app/lib/kennisbank";

const artikel = getKennisbankArtikel("rekentool-op-eigen-website-zetten")!;

export const metadata: Metadata = {
  title: artikel.titel,
  description: artikel.samenvatting,
  alternates: { canonical: `/kennisbank/${artikel.slug}` },
  openGraph: {
    title: `${artikel.titel} · Kostenplan`,
    description: artikel.samenvatting,
    url: `/kennisbank/${artikel.slug}`,
    siteName: "Kostenplan",
    locale: "nl_NL",
    type: "article",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${artikel.titel} · Kostenplan`,
    description: artikel.samenvatting,
    images: ["/opengraph-image"],
  },
};

export default function Artikel() {
  return (
    <ArticleShell artikel={artikel}>
      <p>
        Een rekentool op je eigen website plaatsen bestaat uit twee losse stappen die vaak door
        elkaar worden gehaald: eerst bouw je de rekentool zelf (de vragen, prijzen en logica),
        en pas daarna bepaal je hoe bezoekers hem te zien krijgen. Dit artikel loopt beide
        stappen concreet door.
      </p>

      <h2>Stap 1: bouw de rekentool</h2>
      <p>
        Voordat er iets te plaatsen valt, moet de rekentool zelf bestaan. Dat begint met je
        tarieven — uurtarief, voorrijkosten, materiaalmarge — die je eenmalig instelt. Daarna
        bepaal je welke vragen een klant krijgt en welke prijsregel bij elk antwoord hoort. Voor
        veelvoorkomend werk (bijvoorbeeld bestrating of schilderwerk) kun je starten vanuit een
        kant-en-klaar onderdeel en dat aanpassen aan jouw eigen prijzen; voor iets unieks bouw je
        zelf een onderdeel met eigen vragen op.
      </p>

      <h2>Stap 2: kies hoe je hem deelt</h2>
      <p>
        Elke rekentool krijgt automatisch een eigen, directe link. Die link werkt op zichzelf al
        als volwaardige pagina — je kunt hem meteen delen via e-mail, social media of een
        Google Bedrijfsprofiel, zonder verdere technische stappen.
      </p>
      <p>
        Wil je de rekentool in plaats daarvan middenin een pagina van je eigen website tonen, dan
        gebruik je de embedcode: een kant-en-klaar stukje HTML dat je in een HTML- of embed-blok
        van je website-bouwer plakt. Dat werkt hetzelfde als het insluiten van bijvoorbeeld een
        video, en is beschikbaar op elk platform dat aangepaste HTML toestaat, waaronder
        WordPress, Wix en zelfgebouwde websites.
      </p>

      <h2>Wat te doen als je geen toegang hebt tot de website-code</h2>
      <p>
        Niet iedereen beheert zelf de website-bouwer. In dat geval zijn er twee praktische
        routes: geef de embedcode door aan wie de website wel beheert (webbouwer of collega), of
        gebruik voorlopig alleen de directe link — bijvoorbeeld als knop in het menu of onder een
        contactpagina — totdat er tijd is om de code te laten plaatsen.
      </p>

      <h2>Testen voordat je live gaat</h2>
      <p>
        Controleer na het plaatsen altijd de rekentool op zowel een computer als een telefoon.
        Let daarbij op of de volledige vragenlijst zichtbaar is, of de hoogte van het ingesloten
        blok automatisch meeschaalt, en of de uiteindelijke prijsindicatie overeenkomt met wat je
        zelf zou verwachten voor een paar test-invoerwaarden.
      </p>

      <p>
        Meer weten over de technische kant van embedden?{" "}
        <Link href="/rekentool-op-eigen-website">
          Lees de volledige uitleg over een rekentool op je eigen website
        </Link>
        , of ga direct naar{" "}
        <Link href="/registreren">het bouwen van je eigen rekentool</Link>.
      </p>
    </ArticleShell>
  );
}
