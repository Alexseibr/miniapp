#!/bin/bash
set -e

echo "🔨 Building KETMAR Market for production..."

# Build frontend with production config (no top-level await)
echo "📦 Building frontend..."
npx vite build --config vite.config.prod.ts

# Build backend
echo "🔧 Building backend..."
npx esbuild server/backend.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build complete!"
echo "📁 Frontend: dist/public"
echo "📁 Backend: dist/backend.js"
