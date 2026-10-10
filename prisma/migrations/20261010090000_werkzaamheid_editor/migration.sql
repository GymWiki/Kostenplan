-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "transportPerDag" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MaterialOption" ADD COLUMN     "isVoorbeeld" BOOLEAN NOT NULL DEFAULT false;
