-- CreateEnum
CREATE TYPE "ServicePrijsType" AS ENUM ('UURTARIEF', 'VASTE_PRIJS');

-- AlterTable: add the new per-product transport column first (default 0)
ALTER TABLE "Product" ADD COLUMN     "transportkosten" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: carry over each user's old universal VAST transport rate onto
-- their existing products, so switching to per-product transport doesn't
-- silently zero out pricing that was already live. PER_KM rates have no
-- equivalent flat per-product amount, so those are left at the 0 default.
UPDATE "Product" p
SET "transportkosten" = cs."transportTarief"
FROM "CostSettings" cs
WHERE cs."userId" = p."userId"
  AND cs."transportEnabled" = true
  AND cs."transportType" = 'VAST';

-- AlterTable: drop the now-universal transport rate/type from CostSettings
ALTER TABLE "CostSettings" DROP COLUMN "transportTarief",
DROP COLUMN "transportType";

-- AlterTable: restructure Service around arbeid (uurtarief or vaste prijs)
-- instead of the product-like eenheid/arbeidstijd/materiaalkosten model.
ALTER TABLE "Service" DROP COLUMN "arbeidstijd",
DROP COLUMN "eenheid",
DROP COLUMN "materiaalkosten",
ADD COLUMN     "geschatteUren" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "prijsType" "ServicePrijsType" NOT NULL DEFAULT 'UURTARIEF',
ADD COLUMN     "uurtarief" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vastePrijs" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "TransportType";
