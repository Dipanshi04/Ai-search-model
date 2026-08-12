#!/bin/bash
set -e

ENVIRONMENT=${1:-staging}
echo "🚀 Deploying to $ENVIRONMENT..."

git pull origin main
pnpm install --frozen-lockfile

cd apps/api-server
npx prisma migrate deploy
cd ../..

pnpm build

sudo cp -r apps/public-web/dist/* /var/www/isa-marathon/public/
sudo cp -r apps/runner-app/dist/* /var/www/isa-marathon/runner/
sudo cp -r apps/spectator-app/dist/* /var/www/isa-marathon/spectator/
sudo cp -r apps/admin-panel/dist/* /var/www/isa-marathon/admin/
sudo cp -r apps/led-dashboard/dist/* /var/www/isa-marathon/led/

cd apps/api-server
pm2 restart isa-api || pm2 start dist/index.js --name isa-api
cd ../..

sudo nginx -t && sudo nginx -s reload

echo "✅ Deployed to $ENVIRONMENT successfully!"
