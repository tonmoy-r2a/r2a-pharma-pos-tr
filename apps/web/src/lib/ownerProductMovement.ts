import type {
  DemandBand,
  OwnerProductMovementResponse,
  ProductMovementBandFilter,
  ProductMovementPreset,
} from "@r2a/shared-types";
import { apiRequest } from "./api";
import { utcTodayStart, utcYmd } from "./format";

export type ProductMovementRangePreset = ProductMovementPreset;
export type ProductMovementBand = ProductMovementBandFilter;
export type ProductMovementPayload = OwnerProductMovementResponse;

export type ProductMovementQuery = {
  from?: string;
  to?: string;
  preset?: ProductMovementRangePreset;
  storeId?: string;
  band?: ProductMovementBand;
  q?: string;
  limit?: number;
  offset?: number;
};

const PRESETS: ProductMovementRangePreset[] = ["last30", "last90", "last180"];
const BANDS: ProductMovementBand[] = [
  "all",
  "high_demand",
  "steady",
  "low_sell",
  "no_sales",
];

export function isProductMovementPreset(
  value: string | null | undefined,
): value is ProductMovementRangePreset {
  return (
    value != null &&
    (PRESETS as readonly string[]).includes(value)
  );
}

export function isProductMovementBand(
  value: string | null | undefined,
): value is ProductMovementBand {
  return value != null && (BANDS as readonly string[]).includes(value);
}

export function readProductMovementPresetFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): ProductMovementRangePreset {
  const raw = new URLSearchParams(search).get("preset");
  return isProductMovementPreset(raw) ? raw : "last90";
}

export function readProductMovementBandFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): ProductMovementBand {
  const raw = new URLSearchParams(search).get("band");
  return isProductMovementBand(raw) ? raw : "all";
}

export function buildProductMovementPath(opts: {
  preset?: ProductMovementRangePreset;
  band?: ProductMovementBand;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.preset && opts.preset !== "last90") params.set("preset", opts.preset);
  if (opts.band && opts.band !== "all") params.set("band", opts.band);
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `/reports/product-movement${suffix}`;
}

export function syncProductMovementUrl(opts: {
  preset: ProductMovementRangePreset;
  band: ProductMovementBand;
  q: string;
}): void {
  if (typeof window === "undefined") return;
  const next = buildProductMovementPath(opts);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== next) {
    window.history.replaceState({}, "", next);
  }
}

export function rangeForProductMovementPreset(
  preset: ProductMovementRangePreset,
): { from: string; to: string } {
  const to = utcTodayStart();
  const from = new Date(to);
  const span = preset === "last30" ? 30 : preset === "last90" ? 90 : 180;
  from.setUTCDate(from.getUTCDate() - (span - 1));
  return { from: utcYmd(from), to: utcYmd(to) };
}

export async function fetchProductMovement(
  query: ProductMovementQuery = {},
): Promise<ProductMovementPayload> {
  const params = new URLSearchParams();
  if (query.preset) params.set("preset", query.preset);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.storeId) params.set("storeId", query.storeId);
  if (query.band && query.band !== "all") params.set("band", query.band);
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<ProductMovementPayload>(
    `/api/v1/owner/reports/product-movement${suffix}`,
  );
}

export type DemandBandLabel = Exclude<DemandBand, never>;
