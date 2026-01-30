#!/bin/bash
# Deploy Thred SDK to your own server

set -e

# Configuration
SERVER="user@yourserver.com"
REMOTE_PATH="/var/www/cdn"
VERSION="1.0.0"

echo "🏗️  Building production version..."
npm run build:prod

echo "📦 Uploading to server..."
scp dist/thred.umd.js ${SERVER}:${REMOTE_PATH}/thred-v${VERSION}.js

echo "🔗 Creating symlink to latest..."
ssh ${SERVER} "cd ${REMOTE_PATH} && ln -sf thred-v${VERSION}.js thred-latest.js"

echo "✅ Deployed!"
echo ""
echo "Usage in HTML:"
echo "<script src=\"https://yourcdn.com/thred-latest.js?browserKey=YOUR_KEY\"></script>"
echo ""
echo "Or version-specific:"
echo "<script src=\"https://yourcdn.com/thred-v${VERSION}.js?browserKey=YOUR_KEY\"></script>"
