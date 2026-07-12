-- CreateEnum
CREATE TYPE "ExtraOptionType" AS ENUM ('PER_EENHEID', 'PER_STUK');

-- AlterTable
ALTER TABLE "ExtraOption" ADD COLUMN     "type" "ExtraOptionType" NOT NULL DEFAULT 'PER_EENHEID';
