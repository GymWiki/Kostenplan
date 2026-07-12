/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `prijs` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_userId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_categoryId_fkey";

-- AlterTable
ALTER TABLE "CostSettings" ADD COLUMN     "arbeidZichtbaar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "materiaalZichtbaar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "transportZichtbaar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "voorrijZichtbaar" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId",
DROP COLUMN "prijs",
ALTER COLUMN "eenheid" SET DEFAULT 'm1';

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "categoryId";

-- DropTable
DROP TABLE "Category";

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialOption" (
    "id" TEXT NOT NULL,
    "materialCategoryId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "prijs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actief" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "omschrijving" TEXT,
    "prijs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actief" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MaterialCategory" ADD CONSTRAINT "MaterialCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialOption" ADD CONSTRAINT "MaterialOption_materialCategoryId_fkey" FOREIGN KEY ("materialCategoryId") REFERENCES "MaterialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraOption" ADD CONSTRAINT "ExtraOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
