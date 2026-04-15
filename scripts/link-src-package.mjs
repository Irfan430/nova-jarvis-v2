import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nodeModulesDir = path.join(root, "node_modules");
const aliasDir = path.join(nodeModulesDir, "src");
const target = path.join(root, "src");

fs.mkdirSync(nodeModulesDir, { recursive: true });

try {
  const stat = fs.lstatSync(aliasDir);
  if (stat.isSymbolicLink() || stat.isDirectory() || stat.isFile()) {
    fs.rmSync(aliasDir, { recursive: true, force: true });
  }
} catch {}

const relativeTarget = path.relative(nodeModulesDir, target) || "../src";
fs.symlinkSync(relativeTarget, aliasDir, "dir");

const packageJsonPath = path.join(aliasDir, "package.json");
if (!fs.existsSync(packageJsonPath)) {
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(
      {
        name: "src",
        type: "module",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

console.log(`linked node_modules/src -> ${relativeTarget}`);
