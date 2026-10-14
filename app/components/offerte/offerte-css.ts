// Eén stylesheet voor het offertedocument: dezelfde CSS op het scherm (editor,
// publieke pagina) en in de PDF (headless Chromium), zodat ze overeenkomen.
// Alles onder .og-doc. Afmetingen in mm/pt; kleur en lettertype via variabelen.
export const OFFERTE_CSS = `
.og-doc{--og-kleur:#15803d;--og-font:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  box-sizing:border-box;width:210mm;background:#fff;color:#1f2937;font-family:var(--og-font);font-size:9.5pt;line-height:1.45;
  -webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.og-doc *{box-sizing:border-box}
.og-doc.og-scherm{padding:20mm 20mm 14mm;box-shadow:0 1px 3px rgba(0,0,0,.12),0 8px 28px rgba(0,0,0,.08);min-height:297mm;position:relative}
.og-doc.og-pdf{padding:0;width:auto}
.og-doc h1,.og-doc h2,.og-doc h3,.og-doc p{margin:0}
.og-kop{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;height:28mm}
.og-logo{max-height:20mm;max-width:70mm;object-fit:contain;object-position:left top}
.og-logo-naam{font-size:15pt;font-weight:700;color:var(--og-kleur);line-height:1.15}
.og-afzender{text-align:right;font-size:8.5pt;line-height:1.4;color:#374151}
.og-afzender strong{display:block;font-size:9.5pt;color:#111827}
.og-adresrij{display:flex;justify-content:space-between;gap:10mm;margin-top:8mm;align-items:flex-start}
.og-adres{width:90mm;min-height:30mm;font-size:10pt;line-height:1.4}
.og-meta{width:68mm;font-size:8.5pt}
.og-meta dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:1.2mm 4mm}
.og-meta dt{color:#6b7280}.og-meta dd{margin:0;text-align:right;font-weight:600;color:#111827}
.og-titel{margin-top:10mm;font-size:20pt;font-weight:700;line-height:1.15;color:#111827}
.og-onderwerp{margin-top:1mm;font-size:11pt;color:#374151}
.og-lijn{height:.7mm;width:18mm;background:var(--og-kleur);margin:4mm 0 5mm;border-radius:1mm}
.og-tekst{white-space:pre-line;margin-top:3mm}
.og-spacer td{height:6mm;border:0!important;padding:0!important}
.og-tabel{width:100%;border-collapse:collapse;font-size:9pt}
.og-tabel thead{display:table-header-group}
.og-tabel th{font-size:7.5pt;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;font-weight:600;text-align:left;padding:1.4mm 1.5mm;border-bottom:.25mm solid #9ca3af}
.og-tabel th.r,.og-tabel td.r{text-align:right}
.og-tabel td{padding:1.8mm 1.5mm;border-bottom:.2mm solid #e5e7eb;vertical-align:top}
.og-tabel tr{break-inside:avoid;page-break-inside:avoid}
.og-tabel .og-sectiekop td{border-bottom:.35mm solid var(--og-kleur);padding:2.4mm 1.5mm 1.6mm;font-weight:700;font-size:10pt;color:#111827;break-after:avoid;page-break-after:avoid}
.og-tabel .og-sectiekop td.r{color:var(--og-kleur)}
.og-tabel .og-subtotaal td{font-weight:600;border-bottom:none;padding-top:1.6mm}
.og-tabel col.c-omschr{width:auto}.og-tabel col.c-aantal{width:15mm}.og-tabel col.c-eenheid{width:15mm}.og-tabel col.c-prijs{width:22mm}.og-tabel col.c-btw{width:11mm}.og-tabel col.c-totaal{width:24mm}
.og-label{display:inline-block;margin-left:1.5mm;padding:0 1.6mm;border-radius:1mm;font-size:7pt;font-weight:600;letter-spacing:.02em;vertical-align:1px;border:.2mm solid currentColor}
.og-label.stel{color:#92400e;background:#fffbeb}.og-label.opt{color:#1d4ed8;background:#eff6ff}
.og-toelichting{display:block;color:#6b7280;font-size:8pt;margin-top:.6mm}
.og-tekstregel td{color:#374151;font-style:italic}
.og-niet-meetellen td{color:#6b7280}
.og-totaal{margin-top:6mm;margin-left:auto;width:82mm;break-inside:avoid;page-break-inside:avoid}
.og-totaal dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:1.2mm 4mm;font-size:9.5pt}
.og-totaal dt{color:#4b5563}.og-totaal dd{margin:0;text-align:right}
.og-totaal .eind{margin-top:1.5mm;padding-top:2.4mm;border-top:.35mm solid var(--og-kleur);font-size:13pt;font-weight:700;color:#111827;display:flex;justify-content:space-between;gap:4mm}
.og-totaal .eind span:last-child{color:var(--og-kleur)}
.og-totaal .klein{font-size:8pt;color:#6b7280;margin-top:1.5mm}
.og-blok{margin-top:7mm;break-inside:avoid;page-break-inside:avoid}
.og-blok h3{font-size:10pt;font-weight:700;color:#111827;margin-bottom:1.6mm;padding-bottom:1mm;border-bottom:.2mm solid #d1d5db}
.og-blok ul{margin:0;padding-left:4.5mm}.og-blok li{margin:.6mm 0}
.og-blok table{border-collapse:collapse;width:100%;font-size:9pt}.og-blok td{padding:1mm 1.5mm;border-bottom:.2mm solid #e5e7eb}.og-blok td.r{text-align:right}
.og-klein{font-size:8.5pt;color:#374151}
.og-doc{position:relative}
.og-watermerk{position:absolute;left:0;right:0;top:95mm;text-align:center;font-size:30pt;font-weight:800;letter-spacing:.04em;color:rgba(180,83,9,.13);transform:rotate(-24deg);pointer-events:none;z-index:2;white-space:nowrap}
.og-afsluiting{break-inside:avoid;page-break-inside:avoid}
.og-concept{position:absolute;top:10mm;right:12mm;border:.5mm solid #b45309;color:#b45309;padding:1mm 4mm;font-size:11pt;font-weight:700;letter-spacing:.12em;border-radius:1.5mm}
.og-ondertekening{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-top:9mm;break-inside:avoid;page-break-inside:avoid}
.og-handtekening{border-top:.25mm solid #6b7280;margin-top:16mm;padding-top:1.4mm;font-size:8.5pt;color:#374151}
.og-akkoord{border:.3mm solid #9ca3af;border-radius:1.5mm;padding:3.5mm 4mm}
.og-akkoord h3{border:none;margin:0 0 1.5mm;padding:0}
.og-akkoord .velden{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin-top:2mm}
.og-akkoord .veld{border-bottom:.25mm solid #6b7280;min-height:9mm;font-size:8.5pt;color:#6b7280;padding-top:1mm}
.og-akkoord .veld b{display:block;color:#111827;font-size:10pt;font-weight:600}
.og-getekend{border-color:var(--og-kleur);background:#f0fdf4}
.og-voet{margin-top:10mm;padding-top:2.5mm;border-top:.2mm solid #d1d5db;font-size:7pt;color:#6b7280;text-align:center}
.og-voet .pagina{display:block;margin-top:.8mm;color:#4b5563}
.og-pdf .og-voet{display:none}
.og-wijzigbaar{cursor:pointer;border-radius:1mm;outline:.3mm solid transparent;outline-offset:1mm;transition:outline-color .12s}
.og-wijzigbaar:hover{outline-color:#86efac}
.og-gekozen{outline:.5mm solid var(--og-kleur)!important;outline-offset:1mm;background:rgba(21,128,61,.04)}
.og-invoer{font:inherit;color:inherit;background:transparent;border:0;border-bottom:.2mm dashed #cbd5e1;padding:0;margin:0;width:100%;min-width:0;border-radius:0;text-align:inherit;font-variant-numeric:inherit}
.og-invoer:focus{outline:none;border-bottom-color:var(--og-kleur);background:#f0fdf4}
textarea.og-invoer{resize:none;overflow:hidden;display:block;line-height:1.45}
@page{size:A4;margin:20mm 20mm 26mm}
@media print{.og-doc{box-shadow:none}}
`;
