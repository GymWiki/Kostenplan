-- Werktempo per product in uur, dagdeel of dag, en per hovenier wat een dagdeel en een dag in uren zijn.
-- Alleen nieuwe kolommen met een standaard (dagdeel 4 uur, dag 8 uur: wat de rekentool altijd al aannam) of leeg (= volg de rekentool):
-- bestaande gegevens en prijzen veranderen niet. Terugdraaien kan door de drie kolommen te verwijderen.
ALTER TABLE "Company" ADD COLUMN "urenPerDagdeel" DOUBLE PRECISION NOT NULL DEFAULT 4,
ADD COLUMN "urenPerDag" DOUBLE PRECISION NOT NULL DEFAULT 8;

ALTER TABLE "Product" ADD COLUMN "werktempoEenheid" "ArbeidStapEenheid";
