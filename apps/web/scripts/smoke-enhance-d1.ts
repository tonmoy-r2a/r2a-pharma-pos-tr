/**
 * Enhance Batch D1 smoke — Clickable Dashboard KPIs + inventory ?tab=.
 * Run: npm run smoke:enhance-d1 -w @r2a/web
 *
 * Source guards only (no live API / no fake rows). Asserts navigate targets
 * from the locked deep-link matrix and inventory URL read/write helpers.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildInventoryPath,
  isInventoryTab,
  readSupplierIdFromUrl,
  readTabFromUrl,
} from "../src/lib/inventoryUrl.ts";

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

const D1_ARIA_KEYS = [
  "dashboard.aria.todaySales",
  "dashboard.aria.netProfit",
  "dashboard.aria.transactions",
  "dashboard.aria.avgSale",
  "dashboard.aria.healthLow",
  "dashboard.aria.healthOut",
  "dashboard.aria.healthExp30",
  "dashboard.aria.healthExp90",
  "dashboard.aria.fefoToday",
  "dashboard.aria.fefoWeek",
  "dashboard.aria.viewAudit",
  "dashboard.aria.attentionOut",
  "dashboard.aria.attentionExp30",
  "dashboard.aria.attentionCash",
  "dashboard.aria.attentionFefo",
  "dashboard.aria.staffReports",
  "dashboard.aria.staffVariance",
  "dashboard.aria.staffCashiers",
  "dashboard.aria.staffOpenShifts",
  "dashboard.attention.cashVarianceHint",
  "dashboard.attention.fefoHint",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:enhance-d1"]?.includes("smoke-enhance-d1"),
    "package.json must define smoke:enhance-d1",
  );
  console.log("  ✓ package @r2a/web + smoke:enhance-d1");
}

function checkInventoryUrlHelpers(): void {
  assert(readTabFromUrl("?tab=low") === "low", "readTabFromUrl low");
  assert(readTabFromUrl("?tab=out") === "out", "readTabFromUrl out");
  assert(
    readTabFromUrl("?tab=expiring30") === "expiring30",
    "readTabFromUrl expiring30",
  );
  assert(
    readTabFromUrl("?tab=expiring90") === "expiring90",
    "readTabFromUrl expiring90",
  );
  assert(readTabFromUrl("?tab=bogus") === "all", "invalid tab → all");
  assert(readTabFromUrl("") === "all", "missing tab → all");
  assert(isInventoryTab("expired"), "expired is allowed tab");
  assert(!isInventoryTab("baki"), "no invented tab");

  assert(
    readSupplierIdFromUrl("?supplierId=sup-1&tab=low") === "sup-1",
    "supplierId preserved in read",
  );
  assert(
    buildInventoryPath({ tab: "low" }) === "/inventory?tab=low",
    "build low tab path",
  );
  assert(
    buildInventoryPath({ tab: "out", supplierId: "sup-9" }) ===
      "/inventory?tab=out&supplierId=sup-9",
    "build must keep tab + supplierId",
  );
  assert(
    buildInventoryPath({ tab: "all", supplierId: "sup-9" }) ===
      "/inventory?supplierId=sup-9",
    "all tab omits tab param but keeps supplierId",
  );
  assert(buildInventoryPath({ tab: "all" }) === "/inventory", "bare inventory");

  const page = readSrc("features/inventory/InventoryPage.tsx");
  assert(
    page.includes("readTabFromUrl") &&
      page.includes("writeInventoryUrl") &&
      page.includes("buildInventoryPath") &&
      page.includes("selectTab"),
    "InventoryPage must sync ?tab= via helpers",
  );
  assert(
    page.includes("writeInventoryUrl({ tab: next, supplierId })"),
    "tab change must write URL without dropping supplierId",
  );
  console.log("  ✓ inventory ?tab= read/write helpers + InventoryPage wiring");
}

function checkDashboardDeepLinks(): void {
  const page = readSrc("features/dashboard/DashboardPage.tsx");

  const targets = [
    'navigate(salesTodayHref)',
    'navigate("/reports/sales")',
    'navigate("/inventory?tab=low")',
    'navigate("/inventory?tab=out")',
    'navigate("/inventory?tab=expiring30")',
    'navigate("/inventory?tab=expiring90")',
    'navigate("/inventory/expiry")',
    'navigate("/audit")',
    'navigate("/reports")',
    'navigate("/staff/shifts")',
    'navigate("/sales")',
  ];
  for (const target of targets) {
    assert(page.includes(target), `Dashboard must include ${target}`);
  }

  assert(
    page.includes("todaySalesPath") &&
      page.includes("utcYmd") &&
      page.includes("`/sales?from=${today}&to=${today}`"),
    "Today's sales must deep-link with UTC YMD from/to",
  );
  assert(
    page.includes('navigate("/inventory?tab=out")') &&
      !page.includes('onOpen={() => navigate("/inventory")}'),
    "Attention out-of-stock must use ?tab=out (not bare /inventory)",
  );
  assert(
    page.includes('navigate("/audit")') &&
      page.includes("dashboard.fefo.viewAudit") &&
      !/disabled[\s\S]{0,120}dashboard\.fefo\.viewAudit/.test(page) &&
      !/dashboard\.fefo\.viewAudit[\s\S]{0,160}disabled/.test(page),
    "FEFO View audit CTA must not be disabled",
  );
  assert(
    page.includes("dashboard.staff.viewReports") &&
      page.includes('navigate("/reports")') &&
      !/dashboard\.staff\.viewReports[\s\S]{0,160}disabled/.test(page),
    "Staff View reports must navigate to /reports and not be disabled",
  );
  assert(
    page.includes("openShifts") && page.includes("dashboard.staff.openShifts"),
    "Show staff.openShifts when payload provides it",
  );
  assert(
    !/baki|Baki|on-account|receivable/i.test(page),
    "Dashboard must not invent Baki",
  );
  console.log("  ✓ Dashboard deep-link matrix targets");
}

function checkDesignPolish(): void {
  const page = readSrc("features/dashboard/DashboardPage.tsx");
  assert(
    page.includes("text-3xl") && page.includes("tabular-nums"),
    "Dashboard design: stronger title / tabular KPI numerals",
  );
  assert(
    page.includes("focus-visible:ring-primary") || page.includes("TILE_FOCUS"),
    "Clickable tiles need primary focus ring",
  );
  assert(
    page.includes("border-l-amber-500") || page.includes("border-l-4"),
    "Attention area should read as act-now",
  );
  console.log("  ✓ Dashboard design polish markers");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of D1_ARIA_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  assert(
    en.includes('"dashboard.staff.viewReports": "View reports"'),
    "staff.viewReports label should be View reports",
  );
  console.log("  ✓ D1 aria / hint i18n keys in en + bn-BD");
}

function main(): void {
  console.log("Enhance Batch D1 smoke (@r2a/web)\n");
  checkPackage();
  checkInventoryUrlHelpers();
  checkDashboardDeepLinks();
  checkDesignPolish();
  checkI18n();
  console.log("\nEnhance Batch D1 smoke: PASS");
}

main();
