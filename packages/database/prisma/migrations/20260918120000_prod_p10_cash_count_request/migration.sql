-- Prod Batch P10: Owner Request Cash Count on open Shift.

CREATE TYPE "CashCountRequestStatus" AS ENUM ('NONE', 'REQUESTED', 'CANCELLED', 'COMPLETED');

ALTER TYPE "ShiftActivityType" ADD VALUE 'CASH_COUNT_REQUESTED';
ALTER TYPE "ShiftActivityType" ADD VALUE 'CASH_COUNT_CANCELLED';

ALTER TABLE "Shift" ADD COLUMN "cashCountStatus" "CashCountRequestStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Shift" ADD COLUMN "cashCountRequestedAt" TIMESTAMP(3);
ALTER TABLE "Shift" ADD COLUMN "cashCountRequestedByUserId" TEXT;
ALTER TABLE "Shift" ADD COLUMN "cashCountNote" TEXT;
ALTER TABLE "Shift" ADD COLUMN "cashCountCancelledAt" TIMESTAMP(3);
ALTER TABLE "Shift" ADD COLUMN "cashCountCompletedAt" TIMESTAMP(3);

ALTER TABLE "Shift" ADD CONSTRAINT "Shift_cashCountRequestedByUserId_fkey" FOREIGN KEY ("cashCountRequestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Shift_tenantId_cashCountStatus_idx" ON "Shift"("tenantId", "cashCountStatus");
