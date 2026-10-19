ALTER TYPE "MembershipRole" RENAME TO "MembershipRole_old";
CREATE TYPE "MembershipRole" AS ENUM ('SYSTEM_ADMIN', 'TENANT_ADMIN', 'USER');

ALTER TABLE "Membership" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Membership"
  ALTER COLUMN "role" TYPE "MembershipRole"
  USING (
    CASE "role"::text
      WHEN 'OWNER' THEN 'TENANT_ADMIN'
      WHEN 'ADMIN' THEN 'TENANT_ADMIN'
      ELSE 'USER'
    END
  )::"MembershipRole";
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "MembershipRole_old";

ALTER TABLE "Contact"
  ADD COLUMN "entityType" TEXT NOT NULL DEFAULT 'COMPANY',
  ADD COLUMN "document" TEXT,
  ADD COLUMN "secondaryPhone" TEXT,
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "country" TEXT DEFAULT 'Brasil',
  ADD COLUMN "category" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "externalProvider" TEXT,
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "latitude" DECIMAL(10,7),
  ADD COLUMN "longitude" DECIMAL(10,7),
  ADD COLUMN "rating" DECIMAL(2,1),
  ADD COLUMN "ratingCount" INTEGER;

CREATE INDEX "Contact_organizationId_document_idx" ON "Contact"("organizationId", "document");
CREATE INDEX "Contact_organizationId_city_state_idx" ON "Contact"("organizationId", "city", "state");
CREATE UNIQUE INDEX "Contact_organizationId_externalProvider_externalId_key"
  ON "Contact"("organizationId", "externalProvider", "externalId");
