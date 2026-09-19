/** M6 Slice 2 exit smoke (Batch AD). Requires the cloud API for m6q/m6r/m6s1. */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable");

const steps = [
  ["@r2a/server", "smoke:m6q"],
  ["@r2a/server", "smoke:m6r"],
  ["@r2a/web", "smoke:m6s"],
  ["@r2a/web", "smoke:m6t"],
  ["@r2a/web", "smoke:m6u"],
  ["@r2a/web", "smoke:m6v"],
  ["@r2a/web", "smoke:m6w"],
  ["@r2a/web", "smoke:m6x"],
  ["@r2a/web", "smoke:m6y"],
  ["@r2a/web", "smoke:m6z"],
  ["@r2a/web", "smoke:m6aa"],
  ["@r2a/web", "smoke:m6ab"],
  ["@r2a/web", "smoke:m6ac"],
  ["@r2a/web", "smoke:m6s1"],
] as const;

console.log("M6 Slice 2 (Batch AD) composed smoke\n");
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

console.log("\nPASS: M6 Slice 2 composed smoke");
