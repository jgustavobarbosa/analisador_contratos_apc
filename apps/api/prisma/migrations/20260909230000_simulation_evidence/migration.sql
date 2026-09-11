-- CreateTable
CREATE TABLE "simulation_evidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attendanceAt" TIMESTAMP(3) NOT NULL,
    "informedAmount" DECIMAL(12,2),
    "expectedAmount" DECIMAL(12,2),
    "covered" BOOLEAN NOT NULL,
    "alerts" JSONB NOT NULL,
    "riskNotes" JSONB,
    "actorUserId" TEXT NOT NULL,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "simulation_evidence_tenantId_contractId_createdAt_idx" ON "simulation_evidence"("tenantId", "contractId", "createdAt");

-- CreateIndex
CREATE INDEX "simulation_evidence_batchId_idx" ON "simulation_evidence"("batchId");

-- CreateIndex
CREATE INDEX "simulation_evidence_actorUserId_idx" ON "simulation_evidence"("actorUserId");

-- AddForeignKey
ALTER TABLE "simulation_evidence" ADD CONSTRAINT "simulation_evidence_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
