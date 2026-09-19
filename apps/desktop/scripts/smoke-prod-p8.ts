/**
 * Prod Batch P8 smoke — Desktop stock-audit count UI.
 * Run: npm run smoke:prod-p8 -w @r2a/desktop
 *
 * Source guards only (no live API). OWNER/MANAGER Settings section;
 * online start → lines → submit; no offline queue.
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

const P8_I18N_KEYS = [
  "settings.stockAudit",
  "settings.stockAuditHelp",
  "settings.stockAudit.offline",
  "settings.stockAudit.start",
  "settings.stockAudit.submit",
  "settings.stockAudit.submittedHint",
  "settings.stockAudit.countFooter",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  assert(pkg.name === "@r2a/desktop", `package name must be @r2a/desktop, got ${pkg.name}`);
  assert(
    pkg.scripts?.["smoke:prod-p8"]?.includes("smoke-prod-p8"),
    "package.json must define smoke:prod-p8",
  );
  console.log("  ✓ package @r2a/desktop + smoke:prod-p8");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of P8_I18N_KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ stock audit i18n keys in en + bn-BD");
}

function checkClientAndUi(): void {
  const client = readSrc("lib/stockAudit.ts");
  const section = readSrc("features/audit/StockAuditSection.tsx");
  const index = readSrc("features/audit/index.ts");
  const settings = readSrc("features/settings/SettingsPanel.tsx");

  assert(index.includes("StockAuditSection"), "audit feature index must export StockAuditSection");
  assert(
    client.includes('/api/v1/audits/start') &&
      client.includes("/lines") &&
      client.includes("/submit"),
    "stockAudit client must call start/lines/submit",
  );
  assert(
    !client.includes("outbound_sync_queue") && !section.includes("outbound_sync_queue"),
    "Must not build an offline audit queue",
  );
  assert(
    section.includes("startStockAudit") &&
      section.includes("saveStockAuditLines") &&
      section.includes("submitStockAudit"),
    "StockAuditSection must wire start → lines → submit",
  );
  assert(
    section.includes("ArrowDown") &&
      section.includes("Enter") &&
      !section.includes("[Tab]"),
    "Keyboard: arrows + Enter; no Tab navigator",
  );
  assert(
    settings.includes("StockAuditSection") &&
      settings.includes('"stockAudit"') &&
      settings.includes("canRunStockAudit"),
    "Settings must expose Stock Audit for Owner/Manager only",
  );
  assert(
    settings.includes("OWNER") && settings.includes("MANAGER"),
    "Stock audit gate must be OWNER/MANAGER",
  );
  assert(
    section.includes("settings.stockAudit.offline") ||
      section.includes('t("settings.stockAudit.offline")'),
    "Offline must be blocked honestly",
  );
  console.log("  ✓ Settings Stock Audit + online start/lines/submit wired");
}

function main(): void {
  console.log("Prod Batch P8 smoke (@r2a/desktop)\n");
  checkPackage();
  checkI18n();
  checkClientAndUi();
  console.log("\nPASS");
}

try {
  main();
} catch (err) {
  console.error("\nFAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
}
