/**
 * Catalog Import wizard (Prod Batch P14).
 * Inventory → Import Catalog. Upload CSV/XLSX → dry-run → commit.
 * Invented to match Admin Portal / Inventory chrome. Content region only.
 */

import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import {
  CATALOG_IMPORT_MAX_FILE_BYTES,
  CATALOG_IMPORT_MAX_ROWS,
  commitCatalogImport,
  dryRunCatalogImport,
  type CatalogImportDryRunResult,
} from "@/lib/catalogImport";
import { formatCount } from "@/lib/format";
import { useOwnerPath } from "@/lib/OwnerPathProvider";

type Step = "upload" | "preview" | "done";

export function CatalogImportPage() {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CatalogImportDryRunResult | null>(null);
  const [commitSummary, setCommitSummary] = useState<{
    created: number;
    updated: number;
  } | null>(null);

  const validRows = useMemo(
    () =>
      (preview?.rows ?? [])
        .filter((r) => r.action !== "error" && r.row)
        .map((r) => r.row!),
    [preview],
  );

  const maxMb = (CATALOG_IMPORT_MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setCommitSummary(null);
    setBusy(true);
    setFileName(file.name);
    try {
      const result = await dryRunCatalogImport(file);
      setPreview(result);
      setStep("preview");
    } catch (e) {
      setPreview(null);
      setStep("upload");
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("inventory.import.error"),
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onCommit = async () => {
    if (validRows.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await commitCatalogImport(validRows);
      setCommitSummary({
        created: result.created,
        updated: result.updated,
      });
      setStep("done");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("inventory.import.commitFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFileName(null);
    setPreview(null);
    setCommitSummary(null);
    setError(null);
  };

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => navigate("/inventory")}
            >
              {t("page.inventoryTitle")}
            </button>
            <span className="mx-1.5 text-border">/</span>
            <span>{t("inventory.import.crumb")}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {t("inventory.import.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {t("inventory.import.subtitle")}
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-canvas"
          onClick={() => navigate("/inventory")}
        >
          {t("inventory.import.back")}
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        <p>
          {t("inventory.import.limits")
            .replace("{maxMb}", maxMb)
            .replace("{maxRows}", String(CATALOG_IMPORT_MAX_ROWS))}
        </p>
        <p className="mt-1 font-mono text-xs text-foreground/80">
          {t("inventory.import.columns")}
        </p>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <p>{error}</p>
        </div>
      ) : null}

      {step === "upload" || step === "preview" ? (
        <section className="mb-4 rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
          <FileSpreadsheet
            className="mx-auto size-10 text-primary"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-3 text-sm font-medium text-foreground">
            {t("inventory.import.dropHint")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {fileName
              ? t("inventory.import.selected").replace("{name}", fileName)
              : t("inventory.import.formats")}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
              ) : (
                <Upload className="size-3.5" strokeWidth={1.75} />
              )}
              {busy
                ? t("inventory.import.analyzing")
                : t("inventory.import.chooseFile")}
            </button>
          </div>
        </section>
      ) : null}

      {step === "preview" && preview ? (
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-medium text-foreground">
                {t("inventory.import.kpi.total")}: {formatCount(preview.totalRows)}
              </span>
              <span className="text-emerald-700">
                {t("inventory.import.kpi.create")}:{" "}
                {formatCount(preview.createCount)}
              </span>
              <span className="text-amber-700">
                {t("inventory.import.kpi.update")}:{" "}
                {formatCount(preview.updateCount)}
              </span>
              <span className="text-destructive">
                {t("inventory.import.kpi.error")}:{" "}
                {formatCount(preview.errorCount)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-canvas disabled:opacity-50"
                onClick={reset}
              >
                {t("inventory.import.startOver")}
              </button>
              <button
                type="button"
                disabled={busy || validRows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                onClick={() => void onCommit()}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                ) : null}
                {t("inventory.import.commit").replace(
                  "{count}",
                  String(validRows.length),
                )}
              </button>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="sticky top-0 bg-shell text-[10px] font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2">{t("inventory.import.col.row")}</th>
                  <th className="px-4 py-2">{t("inventory.import.col.action")}</th>
                  <th className="px-4 py-2">{t("inventory.import.col.sku")}</th>
                  <th className="px-4 py-2">{t("inventory.import.col.name")}</th>
                  <th className="px-4 py-2">{t("inventory.import.col.message")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr
                    key={`${row.rowNumber}-${row.sku}`}
                    className="border-t border-border"
                  >
                    <td className="px-4 py-2 font-mono text-xs text-muted">
                      {row.rowNumber}
                    </td>
                    <td className="px-4 py-2">
                      <ActionPill action={row.action} />
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{row.sku}</td>
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2 text-muted">{row.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {step === "done" && commitSummary ? (
        <section className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
          <CheckCircle2
            className="mx-auto size-12 text-emerald-600"
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            {t("inventory.import.doneTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("inventory.import.doneBody")
              .replace("{created}", String(commitSummary.created))
              .replace("{updated}", String(commitSummary.updated))}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-canvas"
              onClick={reset}
            >
              {t("inventory.import.importAnother")}
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              onClick={() => navigate("/inventory")}
            >
              {t("inventory.import.viewInventory")}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ActionPill({
  action,
}: {
  action: "create" | "update" | "error";
}) {
  const { t } = useLocale();
  const label =
    action === "create"
      ? t("inventory.import.action.create")
      : action === "update"
        ? t("inventory.import.action.update")
        : t("inventory.import.action.error");
  const className =
    action === "create"
      ? "bg-emerald-50 text-emerald-800"
      : action === "update"
        ? "bg-amber-50 text-amber-800"
        : "bg-destructive/10 text-destructive";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
