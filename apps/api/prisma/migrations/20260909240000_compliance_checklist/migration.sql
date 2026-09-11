-- CreateEnum
CREATE TYPE "ComplianceItemStatus" AS ENUM ('ok', 'expiring', 'expired', 'missing');

-- CreateTable
CREATE TABLE "compliance_checklist_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requiredBy" TEXT NOT NULL DEFAULT 'RN510/22',
    "dueAt" TIMESTAMP(3),
    "status" "ComplianceItemStatus" NOT NULL DEFAULT 'missing',
    "evidenceDocId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_checklist_items_tenantId_contractId_idx" ON "compliance_checklist_items"("tenantId", "contractId");

-- CreateIndex
CREATE INDEX "compliance_checklist_items_dueAt_idx" ON "compliance_checklist_items"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_checklist_items_tenantId_contractId_code_key" ON "compliance_checklist_items"("tenantId", "contractId", "code");

-- AddForeignKey
ALTER TABLE "compliance_checklist_items" ADD CONSTRAINT "compliance_checklist_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
