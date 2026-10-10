-- Concept uit de browser (probeer-flow) importeren: één keer per concept.
ALTER TABLE "Tool" ADD COLUMN "importSleutel" TEXT;
CREATE UNIQUE INDEX "Tool_companyId_importSleutel_key" ON "Tool"("companyId", "importSleutel");
