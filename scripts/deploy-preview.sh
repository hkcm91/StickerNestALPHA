#!/bin/bash
# Deploy preview to Vercel
# Requires VERCEL_TOKEN environment variable
#
# Usage:
#   VERCEL_TOKEN=your_token ./scripts/deploy-preview.sh
#
# Prerequisites:
#   1. Install Vercel CLI: npm install -g vercel
#   2. Link project: npx vercel link
#   3. Set VERCEL_TOKEN environment variable

set -e

if [ -z "$VERCEL_TOKEN" ]; then
  echo "Error: VERCEL_TOKEN environment variable is not set"
  echo "Get your token from: https://vercel.com/account/tokens"
  exit 1
fi

echo "Deploying preview to Vercel..."
npx vercel --yes --token=$VERCEL_TOKEN

echo "Preview deployment complete!"
