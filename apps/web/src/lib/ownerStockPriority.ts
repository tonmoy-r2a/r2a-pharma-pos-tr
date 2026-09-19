import type {
  OwnerStockPriorityResponse,
  ProductMovementPreset,
  StockPriorityCode,
} from "@r2a/shared-types";
import { apiRequest } from "./api";

export type StockPriorityPreset = ProductMovementPreset;
export type StockPriorityPayload = OwnerStockPriorityResponse;
export type { StockPriorityCode };

export type StockPriorityQuery = {
  from?: string;
  to?: string;
  preset?: StockPriorityPreset;
  storeId?: string;
  limit?: number;
};

const PANEL_PRESETS: Array<"last90" | "last180"> = ["last90", "last180"];

export function isStockPriorityPanelPreset(
  value: string | null | undefined,
): value is "last90" | "last180" {
  return (
    value != null &&
    (PANEL_PRESETS as readonly string[]).includes(value)
  );
}

export async function fetchStockPriority(
  query: StockPriorityQuery = {},
): Promise<StockPriorityPayload> {
  const params = new URLSearchParams();
  if (query.preset) params.set("preset", query.preset);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.storeId) params.set("storeId", query.storeId);
  if (query.limit != null) params.set("limit", String(query.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<StockPriorityPayload>(
    `/api/v1/owner/reports/stock-priority${suffix}`,
  );
}
