/**
 * M6 Batch AC smoke — Owner Return Manifest Details + lifecycle modals.
 * Run: npm run smoke:m6ac -w @r2a/web
 *
 * Source guards (no live API). One details page for Prepared / Dispatched /
 * Accepted / Rejected / Completed. Dispatch posts
 * POST /owner/return-manifests/:id/dispatch (server reduces qty via
 * SUPPLIER_RETURN_DISPATCH). Decision + Complete use Batch R lifecycle APIs.
 * Export / Print / More Actions stay disabled. No per-status page components.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const SERVER_SERVICE = join(
  ROOT,
  "..",
  "server",
  "src",
  "modules",
  "purchasing",
  "purchasing.service.ts",
);

function readRel(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function readSrc(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkTs(p, acc);
    else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const DETAIL_I18N_KEYS = [
  "suppliers.manifestDetail.crumb",
  "suppliers.manifestDetail.loading",
  "suppliers.manifestDetail.error",
  "suppliers.manifestDetail.notFound",
  "suppliers.manifestDetail.dispatch",
  "suppliers.manifestDetail.decision",
  "suppliers.manifestDetail.complete",
  "suppliers.manifestDetail.dispatchTitle",
  "suppliers.manifestDetail.decisionTitle",
  "suppliers.manifestDetail.completeTitle",
  "suppliers.manifestDetail.dispatchConfirm",
  "suppliers.manifestDetail.decisionConfirm",
  "suppliers.manifestDetail.completeConfirm",
  "suppliers.manifestDetail.rejectNoRestore",
  "suppliers.manifestDetail.exportSoon",
  "suppliers.manifestDetail.printSoon",
  "suppliers.manifestDetail.moreActionsSoon",
  "suppliers.manifestDetail.status.PREPARED",
  "suppliers.manifestDetail.status.DISPATCHED",
  "suppliers.manifestDetail.status.ACCEPTED",
  "suppliers.manifestDetail.status.REJECTED",
  "suppliers.manifestDetail.status.COMPLETED",
  "suppliers.manifestDetail.inventory.pending",
  "suppliers.manifestDetail.inventory.posted",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/web", `package name must be @r2a/web, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:m6ac"]?.includes("smoke-m6ac"),
    "package.json must define smoke:m6ac",
  );
  console.log("  ✓ package @r2a/web + smoke:m6ac");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of DETAIL_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  assert(
    !en.includes('"suppliers.placeholder.manifestTitle"') &&
      !bn.includes('"suppliers.placeholder.manifestTitle"') &&
      !en.includes('"suppliers.placeholder.manifest"') &&
      !bn.includes('"suppliers.placeholder.manifest"'),
    "Manifest Details placeholder keys must be removed after Batch AC",
  );
  console.log("  ✓ suppliers.manifestDetail i18n keys in en + bn-BD");
}

function checkClient(): void {
  const lib = readSrc("lib/returnQueue.ts");
  assert(
    lib.includes("fetchReturnManifest") &&
      lib.includes("dispatchReturnManifest") &&
      lib.includes("decideReturnManifest") &&
      lib.includes("completeReturnManifest"),
    "returnQueue lib must expose get/dispatch/decision/complete clients",
  );
  assert(
    lib.includes("/api/v1/owner/return-manifests/") &&
      lib.includes("/dispatch") &&
      lib.includes("/decision") &&
      lib.includes("/complete") &&
      lib.includes("operationId"),
    "Clients must POST dispatch/decision/complete under /owner/return-manifests",
  );
  console.log("  ✓ lib/returnQueue.ts lifecycle clients");
}

function checkPage(): void {
  const page = readSrc("features/suppliers/ManifestDetailsPage.tsx");
  const shell = readSrc("features/shell/AppShell.tsx");
  const index = readSrc("features/suppliers/index.ts");
  const all = walkTs(SRC)
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");

  assert(
    page.includes("ManifestDetailsPage") &&
      page.includes("fetchReturnManifest") &&
      page.includes("dispatchReturnManifest") &&
      page.includes("decideReturnManifest") &&
      page.includes("completeReturnManifest"),
    "Details page must load live manifest and wire all three lifecycle actions",
  );
  assert(
    page.includes('status === "PREPARED"') &&
      page.includes('status === "DISPATCHED"') &&
      page.includes('status === "ACCEPTED"') &&
      page.includes('status === "REJECTED"') &&
      page.includes('status === "COMPLETED"'),
    "One page must switch CTAs / read-only UI by status",
  );
  assert(
    page.includes("DispatchModal") &&
      page.includes("DecisionModal") &&
      page.includes("CompleteModal") &&
      page.includes("operationId"),
    "Dispatch / Decision / Complete modals must exist; dispatch needs operationId",
  );
  assert(
    page.includes("suppliers.manifest.policy.title") &&
      page.includes("expiryReturnsAccepted") &&
      page.includes("minDaysBeforeExpiry"),
    "Supplier Return Policy must render live Supplier record fields",
  );
  assert(
    page.includes("suppliers.manifestDetail.exportSoon") &&
      page.includes("suppliers.manifestDetail.printSoon") &&
      page.includes("suppliers.manifestDetail.moreActionsSoon") &&
      page.includes('aria-disabled="true"'),
    "Export / Print / More Actions must stay disabled",
  );
  assert(
    page.includes("suppliers.manifestDetail.rejectNoRestore"),
    "Rejected path must warn that stock is not auto-restored",
  );
  assert(
    !/ManifestPreparedPage|ManifestDispatchedPage|ManifestAcceptedPage|ManifestCompletedPage/.test(
      all,
    ),
    "Must not add separate status page components",
  );
  assert(
    shell.includes("ManifestDetailsPage") &&
      shell.includes('sub.kind === "returnsManifest"') &&
      !shell.includes("suppliers.placeholder.manifest"),
    "AppShell must render ManifestDetailsPage for /suppliers/returns/:manifestId",
  );
  assert(
    index.includes("ManifestDetailsPage"),
    "suppliers feature index must export ManifestDetailsPage",
  );
  assert(
    !page.includes("SRM-260815-0018") &&
      !page.includes("Square Distribution") &&
      !page.includes("Seclo") &&
      !/৳335/.test(page),
    "Must not hard-code sample SRM, supplier, medicine, or totals",
  );
  assert(
    !/₺/.test(all) && !/\$\d/.test(all),
    "Must not hard-code ₺ or mock dollar totals",
  );
  console.log("  ✓ one details page + 3 modals; no placeholder; no sample rows");
}

function checkServerDispatch(): void {
  const service = readFileSync(SERVER_SERVICE, "utf8");
  assert(
    service.includes("dispatchReturnManifest") &&
      service.includes("SUPPLIER_RETURN_DISPATCH") &&
      service.includes("quantityOnHand: { decrement: line.returnQty }") &&
      service.includes('status: "DISPATCHED"'),
    "Dispatch must decrement quantityOnHand and set DISPATCHED with SUPPLIER_RETURN_DISPATCH",
  );
  assert(
    service.includes("decideReturnManifest") &&
      service.includes("completeReturnManifest") &&
      service.includes('status: "DISPATCHED"') &&
      service.includes('status: "ACCEPTED"'),
    "Decision/complete transitions must remain on the Batch R service",
  );
  console.log("  ✓ server PREPARED→DISPATCHED reduces qty; decision/complete live");
}

function main(): void {
  console.log("M6 Batch AC smoke (@r2a/web)\n");
  checkPackage();
  checkI18n();
  checkClient();
  checkPage();
  checkServerDispatch();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
