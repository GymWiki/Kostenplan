"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, EyeOff } from "lucide-react";
import type { CalculatorField, DerivedVariable, Expression, PriceRule, PriceRuleCategory, StaffelSchijf } from "@/app/lib/calculator-engine";
import { RUNNING_SUBTOTAL_VARIABLE } from "@/app/lib/calculator-engine";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Overlay } from "@/app/components/ui/overlay";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { HelpTip } from "@/app/components/ui/help-tip";
import { beschikbareVariabelen, numeriekeVariabelen } from "./variabelen-utils";

type BouwbaarType = "VAST" | "PER_EENHEID" | "PERCENTAGE" | "TOESLAG" | "KORTING" | "STAFFEL";

const TYPE_LABELS: Record<BouwbaarType, string> = {
  VAST: "Vast bedrag",
  PER_EENHEID: "Aantal × prijs per eenheid",
  PERCENTAGE: "Percentage van het bedrag tot nu toe",
  TOESLAG: "Toeslag (erbij)",
  KORTING: "Korting (eraf)",
  STAFFEL: "Staffelprijs (per schijf)",
};

const CATEGORIE_LABELS: Record<PriceRuleCategory, string> = {
  MATERIAAL: "Materiaal",
  ARBEID: "Arbeid",
  TRANSPORT: "Transport",
  TOESLAG: "Toeslag",
  KORTING: "Korting",
  OVERIG: "Overig",
};

const COMPARATOR_LABELS: Record<string, string> = {
  GELIJK_AAN: "is gelijk aan",
  NIET_GELIJK_AAN: "is niet gelijk aan",
  GROTER_DAN: "is meer dan",
  KLEINER_DAN: "is minder dan",
  GROTER_OF_GELIJK: "is meer dan of gelijk aan",
  KLEINER_OF_GELIJK: "is minder dan of gelijk aan",
};

export function RegelsTab({
  velden,
  afgeleideVariabelen,
  regels,
  onChange,
}: {
  velden: CalculatorField[];
  afgeleideVariabelen: DerivedVariable[];
  regels: PriceRule[];
  onChange: (regels: PriceRule[]) => void;
}) {
  const [bewerkRegel, setBewerkRegel] = useState<PriceRule | "nieuw" | null>(null);
  const [verwijderRegel, setVerwijderRegel] = useState<PriceRule | null>(null);
  const variabelen = beschikbareVariabelen(velden, afgeleideVariabelen);

  function verplaats(index: number, richting: -1 | 1) {
    const nieuw = [...regels];
    const doel = index + richting;
    if (doel < 0 || doel >= nieuw.length) return;
    [nieuw[index], nieuw[doel]] = [nieuw[doel], nieuw[index]];
    onChange(nieuw);
  }

  function opslaan(regel: PriceRule) {
    const bestaatAl = regels.some((r) => r.id === regel.id);
    onChange(bestaatAl ? regels.map((r) => (r.id === regel.id ? regel : r)) : [...regels, regel]);
    setBewerkRegel(null);
  }

  function verwijder(regel: PriceRule) {
    onChange(regels.filter((r) => r.id !== regel.id));
    setVerwijderRegel(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Berekening</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hoe wordt de prijs berekend? Elke regel telt op bij het totaal.</p>
        </div>
        <Button type="button" onClick={() => setBewerkRegel("nieuw")} disabled={velden.length === 0}>
          <Plus className="h-4 w-4" />
          Prijsregel toevoegen
        </Button>
      </div>

      {velden.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          Voeg eerst een vraag toe op het tabblad &ldquo;Vragen&rdquo; — een prijsregel heeft meestal een vraag nodig om mee te rekenen.
        </p>
      )}

      {regels.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nog geen prijsregels. Voeg je eerste regel toe, bijv. &ldquo;Materiaal: oppervlakte × prijs per m²&rdquo;.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {regels.map((regel, i) => (
            <Card key={regel.id} className={!regel.actief ? "opacity-60" : undefined}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                    {regel.label}
                    {regel.intern && <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Alleen voor jou zichtbaar" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIE_LABELS[regel.categorie]}
                    {regel.voorwaarde && " · heeft een voorwaarde"}
                    {!regel.actief && " · uitgeschakeld"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => verplaats(i, -1)} disabled={i === 0} aria-label="Omhoog">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => verplaats(i, 1)} disabled={i === regels.length - 1} aria-label="Omlaag">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setBewerkRegel(regel)} aria-label="Bewerken">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setVerwijderRegel(regel)} aria-label="Verwijderen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {bewerkRegel && (
        <RegelFormModal
          regel={bewerkRegel === "nieuw" ? null : bewerkRegel}
          variabelen={variabelen}
          bestaandeIds={new Set(regels.map((r) => r.id).filter((id) => bewerkRegel === "nieuw" || id !== (bewerkRegel as PriceRule).id))}
          onClose={() => setBewerkRegel(null)}
          onSave={opslaan}
        />
      )}

      <ConfirmDialog
        open={verwijderRegel != null}
        onClose={() => setVerwijderRegel(null)}
        onConfirm={() => verwijderRegel && verwijder(verwijderRegel)}
        title={`"${verwijderRegel?.label}" verwijderen?`}
        description="Deze prijsregel telt hierna niet meer mee in de berekening."
      />
    </div>
  );
}

function nieuwRegelId(bestaandeIds: Set<string>): string {
  let i = 1;
  while (bestaandeIds.has(`regel${i}`)) i += 1;
  return `regel${i}`;
}

type EenvoudigeVoorwaarde = { variabele: string; operator: keyof typeof COMPARATOR_LABELS; waarde: string };

function ontleedVoorwaarde(expr: Expression | undefined): EenvoudigeVoorwaarde | null {
  if (!expr) return null;
  if (!(expr.kind in COMPARATOR_LABELS)) return null;
  const e = expr as Extract<Expression, { links: Expression; rechts: Expression }>;
  if (e.links.kind !== "VARIABELE") return null;
  const rechts = e.rechts;
  const waarde = rechts.kind === "GETAL" ? String(rechts.waarde) : rechts.kind === "TEKST" ? rechts.waarde : rechts.kind === "BOOLEAN" ? String(rechts.waarde) : "";
  return { variabele: e.links.naam, operator: expr.kind as EenvoudigeVoorwaarde["operator"], waarde };
}

function bouwVoorwaarde(v: EenvoudigeVoorwaarde, type: "NUMBER" | "OPTION" | "BOOLEAN"): Expression {
  const rechts: Expression =
    type === "NUMBER"
      ? { kind: "GETAL", waarde: Number(v.waarde) || 0 }
      : type === "BOOLEAN"
        ? { kind: "BOOLEAN", waarde: v.waarde === "waar" }
        : { kind: "TEKST", waarde: v.waarde };
  return { kind: v.operator, links: { kind: "VARIABELE", naam: v.variabele }, rechts } as Expression;
}

function RegelFormModal({
  regel,
  variabelen,
  bestaandeIds,
  onClose,
  onSave,
}: {
  regel: PriceRule | null;
  variabelen: ReturnType<typeof beschikbareVariabelen>;
  bestaandeIds: Set<string>;
  onClose: () => void;
  onSave: (regel: PriceRule) => void;
}) {
  const bestaandType: BouwbaarType = regel && regel.type !== "FORMULE" ? regel.type : "VAST";
  const [type, setType] = useState<BouwbaarType>(bestaandType);
  const [label, setLabel] = useState(regel?.label ?? "");
  const [categorie, setCategorie] = useState<PriceRuleCategory>(regel?.categorie ?? "MATERIAAL");
  const [actief, setActief] = useState(regel?.actief ?? true);
  const [intern, setIntern] = useState(regel?.intern ?? false);
  const [toonInUitsplitsing, setToonInUitsplitsing] = useState(regel?.toonInUitsplitsing ?? true);

  const [bedrag, setBedrag] = useState(regel && "bedrag" in regel && regel.bedrag?.kind === "GETAL" ? String(regel.bedrag.waarde) : "");
  const [hoeveelheidVariabele, setHoeveelheidVariabele] = useState(
    regel && "hoeveelheid" in regel && regel.hoeveelheid.kind === "VARIABELE" ? regel.hoeveelheid.naam : (numeriekeVariabelen(variabelen)[0]?.naam ?? "")
  );
  const [prijsPerEenheid, setPrijsPerEenheid] = useState(
    regel && regel.type === "PER_EENHEID" && regel.prijsPerEenheid.kind === "GETAL" ? String(regel.prijsPerEenheid.waarde) : ""
  );
  const [prijsPerEenheidVariabele, setPrijsPerEenheidVariabele] = useState(
    regel && regel.type === "PER_EENHEID" && regel.prijsPerEenheid.kind === "VARIABELE" ? regel.prijsPerEenheid.naam : ""
  );
  const [prijsBron, setPrijsBron] = useState<"vast" | "variabele">(
    regel && regel.type === "PER_EENHEID" && regel.prijsPerEenheid.kind === "VARIABELE" ? "variabele" : "vast"
  );
  const [eenheid, setEenheid] = useState(regel && "eenheid" in regel ? regel.eenheid : "");
  const [percentage, setPercentage] = useState(
    regel?.type === "PERCENTAGE" && regel.percentage.kind === "GETAL" ? String(regel.percentage.waarde) : ""
  );
  const [kortingType, setKortingType] = useState<"percentage" | "bedrag">(regel?.type === "KORTING" && regel.bedrag ? "bedrag" : "percentage");
  const [kortingWaarde, setKortingWaarde] = useState(
    regel?.type === "KORTING"
      ? regel.percentage?.kind === "GETAL"
        ? String(regel.percentage.waarde)
        : regel.bedrag?.kind === "GETAL"
          ? String(regel.bedrag.waarde)
          : ""
      : ""
  );
  const [schijven, setSchijven] = useState<{ tot: string; prijsPerEenheid: string }[]>(
    regel?.type === "STAFFEL" ? regel.schijven.map((s) => ({ tot: s.tot == null ? "" : String(s.tot), prijsPerEenheid: String(s.prijsPerEenheid) })) : []
  );

  const bestaandeVoorwaarde = ontleedVoorwaarde(regel?.voorwaarde);
  const [heeftVoorwaarde, setHeeftVoorwaarde] = useState(bestaandeVoorwaarde != null);
  const [voorwaardeVariabele, setVoorwaardeVariabele] = useState(bestaandeVoorwaarde?.variabele ?? variabelen[0]?.naam ?? "");
  const [voorwaardeOperator, setVoorwaardeOperator] = useState<EenvoudigeVoorwaarde["operator"]>(bestaandeVoorwaarde?.operator ?? "GELIJK_AAN");
  const [voorwaardeWaarde, setVoorwaardeWaarde] = useState(bestaandeVoorwaarde?.waarde ?? "");

  const [fout, setFout] = useState<string | null>(null);

  const voorwaardeVeld = variabelen.find((v) => v.naam === voorwaardeVariabele);
  const numerieke = numeriekeVariabelen(variabelen);

  function handleOpslaan() {
    if (!label.trim()) {
      setFout("Vul een naam voor deze prijsregel in.");
      return;
    }

    let voorwaarde: Expression | undefined;
    if (heeftVoorwaarde && voorwaardeVeld) {
      voorwaarde = bouwVoorwaarde(
        { variabele: voorwaardeVariabele, operator: voorwaardeOperator, waarde: voorwaardeWaarde },
        voorwaardeVeld.type === "NUMBER" ? "NUMBER" : voorwaardeVeld.type === "BOOLEAN" ? "BOOLEAN" : "OPTION"
      );
    }

    const id = regel?.id ?? nieuwRegelId(bestaandeIds);
    const basis = { id, label: label.trim(), categorie, actief, intern, toonInUitsplitsing, voorwaarde };

    if (type === "STAFFEL") {
      const geldigeSchijven: StaffelSchijf[] = schijven
        .map((s) => ({ tot: s.tot.trim() === "" ? null : Number(s.tot), prijsPerEenheid: Number(s.prijsPerEenheid) || 0 }))
        .filter((s) => Number.isFinite(s.prijsPerEenheid));
      if (geldigeSchijven.length === 0) {
        setFout("Voeg minimaal één schijf toe.");
        return;
      }
      if (!hoeveelheidVariabele) {
        setFout("Kies een vraag om de hoeveelheid uit af te leiden.");
        return;
      }
      onSave({
        ...basis,
        type: "STAFFEL",
        hoeveelheid: { kind: "VARIABELE", naam: hoeveelheidVariabele },
        eenheid: eenheid || "stuks",
        schijven: geldigeSchijven,
      });
      return;
    }

    switch (type) {
      case "VAST":
        onSave({ ...basis, type: "VAST", bedrag: { kind: "GETAL", waarde: Number(bedrag) || 0 } });
        return;
      case "TOESLAG":
        onSave({ ...basis, type: "TOESLAG", bedrag: { kind: "GETAL", waarde: Number(bedrag) || 0 } });
        return;
      case "PERCENTAGE":
        onSave({
          ...basis,
          type: "PERCENTAGE",
          basis: { kind: "VARIABELE", naam: RUNNING_SUBTOTAL_VARIABLE },
          percentage: { kind: "GETAL", waarde: Number(percentage) || 0 },
        });
        return;
      case "KORTING":
        onSave({
          ...basis,
          type: "KORTING",
          percentage: kortingType === "percentage" ? { kind: "GETAL", waarde: Number(kortingWaarde) || 0 } : undefined,
          bedrag: kortingType === "bedrag" ? { kind: "GETAL", waarde: Number(kortingWaarde) || 0 } : undefined,
        });
        return;
      case "PER_EENHEID": {
        if (!hoeveelheidVariabele) {
          setFout("Kies een vraag om de hoeveelheid uit af te leiden.");
          return;
        }
        const prijsExpr: Expression =
          prijsBron === "variabele" && prijsPerEenheidVariabele
            ? { kind: "VARIABELE", naam: prijsPerEenheidVariabele }
            : { kind: "GETAL", waarde: Number(prijsPerEenheid) || 0 };
        onSave({
          ...basis,
          type: "PER_EENHEID",
          hoeveelheid: { kind: "VARIABELE", naam: hoeveelheidVariabele },
          prijsPerEenheid: prijsExpr,
          eenheid: eenheid || "stuks",
        });
        return;
      }
    }
  }

  return (
    <Overlay open onClose={onClose} ariaLabel="Prijsregel bewerken" className="flex items-center justify-center p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">{regel ? "Prijsregel bewerken" : "Prijsregel toevoegen"}</h3>

        {fout && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{fout}</p>}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="regel-label">Naam</Label>
          <Input id="regel-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Bijv. Materiaal" autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="regel-type">Hoe wordt dit berekend?</Label>
            <Select id="regel-type" value={type} onChange={(e) => setType(e.target.value as BouwbaarType)} disabled={regel != null}>
              {Object.entries(TYPE_LABELS).map(([waarde, tekst]) => (
                <option key={waarde} value={waarde}>
                  {tekst}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="regel-categorie">Categorie</Label>
            <Select id="regel-categorie" value={categorie} onChange={(e) => setCategorie(e.target.value as PriceRuleCategory)}>
              {Object.entries(CATEGORIE_LABELS).map(([waarde, tekst]) => (
                <option key={waarde} value={waarde}>
                  {tekst}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {type === "VAST" && (
          <Bedragveld label="Bedrag" waarde={bedrag} onChange={setBedrag} />
        )}
        {type === "TOESLAG" && <Bedragveld label="Toeslagbedrag" waarde={bedrag} onChange={setBedrag} />}

        {type === "PER_EENHEID" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regel-hoeveelheid">Hoeveelheid (welke vraag?)</Label>
              <Select id="regel-hoeveelheid" value={hoeveelheidVariabele} onChange={(e) => setHoeveelheidVariabele(e.target.value)}>
                {numerieke.map((v) => (
                  <option key={v.naam} value={v.naam}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Prijs per eenheid</Label>
              <div className="flex gap-2 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={prijsBron === "vast"} onChange={() => setPrijsBron("vast")} className="accent-primary" />
                  Vast bedrag
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={prijsBron === "variabele"} onChange={() => setPrijsBron("variabele")} className="accent-primary" />
                  Prijs van een materiaalkeuze
                </label>
              </div>
              {prijsBron === "vast" ? (
                <Bedragveld label="" waarde={prijsPerEenheid} onChange={setPrijsPerEenheid} />
              ) : (
                <Select value={prijsPerEenheidVariabele} onChange={(e) => setPrijsPerEenheidVariabele(e.target.value)}>
                  <option value="" disabled>
                    Kies een materiaalkeuze
                  </option>
                  {variabelen
                    .filter((v) => v.naam.endsWith("Prijs"))
                    .map((v) => (
                      <option key={v.naam} value={v.naam}>
                        {v.label}
                      </option>
                    ))}
                </Select>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regel-eenheid">Eenheid</Label>
              <Input id="regel-eenheid" value={eenheid} onChange={(e) => setEenheid(e.target.value)} placeholder="Bijv. meter, m², uur" />
            </div>
          </>
        )}

        {type === "PERCENTAGE" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="regel-percentage">Percentage van het bedrag tot nu toe</Label>
            <div className="relative">
              <DecimalInput id="regel-percentage" value={percentage} onChange={(e) => setPercentage(e.target.value)} className="pr-8" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
        )}

        {type === "KORTING" && (
          <div className="flex flex-col gap-2">
            <Label>Korting</Label>
            <div className="flex gap-2 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={kortingType === "percentage"} onChange={() => setKortingType("percentage")} className="accent-primary" />
                Percentage
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={kortingType === "bedrag"} onChange={() => setKortingType("bedrag")} className="accent-primary" />
                Vast bedrag
              </label>
            </div>
            <div className="relative">
              <DecimalInput value={kortingWaarde} onChange={(e) => setKortingWaarde(e.target.value)} className={kortingType === "percentage" ? "pr-8" : "pl-7"} />
              {kortingType === "percentage" ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              ) : (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              )}
            </div>
          </div>
        )}

        {type === "STAFFEL" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regel-staffel-hoeveelheid">Hoeveelheid (welke vraag?)</Label>
              <Select id="regel-staffel-hoeveelheid" value={hoeveelheidVariabele} onChange={(e) => setHoeveelheidVariabele(e.target.value)}>
                {numerieke.map((v) => (
                  <option key={v.naam} value={v.naam}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regel-staffel-eenheid">Eenheid</Label>
              <Input id="regel-staffel-eenheid" value={eenheid} onChange={(e) => setEenheid(e.target.value)} placeholder="Bijv. meter" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5">
                <Label>Schijven</Label>
                <HelpTip contentKey="kosteninstellingen.bandbreedteModus" />
              </span>
              {schijven.map((schijf, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0 text-muted-foreground">t/m</span>
                  <Input
                    value={schijf.tot}
                    onChange={(e) => {
                      const nieuw = [...schijven];
                      nieuw[i] = { ...schijf, tot: e.target.value };
                      setSchijven(nieuw);
                    }}
                    placeholder="onbeperkt"
                    className="w-24"
                  />
                  <span className="shrink-0 text-muted-foreground">à €</span>
                  <DecimalInput
                    value={schijf.prijsPerEenheid}
                    onChange={(e) => {
                      const nieuw = [...schijven];
                      nieuw[i] = { ...schijf, prijsPerEenheid: e.target.value };
                      setSchijven(nieuw);
                    }}
                    className="w-24"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSchijven(schijven.filter((_, j) => j !== i))} aria-label="Verwijderen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setSchijven([...schijven, { tot: "", prijsPerEenheid: "" }])}>
                <Plus className="h-3.5 w-3.5" />
                Schijf toevoegen
              </Button>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Alleen toepassen onder een voorwaarde</span>
            <Switch checked={heeftVoorwaarde} onChange={(e) => setHeeftVoorwaarde(e.target.checked)} />
          </label>
          {heeftVoorwaarde && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">Als</span>
                <Select value={voorwaardeVariabele} onChange={(e) => setVoorwaardeVariabele(e.target.value)} className="flex-1">
                  {variabelen.map((v) => (
                    <option key={v.naam} value={v.naam}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </div>
              {voorwaardeVeld?.type === "BOOLEAN" ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 text-muted-foreground">is</span>
                  <Select value={voorwaardeWaarde || "waar"} onChange={(e) => setVoorwaardeWaarde(e.target.value)} className="flex-1">
                    <option value="waar">aan</option>
                    <option value="onwaar">uit</option>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Select value={voorwaardeOperator} onChange={(e) => setVoorwaardeOperator(e.target.value as EenvoudigeVoorwaarde["operator"])} className="flex-1">
                      {Object.entries(COMPARATOR_LABELS)
                        .filter(([k]) => voorwaardeVeld?.type === "NUMBER" || k === "GELIJK_AAN" || k === "NIET_GELIJK_AAN")
                        .map(([waarde, tekst]) => (
                          <option key={waarde} value={waarde}>
                            {tekst}
                          </option>
                        ))}
                    </Select>
                  </div>
                  {voorwaardeVeld?.type === "OPTION" && voorwaardeVeld.opties ? (
                    <Select value={voorwaardeWaarde} onChange={(e) => setVoorwaardeWaarde(e.target.value)}>
                      <option value="" disabled>
                        Kies een optie
                      </option>
                      {voorwaardeVeld.opties.map((optie) => (
                        <option key={optie.waarde} value={optie.waarde}>
                          {optie.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <DecimalInput value={voorwaardeWaarde} onChange={(e) => setVoorwaardeWaarde(e.target.value)} />
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Zichtbaar in de kostenuitsplitsing</span>
            <Switch checked={toonInUitsplitsing} onChange={(e) => setToonInUitsplitsing(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              Alleen voor jou zichtbaar (marge/inkoopprijs)
              <HelpTip contentKey="kosteninstellingen.zichtbaarVsActief" />
            </span>
            <Switch checked={intern} onChange={(e) => setIntern(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Ingeschakeld</span>
            <Switch checked={actief} onChange={(e) => setActief(e.target.checked)} />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="button" onClick={handleOpslaan}>
            Opslaan
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

function Bedragveld({ label, waarde, onChange }: { label: string; waarde: string; onChange: (waarde: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
        <DecimalInput value={waarde} onChange={(e) => onChange(e.target.value)} className="pl-7" />
      </div>
    </div>
  );
}
