-- CreateEnum
CREATE TYPE "PrijsType" AS ENUM ('VAST', 'BANDBREEDTE');

-- CreateEnum
CREATE TYPE "BandbreedteModus" AS ENUM ('GEEN', 'PER_PRODUCT', 'TOTAAL');

-- AlterTable
ALTER TABLE "CostSettings" ADD COLUMN     "bandbreedteMargeOmhoog" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "bandbreedteMargeOmlaag" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "bandbreedteModus" "BandbreedteModus" NOT NULL DEFAULT 'GEEN';

-- AlterTable
ALTER TABLE "MaterialOption" ADD COLUMN     "prijsMax" DOUBLE PRECISION,
ADD COLUMN     "prijsMin" DOUBLE PRECISION,
ADD COLUMN     "prijsType" "PrijsType" NOT NULL DEFAULT 'VAST';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "bandbreedteType" "PrijsType" NOT NULL DEFAULT 'VAST',
ADD COLUMN     "geschatteUrenMax" DOUBLE PRECISION,
ADD COLUMN     "geschatteUrenMin" DOUBLE PRECISION,
ADD COLUMN     "vastePrijsMax" DOUBLE PRECISION,
ADD COLUMN     "vastePrijsMin" DOUBLE PRECISION;
