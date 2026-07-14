-- CreateIndex
CREATE INDEX "ExtraOption_productId_idx" ON "ExtraOption"("productId");

-- CreateIndex
CREATE INDEX "LeadNote_leadId_idx" ON "LeadNote"("leadId");

-- CreateIndex
CREATE INDEX "MaterialCategory_productId_idx" ON "MaterialCategory"("productId");

-- CreateIndex
CREATE INDEX "MaterialOption_materialCategoryId_idx" ON "MaterialOption"("materialCategoryId");

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");

-- CreateIndex
CREATE INDEX "Service_userId_idx" ON "Service"("userId");

