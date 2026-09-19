/** Enhance Dashboard Intelligence track exit smoke (Batch D4). Runs d1 → d2 → d3. */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable");

const steps = [
  ["@r2a/web", "smoke:enhance-d1"],
  ["@r2a/server", "smoke:enhance-d2"],
  ["@r2a/web", "smoke:enhance-d2"],
  ["@r2a/server", "smoke:enhance-d3"],
  ["@r2a/web", "smoke:enhance-d3"],
] as const;

console.log("Enhance Dashboard Intelligence (Batch D4) composed smoke\n");
for (const [workspace, script] of steps) {
  console.log(`\n=== ${workspace} ${script} ===`);
  const result = spawnSync(process.execPath, [npmCli, "run", script, "-w", workspace], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`\nFAIL: ${workspace} ${script}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nPASS: Enhance Dashboard Intelligence composed smoke");
