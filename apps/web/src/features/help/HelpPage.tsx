import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  Headphones,
  Loader2,
  Mail,
  Phone,
  Plus,
  Server,
  Ticket,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, type MessageKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { fetchHelpStatus, type HelpStatus } from "@/lib/help";

const FAQ_KEYS = [
  { q: "help.faq.1.q", a: "help.faq.1.a" },
  { q: "help.faq.2.q", a: "help.faq.2.a" },
  { q: "help.faq.3.q", a: "help.faq.3.a" },
  { q: "help.faq.4.q", a: "help.faq.4.a" },
  { q: "help.faq.5.q", a: "help.faq.5.a" },
] as const satisfies ReadonlyArray<{ q: MessageKey; a: MessageKey }>;

/**
 * Invented Help & Support (Batch BP) — FAQ + live system status.
 * Tickets / Create Ticket stay disabled with hints.
 */
export function HelpPage() {
  const { t } = useLocale();
  const [status, setStatus] = useState<HelpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchHelpStatus()
      .then((result) => {
        if (cancelled) return;
        setStatus(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(err instanceof ApiError ? err.message : t("help.loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {t("help.breadcrumb")}
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
          {t("help.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("help.subtitle")}</p>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-5" strokeWidth={1.75} />
          </span>
          <h2 className="mt-3 text-base font-semibold text-foreground">
            {t("help.cards.center.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("help.cards.center.body")}</p>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Headphones className="size-5" strokeWidth={1.75} />
          </span>
          <h2 className="mt-3 text-base font-semibold text-foreground">
            {t("help.cards.contact.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("help.cards.contact.body")}</p>
          {status ? (
            <ul className="mt-3 space-y-1.5 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted" strokeWidth={1.75} />
                <span>{status.supportContact.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted" strokeWidth={1.75} />
                <span>{status.supportContact.phone}</span>
              </li>
              <li className="text-xs text-muted">{status.supportContact.hours}</li>
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted">
              {loading ? t("help.loading") : t("help.contactUnavailable")}
            </p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Server className="size-5" strokeWidth={1.75} />
          </span>
          <h2 className="mt-3 text-base font-semibold text-foreground">
            {t("help.cards.status.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("help.cards.status.body")}</p>
          {loading && !status ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
              {t("help.loading")}
            </p>
          ) : null}
          {error && !status ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <p className="text-destructive">{error}</p>
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-foreground hover:bg-canvas"
                onClick={() => setReload((n) => n + 1)}
              >
                {t("help.retry")}
              </button>
            </div>
          ) : null}
          {status ? <SystemStatusPanel status={status} /> : null}
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CircleHelp className="size-4 text-primary" strokeWidth={1.75} />
            <h2 className="text-base font-semibold text-foreground">
              {t("help.faq.title")}
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {FAQ_KEYS.map((item, index) => {
              const open = openFaq === index;
              return (
                <li key={item.q}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {t(item.q)}
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                      strokeWidth={1.75}
                    />
                  </button>
                  {open ? (
                    <p className="pb-3 text-sm leading-relaxed text-muted">
                      {t(item.a)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ticket className="size-4 text-muted" strokeWidth={1.75} />
              <h2 className="text-base font-semibold text-foreground">
                {t("help.tickets.title")}
              </h2>
            </div>
            <button
              type="button"
              disabled
              title={t("help.tickets.createHint")}
              className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-muted opacity-70"
            >
              <Plus className="size-3.5" strokeWidth={1.75} />
              {t("help.tickets.create")}
            </button>
          </div>
          <p className="text-sm text-muted">{t("help.tickets.body")}</p>
          <p className="mt-3 rounded-lg border border-dashed border-border bg-slate-50 px-3 py-4 text-center text-xs text-muted">
            {t("help.tickets.empty")}
          </p>
          <p className="mt-3 text-xs text-muted">{t("help.tickets.createHint")}</p>
        </aside>
      </div>
    </div>
  );
}

function SystemStatusPanel({ status }: { status: HelpStatus }) {
  const { t } = useLocale();
  const statusLabel =
    status.status === "OPERATIONAL"
      ? t("help.status.operational")
      : status.status === "DEGRADED"
        ? t("help.status.degraded")
        : t("help.status.down");

  return (
    <div className="mt-3 space-y-2 text-sm">
      <StatusRow label={t("help.status.overall")} value={statusLabel} />
      <StatusRow label={t("help.status.database")} value={status.database} />
      <StatusRow label={t("help.status.sync")} value={status.syncEngine} />
      <StatusRow label={t("help.status.version")} value={status.version} />
      <StatusRow label={t("help.status.environment")} value={status.environment} />
      <p className="pt-1 text-xs text-muted">
        {t("help.status.checkedAt")} {formatDateTime(status.timestamp)}
      </p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
