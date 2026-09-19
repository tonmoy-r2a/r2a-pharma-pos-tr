import { MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  fetchTerminalPresence,
  type TerminalPresenceRow,
  type TerminalPresenceStatus,
} from "@/lib/terminalPresence";

const POLL_MS = 15_000;

/**
 * Prod P11 — Dashboard Terminals card (invent to match theme).
 * Live GET /owner/terminals/presence only — no invented terminals.
 */
export function TerminalsPresenceCard() {
  const { t } = useLocale();
  const [rows, setRows] = useState<TerminalPresenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchTerminalPresence()
      .then((items) => {
        if (cancelled) return;
        setRows(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRows([]);
        setLoading(false);
        setError(err instanceof ApiError ? err.message : t("dashboard.terminals.error"));
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  useEffect(() => {
    const id = window.setInterval(() => setReload((n) => n + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            {t("dashboard.terminals.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{t("dashboard.terminals.subtitle")}</p>
        </div>
        <MonitorSmartphone className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-sm text-muted">{t("dashboard.terminals.loading")}</p>
      ) : error && rows.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:bg-canvas"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("dashboard.terminals.retry")}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t("dashboard.terminals.empty")}</p>
          <p className="text-[11px] text-muted">{t("dashboard.terminals.hint")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-2.5 rounded-lg border border-border bg-canvas px-3 py-2.5"
            >
              <PresenceDot status={row.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{row.userName}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {statusLabel(row.status, t)} · {formatDateTime(row.lastSeenAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 ? (
        <p className="mt-3 text-[11px] text-muted">{t("dashboard.terminals.hint")}</p>
      ) : null}
    </section>
  );
}

function PresenceDot({ status }: { status: TerminalPresenceStatus }) {
  const tone =
    status === "ONLINE"
      ? "bg-emerald-500"
      : status === "FORCED_OFFLINE"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <span
      className={`mt-1.5 size-2.5 shrink-0 rounded-full ${tone}`}
      aria-hidden
    />
  );
}

function statusLabel(
  status: TerminalPresenceStatus,
  t: (key: "dashboard.terminals.status.online" | "dashboard.terminals.status.offline" | "dashboard.terminals.status.forcedOffline") => string,
): string {
  if (status === "ONLINE") return t("dashboard.terminals.status.online");
  if (status === "FORCED_OFFLINE") return t("dashboard.terminals.status.forcedOffline");
  return t("dashboard.terminals.status.offline");
}
