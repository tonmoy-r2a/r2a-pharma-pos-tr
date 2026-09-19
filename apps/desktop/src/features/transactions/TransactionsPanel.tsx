import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronRight, LayoutList, Loader2, Receipt, X } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useConnectivity } from "@/features/shell";
import { TransactionDetailView } from "@/features/transactions/TransactionDetailView";
import { useLocale } from "@/i18n";
import {
  getCloudSale,
  listCloudSales,
  mergeCloudWithLocal,
} from "@/lib/cloudSales";
import { formatCustomerPhone } from "@/lib/customerSearch";
import { formatTaka } from "@/lib/format";
import {
  formatTransactionListTime,
  transactionLogStore,
  type LoggedTransaction,
  type TransactionPaymentMethod,
} from "@/lib/transactionLogStore";

export type TransactionsPanelProps = {
  onClose: () => void;
};

type PanelView = "list" | "detail";

/**
 * Transactions — List (AJ) + Detail / Reprint (AK) + Prod P13 cloud reads.
 * Online: store-scoped `GET /sales` (+ detail by id); merge local-only pending ingest.
 * Offline: local `transactionLogStore`. Reprint → print stub until S2.
 * List: ↑/↓ · Enter → detail · Esc close. No Tab. No Baki.
 */
export function TransactionsPanel({ onClose }: TransactionsPanelProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const { isOnline } = useConnectivity();
  const titleId = useId();
  const listId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const [rows, setRows] = useState<LoggedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [view, setView] = useState<PanelView>("list");
  const [selected, setSelected] = useState<LoggedTransaction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const localList = useCallback((): LoggedTransaction[] => {
    if (!user?.tenantId) return [];
    return transactionLogStore.list(user.tenantId, user.storeId ?? null);
  }, [user?.tenantId, user?.storeId]);

  const reload = useCallback(async () => {
    if (!user?.tenantId) {
      setRows([]);
      setListError(null);
      setLoading(false);
      return;
    }

    const local = localList();

    if (!isOnline) {
      setRows(local);
      setListError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError(null);
    try {
      const cloud = await listCloudSales({ limit: 100, offset: 0 });
      setRows(mergeCloudWithLocal(cloud.items, local));
    } catch {
      setRows(local);
      setListError(t("txns.cloudFailed"));
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, isOnline, localList, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (view === "list") {
      panelRef.current?.focus();
    }
  }, [view]);

  useEffect(() => {
    if (rows.length === 0) {
      setFocusedIndex(0);
      return;
    }
    setFocusedIndex((i) => Math.min(Math.max(0, i), rows.length - 1));
  }, [rows.length]);

  const openDetail = useCallback(
    async (entry: LoggedTransaction) => {
      setSelected(entry);
      setView("detail");
      setDetailLoading(false);

      if (!isOnline || !entry.saleId.trim()) return;

      setDetailLoading(true);
      try {
        const cloud = await getCloudSale(entry.saleId);
        if (cloud) setSelected(cloud);
      } catch {
        // Prefer cloud when available; keep local/list snapshot on failure.
      } finally {
        setDetailLoading(false);
      }
    },
    [isOnline],
  );

  const backToList = useCallback(() => {
    setView("list");
    setSelected(null);
    setDetailLoading(false);
    queueMicrotask(() => panelRef.current?.focus());
  }, []);

  const moveFocus = useCallback(
    (delta: number) => {
      if (rows.length === 0) return;
      setFocusedIndex((i) => (i + delta + rows.length) % rows.length);
    },
    [rows.length],
  );

  const methodLabel = useCallback(
    (method: TransactionPaymentMethod, entry?: LoggedTransaction) => {
      switch (method) {
        case "CARD":
          return t("completed.card");
        case "MFS":
          return entry?.mfsSettlement?.providerLabel?.trim() || t("completed.mfs");
        case "LOYALTY":
          return t("txns.methodLoyalty");
        case "CASH":
        default:
          return t("completed.cash");
      }
    },
    [t],
  );

  const customerLabel = useCallback(
    (entry: LoggedTransaction) => {
      if (!entry.customer) return t("cart.walkInCustomer");
      const phone = formatCustomerPhone(entry.customer.phone);
      return phone
        ? `${entry.customer.name} · ${phone}`
        : entry.customer.name;
    },
    [t],
  );

  const focused = rows[focusedIndex] ?? null;

  const emptyHint = useMemo(
    () => t(isOnline ? "txns.emptyHintCloud" : "txns.emptyHint"),
    [t, isOnline],
  );

  const subtitle = useMemo(
    () => t(isOnline ? "txns.subtitleCloud" : "txns.subtitle"),
    [t, isOnline],
  );

  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (view === "detail") {
        backToList();
        return;
      }
      onClose();
      return;
    }

    if (view === "detail") {
      // Detail owns ←/→ CTA nav; Esc handled above.
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      moveFocus(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      moveFocus(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (focused) void openDetail(focused);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute inset-0 z-40 flex flex-col bg-surface"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDownCapture={onKeyDownCapture}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <LayoutList
            className="size-5 shrink-0 text-primary"
            strokeWidth={1.75}
            aria-hidden
          />
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-sm font-semibold text-foreground"
            >
              {view === "detail"
                ? t("txns.detailTitle")
                : t("txns.title")}
            </h2>
            <p className="truncate text-xs text-muted">
              {view === "detail"
                ? detailLoading
                  ? t("txns.detailLoading")
                  : t("txns.detailSubtitle")
                : subtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-shell hover:text-foreground"
          aria-label={t("txns.close")}
          onClick={onClose}
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      {view === "list" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {listError ? (
            <div
              className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"
              role="status"
            >
              {listError}
            </div>
          ) : null}

          <div className="shrink-0 border-b border-border bg-shell/60 px-4 py-2">
            <div className="grid grid-cols-[7.5rem_minmax(0,1.1fr)_minmax(0,1.4fr)_5.5rem_5.5rem_1.5rem] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              <span>{t("txns.colTime")}</span>
              <span>{t("txns.colTxn")}</span>
              <span>{t("txns.colCustomer")}</span>
              <span>{t("txns.colMethod")}</span>
              <span className="text-right">{t("txns.colTotal")}</span>
              <span className="sr-only">{t("txns.openDetail")}</span>
            </div>
          </div>

          {loading && rows.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <Loader2
                className="size-8 animate-spin text-primary"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="text-sm text-muted">{t("txns.loading")}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <Receipt
                className="size-12 text-border"
                strokeWidth={1.25}
                aria-hidden
              />
              <p className="text-sm font-medium text-foreground">
                {t("txns.empty")}
              </p>
              <p className="max-w-sm text-xs text-muted">{emptyHint}</p>
            </div>
          ) : (
            <ul
              id={listId}
              role="listbox"
              aria-label={t("txns.listLabel")}
              aria-busy={loading}
              className="min-h-0 flex-1 overflow-auto"
            >
              {rows.map((entry, index) => {
                const active = index === focusedIndex;
                return (
                  <li key={`${entry.saleId}-${entry.eventId}-${entry.txnLabel}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={[
                        "grid w-full grid-cols-[7.5rem_minmax(0,1.1fr)_minmax(0,1.4fr)_5.5rem_5.5rem_1.5rem] items-center gap-2 border-b border-border px-4 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-shell/80",
                      ].join(" ")}
                      onClick={() => {
                        setFocusedIndex(index);
                        void openDetail(entry);
                      }}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <span className="truncate font-mono text-xs text-muted">
                        {formatTransactionListTime(entry.completedAt)}
                      </span>
                      <span className="truncate font-semibold text-foreground">
                        {entry.txnLabel}
                      </span>
                      <span className="truncate text-muted">
                        {customerLabel(entry)}
                      </span>
                      <span className="truncate text-xs font-medium text-foreground">
                        {methodLabel(entry.paymentMethod, entry)}
                      </span>
                      <span className="truncate text-right font-semibold tabular-nums text-foreground">
                        {formatTaka(entry.total)}
                      </span>
                      <ChevronRight
                        className={[
                          "size-4 justify-self-end",
                          active ? "text-primary" : "text-border",
                        ].join(" ")}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <footer className="shrink-0 border-t border-border bg-shell/40 px-4 py-2 text-[11px] text-muted">
            {t("txns.listFooter")}
          </footer>
        </div>
      ) : selected && user?.tenantId ? (
        <>
          <TransactionDetailView
            entry={selected}
            tenantId={user.tenantId}
            storeId={user.storeId ?? null}
            onBack={backToList}
          />
          <footer className="shrink-0 border-t border-border bg-shell/40 px-4 py-2 text-[11px] text-muted">
            {t("txns.detailFooter")}
          </footer>
        </>
      ) : null}
    </div>
  );
}
