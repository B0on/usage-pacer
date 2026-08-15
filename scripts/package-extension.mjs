import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const distDir = resolve(root, "dist");
const zipPath = resolve(root, `usage-pacer-${pkg.version}.zip`);

execSync(`zip -r "${zipPath}" . -x "*.DS_Store"`, {
  cwd: distDir,
  stdio: "inherit",
});

console.log(`Created ${zipPath}`);
