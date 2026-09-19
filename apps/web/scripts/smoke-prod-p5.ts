/**
 * Prod Batch P5 smoke — Inventory Report page.
 * Run: npm run smoke:prod-p5 -w @r2a/web
 *
 * Source guards only (no live API). Composes existing OWNER inventory-summary,
 * inventory list, and expiry reads. No new aggregate cloud route.
 * Route `/reports/inventory`; Reports dashboard Inventory CTAs enabled.
 * Export disabled until Prod P7.
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

const P5_I18N_KEYS = [
  "reports.inventoryReport.title",
  "reports.inventoryReport.subtitle",
  "reports.inventoryReport.exportHint",
  "reports.inventoryReport.branchLocked",
  "reports.inventoryReport.kpi.costValue",
  "reports.inventoryReport.attention.title",
  "reports.inventoryReport.lots.title",
  "reports.inventoryReport.side.openExpiry",
  "reports.inventoryReport.pagination.prev",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p5"]?.includes("smoke-prod-p5"),
    "package.json must define smoke:prod-p5",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p5");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P5_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ Inventory Report i18n keys in en + bn-BD");
}

function checkRoute(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  const index = readSrc("features/reports/index.ts");
  assert(
    ownerPath.includes('pathname === "/reports/inventory"') &&
      ownerPath.includes('kind: "inventory"'),
    "reportsSubpath must resolve /reports/inventory",
  );
  assert(
    shell.includes("InventoryReportPage") &&
      shell.includes('sub.kind === "inventory"'),
    "AppShell must route /reports/inventory to InventoryReportPage",
  );
  assert(
    index.includes("InventoryReportPage"),
    "reports feature index must export InventoryReportPage",
  );
  console.log("  ✓ /reports/inventory route wired");
}

function checkPageAndCompose(): void {
  const page = readSrc("features/reports/InventoryReportPage.tsx");
  const dashboard = readSrc("features/reports/ReportsDashboardPage.tsx");

  assert(
    page.includes("fetchInventorySummary") &&
      page.includes("fetchOwnerInventory") &&
      page.includes("fetchOwnerExpiry"),
    "Inventory Report must compose summary + inventory list + expiry",
  );
  assert(
    page.includes('tab: "low"') && page.includes('tab: "out"'),
    "Attention tables must load low and out inventory tabs",
  );
  assert(
    !page.includes("/api/v1/owner/reports/inventory"),
    "Must not invent a new inventory report aggregate API client call",
  );
  assert(
    page.includes("reports.inventoryReport.exportHint") &&
      page.includes("disabled"),
    "Export must stay disabled with hint until P7",
  );
  assert(
    page.includes("reports.inventoryReport.branchLocked"),
    "Branch/store filter must stay locked (single-store)",
  );
  assert(
    page.includes('navigate("/inventory")') &&
      page.includes('navigate("/inventory/expiry")'),
    "Side actions must deep-link to Inventory and Expiry Management",
  );
  assert(
    !page.includes("৳124,850") &&
      !page.includes("Napa Extra") &&
      !page.includes("mock"),
    "Inventory Report must not hard-code mock KPI/product values",
  );
  assert(
    dashboard.includes('href="/reports/inventory"') ||
      dashboard.includes('navigate("/reports/inventory")'),
    "Reports Dashboard Inventory View Report must navigate to /reports/inventory",
  );
  assert(
    dashboard.includes('href="/reports/sales"') ||
      dashboard.includes('navigate("/reports/sales")'),
    "Sales Report CTA must remain enabled",
  );
  console.log("  ✓ compose live APIs; dashboard CTAs; export parked");
}

function main(): void {
  console.log("Prod Batch P5 smoke (@r2a/web)\n");
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
