#!/bin/bash
# Run from a checkout; installer.mjs must remain beside this launcher.
set -eu
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js 20+ is required. Nothing was installed.' >&2
  exit 1
fi
node --input-type=module - "$HERE/installer.mjs" "$@" <<'HTML_PLAN_CODEX_NODE'
import { pathToFileURL } from 'node:url';
try {
  const { main } = await import(pathToFileURL(process.argv[2]).href);
  await main(process.argv.slice(3));
} catch (error) {
  console.error(`Stopped: ${error.message}`);
  console.error('Pre-existing skills and Codex configuration have not been overwritten.');
  process.exitCode = 1;
}
HTML_PLAN_CODEX_NODE
