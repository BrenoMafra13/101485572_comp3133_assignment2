#!/bin/sh
set -e

BACKEND_BASE_URL="${BACKEND_URL:-http://localhost:5001}"
BACKEND_BASE_URL="${BACKEND_BASE_URL%/}"

cat > /app/browser/env.js <<EOF
window.__env = {
  GRAPHQL_URL: '${BACKEND_BASE_URL}/graphql',
};
EOF

exec serve -s /app/browser -l "${PORT:-3000}"
