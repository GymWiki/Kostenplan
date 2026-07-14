-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('GRATIS', 'PLUS', 'PRO');

-- CreateEnum
CREATE TYPE "Lettertype" AS ENUM ('MODERN', 'KLASSIEK', 'VRIENDELIJK', 'STOER');

-- CreateEnum
CREATE TYPE "ContactPositie" AS ENUM ('BOVENAAN', 'ONDERAAN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'GRATIS';

-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaireKleur" TEXT NOT NULL DEFAULT '#15803d',
    "achtergrondKleur" TEXT NOT NULL DEFAULT '#f7faf8',
    "lettertype" "Lettertype" NOT NULL DEFAULT 'MODERN',
    "customTitel" TEXT,
    "welkomstTekst" TEXT,
    "bedankTekst" TEXT NOT NULL DEFAULT 'Bedankt voor uw aanvraag! Wij nemen binnen 24 uur contact met u op.',
    "toonTelefoonnummer" BOOLEAN NOT NULL DEFAULT false,
    "telefoonnummer" TEXT,
    "toonEmail" BOOLEAN NOT NULL DEFAULT false,
    "contactPositie" "ContactPositie" NOT NULL DEFAULT 'BOVENAAN',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branding_userId_key" ON "Branding"("userId");

-- AddForeignKey
ALTER TABLE "Branding" ADD CONSTRAINT "Branding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

