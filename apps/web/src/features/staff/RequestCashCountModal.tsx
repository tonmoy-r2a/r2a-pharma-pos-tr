import { AlertCircle, Banknote, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  cancelCashCountRequest,
  fetchShifts,
  requestCashCount,
  type ShiftListRow,
} from "@/lib/shifts";

type RequestableShift = Pick<
  ShiftListRow,
  "id" | "shiftNo" | "user" | "openedAt" | "status" | "cashCountStatus"
>;

/**
 * Prod P10 — Request Cash Count (invent to match theme).
 * Detail: confirm for one OPEN shift.
 * List: pick an OPEN shift, then confirm / cancel pending.
 */
export function RequestCashCountModal({
  shift: initialShift = null,
  onCancel,
  onDone,
}: {
  /** When set (Shift Details), skip picker. */
  shift?: RequestableShift | null;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const [openShifts, setOpenShifts] = useState<ShiftListRow[]>([]);
  const [selected, setSelected] = useState<RequestableShift | null>(initialShift);
  const [loadingList, setLoadingList] = useState(!initialShift);
  const [listError, setListError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialShift) {
      setSelected(initialShift);
      setLoadingList(false);
      return;
    }
    let cancelled = false;
    setLoadingList(true);
    setListError(null);
    void fetchShifts({ status: "OPEN", limit: 25, offset: 0 })
      .then((result) => {
        if (cancelled) return;
        setOpenShifts(result.items);
        if (result.items.length === 1) setSelected(result.items[0]!);
        setLoadingList(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadingList(false);
        setListError(err instanceof ApiError ? err.message : t("shifts.cashCount.error"));
      });
    return () => {
      cancelled = true;
    };
  }, [initialShift, t]);

  useEffect(() => {
    setNote("");
    setError(null);
    setSubmitting(false);
  }, [selected?.id]);

  const alreadyRequested = selected?.cashCountStatus === "REQUESTED";
  const canRequest = selected?.status === "OPEN" && !alreadyRequested;
  const needsPicker = !initialShift && !selected && !loadingList;

  async function submitRequest() {
    if (!selected || !canRequest || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestCashCount(selected.id, {
        note: note.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shifts.cashCount.error"));
      setSubmitting(false);
    }
  }

  async function submitCancel() {
    if (!selected || !alreadyRequested || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await cancelCashCountRequest(selected.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shifts.cashCount.error"));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={onCancel}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-cash-count-title"
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Banknote className="size-5 text-primary" strokeWidth={1.75} />
              <h2 id="request-cash-count-title" className="text-lg font-semibold text-foreground">
                {alreadyRequested ? t("shifts.cashCount.cancelTitle") : t("shifts.cashCount.title")}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              {alreadyRequested ? t("shifts.cashCount.cancelSubtitle") : t("shifts.cashCount.subtitle")}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-canvas hover:text-foreground"
            onClick={onCancel}
            disabled={submitting}
            aria-label={t("shifts.cashCount.close")}
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          {loadingList ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
              {t("shifts.cashCount.loadingOpen")}
            </p>
          ) : listError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {listError}
            </p>
          ) : needsPicker || (!initialShift && openShifts.length > 1 && selected == null) ? (
            openShifts.length === 0 ? (
              <div className="flex gap-2 rounded-lg border border-border bg-canvas px-3 py-3 text-sm text-muted">
                <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                <span>{t("shifts.cashCount.noOpenShifts")}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("shifts.cashCount.pickShift")}
                </p>
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {openShifts.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-canvas"
                        onClick={() => setSelected(row)}
                      >
                        <span className="font-medium text-foreground">{row.shiftNo}</span>
                        <span className="truncate text-xs text-muted">
                          {row.user?.name ?? "—"}
                          {row.cashCountStatus === "REQUESTED"
                            ? ` · ${t("shifts.cashCount.status.requested")}`
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : selected ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <Metric label={t("shifts.cashCount.shift")} value={selected.shiftNo} />
                <Metric
                  label={t("shifts.cashCount.cashier")}
                  value={selected.user?.name ?? t("shifts.detail.unknownCashier")}
                />
                <Metric label={t("shifts.cashCount.opened")} value={formatDateTime(selected.openedAt)} />
              </div>

              {!initialShift && openShifts.length > 1 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setSelected(null)}
                  disabled={submitting}
                >
                  {t("shifts.cashCount.changeShift")}
                </button>
              ) : null}

              {alreadyRequested ? (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                  <span>{t("shifts.cashCount.pendingHint")}</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted">{t("shifts.cashCount.body")}</p>
                  <label className="block text-xs font-medium text-muted">
                    {t("shifts.cashCount.note")}
                    <textarea
                      className="mt-1 min-h-[80px] w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t("shifts.cashCount.notePlaceholder")}
                      maxLength={500}
                      disabled={submitting || !canRequest}
                    />
                  </label>
                </>
              )}
            </>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-canvas"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("shifts.cashCount.close")}
          </button>
          {selected && alreadyRequested ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={submitCancel}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" strokeWidth={1.75} /> : null}
              {submitting ? t("shifts.cashCount.cancelling") : t("shifts.cashCount.cancelRequest")}
            </button>
          ) : selected && canRequest ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={submitRequest}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Banknote className="size-4" strokeWidth={1.75} />
              )}
              {submitting ? t("shifts.cashCount.requesting") : t("shifts.cashCount.confirm")}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}
