-- AUTOSETUP — migration inicial (HUB: Tenant/Organization/Partner)
-- Espelha exatamente prisma/schema.prisma. Escrita manualmente porque o
-- Prisma CLI não consegue baixar seu engine binário nesta rede sandbox
-- (binaries.prisma.sh bloqueado) — mas foi validada rodando de verdade
-- contra um Postgres 16 real neste ambiente (ver docs/traceability.md).

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "capabilities" TEXT[],

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Partner" ADD CONSTRAINT "Partner_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
