import type { Metadata } from "next";
import Link from "next/link";
import { ArticleShell } from "@/app/components/marketing/article-shell";
import { getKennisbankArtikel } from "@/app/lib/kennisbank";

const artikel = getKennisbankArtikel("hoe-werkt-een-offerte-calculator")!;

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
        Een offerte calculator bestaat uit twee delen die na elkaar gebeuren: eerst een
        berekening die de bezoeker zelf invult, daarna — optioneel — een aanvraag die bij de
        vakman binnenkomt. Dit artikel legt beide delen uit, en wat er precies met de gegevens
        van de klant gebeurt.
      </p>

      <h2>Deel 1: de berekening</h2>
      <p>
        De bezoeker doorloopt een reeks vragen die de vakman vooraf heeft ingesteld — bijvoorbeeld
        de oppervlakte van een tuin, het gewenste materiaal, of extra opties zoals een poort. Elke
        vraag is gekoppeld aan een prijsregel: een vaste prijs, een prijs per eenheid (zoals per
        vierkante meter), of een prijs die alleen meetelt wanneer aan een voorwaarde is voldaan.
        Zodra alle verplichte vragen zijn beantwoord, telt de rekentool alle van toepassing zijnde
        regels bij elkaar op tot één prijsindicatie.
      </p>

      <h2>Deel 2: de aanvraag</h2>
      <p>
        Bij de uitkomst kan de bezoeker aangeven dat hij een officiële offerte wil. Die aanvraag
        gaat niet los van de berekening — de exacte antwoorden en de berekende prijsindicatie
        worden meegestuurd, zodat de vakman niet opnieuw hoeft te vragen wat de klant precies
        wilde. De aanvraag komt terecht in een overzicht van openstaande aanvragen (leads), met
        daarin de status van elke aanvraag — bijvoorbeeld nieuw, in behandeling of offerte
        verstuurd.
      </p>

      <h2>Waarom dit tijd bespaart</h2>
      <p>
        Zonder offerte calculator moet elke aanvraag eerst beoordeeld worden om te weten of hij
        past bij het aanbod en budget van de vakman — dat kost tijd, ook bij aanvragen die
        uiteindelijk niets worden. Met een offerte calculator heeft de klant zelf al gezien wat de
        prijsindicatie is vóórdat hij een aanvraag indient. Wie dan alsnog aanvraagt, doet dat met
        een prijsverwachting die al aansluit bij wat de vakman rekent.
      </p>

      <h2>Wat een offerte calculator niet doet</h2>
      <p>
        Een offerte calculator geeft een prijsindicatie op basis van de ingevulde gegevens, geen
        bindende offerte. Bij projecten waarbij de exacte situatie pas na een opname ter plaatse
        duidelijk wordt, blijft er ruimte om de indicatie bij te stellen voordat een definitieve
        offerte wordt verstuurd.
      </p>

      <p>
        Benieuwd naar het verschil met een offerteprogramma?{" "}
        <Link href="/offerte-calculator">Lees de vergelijking op de offerte calculator-pagina</Link>
        , of bekijk hoe het hele traject verdergaat in{" "}
        <Link href="/online-offerte-maken">online een offerte maken</Link>.
      </p>
    </ArticleShell>
  );
}
