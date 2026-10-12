<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Copy in de UI

- In de UI heet het "onderdeel"; het woord "werkzaamheid" komt niet meer voor. Interne code-, route- en databasenamen (`Werkzaamheid…`, `werkzaamheid:<id>` in de URL, `/producten`) blijven zoals ze zijn. `app/lib/copy-regels.test.ts` bewaakt dit.
- De schakelaar op een onderdeel heet overal "Zichtbaar" (aria-label: "Zichtbaar voor klanten: <naam>"); een verborgen onderdeel is gedimd en krijgt het label "Verborgen voor klanten".
