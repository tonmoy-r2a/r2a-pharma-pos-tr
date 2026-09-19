/**
 * Prod P12 — cloud soft held sales client.
 * Soft hold only (no stock reservation). Store-scoped when online.
 * Offline fallback remains `heldSaleStore` localStorage.
 *
 * Reconnect lock: cloud canonical when online; push local-only holds
 * on Go Online if not discarded / already closed on cloud.
 */

import type { HeldSaleCreateInput, HeldSaleRow } from "@r2a/shared-types";
import { apiRequest, ApiError } from "@/lib/api";
import { getOrCreateTerminalId } from "@/lib/terminalId";
import {
  heldSaleStore,
  parseHeldSaleList,
  type HeldSaleInput,
  type HeldSaleSnapshot,
  defaultHeldSaleLabel,
} from "@/lib/heldSaleStore";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function iso(v: unknown): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  return "";
}

function rowToSnapshot(raw: unknown): HeldSaleSnapshot | null {
  const row = asRecord(raw);
  if (!row) return null;
  const payload = asRecord(row.payload) ?? {};
  const heldAt = iso(row.heldAt);
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id || !heldAt) return null;
  const label =
    (typeof row.label === "string" && row.label.trim()) ||
    defaultHeldSaleLabel(
      null,
      [],
      heldAt,
    );
  const parsed = parseHeldSaleList(
    JSON.stringify([
      {
        id,
        heldAt,
        label,
        lines: payload.lines,
        customer: payload.customer ?? null,
        loyalty: payload.loyalty ?? null,
      },
    ]),
  );
  return parsed[0] ?? null;
}

function parseList(data: unknown): HeldSaleSnapshot[] {
  const root = asRecord(data);
  const items = Array.isArray(root?.items) ? root.items : [];
  return items
    .map(rowToSnapshot)
    .filter((s): s is HeldSaleSnapshot => s != null);
}

function snapshotToCreateBody(
  snapshot: HeldSaleSnapshot,
): HeldSaleCreateInput {
  return {
    id: snapshot.id,
    terminalId: getOrCreateTerminalId(),
    label: snapshot.label,
    heldAt: new Date(snapshot.heldAt),
    payload: {
      lines: snapshot.lines as unknown as Record<string, unknown>[],
      customer: (snapshot.customer as unknown as Record<string, unknown>) ?? null,
      loyalty: (snapshot.loyalty as unknown as Record<string, unknown>) ?? null,
    },
  };
}

export async function cloudListHeldSales(): Promise<HeldSaleSnapshot[]> {
  const data = await apiRequest<{ items: HeldSaleRow[] }>("/api/v1/held-sales");
  return parseList(data);
}

export async function cloudCreateHeldSale(
  input: HeldSaleInput & { id?: string; heldAt?: string },
): Promise<HeldSaleSnapshot> {
  const heldAt = input.heldAt ?? new Date().toISOString();
  const label =
    (input.label ?? "").trim() ||
    defaultHeldSaleLabel(input.customer, input.lines, heldAt);
  const body: HeldSaleCreateInput = {
    ...(input.id ? { id: input.id } : {}),
    terminalId: getOrCreateTerminalId(),
    label,
    heldAt: new Date(heldAt),
    payload: {
      lines: input.lines as unknown as Record<string, unknown>[],
      customer: (input.customer as unknown as Record<string, unknown>) ?? null,
      loyalty: (input.loyalty as unknown as Record<string, unknown>) ?? null,
    },
  };
  const data = await apiRequest<HeldSaleRow>("/api/v1/held-sales", {
    method: "POST",
    body,
  });
  const snap = rowToSnapshot(data);
  if (!snap) throw new ApiError("Invalid held sale response", 500, "error");
  return snap;
}

export async function cloudDiscardHeldSale(id: string): Promise<void> {
  await apiRequest(`/api/v1/held-sales/${encodeURIComponent(id)}/discard`, {
    method: "POST",
  });
}

export async function cloudResumeAckHeldSale(id: string): Promise<void> {
  await apiRequest(`/api/v1/held-sales/${encodeURIComponent(id)}/resume-ack`, {
    method: "POST",
  });
}

/**
 * On Go Online / becoming online:
 * 1) Push local-only holds (same id) if cloud has room and not already closed.
 * 2) Replace local cache with cloud list (cloud canonical).
 */
export async function reconcileHeldSalesOnOnline(
  tenantId: string,
  storeId: string | null,
): Promise<{ pushed: number; cloudCount: number }> {
  if (!tenantId || !storeId) {
    return { pushed: 0, cloudCount: 0 };
  }

  let cloud = await cloudListHeldSales();
  const cloudIds = new Set(cloud.map((s) => s.id));
  const local = heldSaleStore.list(tenantId, storeId);
  let pushed = 0;

  for (const snap of local) {
    if (cloudIds.has(snap.id)) continue;
    try {
      const created = await cloudCreateHeldSale({
        id: snap.id,
        lines: snap.lines,
        customer: snap.customer,
        loyalty: snap.loyalty,
        label: snap.label,
        heldAt: snap.heldAt,
      });
      cloudIds.add(created.id);
      pushed += 1;
    } catch (err) {
      // Capacity / already closed / network — leave local until next reconcile.
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[held] push local hold failed:", snap.id, msg);
    }
  }

  cloud = await cloudListHeldSales();
  heldSaleStore.replaceAll(tenantId, storeId, cloud);
  return { pushed, cloudCount: cloud.length };
}

/** Mirror helpers used by smoke / tests. */
export const __heldSaleCloudTest = {
  rowToSnapshot,
  snapshotToCreateBody,
};
