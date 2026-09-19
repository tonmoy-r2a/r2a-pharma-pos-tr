-- Prod P15 — GoodsReceiptDraft (incomplete GRN form; no stock until confirm)

CREATE TABLE "GoodsReceiptDraft" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GoodsReceiptDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoodsReceiptDraft_purchaseOrderId_key" ON "GoodsReceiptDraft"("purchaseOrderId");
CREATE INDEX "GoodsReceiptDraft_tenantId_idx" ON "GoodsReceiptDraft"("tenantId");
CREATE INDEX "GoodsReceiptDraft_tenantId_storeId_idx" ON "GoodsReceiptDraft"("tenantId", "storeId");
CREATE INDEX "GoodsReceiptDraft_updatedByUserId_idx" ON "GoodsReceiptDraft"("updatedByUserId");

ALTER TABLE "GoodsReceiptDraft" ADD CONSTRAINT "GoodsReceiptDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptDraft" ADD CONSTRAINT "GoodsReceiptDraft_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptDraft" ADD CONSTRAINT "GoodsReceiptDraft_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptDraft" ADD CONSTRAINT "GoodsReceiptDraft_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
