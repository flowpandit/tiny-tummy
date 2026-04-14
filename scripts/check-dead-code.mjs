import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();

function listSourceFiles() {
  try {
    return execFileSync("rg", ["--files", "src"], { cwd, encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
      throw error;
    }

    return execFileSync("find", ["src", "-type", "f"], { cwd, encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .sort();
  }
}

const sourceFiles = listSourceFiles();

const codeFiles = sourceFiles.filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
const entryFiles = new Set([
  "src/main.tsx",
  "src/App.tsx",
  "src/vite-env.d.ts",
]);
const allowedOrphans = new Set([
  "src/vite-env.d.ts",
]);

const importedFiles = new Set();
const importPattern = /from\s+["'](\.[^"']+)["']|import\(["'](\.[^"']+)["']\)/g;

for (const file of codeFiles) {
  const absoluteFile = path.join(cwd, file);
  const source = readFileSync(absoluteFile, "utf8");
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    const relativeImport = match[1] ?? match[2];
    const basePath = path.resolve(path.dirname(absoluteFile), relativeImport);
    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      path.join(basePath, "index.ts"),
      path.join(basePath, "index.tsx"),
    ];

    for (const candidate of candidates) {
      if (!existsSync(candidate)) continue;
      importedFiles.add(path.relative(cwd, candidate));
    }
  }
}

const orphanedFiles = codeFiles
  .filter((file) => !entryFiles.has(file))
  .filter((file) => !allowedOrphans.has(file))
  .filter((file) => !importedFiles.has(file))
  .sort();

if (orphanedFiles.length === 0) {
  console.log("Dead-code check passed: no orphaned src TypeScript modules found.");
  process.exit(0);
}

console.error("Dead-code check failed. Orphaned src TypeScript modules:");
for (const file of orphanedFiles) {
  console.error(`- ${file}`);
}
process.exit(1);
