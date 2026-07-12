-- CreateEnum
CREATE TYPE "ArbeidStapEenheid" AS ENUM ('UUR', 'DAGDEEL', 'DAG');

-- AlterTable
ALTER TABLE "CostSettings" ADD COLUMN     "arbeidStapEenheid" "ArbeidStapEenheid" NOT NULL DEFAULT 'UUR';

-- AlterTable
ALTER TABLE "MaterialOption" ADD COLUMN     "stapgrootte" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "arbeidsCapaciteit" DOUBLE PRECISION;

-- AlterTable
-- Renamed (not dropped) so existing arbeidsuren values are preserved — they
-- are numerically equivalent under the default arbeidStapEenheid (UUR).
ALTER TABLE "Service" RENAME COLUMN "arbeidsuren" TO "arbeidstijd";
