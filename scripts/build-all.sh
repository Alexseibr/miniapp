#!/bin/bash
set -e

echo "🔨 Building client app..."
npx vite build

echo "🔨 Building MiniApp..."
cd miniapp && npx vite build && cd ..

echo "✅ Build complete!"
