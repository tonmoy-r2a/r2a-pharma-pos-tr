-- Prod P12 — soft HeldSale (no stock reservation; store-scoped shared holds)

CREATE TYPE "HeldSaleStatus" AS ENUM ('HELD', 'DISCARDED', 'RESUMED');

CREATE TABLE "HeldSale" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "heldAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "status" "HeldSaleStatus" NOT NULL DEFAULT 'HELD',
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HeldSale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HeldSale_tenantId_idx" ON "HeldSale"("tenantId");
CREATE INDEX "HeldSale_tenantId_storeId_status_idx" ON "HeldSale"("tenantId", "storeId", "status");
CREATE INDEX "HeldSale_tenantId_storeId_heldAt_idx" ON "HeldSale"("tenantId", "storeId", "heldAt");
CREATE INDEX "HeldSale_userId_idx" ON "HeldSale"("userId");

ALTER TABLE "HeldSale" ADD CONSTRAINT "HeldSale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HeldSale" ADD CONSTRAINT "HeldSale_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HeldSale" ADD CONSTRAINT "HeldSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
