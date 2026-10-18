"use client";

import type { RekenEenheidSamenvatting } from "@/app/lib/actions/werktempo";
import { EENHEID_NAAM, formatWerktempo, type WerktempoEenheid } from "@/app/lib/werktempo";
import { formatCurrency } from "@/app/lib/format";

const meervoud = (n: number, een: string, meer: string) => `${n} ${n === 1 ? een : meer}`;

// Wat er bij een wissel van rekeneenheid verandert, over alle rekentools heen.
export function EenheidWisselUitleg({ naar, tools }: { naar: WerktempoEenheid; tools: RekenEenheidSamenvatting[] }) {
  const van = tools[0]?.van ?? naar;
  const mee = tools.reduce((s, t) => s + t.aantalMeeveranderend, 0);
  const behouden = tools.reduce((s, t) => s + t.aantalBehouden, 0);
  const voorbeeld = tools.find((t) => t.voorbeeld)?.voorbeeld;
  return (
    <>
      <p>
        Je rekent nu per <strong>{EENHEID_NAAM[van].enkelvoud}</strong> en straks per <strong>{EENHEID_NAAM[naar].enkelvoud}</strong>. De prijzen veranderen niet: je tarief en het werktempo van je onderdelen worden omgerekend.
      </p>
      {tools[0] && (
        <p>
          Je tarief wordt <strong>{formatCurrency(tools[0].nieuwTarief)}</strong> per {EENHEID_NAAM[naar].enkelvoud}.
        </p>
      )}
      <p>
        <strong>{meervoud(mee, "onderdeel rekent", "onderdelen rekenen")}</strong> mee met deze instelling en {mee === 1 ? "wordt" : "worden"} omgerekend
        {voorbeeld && (
          <>
            {" "}
            (bijvoorbeeld {voorbeeld.naam}: {formatWerktempo(voorbeeld.van)} per {EENHEID_NAAM[van].enkelvoud} wordt {formatWerktempo(voorbeeld.naar)} per {EENHEID_NAAM[naar].enkelvoud})
          </>
        )}
        .
      </p>
      {behouden > 0 && (
        <p>
          <strong>{meervoud(behouden, "onderdeel heeft", "onderdelen hebben")}</strong> een eigen eenheid en {behouden === 1 ? "blijft" : "blijven"} zoals {behouden === 1 ? "het is" : "ze zijn"}.
        </p>
      )}
    </>
  );
}

