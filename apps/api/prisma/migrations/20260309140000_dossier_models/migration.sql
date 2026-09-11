-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('contrato', 'aditivo', 'carta', 'comunicado');

-- CreateEnum
CREATE TYPE "CoverageAction" AS ENUM ('include', 'exclude');

-- CreateEnum
CREATE TYPE "CausalRelation" AS ENUM ('motivates', 'implements');

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyA" TEXT NOT NULL,
    "partyB" TEXT NOT NULL,
    "title" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_documents" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT,
    "checksum" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_dates" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "eventAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),

    CONSTRAINT "document_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_versions" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "causedByDocumentId" TEXT,
    "snapshotHash" TEXT,
    "summary" TEXT,

    CONSTRAINT "dossier_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_items" (
    "id" TEXT NOT NULL,
    "dossierVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "action" "CoverageAction" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "sourceDocumentId" TEXT,

    CONSTRAINT "coverage_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_items" (
    "id" TEXT NOT NULL,
    "dossierVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "sourceDocumentId" TEXT,

    CONSTRAINT "price_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "causal_links" (
    "id" TEXT NOT NULL,
    "fromDocumentId" TEXT NOT NULL,
    "toDocumentId" TEXT NOT NULL,
    "relation" "CausalRelation" NOT NULL,

    CONSTRAINT "causal_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_tenantId_idx" ON "contracts"("tenantId");

-- CreateIndex
CREATE INDEX "contract_documents_contractId_idx" ON "contract_documents"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "document_dates_documentId_key" ON "document_dates"("documentId");

-- CreateIndex
CREATE INDEX "dossier_versions_contractId_effectiveFrom_idx" ON "dossier_versions"("contractId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_versions_contractId_version_key" ON "dossier_versions"("contractId", "version");

-- CreateIndex
CREATE INDEX "coverage_items_dossierVersionId_code_idx" ON "coverage_items"("dossierVersionId", "code");

-- CreateIndex
CREATE INDEX "price_items_dossierVersionId_code_idx" ON "price_items"("dossierVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "causal_links_fromDocumentId_toDocumentId_relation_key" ON "causal_links"("fromDocumentId", "toDocumentId", "relation");

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_dates" ADD CONSTRAINT "document_dates_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_versions" ADD CONSTRAINT "dossier_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_versions" ADD CONSTRAINT "dossier_versions_causedByDocumentId_fkey" FOREIGN KEY ("causedByDocumentId") REFERENCES "contract_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_items" ADD CONSTRAINT "coverage_items_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_items" ADD CONSTRAINT "price_items_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causal_links" ADD CONSTRAINT "causal_links_fromDocumentId_fkey" FOREIGN KEY ("fromDocumentId") REFERENCES "contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causal_links" ADD CONSTRAINT "causal_links_toDocumentId_fkey" FOREIGN KEY ("toDocumentId") REFERENCES "contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
