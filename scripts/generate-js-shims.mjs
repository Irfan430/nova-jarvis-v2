import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");

const SKIP_SEGMENTS = new Set(["dist", "node_modules"]);

function shouldSkip(filePath) {
  return filePath.split(path.sep).some((segment) => SKIP_SEGMENTS.has(segment));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (shouldSkip(full)) {
      continue;
    }
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (entry.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) {
      files.push(full);
    }
  }
  return files;
}

function writeShim(sourceFile) {
  const ext = path.extname(sourceFile);
  const shim = [
    `import * as mod from './${path.basename(sourceFile)}'`,
    `export * from './${path.basename(sourceFile)}'`,
    "export default mod.default ?? mod",
    "",
  ].join("\n");

  const outPaths = [sourceFile.slice(0, -ext.length) + ".js"];
  if (ext === ".tsx") {
    outPaths.push(sourceFile.slice(0, -ext.length) + ".jsx");
  }

  let wrote = 0;
  for (const outPath of outPaths) {
    if (!fs.existsSync(outPath) || fs.readFileSync(outPath, "utf8") !== shim) {
      fs.writeFileSync(outPath, shim, "utf8");
      wrote += 1;
    }
  }
  return wrote;
}

let count = 0;
for (const file of walk(srcRoot)) {
  count += writeShim(file);
}

console.log(`generated ${count} JS shims`);
