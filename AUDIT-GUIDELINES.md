# Audit beheer-UI tegen de Web Interface Guidelines

Bron: Vercel Web Interface Guidelines (command.md, opgehaald), toegepast op `app/dashboard`, `app/components/dashboard`, `app/components/ui` en `app/onboarding` (148 bestanden). "Title Case" is genegeerd (Nederlandse zinsvorm). De scan is deels geautomatiseerd (regex over JSX): bevindingen met **?** zijn niet handmatig bevestigd en kunnen vals-positief zijn (bijv. een veld dat wel gelabeld is door een omliggende `Field`/`label`). Bestanden zonder bevindingen zijn niet getoond (= pass).

Al opgelost in eerdere stappen en daarom niet meer in deze lijst: invoerrand-contrast, 16px-invoertekst en 44px hoogte in `Input`/`Select`/`Textarea`, en de `* { border-color }`-overschrijving.

Niet automatisch gecontroleerd (handmatig/volgende stap): heading-hiërarchie, hover/active-feedback, tabular-nums in cijferkolommen (alleen `dashboard/page.tsx`, `offerte-editor.tsx` en `offerte-preview.tsx` gebruiken `tabular-nums`), safe-area op volledige-breedte balken, `touch-action: manipulation` (komt nergens voor), `overscroll-behavior: contain` (alleen in `lead-detail-drawer.tsx`; niet in `Overlay`/`Sheet`), `color-scheme` op de root (ontbreekt in `globals.css`).

## `app/components/ui/icon-picker.tsx`
- `app/components/ui/icon-picker.tsx:83` - <input> zonder zichtbaar label of aria-label **?**
- `app/components/ui/icon-picker.tsx:87` - drie puntjes i.p.v. ellipsis-teken (…)
- `app/components/ui/icon-picker.tsx:87` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/components/ui/photo-input.tsx`
- `app/components/ui/photo-input.tsx:31` - <img> zonder width/height

## `app/components/ui/reveal.tsx`
- `app/components/ui/reveal.tsx:44` - transition: all — noem de eigenschappen (transition-colors/transform/opacity)

## `app/dashboard/bedrijven/nieuw/company-form.tsx`
- `app/dashboard/bedrijven/nieuw/company-form.tsx:28` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/bedrijven/nieuw/company-form.tsx:28` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx`
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:238` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:293` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:327` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:369` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:372` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:407` - <DecimalInput> zonder zichtbaar label of aria-label **?**
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:414` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:421` - <DecimalInput> zonder zichtbaar label of aria-label **?**
- `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx:433` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/leads/lead-detail-drawer.tsx`
- `app/dashboard/leads/lead-detail-drawer.tsx:269` - <Textarea> zonder zichtbaar label of aria-label **?**
- `app/dashboard/leads/lead-detail-drawer.tsx:272` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/leads/lead-detail-drawer.tsx:301` - <Textarea> zonder zichtbaar label of aria-label **?**
- `app/dashboard/leads/lead-detail-drawer.tsx:301` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/leads/lead-detail-drawer.tsx:304` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/leads/lead-detail-drawer.tsx:308` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/leads/leads-table.tsx`
- `app/dashboard/leads/leads-table.tsx:58` - <input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/leads/leads-table.tsx:149` - klikbare div/span i.p.v. button/link

## `app/dashboard/leads/leads-view.tsx`
- `app/dashboard/leads/leads-view.tsx:186` - <select> zonder zichtbaar label of aria-label **?**

## `app/dashboard/leads/status-select.tsx`
- `app/dashboard/leads/status-select.tsx:19` - <Select> zonder zichtbaar label of aria-label **?**

## `app/dashboard/onboarding-checklist.tsx`
- `app/dashboard/onboarding-checklist.tsx:58` - transition: all — noem de eigenschappen (transition-colors/transform/opacity)

## `app/dashboard/page.tsx`
- `app/dashboard/page.tsx:117` - transition: all — noem de eigenschappen (transition-colors/transform/opacity)

## `app/dashboard/profiel/account-form.tsx`
- `app/dashboard/profiel/account-form.tsx:26` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/profiel/company-card.tsx`
- `app/dashboard/profiel/company-card.tsx:81` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/profiel/company-card.tsx:86` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/profiel/company-card.tsx:92` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/profiel/company-card.tsx:99` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/profiel/company-card.tsx:177` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/profiel/company-card.tsx:180` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/profiel/profiel-view.tsx`
- `app/dashboard/profiel/profiel-view.tsx:60` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/bedragveld.tsx`
- `app/dashboard/tools/[toolId]/bouwer/bedragveld.tsx:12` - <DecimalInput> zonder zichtbaar label of aria-label **?**

## `app/dashboard/tools/[toolId]/bouwer/builder-tree.tsx`
- `app/dashboard/tools/[toolId]/bouwer/builder-tree.tsx:193` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/[toolId]/bouwer/builder-tree.tsx:208` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/[toolId]/bouwer/builder-tree.tsx:403` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/[toolId]/bouwer/builder-tree.tsx:403` - icoonknop zonder aria-label **?**

## `app/dashboard/tools/[toolId]/bouwer/calculator-bouwer.tsx`
- `app/dashboard/tools/[toolId]/bouwer/calculator-bouwer.tsx:222` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/keuze-opties-editor.tsx`
- `app/dashboard/tools/[toolId]/bouwer/keuze-opties-editor.tsx:33` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/onderdeel-settings-form.tsx`
- `app/dashboard/tools/[toolId]/bouwer/onderdeel-settings-form.tsx:65` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/bouwer/onderdeel-settings-form.tsx:78` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/onderdeel-settings-form.tsx:92` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/onderdelen-bouwer.tsx`
- `app/dashboard/tools/[toolId]/bouwer/onderdelen-bouwer.tsx:364` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/page.tsx`
- `app/dashboard/tools/[toolId]/bouwer/page.tsx:110` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/product-opties-editor.tsx`
- `app/dashboard/tools/[toolId]/bouwer/product-opties-editor.tsx:22` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/product-opties-editor.tsx:29` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/product-opties-editor.tsx:34` - <DecimalInput> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/product-opties-editor.tsx:49` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx`
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:173` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:173` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:229` - <Select> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:245` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:274` - <DecimalInput> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:298` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:308` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:315` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:319` - <DecimalInput> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/regel-settings-form.tsx:333` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx`
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:108` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:309` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:319` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:377` - <Select> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:393` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:422` - <DecimalInput> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:446` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:456` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:463` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:467` - <DecimalInput> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/regels-tab.tsx:481` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/resultaat-tab.tsx`
- `app/dashboard/tools/[toolId]/bouwer/resultaat-tab.tsx:123` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/resultaat-tab.tsx:133` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/bouwer/stappen-tab.tsx`
- `app/dashboard/tools/[toolId]/bouwer/stappen-tab.tsx:82` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/stappen-tab.tsx:118` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/stappen-tab.tsx:121` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/bouwer/veld-settings-form.tsx`
- `app/dashboard/tools/[toolId]/bouwer/veld-settings-form.tsx:238` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/bouwer/veld-settings-form.tsx:238` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/veld-settings-form.tsx:243` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/veld-settings-form.tsx:249` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/veld-settings-form.tsx:284` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/bouwer/velden-tab.tsx`
- `app/dashboard/tools/[toolId]/bouwer/velden-tab.tsx:85` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/[toolId]/bouwer/velden-tab.tsx:289` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/bouwer/velden-tab.tsx:317` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/velden-tab.tsx:322` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/bouwer/velden-tab.tsx:328` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx`
- `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx:46` - <Select> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx:70` - <Select> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx:78` - <Select> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx:91` - <Select> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx:104` - <Select> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx:115` - <DecimalInput> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx:124` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/[toolId]/bouwer/voorwaarde-editor.tsx:131` - <Select> zonder zichtbaar label of aria-label **?**

## `app/dashboard/tools/[toolId]/embed/embed-settings-form.tsx`
- `app/dashboard/tools/[toolId]/embed/embed-settings-form.tsx:77` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/producten/[id]/bewerken/extra-options-manager.tsx`
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/extra-options-manager.tsx:99` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/extra-options-manager.tsx:108` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/extra-options-manager.tsx:166` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/extra-options-manager.tsx:195` - <Textarea> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/extra-options-manager.tsx:198` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx`
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:79` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:93` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:172` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:172` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:218` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:218` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:325` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:346` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:363` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:492` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:502` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx:515` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/producten/editor/materialen-tabel.tsx`
- `app/dashboard/tools/[toolId]/producten/editor/materialen-tabel.tsx:90` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/editor/materialen-tabel.tsx:91` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/producten/editor/materialen-tabel.tsx:162` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/producten/editor/opslaan-status.tsx`
- `app/dashboard/tools/[toolId]/producten/editor/opslaan-status.tsx:24` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/producten/editor/werkzaamheid-editor.tsx`
- `app/dashboard/tools/[toolId]/producten/editor/werkzaamheid-editor.tsx:281` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/producten/nieuw/werkzaamheid-wizard.tsx`
- `app/dashboard/tools/[toolId]/producten/nieuw/werkzaamheid-wizard.tsx:259` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/producten/nieuw/werkzaamheid-wizard.tsx:317` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/nieuw/werkzaamheid-wizard.tsx:318` - autoFocus: alleen op desktop en voor één primair veld

## `app/dashboard/tools/[toolId]/producten/product-form.tsx`
- `app/dashboard/tools/[toolId]/producten/product-form.tsx:313` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/product-form.tsx:328` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/product-form.tsx:373` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/producten/product-form.tsx:378` - autoFocus: alleen op desktop en voor één primair veld
- `app/dashboard/tools/[toolId]/producten/product-form.tsx:474` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/producten/velden/kosten-blok.tsx`
- `app/dashboard/tools/[toolId]/producten/velden/kosten-blok.tsx:84` - <DecimalInput> zonder zichtbaar label of aria-label **?**

## `app/dashboard/tools/[toolId]/producten/velden/veld-form.tsx`
- `app/dashboard/tools/[toolId]/producten/velden/veld-form.tsx:212` - icoonknop zonder aria-label **?**

## `app/dashboard/tools/[toolId]/resultaat/resultaat-form.tsx`
- `app/dashboard/tools/[toolId]/resultaat/resultaat-form.tsx:78` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/resultaat/resultaat-form.tsx:88` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/[toolId]/uiterlijk/auto-branding.tsx`
- `app/dashboard/tools/[toolId]/uiterlijk/auto-branding.tsx:113` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/uiterlijk/auto-branding.tsx:118` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/uiterlijk/auto-branding.tsx:292` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/[toolId]/uiterlijk/auto-branding.tsx:295` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx`
- `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx:163` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx:178` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx:230` - <Input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx:234` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx:263` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx:273` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx:283` - type="number": gebruik type="text" inputMode="decimal"
- `app/dashboard/tools/[toolId]/uiterlijk/branding-form.tsx:325` - <input> zonder zichtbaar label of aria-label **?**

## `app/dashboard/tools/nieuw/nieuwe-tool-form.tsx`
- `app/dashboard/tools/nieuw/nieuwe-tool-form.tsx:28` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/dashboard/tools/nieuw/nieuwe-tool-form.tsx:30` - autoFocus: alleen op desktop en voor één primair veld

## `app/dashboard/tools/nieuw/startpunt-kiezer.tsx`
- `app/dashboard/tools/nieuw/startpunt-kiezer.tsx:65` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/nieuw/startpunt-kiezer.tsx:147` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/nieuw/startpunt-kiezer.tsx:181` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/nieuw/startpunt-kiezer.tsx:195` - autoFocus: alleen op desktop en voor één primair veld

## `app/dashboard/tools/nieuw/template-toolbar.tsx`
- `app/dashboard/tools/nieuw/template-toolbar.tsx:27` - <input> zonder zichtbaar label of aria-label **?**
- `app/dashboard/tools/nieuw/template-toolbar.tsx:31` - drie puntjes i.p.v. ellipsis-teken (…)
- `app/dashboard/tools/nieuw/template-toolbar.tsx:31` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)

## `app/dashboard/tools/page.tsx`
- `app/dashboard/tools/page.tsx:75` - transition: all — noem de eigenschappen (transition-colors/transform/opacity)
- `app/dashboard/tools/page.tsx:108` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/page.tsx:113` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/page.tsx:118` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)
- `app/dashboard/tools/page.tsx:127` - Button size="sm" is 32px hoog (tikdoel < 44px op mobiel)

## `app/onboarding/rekentool/onboarding-tool-form.tsx`
- `app/onboarding/rekentool/onboarding-tool-form.tsx:27` - placeholder eindigt niet op … (voorbeeldpatroon met ellipsis)
- `app/onboarding/rekentool/onboarding-tool-form.tsx:29` - autoFocus: alleen op desktop en voor één primair veld

