import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { bouwEmbedCode, bouwIframeCode } from "@/app/lib/embed-code";
import { DEFAULT_EMBED_CONFIG } from "@/app/lib/tools";

// Testpagina voor de embed (alleen in de testomgeving: TEST_PAGES=1). Toont de embedcode van een rekentool zoals een hovenier
// hem op zijn site plakt, tussen opzettelijk agressieve CSS van de "host-site": de rekentool mag daar niet door veranderen.
//   /test-embed?tool=<toolId>&modus=script|iframe   (script = het laadscript met Shadow DOM, standaard)
export const metadata: Metadata = { title: "Test: embed", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const AGRESSIEF = `
  body { font-family: "Comic Sans MS", cursive !important; background: #fdf6e3; color: #6b0f0f; line-height: 2.2; }
  h1, h2, h3, p, a, li, label, span, div, button, input, select, textarea, table, td, th { color: #6b0f0f !important; letter-spacing: 2px; word-spacing: 6px; }
  button, input, select, textarea, a { font-size: 9px !important; border: 4px dotted #00a !important; background: #ff0 !important; padding: 0 !important; margin: 18px !important; text-transform: uppercase !important; border-radius: 0 !important; }
  * { box-sizing: content-box !important; }
  p, div { margin-top: 12px !important; text-align: right !important; }
  img, svg { filter: grayscale(1) !important; max-width: 30px !important; }
`;

export default async function TestEmbedPagina({ searchParams }: { searchParams: Promise<{ tool?: string; modus?: string }> }) {
  if (process.env.TEST_PAGES !== "1") notFound();
  const { tool, modus } = await searchParams;
  if (!tool) return <p>Geef ?tool=&lt;toolId&gt; mee.</p>;
  const h = await headers();
  const baseUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const opties = { toolId: tool, toolNaam: "Testrekentool", baseUrl, embedConfig: DEFAULT_EMBED_CONFIG, contact: { naam: "Hoveniersbedrijf De Vries", telefoon: "06 12345678", email: "jan@devries-hoveniers.nl" } };
  const code = modus === "iframe" ? bouwIframeCode(opties) : bouwEmbedCode(opties);
  const i = code.lastIndexOf("<script>");
  const html = code.slice(0, i);
  const script = code.slice(i + "<script>".length, code.lastIndexOf("</script>"));
  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: AGRESSIEF }} />
      <h1>Website van een hovenier (testpagina)</h1>
      <p>Deze tekst en alles eromheen heeft opzettelijk lelijke CSS. De rekentool hieronder hoort daar geen last van te hebben.</p>
      <div data-testid="embed-host" dangerouslySetInnerHTML={{ __html: html }} />
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <p>Tekst onder de rekentool.</p>
    </main>
  );
}
