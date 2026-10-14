import { spawnSync } from "node:child_process";

process.env.NITRO_PRESET = "node-server";
const res = spawnSync("node", ["scripts/with-app-env.mjs", "vite", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
if (res.status !== 0) process.exit(res.status ?? 1);

// Copy pglite wasm and data files into .output/server/_libs
try {
  const { copyFileSync, existsSync, readdirSync } = await import("node:fs");
  const { join } = await import("node:path");
  const pgliteDist = join(process.cwd(), "node_modules/@electric-sql/pglite/dist");
  const outputLibs = join(process.cwd(), ".output/server/_libs");
  if (existsSync(pgliteDist) && existsSync(outputLibs)) {
    const files = readdirSync(pgliteDist);
    for (const f of files) {
      if (f.endsWith(".wasm") || f.endsWith(".data") || f.endsWith(".tar.gz")) {
        copyFileSync(join(pgliteDist, f), join(outputLibs, f));
      }
    }
  }
} catch (e) {
  console.warn("[build:node] Warning copying pglite assets:", e.message);
}

const mig = spawnSync("node", ["scripts/migrate.mjs"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
process.exit(mig.status ?? 0);
