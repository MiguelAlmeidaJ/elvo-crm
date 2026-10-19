CREATE TYPE "ModuleKey" AS ENUM ('LEADS', 'WHATSAPP', 'EMAIL');

CREATE TABLE "Module" (
  "id" UUID NOT NULL,
  "key" "ModuleKey" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationModule" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "moduleId" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Module_key_key" ON "Module"("key");
CREATE UNIQUE INDEX "OrganizationModule_organizationId_moduleId_key" ON "OrganizationModule"("organizationId", "moduleId");
CREATE INDEX "OrganizationModule_moduleId_enabled_idx" ON "OrganizationModule"("moduleId", "enabled");

ALTER TABLE "OrganizationModule" ADD CONSTRAINT "OrganizationModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationModule" ADD CONSTRAINT "OrganizationModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Module" ("id", "key", "name", "description", "active", "updatedAt") VALUES
  (gen_random_uuid(), 'LEADS', 'Buscador de Leads', 'Busca aberta de empresas por nicho e localização.', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'WHATSAPP', 'WhatsApp', 'Conexão e envio de mensagens pela Evolution API.', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'EMAIL', 'E-mail', 'Envio e automações de e-mail.', true, CURRENT_TIMESTAMP);

INSERT INTO "OrganizationModule" ("id", "organizationId", "moduleId", "enabled", "updatedAt")
SELECT gen_random_uuid(), o."id", m."id", (m."key" = 'LEADS'), CURRENT_TIMESTAMP
FROM "Organization" o CROSS JOIN "Module" m;
