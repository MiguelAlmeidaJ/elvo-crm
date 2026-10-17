CREATE TYPE "OpportunityStage" AS ENUM ('QUALIFICATION','PROPOSAL','NEGOTIATION','WON','LOST');
CREATE TABLE "Opportunity" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "contactId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "stage" "OpportunityStage" NOT NULL DEFAULT 'QUALIFICATION',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Opportunity_organizationId_stage_idx" ON "Opportunity"("organizationId","stage");
CREATE INDEX "Opportunity_organizationId_contactId_idx" ON "Opportunity"("organizationId","contactId");
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
