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

const args = ["--cwd", ".", "dev", "--port", "3000", "--host", "localhost"];

// Windows .cmd shims need cmd.exe, but using Node's `shell:true` emits a
// Node 24 DEP0190 warning. Launch cmd.exe explicitly so the child process
// remains shell:false while still supporting paths containing spaces.
const child = isWindows
  ? spawn(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", `"${wranglerBin}" ${args.join(" ")}`],
      {
        stdio: "inherit",
        shell: false,
        windowsHide: false,
      },
    )
  : spawn(wranglerBin, args, {
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
