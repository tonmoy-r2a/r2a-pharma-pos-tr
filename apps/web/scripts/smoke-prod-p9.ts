/**
 * Prod Batch P9 smoke — Review All Issues.
 * Run: npm run smoke:prod-p9 -w @r2a/web
 *
 * Source guards only (no live API). Aggregates GET /owner/suppliers attention.
 * Route lock: `/suppliers/issues`. No ticketing system / no new API.
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

const P9_I18N_KEYS = [
  "suppliers.issues.title",
  "suppliers.issues.subtitle",
  "suppliers.issues.empty",
  "suppliers.issues.kpi.overdue",
  "suppliers.issues.kind.onHold",
  "suppliers.attention.reviewAll",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p9"]?.includes("smoke-prod-p9"),
    "package.json must define smoke:prod-p9",
  );
  console.log("  ✓ package @r2a/web + smoke:prod-p9");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P9_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ supplier issues i18n keys in en + bn-BD");
}

function checkRouteAndPage(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  const index = readSrc("features/suppliers/index.ts");
  const page = readSrc("features/suppliers/SupplierIssuesPage.tsx");
  const list = readSrc("features/suppliers/SuppliersPage.tsx");

  assert(
    ownerPath.includes('parts[0] === "issues"') &&
      ownerPath.includes('kind: "issues"'),
    "suppliersSubpath must resolve /suppliers/issues",
  );
  assert(
    shell.includes("SupplierIssuesPage") &&
      shell.includes('sub.kind === "issues"'),
    "AppShell must route /suppliers/issues to SupplierIssuesPage",
  );
  assert(
    index.includes("SupplierIssuesPage"),
    "suppliers feature index must export SupplierIssuesPage",
  );
  assert(
    page.includes("fetchSuppliers") && page.includes("result.attention"),
    "Issues page must compose GET /owner/suppliers attention",
  );
  assert(
    page.includes("`/purchasing/${encodeURIComponent(order.id)}`") ||
      page.includes('/purchasing/${encodeURIComponent(order.id)}'),
    "Overdue rows must deep-link to PO detail",
  );
  assert(
    page.includes('href: "/purchasing"') &&
      page.includes('href: "/suppliers/returns"') &&
      page.includes("`/suppliers/${encodeURIComponent(supplier.id)}`"),
    "Open PO / returns / on-hold must deep-link to live pages",
  );
  assert(
    !page.includes("/api/v1/owner/tickets") &&
      !page.includes("Create Ticket") &&
      !page.includes("ticket inbox"),
    "Must not invent a ticketing system",
  );
  assert(
    list.includes('onNavigate("/suppliers/issues")') &&
      !list.includes("suppliers.attention.reviewAllSoon"),
    "Suppliers Review All Issues CTA must navigate to /suppliers/issues",
  );
  console.log("  ✓ /suppliers/issues wired from attention + CTA enabled");
}

function main(): void {
  console.log("Prod Batch P9 smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkRouteAndPage();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
