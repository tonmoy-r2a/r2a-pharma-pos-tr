/**
 * Settings → Stock Audit Count (Prod P8).
 * Owner/Manager only. Online required. start → count lines → submit.
 * ↑/↓ navigate · Enter activate · Esc via Settings. No Tab navigator.
 * Owner web `/audit` remains the review surface.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useConnectivity } from "@/features/shell/ConnectivityProvider";
import { PosToast, type PosToastTone } from "@/features/shell/PosToast";
import { useLocale } from "@/i18n";
import {
  listAuditBatches,
  saveStockAuditLines,
  searchAuditProducts,
  startStockAudit,
  stockAuditErrorMessage,
  submitStockAudit,
  type ReceiveBatchRow,
  type ReceiveProductHit,
  type StartedStockAudit,
  type StockAuditCountLine,
  type SubmittedStockAudit,
} from "@/lib/stockAudit";

type ToastState = { message: string; tone: PosToastTone };

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:bg-shell disabled:text-muted";

function parseNonNegInt(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function StockAuditSection() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { mode, forcedOffline } = useConnectivity();
  const titleId = useId();
  const productListId = useId();
  const batchListId = useId();
  const linesListId = useId();

  const online = mode === "online" && !forcedOffline;

  const [locationLabel, setLocationLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [audit, setAudit] = useState<StartedStockAudit | null>(null);
  const [lines, setLines] = useState<StockAuditCountLine[]>([]);
  const [submitted, setSubmitted] = useState<SubmittedStockAudit | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [query, setQuery] = useState("");
  const [productHits, setProductHits] = useState<ReceiveProductHit[]>([]);
  const [productFocus, setProductFocus] = useState(0);
  const [productLoading, setProductLoading] = useState(false);
  const [product, setProduct] = useState<ReceiveProductHit | null>(null);

  const [batches, setBatches] = useState<ReceiveBatchRow[]>([]);
  const [batchFocus, setBatchFocus] = useState(0);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batch, setBatch] = useState<ReceiveBatchRow | null>(null);
  const [countedQty, setCountedQty] = useState("");
  const [lineFocus, setLineFocus] = useState(0);

  const locationRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const queryRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);

  const showToast = useCallback((message: string, tone: PosToastTone) => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (submitted) {
      resetRef.current?.focus();
      return;
    }
    if (!audit) {
      locationRef.current?.focus();
      return;
    }
    queryRef.current?.focus();
  }, [audit, submitted]);

  useEffect(() => {
    if (!audit || product) return;
    const needle = query.trim();
    if (needle.length < 1) {
      setProductHits([]);
      setProductLoading(false);
      return;
    }
    if (!online) {
      setProductHits([]);
      setProductLoading(false);
      return;
    }
    let cancelled = false;
    setProductLoading(true);
    const handle = window.setTimeout(() => {
      void searchAuditProducts(needle)
        .then((hits) => {
          if (cancelled) return;
          setProductHits(hits);
          setProductFocus(0);
          setProductLoading(false);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setProductHits([]);
          setProductLoading(false);
          showToast(
            stockAuditErrorMessage(err, t("settings.stockAudit.searchFailed")),
            "error",
          );
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [audit, product, query, online, showToast, t]);

  useEffect(() => {
    if (!product || !online) {
      setBatches([]);
      setBatch(null);
      return;
    }
    let cancelled = false;
    setBatchLoading(true);
    void listAuditBatches(product.id)
      .then((rows) => {
        if (cancelled) return;
        setBatches(rows);
        setBatchFocus(0);
        setBatchLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBatches([]);
        setBatchLoading(false);
        showToast(
          stockAuditErrorMessage(err, t("settings.stockAudit.batchesFailed")),
          "error",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [product, online, showToast, t]);

  function resetPicker() {
    setQuery("");
    setProductHits([]);
    setProduct(null);
    setBatches([]);
    setBatch(null);
    setCountedQty("");
  }

  function resetAll() {
    setLocationLabel("");
    setNotes("");
    setAudit(null);
    setLines([]);
    setSubmitted(null);
    resetPicker();
    setBusy(false);
  }

  async function handleStart() {
    if (!online) {
      showToast(t("settings.stockAudit.offline"), "error");
      return;
    }
    const label = locationLabel.trim();
    if (!label) {
      showToast(t("settings.stockAudit.needLocation"), "error");
      locationRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const started = await startStockAudit({
        storeId: user?.storeId || undefined,
        locationLabel: label,
        notes: notes.trim() || undefined,
      });
      setAudit(started);
      setLines([]);
      setSubmitted(null);
      resetPicker();
      showToast(
        t("settings.stockAudit.started").replace("{auditNo}", started.auditNo),
        "success",
      );
    } catch (err: unknown) {
      showToast(
        stockAuditErrorMessage(err, t("settings.stockAudit.startFailed")),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function pickProduct(hit: ReceiveProductHit) {
    setProduct(hit);
    setQuery(hit.name);
    setProductHits([]);
    setBatch(null);
    setCountedQty("");
  }

  function pickBatch(row: ReceiveBatchRow) {
    setBatch(row);
    setCountedQty(String(row.quantityOnHand));
    window.setTimeout(() => qtyRef.current?.focus(), 0);
  }

  function addOrUpdateLine() {
    if (!product || !batch) {
      showToast(t("settings.stockAudit.needBatch"), "error");
      return;
    }
    const qty = parseNonNegInt(countedQty);
    if (qty == null) {
      showToast(t("settings.stockAudit.needQty"), "error");
      qtyRef.current?.focus();
      return;
    }
    const next: StockAuditCountLine = {
      batchId: batch.id,
      productId: product.id,
      productName: product.name,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      systemQty: batch.quantityOnHand,
      countedQty: qty,
    };
    setLines((prev) => {
      const without = prev.filter((line) => line.batchId !== next.batchId);
      return [...without, next];
    });
    showToast(t("settings.stockAudit.lineAdded"), "success");
    resetPicker();
    window.setTimeout(() => queryRef.current?.focus(), 0);
  }

  function removeFocusedLine() {
    if (lines.length === 0) return;
    const idx = Math.min(lineFocus, lines.length - 1);
    const target = lines[idx];
    if (!target) return;
    setLines((prev) => prev.filter((line) => line.batchId !== target.batchId));
    setLineFocus((prev) => Math.max(0, Math.min(prev, lines.length - 2)));
  }

  async function persistLines(): Promise<boolean> {
    if (!audit) return false;
    if (lines.length === 0) {
      showToast(t("settings.stockAudit.needLines"), "error");
      return false;
    }
    if (!online) {
      showToast(t("settings.stockAudit.offline"), "error");
      return false;
    }
    await saveStockAuditLines(audit.id, {
      lines: lines.map((line) => ({
        batchId: line.batchId,
        countedQty: line.countedQty,
      })),
    });
    return true;
  }

  async function handleSaveCounts() {
    setBusy(true);
    try {
      const ok = await persistLines();
      if (ok) showToast(t("settings.stockAudit.linesSaved"), "success");
    } catch (err: unknown) {
      showToast(
        stockAuditErrorMessage(err, t("settings.stockAudit.saveFailed")),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!audit) return;
    setBusy(true);
    try {
      const ok = await persistLines();
      if (!ok) return;
      const result = await submitStockAudit(audit.id, {
        notes: notes.trim() || undefined,
      });
      setSubmitted(result);
      showToast(
        t("settings.stockAudit.submitted").replace("{auditNo}", result.auditNo),
        "success",
      );
    } catch (err: unknown) {
      showToast(
        stockAuditErrorMessage(err, t("settings.stockAudit.submitFailed")),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function onStartKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const order = [locationRef.current, notesRef.current, startRef.current];
      const active = document.activeElement;
      let idx = order.findIndex((el) => el === active);
      if (idx < 0) idx = 0;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = (idx + delta + order.length) % order.length;
      order[next]?.focus();
      return;
    }
    if (event.key === "Enter" && document.activeElement === startRef.current) {
      event.preventDefault();
      void handleStart();
    }
  }

  function onCountKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (product && !batch && batches.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setBatchFocus((prev) => {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          return (prev + delta + batches.length) % batches.length;
        });
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const row = batches[batchFocus];
        if (row) pickBatch(row);
        return;
      }
    }

    if (!product && productHits.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setProductFocus((prev) => {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          return (prev + delta + productHits.length) % productHits.length;
        });
        return;
      }
      if (event.key === "Enter" && document.activeElement === queryRef.current) {
        event.preventDefault();
        const hit = productHits[productFocus];
        if (hit) pickProduct(hit);
        return;
      }
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (document.activeElement === qtyRef.current || document.activeElement === addRef.current) {
        event.preventDefault();
        if (document.activeElement === qtyRef.current) addRef.current?.focus();
        else qtyRef.current?.focus();
        return;
      }
      if (lines.length > 0 && (document.activeElement === saveRef.current || document.activeElement === submitRef.current)) {
        event.preventDefault();
        if (document.activeElement === saveRef.current) submitRef.current?.focus();
        else saveRef.current?.focus();
        return;
      }
      if (lines.length > 0 && document.activeElement?.getAttribute("data-audit-line") === "true") {
        event.preventDefault();
        setLineFocus((prev) => {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          return (prev + delta + lines.length) % lines.length;
        });
      }
    }

    if (event.key === "Enter") {
      if (document.activeElement === addRef.current) {
        event.preventDefault();
        addOrUpdateLine();
        return;
      }
      if (document.activeElement === saveRef.current) {
        event.preventDefault();
        void handleSaveCounts();
        return;
      }
      if (document.activeElement === submitRef.current) {
        event.preventDefault();
        void handleSubmit();
        return;
      }
      if (document.activeElement === qtyRef.current) {
        event.preventDefault();
        addOrUpdateLine();
      }
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      if (document.activeElement?.getAttribute("data-audit-line") === "true") {
        event.preventDefault();
        removeFocusedLine();
      }
    }
  }

  const discrepancyCount = lines.filter(
    (line) => line.countedQty !== line.systemQty,
  ).length;

  return (
    <div className="mx-auto w-full max-w-2xl" aria-labelledby={titleId}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <ClipboardCheck className="size-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {t("settings.stockAudit")}
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {t("settings.stockAuditHelp")}
          </p>
        </div>
      </div>

      {!online ? (
        <p
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {t("settings.stockAudit.offline")}
        </p>
      ) : null}

      {submitted ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            <p className="font-semibold">
              {t("settings.stockAudit.submittedTitle").replace(
                "{auditNo}",
                submitted.auditNo,
              )}
            </p>
            <p className="mt-1">
              {t("settings.stockAudit.submittedHint")
                .replace("{status}", submitted.status)
                .replace("{items}", String(submitted.itemsChecked))}
            </p>
          </div>
          <button
            ref={resetRef}
            type="button"
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
            onClick={resetAll}
          >
            {t("settings.stockAudit.startAnother")}
          </button>
          <p className="text-xs text-muted">
            <kbd className="font-medium text-foreground">[Esc]</kbd>{" "}
            {t("settings.back")}
          </p>
        </div>
      ) : !audit ? (
        <div className="mt-6 space-y-4" onKeyDown={onStartKeyDown}>
          <label className="block text-sm font-medium text-foreground">
            {t("settings.stockAudit.location")}
            <input
              ref={locationRef}
              type="text"
              className={inputClass}
              value={locationLabel}
              disabled={!online || busy}
              placeholder={t("settings.stockAudit.locationPlaceholder")}
              onChange={(e) => setLocationLabel(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            {t("settings.stockAudit.notes")}
            <input
              ref={notesRef}
              type="text"
              className={inputClass}
              value={notes}
              disabled={!online || busy}
              placeholder={t("settings.stockAudit.notesPlaceholder")}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button
            ref={startRef}
            type="button"
            disabled={!online || busy}
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleStart()}
          >
            {busy
              ? t("settings.stockAudit.starting")
              : t("settings.stockAudit.start")}
          </button>
          <p className="text-xs text-muted">
            {t("settings.stockAudit.startFooter")}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5" onKeyDown={onCountKeyDown}>
          <div className="rounded-md border border-border bg-shell/40 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              {audit.auditNo} · {audit.locationLabel}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {t("settings.stockAudit.countHint")}
            </p>
          </div>

          <label className="block text-sm font-medium text-foreground">
            {t("settings.stockAudit.product")}
            <input
              ref={queryRef}
              type="text"
              className={inputClass}
              value={query}
              disabled={!online || busy || Boolean(product)}
              placeholder={t("settings.stockAudit.productPlaceholder")}
              aria-controls={productListId}
              aria-autocomplete="list"
              onChange={(e) => {
                setQuery(e.target.value);
                setProduct(null);
                setBatch(null);
              }}
            />
          </label>

          {!product && productLoading ? (
            <p className="text-sm text-muted">{t("settings.stockAudit.searching")}</p>
          ) : null}

          {!product && productHits.length > 0 ? (
            <ul
              id={productListId}
              role="listbox"
              className="max-h-40 overflow-auto rounded-md border border-border bg-surface"
            >
              {productHits.map((hit, index) => (
                <li key={hit.id} role="option" aria-selected={index === productFocus}>
                  <button
                    type="button"
                    className={[
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                      index === productFocus
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-shell",
                    ].join(" ")}
                    onClick={() => pickProduct(hit)}
                  >
                    <span className="font-medium">{hit.name}</span>
                    {hit.sku ? (
                      <span className="text-xs opacity-80">{hit.sku}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {product ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-foreground">{product.name}</span>
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-xs text-muted hover:bg-shell"
                onClick={resetPicker}
              >
                {t("settings.stockAudit.changeProduct")}
              </button>
            </div>
          ) : null}

          {product && batchLoading ? (
            <p className="text-sm text-muted">{t("settings.stockAudit.loadingBatches")}</p>
          ) : null}

          {product && !batch && !batchLoading ? (
            batches.length === 0 ? (
              <p className="text-sm text-muted">{t("settings.stockAudit.noBatches")}</p>
            ) : (
              <ul
                id={batchListId}
                role="listbox"
                className="max-h-44 overflow-auto rounded-md border border-border bg-surface"
              >
                {batches.map((row, index) => (
                  <li key={row.id} role="option" aria-selected={index === batchFocus}>
                    <button
                      type="button"
                      className={[
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                        index === batchFocus
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-shell",
                      ].join(" ")}
                      onClick={() => pickBatch(row)}
                    >
                      <span>
                        <span className="font-medium">{row.batchNumber}</span>
                        <span className="ml-2 text-xs opacity-80">
                          {formatExpiry(row.expiryDate)}
                        </span>
                      </span>
                      <span className="text-xs font-semibold">
                        {t("settings.stockAudit.systemQty")}: {row.quantityOnHand}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {batch ? (
            <div className="space-y-3 rounded-md border border-border bg-shell/30 px-4 py-3">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{batch.batchNumber}</span>
                <span className="ml-2 text-muted">
                  {t("settings.stockAudit.systemQty")}: {batch.quantityOnHand}
                </span>
              </p>
              <label className="block text-sm font-medium text-foreground">
                {t("settings.stockAudit.countedQty")}
                <input
                  ref={qtyRef}
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={countedQty}
                  disabled={busy}
                  onChange={(e) => setCountedQty(e.target.value)}
                />
              </label>
              <button
                ref={addRef}
                type="button"
                disabled={busy}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-shell disabled:opacity-60"
                onClick={addOrUpdateLine}
              >
                {t("settings.stockAudit.addLine")}
              </button>
            </div>
          ) : null}

          <section aria-labelledby={linesListId}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3
                id={linesListId}
                className="text-sm font-semibold text-foreground"
              >
                {t("settings.stockAudit.linesTitle")}
              </h3>
              <p className="text-xs text-muted">
                {lines.length} {t("settings.stockAudit.linesCount")}
                {discrepancyCount > 0
                  ? ` · ${discrepancyCount} ${t("settings.stockAudit.discrepancies")}`
                  : ""}
              </p>
            </div>
            {lines.length === 0 ? (
              <p className="text-sm text-muted">{t("settings.stockAudit.noLines")}</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {lines.map((line, index) => {
                  const diff = line.countedQty - line.systemQty;
                  const active = index === lineFocus;
                  return (
                    <li key={line.batchId}>
                      <button
                        type="button"
                        data-audit-line="true"
                        className={[
                          "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm",
                          active ? "bg-primary/10" : "bg-surface hover:bg-shell/60",
                        ].join(" ")}
                        onFocus={() => setLineFocus(index)}
                        onClick={() => setLineFocus(index)}
                      >
                        <span className="font-medium text-foreground">
                          {line.productName}
                        </span>
                        <span className="text-xs text-muted">
                          {line.batchNumber} · {formatExpiry(line.expiryDate)} ·{" "}
                          {t("settings.stockAudit.systemQty")} {line.systemQty} →{" "}
                          {t("settings.stockAudit.countedQty")} {line.countedQty}
                          {diff !== 0 ? ` (${diff > 0 ? "+" : ""}${diff})` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              ref={saveRef}
              type="button"
              disabled={!online || busy || lines.length === 0}
              className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-shell disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleSaveCounts()}
            >
              {t("settings.stockAudit.saveCounts")}
            </button>
            <button
              ref={submitRef}
              type="button"
              disabled={!online || busy || lines.length === 0}
              className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleSubmit()}
            >
              {busy
                ? t("settings.stockAudit.submitting")
                : t("settings.stockAudit.submit")}
            </button>
          </div>

          <p className="text-xs text-muted">
            {t("settings.stockAudit.countFooter")}
          </p>
        </div>
      )}

      {toast ? (
        <div className="mt-4">
          <PosToast
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => setToast(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
