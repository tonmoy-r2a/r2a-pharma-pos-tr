/**
 * Prod Batch P6 smoke — Purchase Report page.
 * Run: npm run smoke:prod-p6 -w @r2a/web
 *
 * Source guards only (no live API). Composes existing OWNER
 * GET /owner/purchase-orders. Route lock: `/reports/purchasing`.
 * No new aggregate cloud route. Export disabled until Prod P7.
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

const P6_I18N_KEYS = [
  "reports.purchaseReport.title",
  "reports.purchaseReport.subtitle",
  "reports.purchaseReport.exportHint",
  "reports.purchaseReport.branchLocked",
  "reports.purchaseReport.kpi.openValue",
  "reports.purchaseReport.open.title",
  "reports.purchaseReport.recent.title",
  "reports.purchaseReport.side.openPurchasing",
  "reports.purchaseReport.pagination.prev",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p6"]?.includes("smoke-prod-p6"),
    "package.json must define smoke:prod-p6",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p6");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P6_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ Purchase Report i18n keys in en + bn-BD");
}

function checkRoute(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  const index = readSrc("features/reports/index.ts");
  assert(
    ownerPath.includes('pathname === "/reports/purchasing"') &&
      ownerPath.includes('kind: "purchasing"'),
    "reportsSubpath must resolve /reports/purchasing",
  );
  assert(
    !ownerPath.includes('pathname === "/reports/purchases"'),
    "Route lock is /reports/purchasing (not /reports/purchases)",
  );
  assert(
    shell.includes("PurchaseReportPage") &&
      shell.includes('sub.kind === "purchasing"'),
    "AppShell must route /reports/purchasing to PurchaseReportPage",
  );
  assert(
    index.includes("PurchaseReportPage"),
    "reports feature index must export PurchaseReportPage",
  );
  console.log("  ✓ /reports/purchasing route wired");
}

function checkPageAndCompose(): void {
  const page = readSrc("features/reports/PurchaseReportPage.tsx");
  const dashboard = readSrc("features/reports/ReportsDashboardPage.tsx");

  assert(
    page.includes("fetchPurchaseOrders"),
    "Purchase Report must compose fetchPurchaseOrders",
  );
  assert(
    !page.includes("/api/v1/owner/reports/purchas"),
    "Must not invent a new purchase report aggregate API",
  );
  assert(
    page.includes("reports.purchaseReport.exportHint") &&
      page.includes("disabled"),
    "Export must stay disabled with hint until P7",
  );
  assert(
    page.includes("reports.purchaseReport.branchLocked"),
    "Branch/store filter must stay locked (single-store)",
  );
  assert(
    page.includes('navigate("/purchasing")') &&
      page.includes('navigate("/purchasing/new")'),
    "Side actions must deep-link to Purchasing list and Create PO",
  );
  assert(
    page.includes("`/purchasing/${encodeURIComponent(row.id)}`") ||
      page.includes('/purchasing/${encodeURIComponent(row.id)}'),
    "PO rows must link to purchase order details",
  );
  assert(
    dashboard.includes('href="/reports/purchasing"') ||
      dashboard.includes('navigate("/reports/purchasing")'),
    "Reports Dashboard Purchase View Report must navigate to /reports/purchasing",
  );
  assert(
    !page.includes("৳45,000") && !page.includes("PO-MOCK"),
    "Purchase Report must not hard-code mock KPI/PO values",
  );
  console.log("  ✓ compose live POs; dashboard CTAs; export parked");
}

function main(): void {
  console.log("Prod Batch P6 smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkRoute();
  checkPageAndCompose();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
