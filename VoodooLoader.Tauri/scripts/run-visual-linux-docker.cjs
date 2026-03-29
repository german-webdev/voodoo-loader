const { spawnSync } = require("node:child_process");
const path = require("node:path");

const workspaceDir = path.resolve(__dirname, "..");
const shouldUpdate = process.argv.includes("--update");

const containerCommand = shouldUpdate
  ? "npm ci && npx playwright install --with-deps chromium && npm run e2e:visual:update"
  : "npm ci && npx playwright install --with-deps chromium && npm run e2e:visual";

const dockerArgs = [
  "run",
  "--rm",
  "-t",
  "-v",
  `${workspaceDir}:/work`,
  "-w",
  "/work",
  "mcr.microsoft.com/playwright:v1.56.1-jammy",
  "bash",
  "-lc",
  containerCommand,
];

const result = spawnSync("docker", dockerArgs, { stdio: "inherit", shell: true });

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
