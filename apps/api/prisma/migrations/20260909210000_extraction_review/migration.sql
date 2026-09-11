-- CreateEnum
CREATE TYPE "ExtractionBatchStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ExtractedFieldStatus" AS ENUM ('pending_review', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "extraction_batches" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'assisted-json-v1',
    "status" "ExtractionBatchStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extraction_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_fields" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "ExtractedFieldStatus" NOT NULL DEFAULT 'pending_review',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extraction_batches_documentId_idx" ON "extraction_batches"("documentId");

-- CreateIndex
CREATE INDEX "extracted_fields_batchId_idx" ON "extracted_fields"("batchId");

-- CreateIndex
CREATE INDEX "extracted_fields_status_idx" ON "extracted_fields"("status");

-- AddForeignKey
ALTER TABLE "extraction_batches" ADD CONSTRAINT "extraction_batches_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "extraction_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
