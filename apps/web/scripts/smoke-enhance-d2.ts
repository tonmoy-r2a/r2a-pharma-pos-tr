/**
 * Enhance Batch D2 web smoke — route / client / i18n / no Baki (static).
 * Run: npm run smoke:enhance-d2 -w @r2a/web
 *
 * Live API + OWNER 403 checks live in @r2a/server smoke:enhance-d2.
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

const D2_KEYS = [
  "reports.productMovement.title",
  "reports.productMovement.band.high_demand",
  "reports.productMovement.band.low_sell",
  "reports.productMovement.band.no_sales",
  "reports.cards.productMovement.title",
  "dashboard.productMovementCta",
  "dashboard.aria.productMovement",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:enhance-d2"]?.includes("smoke-enhance-d2"),
    "package.json must define smoke:enhance-d2",
  );
  console.log("  ✓ package @r2a/web + smoke:enhance-d2");
}

function checkRoute(): void {
  const pathHelpers = readSrc("lib/ownerPath.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  const index = readSrc("features/reports/index.ts");
  assert(
    pathHelpers.includes('pathname === "/reports/product-movement"'),
    "ownerPath must register /reports/product-movement",
  );
  assert(
    shell.includes("ProductMovementPage") &&
      shell.includes('sub.kind === "productMovement"'),
    "AppShell must route product-movement",
  );
  assert(
    index.includes("ProductMovementPage"),
    "reports index must export ProductMovementPage",
  );
  console.log("  ✓ /reports/product-movement route");
}

function checkClientAndHub(): void {
  const client = readSrc("lib/ownerProductMovement.ts");
  const page = readSrc("features/reports/ProductMovementPage.tsx");
  const hub = readSrc("features/reports/ReportsDashboardPage.tsx");
  const dashboard = readSrc("features/dashboard/DashboardPage.tsx");
  assert(
    client.includes("/api/v1/owner/reports/product-movement"),
    "client must call product-movement API",
  );
  assert(page.includes("fetchProductMovement"), "page must fetch movement");
  assert(hub.includes("/reports/product-movement"), "hub must link movement");
  assert(
    dashboard.includes("/reports/product-movement"),
    "dashboard CTA must link movement",
  );
  for (const blob of [client, page, hub]) {
    assert(!/\bbaki\b/i.test(blob), "D2 surfaces must not mention Baki");
  }
  console.log("  ✓ client + hub + dashboard CTA; no Baki");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of D2_KEYS) {
    assert(en.includes(`"${key}"`), `en missing ${key}`);
    assert(bn.includes(`"${key}"`), `bn-BD missing ${key}`);
  }
  console.log("  ✓ i18n en + bn-BD keys");
}

function main(): void {
  console.log("Enhance D2 web smoke (static)\n");
  checkPackage();
  checkRoute();
  checkClientAndHub();
  checkI18n();
  console.log("\nEnhance D2 web smoke: PASS");
}

main();
