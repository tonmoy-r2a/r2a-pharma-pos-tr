-- M6 Batch BM: Settings & business profile schema + configuration activity log.

-- CreateEnum
CREATE TYPE "ConfigurationActivityType" AS ENUM (
  'BUSINESS_PROFILE_UPDATED',
  'ACCOUNT_PROFILE_UPDATED',
  'PASSWORD_CHANGED',
  'STORE_SETTINGS_UPDATED',
  'SECURITY_SETTINGS_UPDATED'
);

-- AlterTable Tenant
ALTER TABLE "Tenant"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "tradeLicenseNo" TEXT,
  ADD COLUMN "drugLicenseNo" TEXT,
  ADD COLUMN "vatRegNo" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BDT',
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  ADD COLUMN "openingHours" TEXT;

-- AlterTable Store
ALTER TABLE "Store"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "tradeLicenseNo" TEXT,
  ADD COLUMN "drugLicenseNo" TEXT,
  ADD COLUMN "vatRegNo" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "openingHours" TEXT,
  ADD COLUMN "timezone" TEXT;

-- CreateTable ConfigurationActivityEvent
CREATE TABLE "ConfigurationActivityEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" "ConfigurationActivityType" NOT NULL,
  "section" TEXT,
  "summary" TEXT NOT NULL,
  "details" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConfigurationActivityEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConfigurationActivityEvent"
  ADD CONSTRAINT "ConfigurationActivityEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationActivityEvent"
  ADD CONSTRAINT "ConfigurationActivityEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ConfigurationActivityEvent_tenantId_idx" ON "ConfigurationActivityEvent"("tenantId");
CREATE INDEX "ConfigurationActivityEvent_tenantId_createdAt_idx" ON "ConfigurationActivityEvent"("tenantId", "createdAt");
CREATE INDEX "ConfigurationActivityEvent_actorUserId_idx" ON "ConfigurationActivityEvent"("actorUserId");
