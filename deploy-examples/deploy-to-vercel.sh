#!/bin/bash
# Deploy Thred SDK to Vercel

set -e

echo "🏗️  Building production version..."
npm run build:prod

echo "📦 Copying to public folder..."
mkdir -p public
cp dist/thred-track.umd.js public/thred-track.js

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployed!"
echo ""
echo "Usage in HTML:"
echo '<script src="https://your-domain.vercel.app/thred-track.js?browserKey=YOUR_KEY"></script>'
