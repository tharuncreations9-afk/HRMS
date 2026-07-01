#!/usr/bin/env sh
set -e

cd "$(dirname "$0")/.."

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building production bundle..."
npm run build

echo "Restarting app on port 3000..."
npm run stop:3000 || true
npm run start
