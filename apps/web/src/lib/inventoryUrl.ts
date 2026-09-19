/**
 * Inventory list URL helpers (Enhance D1).
 * Sync `?tab=` + `?supplierId=` without dropping either on update.
 */

export const INVENTORY_TABS = [
  "all",
  "low",
  "out",
  "expiring30",
  "expiring90",
  "expired",
] as const;

export type InventoryUrlTab = (typeof INVENTORY_TABS)[number];

export function isInventoryTab(
  value: string | null | undefined,
): value is InventoryUrlTab {
  return !!value && (INVENTORY_TABS as readonly string[]).includes(value);
}

/** Read + validate `?tab=`; invalid/missing → `all`. */
export function readTabFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): InventoryUrlTab {
  const raw = new URLSearchParams(search).get("tab");
  return isInventoryTab(raw) ? raw : "all";
}

/** Read optional `?supplierId=` (trim; empty when absent). */
export function readSupplierIdFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string {
  const raw = new URLSearchParams(search).get("supplierId");
  return raw?.trim() || "";
}

/** Build `/inventory` path keeping tab + supplierId in query when set. */
export function buildInventoryPath(opts: {
  tab?: InventoryUrlTab;
  supplierId?: string;
}): string {
  const params = new URLSearchParams();
  const tab = opts.tab ?? "all";
  if (tab !== "all") params.set("tab", tab);
  const supplierId = opts.supplierId?.trim();
  if (supplierId) params.set("supplierId", supplierId);
  const qs = params.toString();
  return qs ? `/inventory?${qs}` : "/inventory";
}

/** Replace URL query for inventory list without a full navigation push. */
export function writeInventoryUrl(opts: {
  tab: InventoryUrlTab;
  supplierId: string;
}): void {
  const next = buildInventoryPath(opts);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== next) {
    window.history.replaceState({}, "", next);
  }
}
