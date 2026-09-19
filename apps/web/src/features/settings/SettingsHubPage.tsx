import {
  Building2,
  ClipboardList,
  Database,
  Lock,
  Shield,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useLocale, type MessageKey } from "@/i18n";
import { useOwnerPath } from "@/lib/OwnerPathProvider";

type HubCard = {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  icon: LucideIcon;
  live: boolean;
  path?: "/settings/business";
  hintKey?: MessageKey;
};

const HUB_CARDS: readonly HubCard[] = [
  {
    id: "business",
    titleKey: "settings.hub.business.title",
    bodyKey: "settings.hub.business.body",
    icon: Building2,
    live: true,
    path: "/settings/business",
  },
  {
    id: "branch",
    titleKey: "settings.hub.branch.title",
    bodyKey: "settings.hub.branch.body",
    icon: ClipboardList,
    live: false,
    hintKey: "settings.hub.branch.hint",
  },
  {
    id: "roles",
    titleKey: "settings.hub.roles.title",
    bodyKey: "settings.hub.roles.body",
    icon: Shield,
    live: false,
    hintKey: "settings.hub.roles.hint",
  },
  {
    id: "preferences",
    titleKey: "settings.hub.preferences.title",
    bodyKey: "settings.hub.preferences.body",
    icon: SlidersHorizontal,
    live: false,
    hintKey: "settings.hub.preferences.hint",
  },
  {
    id: "security",
    titleKey: "settings.hub.security.title",
    bodyKey: "settings.hub.security.body",
    icon: Lock,
    live: false,
    hintKey: "settings.hub.security.hint",
  },
  {
    id: "auditData",
    titleKey: "settings.hub.auditData.title",
    bodyKey: "settings.hub.auditData.body",
    icon: Database,
    live: false,
    hintKey: "settings.hub.auditData.hint",
  },
] as const;

/**
 * Invented Settings hub (Batch BN) — Admin Portal chrome family.
 * Only Business Profile is live; other cards stay disabled with i18n hints.
 */
export function SettingsHubPage() {
  const { t } = useLocale();
  const { navigate } = useOwnerPath();

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {t("settings.hub.breadcrumb")}
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
          {t("settings.hub.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("settings.hub.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {HUB_CARDS.map((card) => {
          const Icon = card.icon;
          if (card.live && card.path) {
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => navigate(card.path!)}
                className="flex flex-col rounded-xl border border-border bg-surface p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <h2 className="mt-4 text-base font-semibold text-foreground">
                  {t(card.titleKey)}
                </h2>
                <p className="mt-1 flex-1 text-sm text-muted">{t(card.bodyKey)}</p>
                <span className="mt-4 text-sm font-medium text-primary">
                  {t("settings.hub.open")}
                </span>
              </button>
            );
          }

          return (
            <div
              key={card.id}
              title={card.hintKey ? t(card.hintKey) : undefined}
              aria-disabled="true"
              className="flex cursor-not-allowed flex-col rounded-xl border border-border/80 bg-surface/70 p-5 opacity-70 shadow-sm"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-muted">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                {t(card.titleKey)}
              </h2>
              <p className="mt-1 flex-1 text-sm text-muted">{t(card.bodyKey)}</p>
              <p className="mt-4 text-xs text-muted">
                {card.hintKey ? t(card.hintKey) : t("settings.hub.disabledHint")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
