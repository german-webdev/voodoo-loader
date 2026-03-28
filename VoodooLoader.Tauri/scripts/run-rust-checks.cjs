const { existsSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

function resolveCargo() {
  const candidates = [
    "cargo",
    process.env.CARGO,
    process.env.USERPROFILE ? join(process.env.USERPROFILE, ".cargo", "bin", "cargo.exe") : null,
    process.env.HOME ? join(process.env.HOME, ".cargo", "bin", "cargo") : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "cargo") {
      const probe = spawnSync("cargo", ["--version"], { stdio: "ignore", shell: false });
      if (probe.status === 0) return "cargo";
      continue;
    }

    if (!existsSync(candidate)) continue;

    const probe = spawnSync(candidate, ["--version"], { stdio: "ignore", shell: false });
    if (probe.status === 0) return candidate;
  }

  return null;
}

function runOrFail(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const cargo = resolveCargo();
if (!cargo) {
  console.error("cargo not found. Install Rust toolchain and ensure cargo is available.");
  process.exit(1);
}

runOrFail(cargo, ["check", "--manifest-path", "src-tauri/Cargo.toml", "--locked"]);
runOrFail(cargo, ["test", "--manifest-path", "src-tauri/Cargo.toml", "--locked"]);
