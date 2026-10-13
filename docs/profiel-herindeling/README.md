# Profiel herindeling

Profiel is een gegroepeerde lijst (kop met logo, naam en domein; JE BEDRIJF · PRIJZEN EN AANVRAGEN · ABONNEMENT · ACCOUNT). Elke regel opent een eigen detailpagina; alles is gebouwd met `SettingsGroup` / `SettingsRow` (`app/components/instellingen/`).

| Route | Inhoud |
|---|---|
| `/dashboard/profiel` | lijst |
| `/dashboard/profiel/bedrijfsgegevens` | handelsnaam, rechtsvorm, statutaire naam/zetel (bv/nv), adres, KvK, btw-id of KOR, IBAN, telefoon, e-mail, website, contactpersoon; onderaan (alleen bij >1 bedrijf) "Bedrijf verwijderen" |
| `/dashboard/profiel/huisstijl` | logo en kleur per rekentool (aanpassen in de rekentool zelf) |
| `/dashboard/profiel/tarieven` | arbeid, voorrijkosten, transport |
| `/dashboard/profiel/werkgebied` | werkgebied en minimum |
| `/dashboard/profiel/offerte-instellingen` | nummering, geldigheid, betaling, standaardteksten, voorwaarden, AV-PDF, herroeping, btw per soort regel, berichten |
| `/dashboard/profiel/abonnement` | status, pakketten |
| `/dashboard/profiel/account` | inloggegevens |
| `/dashboard/profiel/meldingen` | pushmeldingen (alleen als beschikbaar) |

Oude routes sturen door: `/dashboard/abonnement` (query blijft), `/dashboard/branding`, `/dashboard/profiel?scherm=…` (`bedrijf`/`offertegegevens` → bedrijfsgegevens, `uiterlijk` → huisstijl, enz.).

## Lijst: waar is elke instelling bewerkbaar?

Automatisch gegenereerd door `scripts/mobile-ux/profiel-herindeling-controle.js` (`velden-per-pagina.json`): geen enkel formulierveld komt op meer dan één instellingenpagina voor.

| Instelling | Bewerkbaar op | Opmerking |
|---|---|---|
| Naam, adres, KvK, btw/KOR, IBAN, contact, website | Bedrijfsgegevens | Bedrijfsnaam, KvK en adres van het bedrijf worden bij opslaan meegenomen (zelfde actie als voorheen). De offerte-wizard (`gegevens-wizard`, eerste keer een offerte maken) vraagt ontbrekende velden ook, met hetzelfde formulier en dezelfde opslaanactie. |
| Huisstijl en logo | rekentool-editor (per rekentool) | Profiel → Huisstijl is alleen een overzicht met links; de data staat per rekentool. |
| Tarieven | Tarieven | |
| Werkgebied en minimum | Werkgebied (bedrijf) | Een rekentool kan in de editor afwijken (bewust per-rekentool-override, geen instellingenpagina). |
| Abonnement | Abonnement | |
| Offerte-instellingen | Offerte-instellingen | |

## Niet gebouwd (bestaat niet in de app, zou nieuwe logica zijn)
- **Facturen** (geen factuurgegevens in de app; Mollie stuurt zelf bevestigingen).
- **Account verwijderen** (er is geen actie voor).
- **Opzegging ongedaan maken**: een opgezegd Mollie-abonnement kan niet hervat worden; de knop heet **Opnieuw abonneren**.
- Gratis-limiet is 10 onderdelen (niet 3), dus "Gratis · 2 van 10 onderdelen".
