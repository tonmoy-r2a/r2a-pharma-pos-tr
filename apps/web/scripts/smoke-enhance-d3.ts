/**
 * Enhance Batch D3 web smoke — panel / client / i18n / no Baki (static).
 * Run: npm run smoke:enhance-d3 -w @r2a/web
 *
 * Live API + OWNER 403 checks live in @r2a/server smoke:enhance-d3.
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

const D3_KEYS = [
  "dashboard.stockPriority.title",
  "dashboard.stockPriority.p1",
  "dashboard.stockPriority.p4",
  "dashboard.stockPriority.footerCta",
  "dashboard.stockPriority.empty",
  "dashboard.aria.stockPriorityP1",
  "dashboard.aria.stockPriorityFooter",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:enhance-d3"]?.includes("smoke-enhance-d3"),
    "package.json must define smoke:enhance-d3",
  );
  console.log("  ✓ package @r2a/web + smoke:enhance-d3");
}

function checkPanelWiring(): void {
  const client = readSrc("lib/ownerStockPriority.ts");
  const panel = readSrc("features/dashboard/StockPriorityPanel.tsx");
  const dashboard = readSrc("features/dashboard/DashboardPage.tsx");
  const index = readSrc("features/dashboard/index.ts");

  assert(
    client.includes("/api/v1/owner/reports/stock-priority"),
    "client must call stock-priority API",
  );
  assert(panel.includes("fetchStockPriority"), "panel must fetch stock priority");
  assert(
    dashboard.includes("StockPriorityPanel"),
    "Dashboard must render StockPriorityPanel",
  );
  assert(
    index.includes("StockPriorityPanel"),
    "dashboard index must export StockPriorityPanel",
  );
  assert(
    panel.includes("/inventory?tab=out") &&
      panel.includes("/inventory?tab=low") &&
      panel.includes("/reports/product-movement?preset=last90"),
    "panel must deep-link P1/P2 counts and footer CTA",
  );
  for (const blob of [client, panel, dashboard]) {
    assert(!/\bbaki\b/i.test(blob), "D3 surfaces must not mention Baki");
  }
  console.log("  ✓ panel + client + deep-links; no Baki");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of D3_KEYS) {
    assert(en.includes(`"${key}"`), `en missing ${key}`);
    assert(bn.includes(`"${key}"`), `bn-BD missing ${key}`);
  }
  console.log("  ✓ i18n en + bn-BD keys");
}

function main(): void {
  console.log("Enhance D3 web smoke (static)\n");
  checkPackage();
  checkPanelWiring();
  checkI18n();
  console.log("\nEnhance D3 web smoke: PASS");
}

main();
