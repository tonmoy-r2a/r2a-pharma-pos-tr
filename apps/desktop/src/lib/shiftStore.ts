/**
 * Cloud-backed cashier shift window (M6 Batch AY).
 *
 * Open/close now call the cloud API (POST /shifts, POST /shifts/active/close).
 * The active shift is cached in localStorage so offline sale ingest can attach
 * the shiftId. GET /shifts/active rehydrates the cache on login/reconnect.
 *
 * Key: pharmasync.shift.<tenantId>.<storeId|none>
 *
 * M3 history: originally local-only (localStorage). Batch AX added the cloud
 * shift module; Batch AY wires the desktop to it.
 */

import type { Shift } from "@r2a/shared-types";
import { ApiError, apiRequest } from "@/lib/api";

export type ActiveShift = {
  /** Cloud shift id — sent with sale ingest. */
  shiftId: string;
  /** Display shift number (e.g. SH-260822-001). */
  shiftNo: string;
  /** ISO timestamp when the shift was opened. */
  openedAt: string;
  /** Display name of cashier/owner who opened (runtime name — not translated). */
  openedByName: string;
  /** Optional user id for audit. */
  openedByUserId?: string;
  /** Opening float in ৳ (read from cloud). */
  openingFloat: number;
  /** Prod P10 — Owner requested cash count (close with counted cash). */
  cashCountRequested?: boolean;
  /** Optional owner note from cash-count request. */
  cashCountNote?: string | null;
};

const PREFIX = "pharmasync.shift";

function storageKey(tenantId: string, storeId: string | null): string {
  const storePart = storeId?.trim() || "none";
  return `${PREFIX}.${tenantId}.${storePart}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseActive(raw: string | null): ActiveShift | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    const shiftId = typeof o.shiftId === "string" ? o.shiftId.trim() : "";
    const shiftNo = typeof o.shiftNo === "string" ? o.shiftNo.trim() : "";
    const openedAt = typeof o.openedAt === "string" ? o.openedAt.trim() : "";
    const openedByName =
      typeof o.openedByName === "string" ? o.openedByName.trim() : "";
    if (!shiftId || !openedAt || Number.isNaN(new Date(openedAt).getTime()))
      return null;
    if (!openedByName) return null;
    const openedByUserId =
      typeof o.openedByUserId === "string" && o.openedByUserId.trim()
        ? o.openedByUserId.trim()
        : undefined;
    const openingFloat =
      typeof o.openingFloat === "number" ? o.openingFloat : 0;
    const cashCountRequested = o.cashCountRequested === true;
    const cashCountNote =
      typeof o.cashCountNote === "string" && o.cashCountNote.trim()
        ? o.cashCountNote.trim()
        : null;
    return {
      shiftId,
      shiftNo: shiftNo || "—",
      openedAt,
      openedByName,
      openedByUserId,
      openingFloat,
      cashCountRequested,
      cashCountNote,
    };
  } catch {
    return null;
  }
}

function toActiveShift(
  cloud: Shift,
  openedByName: string,
  openedByUserId?: string,
): ActiveShift {
  return {
    shiftId: cloud.id,
    shiftNo: cloud.shiftNo || "—",
    openedAt:
      cloud.openedAt instanceof Date
        ? cloud.openedAt.toISOString()
        : new Date(cloud.openedAt).toISOString(),
    openedByName,
    openedByUserId,
    openingFloat: Number(cloud.openingFloat),
    cashCountRequested: cloud.cashCountStatus === "REQUESTED",
    cashCountNote: cloud.cashCountNote ?? null,
  };
}

function persistShift(
  tenantId: string,
  storeId: string | null,
  shift: ActiveShift,
): void {
  try {
    localStorage.setItem(storageKey(tenantId, storeId), JSON.stringify(shift));
  } catch {
    /* ignore quota / private mode */
  }
}

function clearShift(tenantId: string, storeId: string | null): void {
  try {
    localStorage.removeItem(storageKey(tenantId, storeId));
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/*  Public helpers (unchanged API surface for callers)                         */
/* -------------------------------------------------------------------------- */

/** HH:MM · YYYY-MM-DD — Latin digits only. */
export function formatShiftOpenedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} · ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Compact clock for Counter Ready card (HH:MM). */
export function formatShiftClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Elapsed since open — e.g. "2h 15m" (Latin digits). */
export function formatShiftDuration(
  openedAtIso: string,
  nowMs: number = Date.now(),
): string {
  const opened = new Date(openedAtIso).getTime();
  if (Number.isNaN(opened)) return "—";
  const elapsedMin = Math.max(0, Math.floor((nowMs - opened) / 60_000));
  const hours = Math.floor(elapsedMin / 60);
  const minutes = elapsedMin % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/* -------------------------------------------------------------------------- */
/*  Store API                                                                  */
/* -------------------------------------------------------------------------- */

export const shiftStore = {
  /** Read cached active shift (localStorage). */
  get(tenantId: string, storeId: string | null): ActiveShift | null {
    if (!tenantId) return null;
    try {
      return parseActive(localStorage.getItem(storageKey(tenantId, storeId)));
    } catch {
      return null;
    }
  },

  /**
   * Open shift via cloud API → cache in localStorage.
   * Online required; throws on network / 4xx / 5xx so caller can show error.
   */
  async open(
    tenantId: string,
    storeId: string | null,
    args: {
      openedByName: string;
      openedByUserId?: string;
      openingFloat: number;
    },
  ): Promise<ActiveShift> {
    try {
      const cloud = await apiRequest<Shift>("/api/v1/shifts", {
        method: "POST",
        body: { openingFloat: args.openingFloat },
      });

      const shift = toActiveShift(
        cloud,
        args.openedByName,
        args.openedByUserId,
      );
      persistShift(tenantId, storeId, shift);
      return shift;
    } catch (err) {
      // Cloud already has an OPEN shift (seed, other terminal, lost cache).
      // Adopt it so POS open/close/sale gates match the server.
      if (err instanceof ApiError && err.statusCode === 409) {
        const existing = await shiftStore.fetchAndCache(
          tenantId,
          storeId,
          args.openedByName,
          args.openedByUserId,
        );
        if (existing) return existing;
      }
      throw err;
    }
  },

  /**
   * Close shift via cloud API → clear localStorage cache.
   * Online required; throws on network / 4xx / 5xx.
   * Returns the closed shift with variance info for display.
   */
  async close(
    tenantId: string,
    storeId: string | null,
    countedCash: number,
  ): Promise<{ variance: number; status: string }> {
    const cloud = await apiRequest<Shift>("/api/v1/shifts/active/close", {
      method: "POST",
      body: { countedCash },
    });

    clearShift(tenantId, storeId);
    return {
      variance: Number(cloud.variance ?? 0),
      status: cloud.status,
    };
  },

  /**
   * Fetch active shift from cloud and update localStorage cache.
   * Called on login / reconnect to rehydrate.
   * Returns null if no active shift on server.
   */
  async fetchAndCache(
    tenantId: string,
    storeId: string | null,
    userName: string,
    userId?: string,
  ): Promise<ActiveShift | null> {
    try {
      const cloud = await apiRequest<Shift | null>(
        "/api/v1/shifts/active",
        { method: "GET" },
      );
      if (!cloud || !cloud.id) {
        clearShift(tenantId, storeId);
        return null;
      }
      const shift = toActiveShift(cloud, userName, userId);
      persistShift(tenantId, storeId, shift);
      return shift;
    } catch {
      // Network error — keep existing cache if any
      return shiftStore.get(tenantId, storeId);
    }
  },

  /**
   * Prod P10 — poll cloud active shift for cash-count request flag.
   * No-op when offline; preserves cache on network errors.
   */
  async refreshCashCountFlag(
    tenantId: string,
    storeId: string | null,
    userName: string,
    userId?: string,
  ): Promise<ActiveShift | null> {
    return shiftStore.fetchAndCache(tenantId, storeId, userName, userId);
  },

  /**
   * Clear cached shift (e.g. on logout).
   */
  clear(tenantId: string, storeId: string | null): void {
    clearShift(tenantId, storeId);
  },
};
