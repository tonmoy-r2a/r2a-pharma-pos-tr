/**
 * M6 Batch BP smoke — Help & Support + footer Help.
 * Run: npm run smoke:m6bp -w @r2a/web
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
  "help.title",
  "help.cards.center.title",
  "help.cards.contact.title",
  "help.cards.status.title",
  "help.faq.title",
  "help.faq.1.q",
  "help.tickets.createHint",
] as const;

function checkPackage(): void {
  const pkg = JSON.parse(readRel("package.json")) as {
    scripts?: Record<string, string>;
  };
  assert(
    pkg.scripts?.["smoke:m6bp"]?.includes("smoke-m6bp"),
    "package.json must define smoke:m6bp",
  );
  console.log("  ✓ smoke:m6bp script registered");
}

function checkI18n(): void {
  const en = readSrc("i18n/locales/en.ts");
  const bn = readSrc("i18n/locales/bn-BD.ts");
  for (const key of KEYS) {
    assert(
      en.includes(`"${key}"`) && bn.includes(`"${key}"`),
      `${key} must exist in en and bn-BD`,
    );
  }
  console.log("  ✓ Help & Support i18n keys in en + bn-BD");
}

function checkRoutes(): void {
  const ownerPath = readSrc("lib/ownerPath.ts");
  const nav = readSrc("features/shell/nav.ts");
  const shell = readSrc("features/shell/AppShell.tsx");
  assert(ownerPath.includes('"/help"'), "/help must be an owner path");
  assert(
    nav.includes('id: "help"') &&
      nav.includes('path: "/help"') &&
      nav.includes("live: true"),
    "Help footer must be live and point to /help",
  );
  assert(
    shell.includes("HelpPage") && shell.includes('path === "/help"'),
    "AppShell must route /help to HelpPage",
  );
  console.log("  ✓ /help route and footer Help registered");
}

function checkClientAndPage(): void {
  const client = readSrc("lib/help.ts");
  const page = readSrc("features/help/HelpPage.tsx");
  assert(
    client.includes("/api/v1/owner/help/status"),
    "Help client must call help status API",
  );
  assert(
    page.includes("fetchHelpStatus") && page.includes("FAQ_KEYS"),
    "Help page must fetch live status and render FAQ accordion",
  );
  assert(
    page.includes("help.cards.center.title") &&
      page.includes("help.cards.contact.title") &&
      page.includes("help.cards.status.title"),
    "Help page must include Help Center / Contact / System Status cards",
  );
  assert(
    page.includes("disabled") &&
      page.includes("help.tickets.createHint") &&
      page.includes("help.tickets.empty"),
    "Tickets / Create Ticket must stay disabled with hints",
  );
  assert(
    !page.includes("TKT-1001") && !page.includes("fake-ticket"),
    "Help page must not invent live ticket rows",
  );
  console.log("  ✓ Help page uses live status; tickets remain disabled");
}

function main(): void {
  console.log("M6 Batch BP smoke (@r2a/web)\n");
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
