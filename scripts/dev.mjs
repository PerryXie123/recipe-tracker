import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const spawnOptions = {
  stdio: "inherit",
  shell: isWindows
};

cleanupStaleDevProcesses();

const processes = [
  spawn(npmCommand, ["run", "dev:backend"], spawnOptions),
  spawn(npmCommand, ["run", "dev:frontend"], spawnOptions)
];

function cleanupStaleDevProcesses() {
  if (!isWindows) {
    return;
  }

  const command = `
    param($root, $currentPid)
    $portOwners = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
    $processes = Get-CimInstance Win32_Process | Where-Object {
      $_.ProcessId -ne [int]$currentPid -and
      $_.CommandLine -like "*$root*" -and
      (
        $_.CommandLine -like "*vite-node*--watch src/server.ts*" -or
        $_.CommandLine -like "*vite*--config vite.config.mjs*" -or
        ($portOwners -contains $_.ProcessId)
      )
    }
    foreach ($process in $processes) {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
  `;

  spawnSync("powershell.exe", ["-NoProfile", "-Command", command, process.cwd(), String(process.pid)], {
    stdio: "ignore"
  });
}

function shutdown(signal) {
  for (const child of processes) {
    stopProcessTree(child.pid, signal);
  }
}

function stopProcessTree(pid, signal) {
  if (!pid) {
    return;
  }

  if (isWindows) {
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }

  try {
    process.kill(pid, signal);
  } catch {
    // The process may have already exited.
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
