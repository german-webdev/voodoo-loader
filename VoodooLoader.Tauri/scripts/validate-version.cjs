const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");
const cargoTomlPath = path.join(projectRoot, "src-tauri", "Cargo.toml");

const semverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|[0-9A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const prereleaseChannelRegex = /^(alpha|beta|rc)\.(0|[1-9]\d*)$/;

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index >= 0 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return null;
}

function readPackageVersion() {
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  return String(parsed.version || "").trim();
}

function readCargoVersion() {
  const raw = fs.readFileSync(cargoTomlPath, "utf8");
  const packageBlockMatch = raw.match(/\[package\][\s\S]*?(?=\n\[|$)/);
  if (!packageBlockMatch) {
    throw new Error("Could not find [package] section in Cargo.toml");
  }
  const versionMatch = packageBlockMatch[0].match(/^\s*version\s*=\s*"([^"]+)"/m);
  if (!versionMatch) {
    throw new Error('Could not find "version" in [package] section of Cargo.toml');
  }
  return versionMatch[1].trim();
}

function extractPrerelease(version) {
  const match = version.match(semverRegex);
  if (!match) {
    return null;
  }
  return match[4] || "";
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const branchFromArg = getArgValue("--branch");
  const branch = (branchFromArg || process.env.GITHUB_REF_NAME || "").trim();

  const packageVersion = readPackageVersion();
  const cargoVersion = readCargoVersion();

  assert(packageVersion.length > 0, "package.json version must not be empty");
  assert(cargoVersion.length > 0, "Cargo.toml version must not be empty");
  assert(
    packageVersion === cargoVersion,
    `Version mismatch: package.json=${packageVersion}, Cargo.toml=${cargoVersion}`,
  );
  assert(
    semverRegex.test(packageVersion),
    `Version "${packageVersion}" is not valid SemVer 2.0.0`,
  );

  const prerelease = extractPrerelease(packageVersion);
  if (branch === "development") {
    assert(
      prerelease.length > 0,
      `Development branch must use prerelease version (alpha.N/beta.N/rc.N), got "${packageVersion}"`,
    );
    assert(
      prereleaseChannelRegex.test(prerelease),
      `Development prerelease must be one of alpha.N, beta.N or rc.N, got "${prerelease}"`,
    );
  } else if (branch === "master") {
    assert(
      prerelease.length === 0,
      `Master branch must use stable release version without prerelease suffix, got "${packageVersion}"`,
    );
  }

  const branchInfo = branch || "local";
  console.log(
    `[check:version] OK for ${branchInfo}: version=${packageVersion}, prerelease=${prerelease || "none"}`,
  );
}

try {
  main();
} catch (error) {
  console.error(`[check:version] FAILED: ${error.message}`);
  process.exit(1);
}

