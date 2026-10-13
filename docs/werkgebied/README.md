# Werkgebied en minimale opdracht

Alles staat standaard **uit**: een rekentool zonder deze instellingen rekent en werkt precies als voorheen.

- **Instellingen**: Profiel → "Werkgebied en minimum" (per bedrijf) en in de editor per rekentool (overnemen of eigen instelling). Opslag: `Company.werkgebied` / `Tool.werkgebied` (JSON).
- **Rekenkern** (`app/lib/pricing/locatie.ts`, `engine.ts`): afstandstoeslag als eigen projectregel `Voorrijkosten extra afstand (34 km)`, minimum als eigen correctieregel `Aanvulling tot minimumtarief`; totaal = som van de regels. Uitkomst bevat `serviceArea` (`withinServiceArea` true/false/"unknown", `distanceKm`), `minimum.belowMinimum`, `requestAllowed` en `flags`.
- **Afstand**: hemelsbreed (haversine) tot het startadres, op 0,1 km afgerond; precies op de straal telt als binnen. Dit staat ook in de instellingen. Het startadres wordt één keer bij opslaan gegeocodeerd (PDOK Locatieserver, gratis) en met coördinaten bewaard. PDOK-antwoorden worden 10 minuten onthouden.
- **PDOK-storing blokkeert nooit**: de klant gaat door, de lead krijgt "Werkgebied niet gecontroleerd".
- **Snapshot**: de instellingen zitten in de gepubliceerde snapshot, dus ook de embed en de reserve-snapshot werken zonder onze server.
- **Server** (`app/lib/pricing/server.ts`): zoekt het adres zelf op, rekent afstand en prijs opnieuw met de kern en weigert aanvragen die niet mogen met dezelfde melding. Aanvragen uit de Cloudflare-reserve worden alleen gemarkeerd, nooit geweigerd.
- **Leads**: labels "Buiten werkgebied", "Onder minimum", "Werkgebied niet gecontroleerd", afstand in km, filter, en een kaart in het leaddetail. Optioneel (standaard uit) een vriendelijke afwijzingsmail aan de klant bij "Buiten werkgebied" (`afwijzingVerzondOp` voorkomt dubbel versturen).
- **Niet ondersteund**: formule-gebaseerde ("Aangepaste") rekentools gebruiken deze instellingen nog niet.

## Controle

`scripts/mobile-ux/werkgebied-controle.js` (zie `controle-uitvoer.txt`, 42/42). De sandbox bereikt PDOK en de kaarttegels niet: de server praat met `scripts/mobile-ux/fake-pdok.js` via `PDOK_BASIS_URL`, de browser krijgt dezelfde antwoorden via route-onderschepping, en de kaartachtergrond is een grijs vlak. Schermen: `docs/werkgebied/schermen/`.
