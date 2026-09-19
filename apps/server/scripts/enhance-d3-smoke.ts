/**
 * Enhance Batch D3 smoke — Stock priority API + Dashboard panel wiring.
 * Run (server must already be running):
 *   npm run smoke:enhance-d3 -w @r2a/server
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { ownerStockPriorityResponseSchema } from "@r2a/shared-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const BASE = (process.env.BASE_URL || "http://localhost:8787").replace(
  /\/$/,
  "",
);
const API = `${BASE}/api/v1`;
const SEED = {
  ownerEmail: process.env.SEED_OWNER_EMAIL || "owner@demo.local",
  managerEmail: process.env.SEED_MANAGER_EMAIL || "manager@demo.local",
  cashierEmail: process.env.SEED_CASHIER_EMAIL || "cashier@demo.local",
  password: process.env.SEED_OWNER_PASSWORD || "ChangeMe123!",
  tenantSlug: "demo-pharmacy",
};

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

const PRIORITY_ORDER = [
  "P1_restock_now",
  "P2_restock_soon",
  "P3_watch_cover",
  "P4_review_slow",
] as const;

function pass(name: string, detail = ""): void {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail = ""): void {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function req(
  pathname: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const response = await fetch(`${API}${pathname}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body: body as Record<string, unknown> };
}

async function login(email: string) {
  const response = await req("/auth/login", {
    method: "POST",
    body: {
      email,
      password: SEED.password,
      tenantSlug: SEED.tenantSlug,
    },
  });
  const data = asRecord(response.body.data);
  const user = asRecord(data?.user);
  return {
    status: response.status,
    body: response.body,
    token: typeof data?.accessToken === "string" ? data.accessToken : null,
    storeId: typeof user?.storeId === "string" ? user.storeId : null,
  };
}

function checkWebWiring(): void {
  const panel = fs.readFileSync(
    path.join(
      repoRoot,
      "apps/web/src/features/dashboard/StockPriorityPanel.tsx",
    ),
    "utf8",
  );
  const dashboard = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/features/dashboard/DashboardPage.tsx"),
    "utf8",
  );
  const client = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/lib/ownerStockPriority.ts"),
    "utf8",
  );

  if (
    client.includes("/api/v1/owner/reports/stock-priority") &&
    panel.includes("fetchStockPriority") &&
    dashboard.includes("StockPriorityPanel")
  ) {
    pass("1. Dashboard panel + client wired to stock-priority");
  } else {
    fail("1. Dashboard panel + client wired to stock-priority");
  }

  if (
    panel.includes("/inventory?tab=out") &&
    panel.includes("/inventory?tab=low") &&
    panel.includes("/reports/product-movement?preset=last90") &&
    panel.includes("`/inventory/${row.productId}`") &&
    !panel.toLowerCase().includes("baki") &&
    !client.toLowerCase().includes("baki")
  ) {
    pass("2. Deep-links + no Baki");
  } else {
    fail("2. Deep-links + no Baki");
  }
}

async function main(): Promise<void> {
  console.log(`Enhance D3 smoke → ${API}\n`);
  checkWebWiring();

  const health = await req("/health");
  if (health.status === 200 && asRecord(health.body.data)?.ok === true) {
    pass("3. Health envelope");
  } else {
    fail("3. Health envelope", JSON.stringify(health.body));
    return finish();
  }

  const unauth = await req("/owner/reports/stock-priority");
  if (unauth.status === 401) {
    pass("4. Unauthenticated stock-priority is 401");
  } else {
    fail("4. Unauthenticated stock-priority is 401", `status=${unauth.status}`);
  }

  const [owner, manager, cashier] = await Promise.all([
    login(SEED.ownerEmail),
    login(SEED.managerEmail),
    login(SEED.cashierEmail),
  ]);
  if (owner.status === 200 && owner.token) {
    pass("5a. Owner login", SEED.ownerEmail);
  } else {
    fail("5a. Owner login", JSON.stringify(owner.body));
    return finish();
  }
  if (manager.status === 200 && manager.token) {
    pass("5b. Manager login", SEED.managerEmail);
  } else {
    fail("5b. Manager login", JSON.stringify(manager.body));
    return finish();
  }
  if (cashier.status === 200 && cashier.token) {
    pass("5c. Cashier login", SEED.cashierEmail);
  } else {
    fail("5c. Cashier login", JSON.stringify(cashier.body));
    return finish();
  }

  const [managerReport, cashierReport] = await Promise.all([
    req("/owner/reports/stock-priority", { token: manager.token }),
    req("/owner/reports/stock-priority", { token: cashier.token }),
  ]);
  if (managerReport.status === 403 && cashierReport.status === 403) {
    pass("6. Manager/Cashier stock-priority is 403");
  } else {
    fail(
      "6. Manager/Cashier stock-priority is 403",
      JSON.stringify({
        manager: managerReport.status,
        cashier: cashierReport.status,
      }),
    );
  }

  const ownerReport = await req(
    "/owner/reports/stock-priority?preset=last90",
    { token: owner.token },
  );
  const parsed = ownerStockPriorityResponseSchema.safeParse(
    ownerReport.body.data,
  );
  if (ownerReport.status === 200 && parsed.success) {
    pass(
      "7. Owner response matches Zod",
      `${parsed.data.items.length} items / counts p1=${parsed.data.counts.p1} p2=${parsed.data.counts.p2}`,
    );
  } else {
    fail(
      "7. Owner response matches Zod",
      parsed.success
        ? JSON.stringify(ownerReport.body)
        : parsed.error.message,
    );
    return finish();
  }

  const data = parsed.data;
  if (data.range.preset === "last90" && data.range.spanDays === 90) {
    pass("8. Default/last90 preset spanDays=90");
  } else {
    fail("8. Default/last90 preset spanDays=90", JSON.stringify(data.range));
  }

  const rank = (code: string) => PRIORITY_ORDER.indexOf(code as (typeof PRIORITY_ORDER)[number]);
  let ordered = true;
  for (let i = 1; i < data.items.length; i++) {
    const prev = data.items[i - 1]!;
    const curr = data.items[i]!;
    const prevRank = rank(prev.priority);
    const currRank = rank(curr.priority);
    if (prevRank < 0 || currRank < 0) {
      ordered = false;
      break;
    }
    if (currRank < prevRank) {
      ordered = false;
      break;
    }
    if (
      currRank === prevRank &&
      curr.avgDailyUnits > prev.avgDailyUnits + 1e-9
    ) {
      ordered = false;
      break;
    }
  }
  if (ordered) {
    pass(
      "9. Priority ordering P1→P4 then avgDailyUnits",
      data.items.map((row) => row.priority).join(",") || "empty",
    );
  } else {
    fail(
      "9. Priority ordering P1→P4 then avgDailyUnits",
      data.items.map((row) => `${row.priority}:${row.avgDailyUnits}`).join("|"),
    );
  }

  const limited = await req(
    "/owner/reports/stock-priority?preset=last90&limit=8",
    { token: owner.token },
  );
  const limitedParsed = ownerStockPriorityResponseSchema.safeParse(
    limited.body.data,
  );
  if (
    limited.status === 200 &&
    limitedParsed.success &&
    limitedParsed.data.items.length <= 8
  ) {
    pass(
      "10. limit=8 caps items",
      `${limitedParsed.data.items.length} items`,
    );
  } else {
    fail("10. limit=8 caps items", JSON.stringify(limited.body));
  }

  const last180 = await req(
    "/owner/reports/stock-priority?preset=last180",
    { token: owner.token },
  );
  const last180Parsed = ownerStockPriorityResponseSchema.safeParse(
    last180.body.data,
  );
  if (
    last180.status === 200 &&
    last180Parsed.success &&
    last180Parsed.data.range.preset === "last180" &&
    last180Parsed.data.range.spanDays === 180
  ) {
    pass("11. last180 preset");
  } else {
    fail("11. last180 preset", JSON.stringify(last180.body));
  }

  finish();
}

function finish(): void {
  const failed = results.filter((result) => !result.ok);
  console.log(
    `\nEnhance D3 smoke summary: ${results.length - failed.length}/${results.length} passed`,
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
