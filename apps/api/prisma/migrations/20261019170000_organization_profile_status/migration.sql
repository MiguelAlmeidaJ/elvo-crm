ALTER TABLE "Organization"
ADD COLUMN "legalName" TEXT,
ADD COLUMN "document" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "addressNumber" TEXT,
ADD COLUMN "complement" TEXT,
ADD COLUMN "neighborhood" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "country" TEXT DEFAULT 'Brasil',
ADD COLUMN "industry" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deactivatedAt" TIMESTAMP(3);
CREATE INDEX "Organization_active_idx" ON "Organization"("active");
