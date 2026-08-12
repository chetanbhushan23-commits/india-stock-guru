import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const binName = process.platform === "win32" ? "wrangler.cmd" : "wrangler";
const wranglerBin = resolve("node_modules", ".bin", binName);

if (!existsSync(wranglerBin)) {
  console.error("Wrangler is not installed. Run `npm install` first.");
  process.exit(1);
}

const child = spawn(wranglerBin, ["--cwd", ".", "dev", "--port", "3000", "--host", "localhost"], {
  stdio: "inherit",
  shell: false,
  windowsHide: false,
});

child.on("error", (error) => {
  console.error(`Unable to start Wrangler: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});
