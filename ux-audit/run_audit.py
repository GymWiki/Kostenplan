"""
UX-audit automation voor Kostenplan (dashboard, ingelogd).

BELANGRIJK — waarom dit script bestaat i.p.v. een afgerond rapport:
Dit is geschreven in een remote/cloud Claude Code-sessie waarvan het
netwerkbeleid alle uitgaande verbindingen naar het echte Supabase-project
blokkeert (zowel de Auth/REST-API als de rauwe Postgres-verbinding — zie
/root/.ccr/README.md, secties "403/407 from the proxy" en "raw-TCP
databases"). Daardoor kon dit script hier NIET worden uitgevoerd of
geverifieerd. Voer het uit in een omgeving met gewone internettoegang tot
Supabase (bijv. een lokale Claude Code-sessie of gewoon lokaal `python3
ux-audit/run_audit.py`).

Vereisten vooraf:
1. .env.local in de projectroot met een werkende NEXT_PUBLIC_SUPABASE_URL,
   NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL en DIRECT_URL.
2. `npm run dev` (of `npx next dev -p 3000`) draait al op poort 3000 — dit
   script start de server zelf niet, om makkelijker te kunnen herstarten
   zonder de dev-server steeds opnieuw op te hoeven starten.
3. pip install playwright && playwright install chromium
   (of hergebruik een bestaande Chromium-install via
   PLAYWRIGHT_BROWSERS_PATH, zoals in de oorspronkelijke sandbox).

Gebruik:
    python3 ux-audit/run_audit.py

Output:
- ux-audit/*.png — één screenshot per scherm, per viewport
  (bestandsnaam: "<nummer>-<scherm>--<desktop|mobiel>.png")
- ux-audit/findings.json — machineleesbare log: welke schermen bezocht zijn,
  welke interactieve elementen erop staan, en welke console-/pagina-fouten
  zijn opgevangen. Gebruik dit als basis om ux-audit/report.md in te vullen
  (zie de structuur die daar al klaarstaat).

Ontwerp: dit script kent de routes van de app uit de broncode (zie
app/components/dashboard/nav-links.ts en
app/dashboard/tools/[toolId]/tool-nav.tsx) en navigeert er grotendeels
direct naartoe via URL, in plaats van blind op linktekst te klikken — dat
maakt het minder fragiel voor kleine copy-wijzigingen. Waar een score
interactie vereist (formulier invullen, tab wisselen, modal openen) wordt
wél echt geklikt/getypt, precies wat de opdracht vraagt ("niet alleen code
lezen, echt doorklikken"). Elke stap staat in een eigen try/except zodat één
kapotte stap niet de rest van de audit blokkeert — een gefaalde stap wordt
zelf als bevinding gelogd (type "vermoedelijke bug / script kon niet verder").
"""

import json
import sys
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright, Page, BrowserContext

BASE_URL = "http://localhost:3000"
EMAIL = "pieter.kluvers06@gmail.com"
PASSWORD = "u73tnxgd"
COMPANY_NAAM = "Groen & Zo Tuinen (audit)"

OUT_DIR = Path(__file__).parent
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobiel": {"width": 390, "height": 844},
}

CHROMIUM_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"  # pas aan/verwijder indien niet van toepassing

findings: list[dict] = []
step_counter = {"n": 0}


def next_n() -> str:
    step_counter["n"] += 1
    return f"{step_counter['n']:02d}"


def attach_console_capture(page: Page) -> list[str]:
    errors: list[str] = []
    page.on(
        "console",
        lambda msg: errors.append(f"[console:{msg.type}] {msg.text}")
        if msg.type in ("error", "warning")
        else None,
    )
    page.on("pageerror", lambda exc: errors.append(f"[pageerror] {exc}"))
    page.on(
        "response",
        lambda resp: errors.append(f"[http {resp.status}] {resp.url}")
        if resp.status >= 400 and "/_next/" not in resp.url
        else None,
    )
    return errors


def discover_interactive(page: Page) -> dict:
    """Telt zichtbare interactieve elementen — basis voor de
    'hoeveel keuzes tegelijk zichtbaar'-vraag uit de opdracht."""
    def count_visible(selector: str) -> int:
        try:
            els = page.locator(selector)
            return sum(1 for i in range(els.count()) if els.nth(i).is_visible())
        except Exception:
            return -1

    return {
        "visible_buttons": count_visible("button"),
        "visible_links": count_visible("a"),
        "visible_text_inputs": count_visible('input:not([type="hidden"])'),
        "visible_selects": count_visible("select"),
        "visible_headings": count_visible("h1, h2, h3"),
    }


def shoot_and_log(
    page: Page,
    name: str,
    viewport_name: str,
    console_errors: list[str],
    note: str = "",
    full_page: bool = True,
):
    page.wait_for_timeout(400)
    n = next_n()
    filename = f"{n}-{name}--{viewport_name}.png"
    try:
        page.screenshot(path=str(OUT_DIR / filename), full_page=full_page)
    except Exception as e:
        filename = f"{filename} (SCREENSHOT MISLUKT: {e})"
    entry = {
        "n": n,
        "screen": name,
        "viewport": viewport_name,
        "url": page.url,
        "screenshot": filename,
        "console_errors": console_errors.copy(),
        "interactive": discover_interactive(page),
        "note": note,
    }
    findings.append(entry)
    print(f"  [{n}] {name} ({viewport_name}) -> {filename}  errors={len(console_errors)}")
    return entry


def safe_step(label: str, fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        print(f"  !! STAP MISLUKT: {label}: {e}")
        findings.append(
            {
                "n": next_n(),
                "screen": f"FOUT: {label}",
                "viewport": "-",
                "url": "-",
                "screenshot": None,
                "console_errors": [traceback.format_exc()],
                "interactive": {},
                "note": "Script kon deze stap niet voltooien — mogelijk een echte bug, mogelijk een selector die niet meer klopt. Handmatig verifiëren.",
            }
        )
        return None


# ---------------------------------------------------------------------------
# Flows
# ---------------------------------------------------------------------------


def login_or_signup(page: Page, console_errors: list[str]):
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[name="email"]', EMAIL)
    page.fill('input[name="password"]', PASSWORD)
    page.click('button[type="submit"]:has-text("Inloggen")')
    page.wait_for_timeout(2000)

    if "/login" in page.url:
        body = page.inner_text("body")
        if "onjuist" in body.lower() or "niet gelukt" in body.lower():
            print("  Login mislukt (account bestaat waarschijnlijk nog niet) -> registreren")
            page.goto(f"{BASE_URL}/registreren")
            page.wait_for_load_state("networkidle")
            page.fill('input[name="email"]', EMAIL)
            page.fill('input[name="password"]', PASSWORD)
            page.click('button[type="submit"]:has-text("Gratis account aanmaken")')
            page.wait_for_timeout(3000)

    print("  Ingelogd/geregistreerd, huidige URL:", page.url)


def complete_onboarding_if_needed(page: Page, viewport_name: str, console_errors: list[str]):
    if "/onboarding/bedrijf" in page.url or page.url == f"{BASE_URL}/onboarding":
        shoot_and_log(page, "onboarding-bedrijf", viewport_name, console_errors)
        page.fill('input[name="naam"]', COMPANY_NAAM)
        page.click('button[type="submit"]:has-text("Bedrijf aanmaken")')
        page.wait_for_timeout(2000)

    if "/onboarding/rekentool" in page.url:
        shoot_and_log(page, "onboarding-rekentool", viewport_name, console_errors)
        # Sla over als er een "sla over"/"later"-optie is; anders eerste
        # sjabloon-kaart proberen. Zelf verifiëren welk pad daadwerkelijk
        # gekozen wordt — dit is een educated guess op basis van de
        # component-naam, niet geverifieerd tegen de echte DOM.
        skip = page.get_by_text("later", exact=False)
        if skip.count():
            skip.first.click()
        else:
            card = page.locator("button, a").first
            if card.count():
                card.click()
        page.wait_for_timeout(2000)

    if "/onboarding/huisstijl" in page.url:
        shoot_and_log(page, "onboarding-huisstijl", viewport_name, console_errors)
        skip = page.get_by_text("later", exact=False)
        if skip.count():
            skip.first.click()
        else:
            submit = page.locator('button[type="submit"]').first
            if submit.count():
                submit.click()
        page.wait_for_timeout(2000)


def get_or_create_first_tool_id(page: Page, viewport_name: str, console_errors: list[str]) -> str | None:
    page.goto(f"{BASE_URL}/dashboard/tools")
    page.wait_for_load_state("networkidle")
    shoot_and_log(page, "tools-overzicht", viewport_name, console_errors)

    tool_links = page.locator('a[href^="/dashboard/tools/"]:not([href*="/nieuw"])')
    if tool_links.count() > 0:
        href = tool_links.first.get_attribute("href")
        return href.split("/dashboard/tools/")[1].split("/")[0]

    print("  Geen bestaande tool gevonden -> nieuwe rekentool aanmaken via sjabloon-flow")
    page.goto(f"{BASE_URL}/dashboard/tools/nieuw")
    page.wait_for_load_state("networkidle")
    shoot_and_log(page, "tools-nieuw-startpunt-kiezer", viewport_name, console_errors)

    # Klik de eerste sjabloonkaart (niet "Zelf beginnen") -> opent preview-modal.
    template_card = page.locator("button").filter(has_text="Bekijk sjabloon").first
    if template_card.count() == 0:
        print("  Geen sjabloonkaart gevonden, val terug op 'Begin vanaf 0'")
        page.get_by_text("Begin vanaf 0", exact=False).first.click()
    else:
        template_card.click()
        page.wait_for_timeout(600)
        shoot_and_log(page, "tools-nieuw-sjabloon-preview-modal", viewport_name, console_errors)
        use_btn = page.locator("button").filter(has_text="sjabloon gebruiken").first
        if use_btn.count():
            use_btn.click()
    page.wait_for_timeout(800)
    shoot_and_log(page, "tools-nieuw-naam-stap", viewport_name, console_errors)

    naam_input = page.locator('input[name="naam"]')
    if naam_input.count():
        naam_input.fill("Tuinaanleg (audit)")
    submit = page.locator('button[type="submit"]').first
    if submit.count():
        submit.click()
    page.wait_for_timeout(2500)
    print("  URL na aanmaken tool:", page.url)

    if "/dashboard/tools/" in page.url:
        return page.url.split("/dashboard/tools/")[1].split("/")[0].split("?")[0]
    return None


def visit(page: Page, url: str, name: str, viewport_name: str, console_errors: list[str], note: str = ""):
    page.goto(url)
    page.wait_for_load_state("networkidle")
    return shoot_and_log(page, name, viewport_name, console_errors, note=note)


def explore_tool(page: Page, tool_id: str, viewport_name: str, console_errors: list[str]):
    base = f"{BASE_URL}/dashboard/tools/{tool_id}"

    visit(page, base, "tool-overzicht", viewport_name, console_errors)
    visit(page, f"{base}/calculator", "tool-calculator-preview", viewport_name, console_errors)

    # Bouwer: heeft eigen tabs (Onderdelen/Resultaat of Velden/Regels,
    # afhankelijk van v1 vs v2) — beide tabs proberen te vinden en aanklikken.
    def bouwer_flow():
        visit(page, f"{base}/bouwer", "tool-bouwer", viewport_name, console_errors)
        tabs = page.get_by_role("tab")
        tab_count = tabs.count()
        for i in range(tab_count):
            tab = tabs.nth(i)
            label = tab.inner_text().strip() or f"tab-{i}"
            tab.click()
            page.wait_for_timeout(500)
            shoot_and_log(
                page, f"tool-bouwer-tab-{label.lower().replace(' ', '-')}", viewport_name, console_errors
            )
        # Probeer één onderdeel/veld te openen als dat kan (eerste
        # klikbare rij in de structuurlijst), puur om te zien of de
        # editor-overlay/-paneel goed opent.
        row = page.locator('[class*="row"], li, button').filter(has_text="bewerk").first
        if row.count():
            row.click()
            page.wait_for_timeout(600)
            shoot_and_log(page, "tool-bouwer-item-geopend", viewport_name, console_errors)

    safe_step("Bouwer-flow", bouwer_flow)

    visit(page, f"{base}/producten", "tool-producten-lijst", viewport_name, console_errors)

    def product_nieuw_flow():
        visit(page, f"{base}/producten/nieuw", "tool-producten-nieuw", viewport_name, console_errors)
        naam = page.locator('input[name="naam"]')
        if naam.count():
            naam.fill("Testproduct (audit)")
        prijs = page.locator('input[name="prijs"]')
        if prijs.count():
            prijs.fill("25")
        submit = page.locator('button[type="submit"]').first
        if submit.count():
            submit.click()
        page.wait_for_timeout(1500)
        shoot_and_log(page, "tool-producten-na-opslaan", viewport_name, console_errors)

    safe_step("Product aanmaken", product_nieuw_flow)

    visit(page, f"{base}/producten/velden", "tool-producten-velden", viewport_name, console_errors)
    visit(page, f"{base}/prijzen", "tool-prijzen", viewport_name, console_errors)
    visit(page, f"{base}/uiterlijk", "tool-uiterlijk", viewport_name, console_errors)
    visit(page, f"{base}/resultaat", "tool-resultaat", viewport_name, console_errors)
    visit(page, f"{base}/aanvraagformulier", "tool-aanvraagformulier", viewport_name, console_errors)
    visit(page, f"{base}/publiceren", "tool-publiceren", viewport_name, console_errors)
    visit(page, f"{base}/embed", "tool-embed", viewport_name, console_errors)
    visit(page, f"{base}/instellingen", "tool-instellingen", viewport_name, console_errors)


def explore_leads(page: Page, viewport_name: str, console_errors: list[str]):
    visit(page, f"{BASE_URL}/dashboard/leads", "leads-overzicht", viewport_name, console_errors)

    def open_first_lead():
        card = page.locator('[class*="kanban"] [class*="card"], table tbody tr').first
        if card.count() == 0:
            shoot_and_log(
                page,
                "leads-lege-staat",
                viewport_name,
                console_errors,
                note="Geen leads aanwezig — dit is een NIEUW testaccount zonder aanvragen. "
                "Om de omzetten-naar-offerte-flow echt te testen moet eerst een aanvraag "
                "binnenkomen via de publieke rekentool van een gepubliceerde tool.",
            )
            return
        card.click()
        page.wait_for_timeout(600)
        shoot_and_log(page, "leads-detail-drawer", viewport_name, console_errors)

    safe_step("Lead-detail openen", open_first_lead)


def submit_test_lead_via_public_tool(page: Page, tool_id: str, viewport_name: str, console_errors: list[str]):
    """Best-effort: probeert een testaanvraag te versturen via de publieke
    tool-URL, zodat de leads-flow (incl. omzetten naar offerte) echt getest
    kan worden i.p.v. alleen de lege staat te zien. Vereist dat de tool al
    gepubliceerd is met minstens één product — zo niet, wordt dit
    overgeslagen en apart gelogd."""
    page.goto(f"{BASE_URL}/dashboard/tools/{tool_id}/publiceren")
    page.wait_for_load_state("networkidle")
    link = page.locator('a[href*="/t/"]').first
    if link.count() == 0:
        findings.append(
            {
                "n": next_n(),
                "screen": "publieke-tool-link-niet-gevonden",
                "viewport": viewport_name,
                "url": page.url,
                "screenshot": None,
                "console_errors": [],
                "interactive": {},
                "note": "Kon geen publieke tool-link vinden op de publiceren-pagina — "
                "tool is mogelijk nog niet gepubliceerd. Leads-flow kon niet end-to-end getest worden.",
            }
        )
        return
    public_url = link.get_attribute("href")
    page.goto(public_url if public_url.startswith("http") else f"{BASE_URL}{public_url}")
    page.wait_for_load_state("networkidle")
    shoot_and_log(page, "publieke-rekentool", viewport_name, console_errors)
    # Verder invullen is calculator-specifiek en te fragiel om generiek te
    # scripten — handmatig een testaanvraag indienen wordt aanbevolen als
    # aanvulling hierop.


def run_for_viewport(context: BrowserContext, viewport_name: str, tool_id_holder: dict):
    print(f"\n=== Viewport: {viewport_name} ({VIEWPORTS[viewport_name]}) ===")
    page = context.new_page()
    page.set_viewport_size(VIEWPORTS[viewport_name])
    console_errors = attach_console_capture(page)

    safe_step("Login/signup", login_or_signup, page, console_errors)
    safe_step(
        "Onboarding afronden",
        complete_onboarding_if_needed,
        page,
        viewport_name,
        console_errors,
    )

    visit(page, f"{BASE_URL}/dashboard", "dashboard-overzicht", viewport_name, console_errors)

    if viewport_name == "desktop":
        tool_id = safe_step(
            "Eerste tool ophalen/aanmaken",
            get_or_create_first_tool_id,
            page,
            viewport_name,
            console_errors,
        )
        tool_id_holder["id"] = tool_id
    else:
        tool_id = tool_id_holder.get("id")

    if tool_id:
        safe_step("Tool volledig doorlopen", explore_tool, page, tool_id, viewport_name, console_errors)
    else:
        print("  Geen tool-id beschikbaar — tool-secties overgeslagen.")

    safe_step("Leads doorlopen", explore_leads, page, viewport_name, console_errors)

    visit(page, f"{BASE_URL}/dashboard/abonnement", "abonnement", viewport_name, console_errors)
    visit(page, f"{BASE_URL}/dashboard/profiel", "profiel", viewport_name, console_errors)

    if viewport_name == "desktop" and tool_id:
        safe_step(
            "Publieke rekentool + testaanvraag",
            submit_test_lead_via_public_tool,
            page,
            tool_id,
            viewport_name,
            console_errors,
        )

    page.close()


def main():
    OUT_DIR.mkdir(exist_ok=True)
    tool_id_holder: dict = {}

    with sync_playwright() as p:
        launch_kwargs = {"headless": True}
        if Path(CHROMIUM_PATH).exists():
            launch_kwargs["executable_path"] = CHROMIUM_PATH
        browser = p.chromium.launch(**launch_kwargs)
        context = browser.new_context()

        # Desktop eerst (maakt/onthoudt de tool-id), dan mobiel opnieuw
        # inloggen in een verse context zodat viewport-specifiek
        # responsive gedrag (niet enkel CSS resize) echt getest wordt.
        run_for_viewport(context, "desktop", tool_id_holder)
        context.close()

        context2 = browser.new_context()
        run_for_viewport(context2, "mobiel", tool_id_holder)
        context2.close()

        browser.close()

    (OUT_DIR / "findings.json").write_text(json.dumps(findings, indent=2, ensure_ascii=False))
    print(f"\nKlaar. {len(findings)} schermen/stappen gelogd in ux-audit/findings.json")
    print("Vul ux-audit/report.md in op basis van findings.json + de screenshots.")


if __name__ == "__main__":
    main()
