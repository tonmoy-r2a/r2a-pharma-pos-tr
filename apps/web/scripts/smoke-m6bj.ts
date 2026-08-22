/**
 * M6 Batch BJ smoke — Audit nav + Audit & FEFO dashboard.
 * Run: npm run smoke:m6bj -w @r2a/web
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

function readRel(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function readSrc(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const KEYS = [
  "audit.title",
  "audit.subtitle",
  "audit.kpi.totalAudits",
  "audit.expiry.title",
  "audit.fefo.title",
  "audit.recent.title",
  "audit.activity.title",
  "audit.generateHint",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as { scripts?: Record<string, string> };
  assert(pkg.scripts?.["smoke:m6bj"]?.includes("smoke-m6bj"), "package.json must define smoke:m6bj");
  console.log("  ✓ smoke:m6bj script registered");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of KEYS) {
    assert(en.includes(`"${key}"`) && bn.includes(`"${key}"`), `${key} must exist in en and bn-BD`);
  }
  console.log("  ✓ Audit dashboard i18n keys in en + bn-BD");
}

function checkRoutes(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const nav = readSrc("features/shell/nav.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  assert(ownerPath.includes('"/audit"'), "/audit must be an owner path");
  assert(ownerPath.includes('pathname.startsWith("/audit/")'), "audit detail subpaths must be allowed as live URLs");
  assert(nav.includes('id: "auditFefo"') && nav.includes('path: "/audit"') && nav.includes("live: true"), "Audit & FEFO nav must be live and point to /audit");
  assert(shell.includes("AuditDashboardPage") && shell.includes('path === "/audit"'), "AppShell must route /audit to AuditDashboardPage");
  console.log("  ✓ /audit route and nav registered");
}

function checkClientAndPage(): void {
  const client = readSrc("lib/audit.ts");
  const page = readSrc("features/audit/AuditDashboardPage.tsx");
  assert(client.includes("/api/v1/owner/audit/dashboard"), "Audit client must call dashboard API");
  assert(client.includes("/api/v1/owner/audits"), "Audit client must call audit list API");
  assert(page.includes("fetchAuditDashboard") && page.includes("fetchAudits"), "Audit dashboard must fetch live audit data");
  assert(page.includes("fetchOwnerExpiry"), "Expiry Monitoring must use live expiry API");
  assert(page.includes("navigate(`/audit/${audit.id}`)"), "View action must link to /audit/:auditId");
  assert(page.includes("disabled") && page.includes('t("audit.generateHint")'), "Generate Report must remain disabled with a hint");
  assert(!page.includes("AUD-260815-01") && !page.includes("Napa 500mg") && !page.includes("94.2%"), "Audit dashboard must not hard-code mock rows or KPI values");
  console.log("  ✓ Audit dashboard uses live data only");
}

function main(): void {
  console.log("M6 Batch BJ smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkRoutes();
  checkClientAndPage();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
