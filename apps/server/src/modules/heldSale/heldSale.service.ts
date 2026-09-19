import type {
  HeldSaleCreateInput,
  HeldSalePayload,
  HeldSaleRow,
} from "@r2a/shared-types";
import { MAX_HELD_SALES } from "@r2a/shared-types";
import { prisma, Prisma } from "@r2a/database";
import { AppError } from "../../utils/AppError";
import type { TenantContext } from "../../types/tenant";

function storeScope(ctx: TenantContext): string {
  if (!ctx.storeId) throw new AppError("Store context required", 400);
  return ctx.storeId;
}

function asPayload(raw: unknown): HeldSalePayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AppError("Invalid held sale payload", 500);
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.lines) || o.lines.length === 0) {
    throw new AppError("Invalid held sale payload", 500);
  }
  return {
    lines: o.lines as Record<string, unknown>[],
    customer:
      o.customer && typeof o.customer === "object" && !Array.isArray(o.customer)
        ? (o.customer as Record<string, unknown>)
        : null,
    loyalty:
      o.loyalty && typeof o.loyalty === "object" && !Array.isArray(o.loyalty)
        ? (o.loyalty as Record<string, unknown>)
        : null,
  };
}

function toRow(row: {
  id: string;
  tenantId: string;
  storeId: string;
  userId: string;
  terminalId: string;
  label: string;
  heldAt: Date;
  expiresAt: Date | null;
  status: "HELD" | "DISCARDED" | "RESUMED";
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
}): HeldSaleRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    userId: row.userId,
    terminalId: row.terminalId,
    label: row.label,
    heldAt: row.heldAt,
    expiresAt: row.expiresAt,
    status: row.status,
    payload: asPayload(row.payload),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function countHeld(tenantId: string, storeId: string): Promise<number> {
  return prisma.heldSale.count({
    where: { tenantId, storeId, status: "HELD" },
  });
}

/** Create soft hold — store-scoped max 3. Optional client `id` for offline push. */
export async function createHeldSale(
  ctx: TenantContext,
  input: HeldSaleCreateInput,
): Promise<HeldSaleRow> {
  const storeId = storeScope(ctx);
  const heldAt = input.heldAt ?? new Date();
  const expiresAt = input.expiresAt ?? null;
  const clientId = input.id?.trim() || null;

  if (clientId) {
    const existing = await prisma.heldSale.findFirst({
      where: { id: clientId, tenantId: ctx.tenantId },
    });
    if (existing) {
      if (existing.storeId !== storeId) {
        throw new AppError("Held sale belongs to another store", 403);
      }
      // Idempotent reconnect: already HELD → return; discarded/resumed → cloud wins
      if (existing.status === "HELD") return toRow(existing);
      throw new AppError("Held sale already closed", 409);
    }
  }

  const openCount = await countHeld(ctx.tenantId, storeId);
  if (openCount >= MAX_HELD_SALES) {
    throw new AppError(
      `Already holding ${MAX_HELD_SALES} sales. Resume or discard one first.`,
      409,
    );
  }

  const payload = input.payload as Prisma.InputJsonValue;
  const row = await prisma.heldSale.create({
    data: {
      ...(clientId ? { id: clientId } : {}),
      tenantId: ctx.tenantId,
      storeId,
      userId: ctx.userId,
      terminalId: input.terminalId,
      label: input.label.trim(),
      heldAt,
      expiresAt,
      status: "HELD",
      payload,
    },
  });

  return toRow(row);
}

/** List active HELD for JWT store (newest first). */
export async function listHeldSales(ctx: TenantContext): Promise<HeldSaleRow[]> {
  const storeId = storeScope(ctx);
  const rows = await prisma.heldSale.findMany({
    where: { tenantId: ctx.tenantId, storeId, status: "HELD" },
    orderBy: { heldAt: "desc" },
    take: MAX_HELD_SALES,
  });
  return rows.map(toRow);
}

export async function getHeldSale(
  ctx: TenantContext,
  heldSaleId: string,
): Promise<HeldSaleRow> {
  const storeId = storeScope(ctx);
  const row = await prisma.heldSale.findFirst({
    where: {
      id: heldSaleId,
      tenantId: ctx.tenantId,
      storeId,
      status: "HELD",
    },
  });
  if (!row) throw new AppError("Held sale not found", 404);
  return toRow(row);
}

export async function discardHeldSale(
  ctx: TenantContext,
  heldSaleId: string,
): Promise<HeldSaleRow> {
  const storeId = storeScope(ctx);
  const existing = await prisma.heldSale.findFirst({
    where: { id: heldSaleId, tenantId: ctx.tenantId, storeId },
  });
  if (!existing || existing.status !== "HELD") {
    throw new AppError("Held sale not found", 404);
  }
  const row = await prisma.heldSale.update({
    where: { id: existing.id },
    data: { status: "DISCARDED" },
  });
  return toRow(row);
}

/** Resume ack — mark RESUMED after desktop soft recheck + cart restore. */
export async function resumeAckHeldSale(
  ctx: TenantContext,
  heldSaleId: string,
): Promise<HeldSaleRow> {
  const storeId = storeScope(ctx);
  const existing = await prisma.heldSale.findFirst({
    where: { id: heldSaleId, tenantId: ctx.tenantId, storeId },
  });
  if (!existing || existing.status !== "HELD") {
    throw new AppError("Held sale not found", 404);
  }
  const row = await prisma.heldSale.update({
    where: { id: existing.id },
    data: { status: "RESUMED" },
  });
  return toRow(row);
}
