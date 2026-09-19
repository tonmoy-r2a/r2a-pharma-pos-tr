/**
 * M6 Batch BK smoke — Audit Detail + Review modal + Apply FEFO correction.
 * Run: npm run smoke:m6bk -w @r2a/web
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
  "audit.detail.breadcrumb",
  "audit.detail.loading",
  "audit.detail.reviewButton",
  "audit.detail.generateReport",
  "audit.detail.generateHint",
  "audit.detail.kpi.itemsChecked",
  "audit.detail.kpi.discrepancies",
  "audit.detail.kpi.varianceAmount",
  "audit.detail.lines.title",
  "audit.detail.lines.medicine",
  "audit.detail.lines.batch",
  "audit.detail.lines.difference",
  "audit.detail.lines.variance",
  "audit.detail.fefo.title",
  "audit.detail.fefo.applyCorrection",
  "audit.detail.activity.title",
  "audit.reviewModal.title",
  "audit.reviewModal.decisionComplete",
  "audit.reviewModal.decisionVariance",
  "audit.correctModal.title",
  "audit.correctModal.noteLabel",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as { scripts?: Record<string, string> };
  assert(pkg.scripts?.["smoke:m6bk"]?.includes("smoke-m6bk"), "package.json must define smoke:m6bk");
  console.log("  ✓ smoke:m6bk script registered");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of KEYS) {
    assert(en.includes(`"${key}"`) && bn.includes(`"${key}"`), `${key} must exist in en and bn-BD`);
  }
  console.log("  ✓ Audit Detail i18n keys in en + bn-BD");
}

function checkRoutes(): void {
  const shell = readSrc("features/shell/AppShell.tsx");
  const auditIndex = readSrc("features/audit/index.ts");
  assert(shell.includes("AuditDetailPage"), "AppShell must import AuditDetailPage");
  assert(
    shell.includes('sub.kind === "detail"') && shell.includes("<AuditDetailPage"),
    "AppShell must render AuditDetailPage for audit detail subpath",
  );
  assert(auditIndex.includes("AuditDetailPage"), "features/audit/index.ts must export AuditDetailPage");
  console.log("  ✓ /audit/:auditId route wired to AuditDetailPage");
}

function checkClientAndPage(): void {
  const client = readSrc("lib/audit.ts");
  const page = readSrc("features/audit/AuditDetailPage.tsx");
  assert(client.includes("fetchAuditDetail"), "lib/audit.ts must export fetchAuditDetail");
  assert(client.includes("reviewAudit"), "lib/audit.ts must export reviewAudit");
  assert(client.includes("correctFefoViolation"), "lib/audit.ts must export correctFefoViolation");
  assert(page.includes("fetchAuditDetail"), "AuditDetailPage must fetch live audit detail");
  assert(page.includes("reviewAudit"), "AuditDetailPage must call reviewAudit in review modal");
  assert(page.includes("correctFefoViolation"), "AuditDetailPage must call correctFefoViolation in FEFO modal");
  assert(page.includes("disabled") && page.includes('t("audit.detail.generateHint")'), "Generate Report button must remain disabled with hint");
  assert(!page.includes("AUD-260815-01") && !page.includes("Napa 500mg"), "AuditDetailPage must not hard-code mock rows");
  console.log("  ✓ AuditDetailPage uses live API and implements review + FEFO correction");
}

function main(): void {
  console.log("M6 Batch BK smoke (@r2a/web)\n");
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
