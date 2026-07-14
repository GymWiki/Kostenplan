-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MAANDELIJKS', 'JAARLIJKS');

-- CreateEnum
CREATE TYPE "MollieSubscriptionStatus" AS ENUM ('GEEN', 'PENDING', 'ACTIVE', 'CANCELED', 'SUSPENDED', 'COMPLETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "billingInterval" "BillingInterval",
ADD COLUMN     "huidigePeriodeEind" TIMESTAMP(3),
ADD COLUMN     "mollieCustomerId" TEXT,
ADD COLUMN     "mollieSubscriptionId" TEXT,
ADD COLUMN     "overrideTier" "SubscriptionTier",
ADD COLUMN     "subscriptionStatus" "MollieSubscriptionStatus" NOT NULL DEFAULT 'GEEN';

-- CreateIndex
CREATE UNIQUE INDEX "User_mollieCustomerId_key" ON "User"("mollieCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_mollieSubscriptionId_key" ON "User"("mollieSubscriptionId");

