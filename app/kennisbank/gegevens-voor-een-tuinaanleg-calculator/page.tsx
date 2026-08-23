import type { Metadata } from "next";
import Link from "next/link";
import { ArticleShell } from "@/app/components/marketing/article-shell";
import { getKennisbankArtikel } from "@/app/lib/kennisbank";

const artikel = getKennisbankArtikel("gegevens-voor-een-tuinaanleg-calculator")!;

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
        Een tuinaanleg-calculator is meestal geen enkele berekening, maar een optelsom van
        meerdere onderdelen — bestrating, een schutting, kunstgras, beplanting en grondwerk komen
        vaak samen voor in één tuinproject. Hieronder staat per onderdeel welke gegevens je nodig
        hebt om er een werkende prijsberekening van te maken.
      </p>

      <h2>Basistarieven (voor elk onderdeel)</h2>
      <ul>
        <li>Je uurtarief voor arbeid.</li>
        <li>Voorrijkosten, als je die apart in rekening brengt.</li>
        <li>Je gewenste materiaalmarge, als je materiaal doorverkoopt tegen een opslag.</li>
      </ul>
      <p>
        Deze tarieven stel je eenmalig in; ze gelden vervolgens automatisch voor elk onderdeel dat
        je toevoegt.
      </p>

      <h2>Bestrating</h2>
      <ul>
        <li>Prijs per vierkante meter per materiaalsoort (bijvoorbeeld klinkers, betontegels, natuursteen).</li>
        <li>Of er al bestaande bestrating opgebroken en afgevoerd moet worden.</li>
        <li>Of er nog grondwerk (uitgraven, zandbed) nodig is.</li>
      </ul>

      <h2>Schutting</h2>
      <ul>
        <li>Prijs per strekkende meter voor het gekozen materiaal.</li>
        <li>Prijs per strekkende meter voor arbeid (plaatsen).</li>
        <li>Een eventuele toeslag voor een poort.</li>
      </ul>

      <h2>Kunstgras</h2>
      <ul>
        <li>Prijs per vierkante meter voor het kunstgras zelf.</li>
        <li>Prijs voor de ondergrond (bijvoorbeeld een drainerende laag), als die nog aangelegd moet worden.</li>
      </ul>

      <h2>Beplanting en grondwerk</h2>
      <ul>
        <li>Een vaste of oppervlakteafhankelijke prijs voor beplanting, afhankelijk van hoe gedetailleerd je dit wilt aanbieden.</li>
        <li>Een prijs voor grondwerk, bijvoorbeeld per vierkante meter of als vaste post.</li>
      </ul>

      <h2>Hoe je dit combineert tot één tuinaanleg-calculator</h2>
      <p>
        Elk onderdeel hierboven kan als losse rekentool bestaan, of samen worden gecombineerd tot
        één tuinaanleg-calculator waarin een klant meerdere onderdelen tegelijk selecteert. De
        rekentool telt dan de deelprijzen van elk gekozen onderdeel bij elkaar op tot één
        totaalprijs, zichtbaar uitgesplitst per onderdeel.
      </p>
      <p>
        Begin je liever klein, dan is het ook mogelijk om met één onderdeel te starten —
        bijvoorbeeld alleen bestrating — en de rekentool later uit te breiden zodra je merkt welke
        vragen klanten je nog aanvullend stellen.
      </p>

      <p>
        Klaar om te starten?{" "}
        <Link href="/voor/hoveniers">Bekijk de rekentool-pagina voor hoveniers</Link> of{" "}
        <Link href="/registreren">maak direct je eigen tuinaanleg-calculator</Link>.
      </p>
    </ArticleShell>
  );
}
