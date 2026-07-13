-- AlterTable
ALTER TABLE "CostSettings" ADD COLUMN     "arbeidTariefPerProduct" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "materiaalMargePerProduct" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "arbeidTariefOverride" DOUBLE PRECISION,
ADD COLUMN     "materiaalMargeOverride" DOUBLE PRECISION;
