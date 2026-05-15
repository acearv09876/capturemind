// Creates a tsx shim at /usr/local/bin/tsx so mcp-proxy can spawn it.
// server.js is plain JS, so "node <args>" is fully equivalent to "tsx <args>".
const fs = require('fs');
try {
  fs.writeFileSync('/usr/local/bin/tsx', '#!/bin/sh\nexec node "$@"\n');
  fs.chmodSync('/usr/local/bin/tsx', 0o755);
  console.log('tsx shim installed at /usr/local/bin/tsx');
} catch (e) {
  console.error('Could not install tsx shim:', e.message);
}
