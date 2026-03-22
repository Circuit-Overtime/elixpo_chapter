#!/usr/bin/env node

/**
 * Thin npm wrapper for the Elixpo CLI (Python).
 * Checks for Python availability, installs elixpo-cli if needed,
 * and forwards all arguments.
 */

const { execSync, spawn } = require("child_process");

const PYTHON_COMMANDS = ["python3", "python"];
const PACKAGE = "elixpo-cli";

function findPython() {
  for (const cmd of PYTHON_COMMANDS) {
    try {
      const version = execSync(`${cmd} --version 2>&1`, { encoding: "utf-8" }).trim();
      const match = version.match(/Python (\d+)\.(\d+)/);
      if (match && (parseInt(match[1]) > 3 || (parseInt(match[1]) === 3 && parseInt(match[2]) >= 11))) {
        return cmd;
      }
    } catch {}
  }
  return null;
}

function isElixpoInstalled(python) {
  try {
    execSync(`${python} -m elixpo_cli.main --help 2>&1`, { encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const python = findPython();
  if (!python) {
    console.error("Error: Python 3.11+ is required but not found.");
    console.error("Install Python from https://python.org or via your package manager.");
    process.exit(1);
  }

  if (!isElixpoInstalled(python)) {
    console.log(`Installing ${PACKAGE}...`);
    try {
      execSync(`${python} -m pip install ${PACKAGE}`, { stdio: "inherit" });
    } catch (e) {
      console.error(`Failed to install ${PACKAGE}. Try: ${python} -m pip install ${PACKAGE}`);
      process.exit(1);
    }
  }

  const args = process.argv.slice(2);
  const child = spawn(python, ["-m", "elixpo_cli.main", ...args], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => process.exit(code || 0));
}

main();
