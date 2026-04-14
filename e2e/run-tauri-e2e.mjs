import { spawn } from "node:child_process";

if (process.platform === "darwin") {
  console.error(
    "Tauri WebDriver desktop tests are not supported on macOS. Run `npm run test:e2e:tauri` in Linux or Windows CI instead.",
  );
  process.exit(1);
}

const child = spawn("wdio", ["run", "./e2e/wdio.conf.cjs"], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

