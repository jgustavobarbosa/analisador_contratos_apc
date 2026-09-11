-- CreateEnum
CREATE TYPE "CatalogSourceKind" AS ENUM ('ans', 'cfm', 'associacao', 'jusbrasil', 'hospital', 'caso_base', 'outro');

-- CreateTable
CREATE TABLE "catalog_instruments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceKind" "CatalogSourceKind" NOT NULL,
    "sourceUrl" TEXT,
    "localPath" TEXT,
    "publisher" TEXT,
    "summary" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_dimensions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "catalog_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_instrument_dimensions" (
    "instrumentId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "catalog_instrument_dimensions_pkey" PRIMARY KEY ("instrumentId","dimensionId")
);

-- AlterTable
ALTER TABLE "contract_documents" ADD COLUMN "catalogInstrumentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "catalog_instruments_code_key" ON "catalog_instruments"("code");

-- CreateIndex
CREATE INDEX "catalog_instruments_sourceKind_idx" ON "catalog_instruments"("sourceKind");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_dimensions_code_key" ON "catalog_dimensions"("code");

-- CreateIndex
CREATE INDEX "contract_documents_catalogInstrumentId_idx" ON "contract_documents"("catalogInstrumentId");

-- CreateIndex
CREATE INDEX "contract_documents_checksum_idx" ON "contract_documents"("checksum");

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_catalogInstrumentId_fkey" FOREIGN KEY ("catalogInstrumentId") REFERENCES "catalog_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_instrument_dimensions" ADD CONSTRAINT "catalog_instrument_dimensions_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "catalog_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_instrument_dimensions" ADD CONSTRAINT "catalog_instrument_dimensions_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "catalog_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
