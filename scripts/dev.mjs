import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const spawnOptions = {
  stdio: "inherit",
  shell: isWindows
};

const processes = [
  spawn(npmCommand, ["run", "dev:backend"], spawnOptions),
  spawn(npmCommand, ["run", "dev:frontend"], spawnOptions)
];

function shutdown(signal) {
  for (const child of processes) {
    child.kill(signal);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of processes) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown("SIGTERM");
      process.exit(code);
    }
  });
}
