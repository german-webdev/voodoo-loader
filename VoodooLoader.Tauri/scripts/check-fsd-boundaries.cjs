/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const SKIP_IMPORT_SUFFIXES = [
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
];

const files = [];
walk(srcRoot);

const violations = [];

for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const fromLayer = getLayer(filePath);
  if (!fromLayer) continue;

  const importRegex = /from\s+["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    const rawImport = match[1];

    if (!rawImport.startsWith(".")) continue;
    if (SKIP_IMPORT_SUFFIXES.some((suffix) => rawImport.endsWith(suffix))) continue;

    const resolvedPath = resolveImport(filePath, rawImport);
    if (!resolvedPath) continue;
    if (!resolvedPath.startsWith(srcRoot)) continue;

    const toLayer = getLayer(resolvedPath);
    if (!toLayer) continue;

    if (!isAllowed(fromLayer, toLayer)) {
      violations.push({
        filePath,
        fromLayer,
        toLayer,
        rawImport,
      });
    }
  }
}

if (violations.length > 0) {
  console.error("FSD boundary violations found:");
  for (const violation of violations) {
    const relativePath = path.relative(projectRoot, violation.filePath);
    console.error(
      `- ${relativePath}: ${violation.fromLayer} -> ${violation.toLayer} via "${violation.rawImport}"`,
    );
  }
  process.exit(1);
}

console.log("FSD boundary check passed.");

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!SOURCE_EXTENSIONS.includes(path.extname(entry.name))) continue;
    files.push(fullPath);
  }
}

function resolveImport(filePath, importPath) {
  const baseDir = path.dirname(filePath);
  const targetPath = path.resolve(baseDir, importPath);

  const candidates = [
    targetPath,
    ...SOURCE_EXTENSIONS.map((extension) => `${targetPath}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(targetPath, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function getLayer(filePath) {
  const relative = path.relative(srcRoot, filePath);
  if (relative.startsWith("..")) return null;
  const [layer] = relative.split(path.sep);
  return layer || null;
}

function isAllowed(fromLayer, toLayer) {
  const matrix = {
    shared: new Set(["shared"]),
    entities: new Set(["entities", "shared"]),
    features: new Set(["features", "entities", "shared"]),
    widgets: new Set(["widgets", "features", "entities", "shared"]),
    pages: new Set(["pages", "widgets", "features", "entities", "shared"]),
    app: new Set(["app", "pages", "widgets", "features", "entities", "shared"]),
    processes: new Set(["processes", "pages", "widgets", "features", "entities", "shared"]),
  };

  const allowed = matrix[fromLayer];
  if (!allowed) return true;
  return allowed.has(toLayer);
}
