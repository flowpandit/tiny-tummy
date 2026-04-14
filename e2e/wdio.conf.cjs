const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

let tauriDriver;

function resolveTauriDriverPath() {
  if (process.env.TAURI_DRIVER_PATH) {
    return process.env.TAURI_DRIVER_PATH;
  }

  const suffix = process.platform === "win32" ? ".exe" : "";
  return path.join(os.homedir(), ".cargo", "bin", `tauri-driver${suffix}`);
}

function resolveAppBinaryPath() {
  if (process.env.TAURI_E2E_APP_PATH) {
    return process.env.TAURI_E2E_APP_PATH;
  }

  const suffix = process.platform === "win32" ? ".exe" : "";
  return path.resolve(__dirname, "..", "src-tauri", "target", "release", `tiny-tummy${suffix}`);
}

exports.config = {
  specs: ["./specs/**/*.e2e.cjs"],
  maxInstances: 1,
  hostname: "127.0.0.1",
  port: 4444,
  path: "/",
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: resolveAppBinaryPath(),
      },
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 90000,
  },
  onPrepare() {
    if (process.platform === "darwin") {
      throw new Error(
        "Tauri WebDriver desktop tests are not supported on macOS. Official Tauri docs currently support desktop WebDriver only on Windows and Linux.",
      );
    }

    const build = spawnSync(
      "cargo",
      ["build", "--release", "--manifest-path", "src-tauri/Cargo.toml"],
      {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
      },
    );

    if (build.status !== 0) {
      throw new Error("Failed to build the Tauri release binary for E2E tests.");
    }

    const driverPath = resolveTauriDriverPath();
    if (!fs.existsSync(driverPath)) {
      throw new Error(
        `tauri-driver was not found at ${driverPath}. Install it with "cargo install tauri-driver --locked" or set TAURI_DRIVER_PATH.`,
      );
    }

    const appBinaryPath = resolveAppBinaryPath();
    if (!fs.existsSync(appBinaryPath)) {
      throw new Error(`Tauri app binary not found at ${appBinaryPath}.`);
    }
  },
  beforeSession() {
    tauriDriver = spawn(resolveTauriDriverPath(), [], {
      stdio: ["ignore", process.stdout, process.stderr],
    });
  },
  afterSession() {
    if (tauriDriver) {
      tauriDriver.kill();
      tauriDriver = null;
    }
  },
};
