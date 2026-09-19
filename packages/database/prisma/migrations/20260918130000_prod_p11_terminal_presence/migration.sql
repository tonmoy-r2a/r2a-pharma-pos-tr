-- Prod Batch P11: Terminal presence heartbeat for Owner web dots.

CREATE TABLE "TerminalPresence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "userAgent" TEXT,
  "forceOffline" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TerminalPresence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TerminalPresence_tenantId_terminalId_key" ON "TerminalPresence"("tenantId", "terminalId");
CREATE INDEX "TerminalPresence_tenantId_idx" ON "TerminalPresence"("tenantId");
CREATE INDEX "TerminalPresence_tenantId_storeId_idx" ON "TerminalPresence"("tenantId", "storeId");
CREATE INDEX "TerminalPresence_tenantId_lastSeenAt_idx" ON "TerminalPresence"("tenantId", "lastSeenAt");
CREATE INDEX "TerminalPresence_userId_idx" ON "TerminalPresence"("userId");

ALTER TABLE "TerminalPresence" ADD CONSTRAINT "TerminalPresence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TerminalPresence" ADD CONSTRAINT "TerminalPresence_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TerminalPresence" ADD CONSTRAINT "TerminalPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
