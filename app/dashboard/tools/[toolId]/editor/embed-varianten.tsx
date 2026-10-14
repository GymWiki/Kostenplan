"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CopyButton } from "@/app/components/dashboard/copy-link";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input, Select } from "@/app/components/ui/input";
import { Sheet } from "@/app/components/ui/sheet";
import { bouwEmbedCode, variantQuery, type EmbedCodeOpties } from "@/app/lib/embed-code";
import { KNOP_POSITIES, WEERGAVEN, WEERGAVE_LABEL, type KnopPositie, type Plaatsing, type Weergave } from "@/app/lib/weergave/config";
import { slugVan, zuiverVariant, type EmbedVariant } from "@/app/lib/weergave/embed-opties";

// Varianten van de embedcode voor andere plekken op de site, bijv. "Alleen schutting, in de pagina" voor de schuttingpagina.
// Elke variant heeft een eigen code en een voorbeeld. Ze staan alleen in deze browser: de code zelf is wat telt.
type Variant = { id: string; naam: string; weergave: Weergave | ""; plaatsing: Plaatsing | ""; knopTekst: string; knopPositie: KnopPositie | ""; onderdelen: string[] };

const sleutel = (toolId: string) => `kp:varianten:${toolId}`;

function lees(toolId: string): Variant[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(sleutel(toolId)) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string" && typeof x.naam === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}

function naarVariant(v: Variant): EmbedVariant {
  return zuiverVariant({
    weergave: v.weergave || undefined,
    plaatsing: v.plaatsing || undefined,
    knopTekst: v.plaatsing === "popup" ? v.knopTekst : undefined,
    knopPositie: v.plaatsing === "popup" ? v.knopPositie || undefined : undefined,
    onderdelen: v.onderdelen,
  });
}

export function EmbedVarianten({ toolId, opties, producten, live }: { toolId: string; opties: EmbedCodeOpties; producten: { id: string; naam: string }[]; live: boolean }) {
  const [varianten, setVarianten] = useState<Variant[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [voorbeeld, setVoorbeeld] = useState<Variant | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setVarianten(lees(toolId));
      setGeladen(true);
    });
  }, [toolId]);
  useEffect(() => {
    if (!geladen) return;
    try {
      window.localStorage.setItem(sleutel(toolId), JSON.stringify(varianten));
    } catch {
      // opslag geblokkeerd: de varianten blijven alleen zolang dit scherm open is
    }
  }, [geladen, toolId, varianten]);

  const wijzig = (id: string, patch: Partial<Variant>) => setVarianten((l) => l.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const voegToe = () =>
    setVarianten((l) => [...l, { id: Math.random().toString(36).slice(2, 10), naam: `Variant ${l.length + 1}`, weergave: "", plaatsing: "", knopTekst: "", knopPositie: "", onderdelen: [] }]);

  return (
    <section aria-labelledby="varianten-titel" className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div>
        <h3 id="varianten-titel" className="font-bold text-foreground">
          Varianten voor andere plekken
        </h3>
        <p className="text-sm text-muted-foreground">Bijvoorbeeld alleen je schutting op de schuttingpagina. Elke variant heeft een eigen code.</p>
      </div>
      {varianten.map((v) => {
        const variant = naarVariant(v);
        const code = bouwEmbedCode({ ...opties, variant });
        return (
          <div key={v.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex items-end gap-2">
              <Field label="Naam van de variant" htmlFor={`var-${v.id}-naam`} className="flex-1">
                <Input id={`var-${v.id}-naam`} value={v.naam} maxLength={60} onChange={(e) => wijzig(v.id, { naam: e.target.value })} />
              </Field>
              <Button type="button" variant="ghost" size="icon" aria-label={`${v.naam} verwijderen`} onClick={() => setVarianten((l) => l.filter((x) => x.id !== v.id))}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Weergave" htmlFor={`var-${v.id}-weergave`}>
                <Select id={`var-${v.id}-weergave`} value={v.weergave} onChange={(e) => wijzig(v.id, { weergave: e.target.value as Weergave | "" })}>
                  <option value="">Zoals ingesteld</option>
                  {WEERGAVEN.map((w) => (
                    <option key={w} value={w}>
                      {WEERGAVE_LABEL[w]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Plaatsing" htmlFor={`var-${v.id}-plaatsing`}>
                <Select id={`var-${v.id}-plaatsing`} value={v.plaatsing} onChange={(e) => wijzig(v.id, { plaatsing: e.target.value as Plaatsing | "" })}>
                  <option value="">In de pagina</option>
                  <option value="popup">Knop met pop-up</option>
                </Select>
              </Field>
            </div>
            {v.plaatsing === "popup" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tekst op de knop" htmlFor={`var-${v.id}-knop`}>
                  <Input id={`var-${v.id}-knop`} value={v.knopTekst} maxLength={40} placeholder="Bereken je prijs" onChange={(e) => wijzig(v.id, { knopTekst: e.target.value })} />
                </Field>
                <Field label="Waar staat de knop?" htmlFor={`var-${v.id}-positie`}>
                  <Select id={`var-${v.id}-positie`} value={v.knopPositie} onChange={(e) => wijzig(v.id, { knopPositie: e.target.value as KnopPositie | "" })}>
                    <option value="">Rechtsonder in beeld</option>
                    {KNOP_POSITIES.map((k) => (
                      <option key={k} value={k}>
                        {k === "rechtsonder" ? "Rechtsonder in beeld" : k === "linksonder" ? "Linksonder in beeld" : "In de pagina, op de plek van de code"}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            <Field label="Welke onderdelen?" as="fieldset" hint={v.onderdelen.length === 1 ? "Eén onderdeel: je klant ziet meteen de berekening, zonder keuzescherm." : "Niets aangevinkt: alle onderdelen."}>
              <div className="flex flex-col">
                {producten.map((p) => (
                  <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={v.onderdelen.includes(p.id)}
                      onChange={(e) => wijzig(v.id, { onderdelen: e.target.checked ? [...v.onderdelen, p.id] : v.onderdelen.filter((x) => x !== p.id) })}
                    />
                    {p.naam}
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex flex-col gap-2">
              <label htmlFor={`var-${v.id}-code`} className="text-sm font-semibold text-foreground">
                Code
              </label>
              <textarea id={`var-${v.id}-code`} readOnly value={code} rows={5} className="w-full rounded-md border border-input bg-muted p-2 font-mono text-xs text-foreground" />
              <div className="flex flex-wrap gap-2">
                <CopyButton text={code} label="Kopieer code" />
                <Button type="button" variant="secondary" onClick={() => setVoorbeeld(v)} disabled={!live}>
                  Voorbeeld
                </Button>
              </div>
              {!live && <p className="text-sm text-muted-foreground">Zet je rekentool eerst live om een voorbeeld te zien.</p>}
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" className="self-start" onClick={voegToe}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Variant maken
      </Button>
      {producten.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-foreground">Rechtstreeks naar een onderdeel linken</summary>
          <p>
            Zet <code>?kp=naam</code> achter het adres van je pagina, of <code>#naam</code>, en dat onderdeel staat meteen open. Bijvoorbeeld:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {producten.map((p) => (
              <li key={p.id}>
                {p.naam}: <code>?kp={slugVan(p.naam)}</code>
              </li>
            ))}
          </ul>
        </details>
      )}
      <Sheet open={voorbeeld !== null} onClose={() => setVoorbeeld(null)} title={voorbeeld ? `Voorbeeld: ${voorbeeld.naam}` : "Voorbeeld"} className="sm:max-w-3xl">
        {voorbeeld && (
          <iframe
            title={`Voorbeeld: ${voorbeeld.naam}`}
            src={`${opties.baseUrl}/embed/${toolId}${variantQuery(naarVariant(voorbeeld))}`}
            className="h-[70dvh] w-full rounded-md border border-border bg-white"
          />
        )}
      </Sheet>
    </section>
  );
}
