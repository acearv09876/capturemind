'use strict';
// pnpm hook — runs during resolution, unaffected by --ignore-scripts.
// Creates a /usr/local/bin/tsx shim so mcp-proxy can spawn it.
// server.js is plain JS; "node $@" is fully equivalent to "tsx $@".
const fs = require('fs');

module.exports = {
  hooks: {
    afterAllResolved(lockfile, context) {
      try {
        fs.writeFileSync('/usr/local/bin/tsx', '#!/bin/sh\nexec node "$@"\n');
        fs.chmodSync('/usr/local/bin/tsx', 0o755);
        context.log('tsx shim installed at /usr/local/bin/tsx');
      } catch (e) {
        context.log('tsx shim failed: ' + e.message);
      }
      return lockfile;
    }
  }
};
