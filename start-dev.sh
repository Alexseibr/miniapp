#!/bin/bash
set -e

# Use the real application entrypoint in development mode.
export NODE_ENV=${NODE_ENV:-development}
export PORT=${PORT:-5000}

exec node index.js
