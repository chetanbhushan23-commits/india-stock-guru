import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const isWindows = process.platform === "win32";
const binName = isWindows ? "wrangler.cmd" : "wrangler";
const wranglerBin = resolve("node_modules", ".bin", binName);

if (!existsSync(wranglerBin)) {
  console.error("Wrangler is not installed. Run `npm install` first.");
  process.exit(1);
}

// Windows cannot spawn .cmd files with shell:false. This was the cause of
// `spawn EINVAL` on Node 24. Use the Windows command shell only for the
// package shim; keep shell:false on POSIX systems.
const child = spawn(
  wranglerBin,
  ["--cwd", ".", "dev", "--port", "3000", "--host", "localhost"],
  {
    stdio: "inherit",
    shell: isWindows,
    windowsHide: false,
  },
);

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
