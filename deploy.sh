#!/bin/bash
# ISA Marathon - Deployment Script
# Run this on the EC2 server after git pull
# Usage: bash deploy.sh

set -e

echo "=== ISA Marathon Deployment ==="

PROJECT_DIR="/var/www/isa-marathon"
NGINX_CONF_DIR="/etc/nginx/conf.d"

cd "$PROJECT_DIR"

# 1. Pull latest code
echo "[1/6] Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo "[2/6] Installing dependencies..."
pnpm install --frozen-lockfile

# 3. Build all apps
echo "[3/6] Building all apps..."
pnpm build:api
pnpm build:public
pnpm build:runner
pnpm build:spectator
pnpm build:led
pnpm build:admin

# 4. Copy Nginx configs
echo "[4/6] Setting up Nginx..."
cp "$PROJECT_DIR/nginx/marathon.com.conf" "$NGINX_CONF_DIR/"
cp "$PROJECT_DIR/nginx/admin.marathon.com.conf" "$NGINX_CONF_DIR/"

# 5. Test Nginx config
echo "[5/6] Testing Nginx config..."
nginx -t
if [ $? -ne 0 ]; then
  echo "ERROR: Nginx config test failed!"
  exit 1
fi

# 6. Restart Nginx
echo "[6/6] Restarting Nginx..."
systemctl restart nginx

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Public:  http://marathon.com"
echo "Admin:   http://admin.marathon.com"
echo "API:     http://marathon.com/api"
echo ""
echo "If SSL is needed, run:"
echo "  sudo certbot --nginx -d marathon.com -d admin.marathon.com"
