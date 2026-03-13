import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const templateRoot = path.join(sourceRoot, "starter", "next-app");
const mockupSource = path.join(
  sourceRoot,
  "skills",
  "app-store-screenshots",
  "mockup.png",
);

const targetArg = process.argv[2];

if (!targetArg) {
  console.error("Usage: node scripts/bootstrap-template.mjs <target-directory>");
  process.exit(1);
}

const targetRoot = path.resolve(process.cwd(), targetArg);

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyTree(sourceDir, targetDir) {
  ensureDirectory(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyTree(sourcePath, targetPath);
      continue;
    }

    if (fs.existsSync(targetPath)) {
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

copyTree(templateRoot, targetRoot);

ensureDirectory(path.join(targetRoot, "public"));
ensureDirectory(path.join(targetRoot, "public", "screenshots"));
ensureDirectory(path.join(targetRoot, "public", "screenshots-ipad"));

const mockupTarget = path.join(targetRoot, "public", "mockup.png");
if (!fs.existsSync(mockupTarget)) {
  fs.copyFileSync(mockupSource, mockupTarget);
}

console.log(`Bootstrapped starter into ${targetRoot}`);
console.log("Next steps:");
console.log("  1. Replace placeholder screenshots in public/screenshots/");
console.log("  2. Optionally add iPad screenshots in public/screenshots-ipad/");
console.log("  3. Run `bun install` and `bun dev`");
