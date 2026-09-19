/**
 * Prod Batch P11 smoke — Terminal presence.
 * Run: npm run smoke:prod-p11 -w @r2a/web
 *
 * Source guards only (no live API). Covers Prisma TerminalPresence,
 * heartbeat + Owner presence APIs, desktop heartbeat (incl. Force Offline),
 * Dashboard Terminals card.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const REPO = join(ROOT, "..", "..");

function readRel(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function readSrc(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(REPO, rel), "utf8");
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const P11_WEB_I18N = [
  "dashboard.terminals.title",
  "dashboard.terminals.status.online",
  "dashboard.terminals.status.offline",
  "dashboard.terminals.status.forcedOffline",
  "dashboard.terminals.empty",
  "dashboard.terminals.hint",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p11"]?.includes("smoke-prod-p11"),
    "package.json must define smoke:prod-p11",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p11");
}

function checkSchemaAndZod(): void {
  const schema = readRepo("packages/database/prisma/schema.prisma");
  const migration = readRepo(
    "packages/database/prisma/migrations/20260918130000_prod_p11_terminal_presence/migration.sql",
  );
  const zod = readRepo("packages/shared-types/src/terminal.ts");
  const index = readRepo("packages/shared-types/src/index.ts");

  assert(
    schema.includes("model TerminalPresence") &&
      schema.includes("forceOffline") &&
      schema.includes("lastSeenAt") &&
      schema.includes("terminalId"),
    "Prisma TerminalPresence must include heartbeat fields",
  );
  assert(
    migration.includes("TerminalPresence") && migration.includes("forceOffline"),
    "P11 migration must create TerminalPresence",
  );
  assert(
    zod.includes("terminalHeartbeatSchema") &&
      zod.includes("TERMINAL_PRESENCE_STALE_MS") &&
      zod.includes("FORCED_OFFLINE") &&
      index.includes("./terminal"),
    "shared-types terminal contracts must be exported",
  );
  console.log("  ✓ Prisma + Zod terminal presence");
}

function checkApis(): void {
  const router = readRepo("apps/server/src/modules/terminal/terminal.router.ts");
  const service = readRepo("apps/server/src/modules/terminal/terminal.service.ts");
  const routes = readRepo("apps/server/src/routes/index.ts");
  const owner = readRepo("apps/server/src/modules/owner/owner.router.ts");

  assert(
    router.includes('"/heartbeat"') &&
      router.includes("ownerTerminalPresenceRouter") &&
      router.includes('"/presence"'),
    "terminal router must mount heartbeat + owner presence",
  );
  assert(
    service.includes("forceOffline") &&
      service.includes("computeStatus") &&
      service.includes("TERMINAL_PRESENCE_STALE_MS"),
    "terminal service must upsert heartbeat + compute ONLINE/OFFLINE/FORCED_OFFLINE",
  );
  assert(
    routes.includes('"/terminals"') && routes.includes("terminalRouter"),
    "domainRouter must mount /terminals",
  );
  assert(
    owner.includes('"/terminals"') && owner.includes("ownerTerminalPresenceRouter"),
    "ownerRouter must mount /terminals/presence",
  );
  console.log("  ✓ heartbeat + Owner presence routes");
}

function checkDesktop(): void {
  const presence = readRepo("apps/desktop/src/lib/terminalPresence.ts");
  const idStore = readRepo("apps/desktop/src/lib/terminalId.ts");
  const hook = readRepo("apps/desktop/src/features/shell/useTerminalPresenceHeartbeat.ts");
  const app = readRepo("apps/desktop/src/App.tsx");

  assert(
    presence.includes("/api/v1/terminals/heartbeat") &&
      presence.includes("forceOffline") &&
      idStore.includes("pharmasync.terminalId"),
    "desktop must POST heartbeat with stable terminalId",
  );
  assert(
    hook.includes("forcedOffline") &&
      hook.includes("postTerminalHeartbeat") &&
      hook.includes("Force Offline"),
    "heartbeat hook must continue with forceOffline while Forced Offline",
  );
  assert(
    app.includes("useTerminalPresenceHeartbeat"),
    "AuthenticatedPos must start presence heartbeat",
  );
  console.log("  ✓ desktop heartbeat (incl. Force Offline lock)");
}

function checkWebUi(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P11_WEB_I18N) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }

  const lib = readSrc("lib/terminalPresence.ts");
  const card = readSrc("features/dashboard/TerminalsPresenceCard.tsx");
  const dash = readSrc("features/dashboard/DashboardPage.tsx");

  assert(
    lib.includes("/api/v1/owner/terminals/presence") &&
      lib.includes("fetchTerminalPresence"),
    "web lib must GET owner terminals presence",
  );
  assert(
    card.includes("fetchTerminalPresence") &&
      card.includes("PresenceDot") &&
      card.includes("status === \"ONLINE\""),
    "TerminalsPresenceCard must render live presence dots",
  );
  assert(
    dash.includes("TerminalsPresenceCard"),
    "Dashboard must include TerminalsPresenceCard",
  );
  console.log("  ✓ Dashboard Terminals card + i18n");
}

function main(): void {
  console.log("\nProd Batch P11 smoke — Terminal presence\n");
  checkPackage();
  checkSchemaAndZod();
  checkApis();
  checkDesktop();
  checkWebUi();
  console.log("\nAll P11 checks passed.\n");
}

main();
