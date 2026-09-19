import type {
  TerminalHeartbeatInput,
  OwnerTerminalPresenceRow,
  TerminalPresenceStatus,
} from "@r2a/shared-types";
import { TERMINAL_PRESENCE_STALE_MS } from "@r2a/shared-types";
import { prisma } from "@r2a/database";
import { AppError } from "../../utils/AppError";
import type { TenantContext } from "../../types/tenant";

function storeScope(ctx: TenantContext): string {
  if (!ctx.storeId) throw new AppError("Store context required", 400);
  return ctx.storeId;
}

function computeStatus(
  lastSeenAt: Date,
  forceOffline: boolean,
  nowMs: number = Date.now(),
): TerminalPresenceStatus {
  const fresh = nowMs - lastSeenAt.getTime() < TERMINAL_PRESENCE_STALE_MS;
  if (!fresh) return "OFFLINE";
  if (forceOffline) return "FORCED_OFFLINE";
  return "ONLINE";
}

/** Upsert desktop heartbeat (authenticated cashier/manager/owner POS). */
export async function heartbeat(
  ctx: TenantContext,
  input: TerminalHeartbeatInput,
) {
  const storeId = storeScope(ctx);
  const now = new Date();
  const forceOffline = input.forceOffline === true;
  const userAgent = input.userAgent?.trim() || null;

  const row = await prisma.terminalPresence.upsert({
    where: {
      tenantId_terminalId: {
        tenantId: ctx.tenantId,
        terminalId: input.terminalId,
      },
    },
    create: {
      tenantId: ctx.tenantId,
      storeId,
      terminalId: input.terminalId,
      userId: ctx.userId,
      lastSeenAt: now,
      forceOffline,
      userAgent,
    },
    update: {
      storeId,
      userId: ctx.userId,
      lastSeenAt: now,
      forceOffline,
      userAgent,
    },
  });

  return {
    ...row,
    status: computeStatus(row.lastSeenAt, row.forceOffline),
  };
}

/** OWNER list of reported terminals — no invented rows. */
export async function listPresence(
  ctx: TenantContext,
): Promise<OwnerTerminalPresenceRow[]> {
  const rows = await prisma.terminalPresence.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(ctx.storeId ? { storeId: ctx.storeId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  const nowMs = Date.now();
  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    terminalId: row.terminalId,
    userId: row.userId,
    userName: row.user.name,
    userRole: row.user.role,
    lastSeenAt: row.lastSeenAt,
    forceOffline: row.forceOffline,
    userAgent: row.userAgent,
    status: computeStatus(row.lastSeenAt, row.forceOffline, nowMs),
  }));
}
