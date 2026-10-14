import { spawnSync } from "node:child_process";

process.env.NITRO_PRESET = "node-server";
const res = spawnSync("node", ["scripts/with-app-env.mjs", "vite", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
if (res.status !== 0) process.exit(res.status ?? 1);

const mig = spawnSync("node", ["scripts/migrate.mjs"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
process.exit(mig.status ?? 0);
