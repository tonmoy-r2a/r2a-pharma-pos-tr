import { ArrowRight, ArrowUpRight, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, type MessageKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import { formatCount } from "@/lib/format";
import {
  fetchStockPriority,
  type StockPriorityCode,
  type StockPriorityPayload,
} from "@/lib/ownerStockPriority";

const TILE_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const PANEL_LIMIT = 8;

type PanelPreset = "last90" | "last180";

function priorityLabelKey(code: StockPriorityCode): MessageKey {
  if (code === "P1_restock_now") return "dashboard.stockPriority.p1";
  if (code === "P2_restock_soon") return "dashboard.stockPriority.p2";
  if (code === "P3_watch_cover") return "dashboard.stockPriority.p3";
  return "dashboard.stockPriority.p4";
}

function reasonLabelKey(reason: string): MessageKey | null {
  if (reason === "high_demand") return "dashboard.stockPriority.reason.high_demand";
  if (reason === "out") return "dashboard.stockPriority.reason.out";
  if (reason === "low") return "dashboard.stockPriority.reason.low";
  if (reason === "low_cover") return "dashboard.stockPriority.reason.low_cover";
  if (reason === "thin_cover") return "dashboard.stockPriority.reason.thin_cover";
  if (reason === "low_sell") return "dashboard.stockPriority.reason.low_sell";
  if (reason === "no_sales") return "dashboard.stockPriority.reason.no_sales";
  if (reason === "on_hand") return "dashboard.stockPriority.reason.on_hand";
  return null;
}

function badgeClass(code: StockPriorityCode): string {
  if (code === "P1_restock_now") return "bg-red-100 text-red-800";
  if (code === "P2_restock_soon") return "bg-orange-100 text-orange-800";
  if (code === "P3_watch_cover") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

/**
 * Sale-priority stock alarms (Enhance D3).
 * Live rows from GET /owner/reports/stock-priority — no invented KPIs.
 */
export function StockPriorityPanel({
  navigate,
}: {
  navigate: (to: string) => void;
}) {
  const { t } = useLocale();
  const [preset, setPreset] = useState<PanelPreset>("last90");
  const [data, setData] = useState<StockPriorityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchStockPriority({ preset, limit: PANEL_LIMIT })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setLoading(false);
        if (err instanceof ApiError) setError(err.message);
        else setError(t("dashboard.stockPriority.error"));
      });
    return () => {
      cancelled = true;
    };
  }, [preset, reload, t]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {t("dashboard.stockPriority.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {t("dashboard.stockPriority.subtitle")}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <span className="sr-only">{t("dashboard.stockPriority.rangeLabel")}</span>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as PanelPreset)}
            className={`rounded-md border border-border bg-canvas px-2 py-1 text-xs font-medium text-foreground ${TILE_FOCUS}`}
          >
            <option value="last90">{t("dashboard.stockPriority.range.last90")}</option>
            <option value="last180">
              {t("dashboard.stockPriority.range.last180")}
            </option>
          </select>
        </label>
      </div>

      {data ? (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-label={t("dashboard.aria.stockPriorityP1")}
            className={`rounded-lg bg-red-50 px-2.5 py-2.5 text-left transition-colors hover:bg-red-100/80 ${TILE_FOCUS}`}
            onClick={() => navigate("/inventory?tab=out")}
          >
            <p className="text-lg font-semibold tabular-nums text-red-800">
              {formatCount(data.counts.p1)}
            </p>
            <p className="text-[11px] leading-snug text-red-800/80">
              {t("dashboard.stockPriority.countP1")}
            </p>
          </button>
          <button
            type="button"
            aria-label={t("dashboard.aria.stockPriorityP2")}
            className={`rounded-lg bg-orange-50 px-2.5 py-2.5 text-left transition-colors hover:bg-orange-100/80 ${TILE_FOCUS}`}
            onClick={() => navigate("/inventory?tab=low")}
          >
            <p className="text-lg font-semibold tabular-nums text-orange-800">
              {formatCount(data.counts.p2)}
            </p>
            <p className="text-[11px] leading-snug text-orange-800/80">
              {t("dashboard.stockPriority.countP2")}
            </p>
          </button>
        </div>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-muted">{t("dashboard.stockPriority.loading")}</p>
      ) : null}

      {error && !data ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            className={`rounded-md border border-border px-2 py-1 text-foreground hover:bg-canvas ${TILE_FOCUS}`}
            onClick={() => setReload((n) => n + 1)}
          >
            {t("dashboard.stockPriority.retry")}
          </button>
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg bg-canvas/60 px-3 py-3 text-sm text-muted">
          <Package className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <p>{t("dashboard.stockPriority.empty")}</p>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border/70">
          {data.items.map((row) => (
            <li key={row.productId}>
              <button
                type="button"
                aria-label={t("dashboard.aria.stockPriorityRow")}
                className={`-mx-1 flex w-[calc(100%+0.5rem)] items-start gap-2 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-canvas/70 ${TILE_FOCUS}`}
                onClick={() => navigate(`/inventory/${row.productId}`)}
              >
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(row.priority)}`}
                >
                  {t(priorityLabelKey(row.priority))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {row.name}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                    <span>
                      {t("dashboard.stockPriority.onHand")}:{" "}
                      <span className="tabular-nums text-foreground">
                        {formatCount(row.onHand)}
                      </span>
                    </span>
                    <span>
                      {t("dashboard.stockPriority.daysCover")}:{" "}
                      <span className="tabular-nums text-foreground">
                        {row.daysOfCover == null
                          ? "—"
                          : formatCount(Math.round(row.daysOfCover))}
                      </span>
                    </span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {row.reasons.map((reason) => {
                      const key = reasonLabelKey(reason);
                      if (!key) return null;
                      return (
                        <span
                          key={reason}
                          className="rounded bg-canvas px-1.5 py-0.5 text-[10px] text-muted"
                        >
                          {t(key)}
                        </span>
                      );
                    })}
                  </span>
                </span>
                <ArrowUpRight
                  className="mt-1 size-4 shrink-0 text-muted"
                  strokeWidth={1.75}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        aria-label={t("dashboard.aria.stockPriorityFooter")}
        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 ${TILE_FOCUS}`}
        onClick={() => navigate("/reports/product-movement?preset=last90")}
      >
        {t("dashboard.stockPriority.footerCta")}
        <ArrowRight className="size-4" strokeWidth={1.75} />
      </button>
    </section>
  );
}
