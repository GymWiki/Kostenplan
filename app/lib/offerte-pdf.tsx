import "server-only";

import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatCurrency } from "@/app/lib/format";
import { regelTotaal, berekenOfferteTotalen, type OfferteRegel } from "@/app/lib/offertes";
import { uploadOffertePdf } from "@/app/lib/storage";
import type { Branding } from "@/app/generated/prisma/client";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });

// @react-pdf/renderer gebruikt zijn eigen lay-outengine, geen browser — dus
// geen van de vier web-lettertypes uit app/lib/fonts.ts (die zijn Next/Google
// Font-bestanden, niet zomaar in te laden hier). Voor fase 1 gebruiken we
// het ingebouwde Helvetica-family en passen we alleen de primaire kleur toe
// als accent — visueel dicht genoeg bij de rekentool, zonder extra
// font-bestanden te moeten downloaden/registreren bij elke PDF-generatie.
function maakStyles(primaireKleur: string) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    logo: { width: 48, height: 48, objectFit: "contain" },
    bedrijfsnaam: { fontSize: 14, fontFamily: "Helvetica-Bold", color: primaireKleur },
    titel: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    subtitel: { fontSize: 10, color: "#6b7280", marginBottom: 16 },
    introTekst: { fontSize: 10, marginBottom: 16, lineHeight: 1.4 },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: primaireKleur,
      paddingBottom: 6,
      marginBottom: 4,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e7eb",
      paddingVertical: 6,
    },
    colOmschrijving: { flex: 3 },
    colAantal: { flex: 1, textAlign: "right" },
    colPrijs: { flex: 1.2, textAlign: "right" },
    colTotaal: { flex: 1.2, textAlign: "right" },
    headerCell: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#6b7280", textTransform: "uppercase" },
    totalen: { marginTop: 12, alignSelf: "flex-end", width: 220 },
    totalenRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
    totalenLabelEind: { fontFamily: "Helvetica-Bold", fontSize: 12 },
    totalenWaardeEind: { fontFamily: "Helvetica-Bold", fontSize: 12, color: primaireKleur },
    voorwaarden: { marginTop: 32, fontSize: 8, color: "#6b7280", lineHeight: 1.4 },
    geldigTot: { marginTop: 24, fontSize: 9, color: "#6b7280" },
  });
}

type OffertePdfProps = {
  bedrijfsnaam: string;
  klantNaam: string;
  logoUrl: string | null;
  primaireKleur: string;
  regels: OfferteRegel[];
  introTekst: string | null;
  voorwaardenTekst: string | null;
  geldigTot: Date;
  btwPercentage: number;
};

function OffertePdfDocument({
  bedrijfsnaam,
  klantNaam,
  logoUrl,
  primaireKleur,
  regels,
  introTekst,
  voorwaardenTekst,
  geldigTot,
  btwPercentage,
}: OffertePdfProps) {
  const styles = maakStyles(primaireKleur);
  const { subtotaal, btw, totaal } = berekenOfferteTotalen(regels, btwPercentage);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.bedrijfsnaam}>{bedrijfsnaam}</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image>, geen HTML img */}
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>

        <Text style={styles.titel}>Offerte voor {klantNaam}</Text>
        <Text style={styles.subtitel}>Datum: {dateFormatter.format(new Date())}</Text>

        {introTekst && <Text style={styles.introTekst}>{introTekst}</Text>}

        <View style={styles.tableHeader}>
          <Text style={[styles.colOmschrijving, styles.headerCell]}>Omschrijving</Text>
          <Text style={[styles.colAantal, styles.headerCell]}>Aantal</Text>
          <Text style={[styles.colPrijs, styles.headerCell]}>Prijs p/eenheid</Text>
          <Text style={[styles.colTotaal, styles.headerCell]}>Totaal</Text>
        </View>
        {regels.map((regel) => (
          <View key={regel.id} style={styles.tableRow}>
            <Text style={styles.colOmschrijving}>{regel.omschrijving}</Text>
            <Text style={styles.colAantal}>
              {regel.aantal} {regel.eenheid}
            </Text>
            <Text style={styles.colPrijs}>{formatCurrency(regel.prijsPerEenheid)}</Text>
            <Text style={styles.colTotaal}>{formatCurrency(regelTotaal(regel))}</Text>
          </View>
        ))}

        <View style={styles.totalen}>
          <View style={styles.totalenRow}>
            <Text>Subtotaal</Text>
            <Text>{formatCurrency(subtotaal)}</Text>
          </View>
          <View style={styles.totalenRow}>
            <Text>Btw ({btwPercentage}%)</Text>
            <Text>{formatCurrency(btw)}</Text>
          </View>
          <View style={styles.totalenRow}>
            <Text style={styles.totalenLabelEind}>Totaal</Text>
            <Text style={styles.totalenWaardeEind}>{formatCurrency(totaal)}</Text>
          </View>
        </View>

        <Text style={styles.geldigTot}>Geldig tot {dateFormatter.format(geldigTot)}</Text>

        {voorwaardenTekst && <Text style={styles.voorwaarden}>{voorwaardenTekst}</Text>}
      </Page>
    </Document>
  );
}

export async function genereerEnUploadOffertePdf(params: {
  companyId: string;
  offerteId: string;
  bedrijfsnaam: string;
  klantNaam: string;
  regels: OfferteRegel[];
  introTekst: string | null;
  voorwaardenTekst: string | null;
  geldigTot: Date;
  btwPercentage: number;
  branding: Branding | null;
}): Promise<string | null> {
  const buffer = await renderToBuffer(
    <OffertePdfDocument
      bedrijfsnaam={params.bedrijfsnaam}
      klantNaam={params.klantNaam}
      logoUrl={params.branding?.logoUrl ?? null}
      primaireKleur={params.branding?.primaireKleur ?? "#15803d"}
      regels={params.regels}
      introTekst={params.introTekst}
      voorwaardenTekst={params.voorwaardenTekst}
      geldigTot={params.geldigTot}
      btwPercentage={params.btwPercentage}
    />
  );

  const result = await uploadOffertePdf(params.companyId, params.offerteId, buffer);
  return result.url ?? null;
}
