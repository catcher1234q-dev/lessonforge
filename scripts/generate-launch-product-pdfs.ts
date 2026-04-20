import { spawnSync } from "node:child_process";
import path from "node:path";

const scriptPath = path.join(process.cwd(), "scripts", "generate_marketplace_catalog_assets.py");

const result = spawnSync("python3", [scriptPath], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}
