import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const ref = "/home/irfan/Downloads/claude-codea-main/claude-codea-main";
const srcRoot = path.join(repo, "src");
const importPattern = /from ['"]([^'"]+)['"]/g;

function candidatePaths(baseDir, spec) {
  if (spec.startsWith("bun:")) {
    return [];
  }

  const target = spec.startsWith("src/")
    ? path.join(repo, spec)
    : path.resolve(baseDir, spec);
  const rel = path.relative(repo, target);
  const out = [rel];

  const addBaseVariants = (base) => {
    out.push(`${base}.ts`);
    out.push(`${base}.tsx`);
    out.push(`${base}.js`);
    out.push(`${base}.jsx`);
    out.push(`${base}.mjs`);
  };

  if (rel.endsWith(".js")) {
    addBaseVariants(rel.slice(0, -3));
  } else if (rel.endsWith(".jsx")) {
    addBaseVariants(rel.slice(0, -4));
  } else if (rel.endsWith(".mjs")) {
    addBaseVariants(rel.slice(0, -4));
  } else {
    addBaseVariants(rel);
    out.push(path.join(rel, "index.ts"));
    out.push(path.join(rel, "index.tsx"));
    out.push(path.join(rel, "index.js"));
    out.push(path.join(rel, "index.jsx"));
  }

  return [...new Set(out)];
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) {
      files.push(full);
    }
  }
  return files;
}

const copied = [];
for (let i = 0; i < 8; i += 1) {
  let changed = false;
  for (const file of walk(srcRoot)) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(importPattern)) {
      const spec = match[1];
      if (!(spec.startsWith(".") || spec.startsWith("..") || spec.startsWith("src/"))) {
        continue;
      }
      const candidates = candidatePaths(path.dirname(file), spec);
      if (candidates.some((candidate) => fs.existsSync(path.join(repo, candidate)))) {
        continue;
      }
      const sourceRel = candidates.find((candidate) => fs.existsSync(path.join(ref, candidate)));
      if (!sourceRel) {
        continue;
      }
      const sourcePath = path.join(ref, sourceRel);
      const destPath = path.join(repo, sourceRel);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(sourcePath, destPath);
      copied.push(sourceRel);
      changed = true;
    }
  }
  if (!changed) {
    break;
  }
}

console.log(`copied ${copied.length} files`);
for (const file of copied.slice(0, 200)) {
  console.log(file);
}
