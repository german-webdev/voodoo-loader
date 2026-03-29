/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const tauriRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(tauriRoot, "..");
const releasesDir = path.join(repoRoot, "releases");

const packageJsonPath = path.join(tauriRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;
const commit = execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();

const buildName = `VoodooLoader-${version}-${commit}-portable`;
const outputDir = path.join(releasesDir, buildName);
const outputZip = path.join(releasesDir, `${buildName}.zip`);
const releaseExe = path.join(tauriRoot, "src-tauri", "target", "release", "voodooloadertauri.exe");

console.log("[release-portable] Cleaning old releases...");
if (fs.existsSync(releasesDir)) {
  fs.rmSync(releasesDir, { recursive: true, force: true });
}
fs.mkdirSync(releasesDir, { recursive: true });

console.log("[release-portable] Building release app via Tauri (nsis target)...");
execSync("npm.cmd run tauri -- build --bundles nsis", { cwd: tauriRoot, stdio: "inherit" });

if (!fs.existsSync(releaseExe)) {
  throw new Error(`Release exe not found: ${releaseExe}`);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(releaseExe, path.join(outputDir, "VoodooLoader.exe"));
fs.writeFileSync(
  path.join(outputDir, "README_PORTABLE.txt"),
  [
    "Voodoo Loader portable build",
    `Version: ${version}`,
    `Commit: ${commit}`,
    "",
    "Run: VoodooLoader.exe",
    "",
  ].join("\n"),
  "utf8",
);

console.log("[release-portable] Creating zip...");
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${toPs(outputDir)}\\*' -DestinationPath '${toPs(outputZip)}' -Force"`,
  { cwd: repoRoot, stdio: "inherit" },
);

console.log(`[release-portable] Done: ${outputZip}`);

function toPs(filePath) {
  return filePath.replace(/\\/g, "\\\\");
}
