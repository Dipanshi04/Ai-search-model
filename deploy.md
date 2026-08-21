# ISA Tech Marathon - Deployment Guide

> Monorepo powered by Turborepo + PNPM workspaces.
> Covers local development and production deployment for all apps.

---

## Project Architecture

`
isa-tech-marathon/
apps/
   api-server        - Express + Prisma + Socket.io (Backend) - Port 4000
   admin-panel       - React + Vite (Admin UI)                - Port 3003
   public-web        - React + Vite (Public website)          - Port 3000
   runner-app        - React + Vite (Runner mobile/web app)   - Port 3001
   spectator-app     - React + Vite (Spectator view)          - Port 3002
   led-dashboard     - React + Vite (LED scoreboard)          - Port 3004
packages/             - Shared packages (types, utils, config, socket-client)
infra/
   nginx/            - Nginx configs (dev + prod)
   postgres/         - DB init SQL
   scripts/          - deploy.sh, ssl-setup.sh, backup.sh
docker-compose.dev.yml    - Dev: PostgreSQL + Redis only
docker-compose.prod.yml   - Prod: Full stack (API + DB + Redis + Nginx)
`

---

## Prerequisites

| Tool           | Version    | Purpose                 |
|----------------|------------|-------------------------|
| Node.js        | >= 22.0.0  | Runtime                 |
| PNPM           | 9.15.0     | Package manager         |
| Docker         | latest     | PostgreSQL + Redis       |
| Docker Compose | v2+        | Container orchestration |
| Git            | any        | Source control          |

Install PNPM if not already installed:
`ash
npm install -g pnpm@9.15.0
`

---

# PART 1: LOCAL DEVELOPMENT

## Step 1 - Clone the Repository

`ash
git clone <your-repo-url> isa-tech-marathon
cd isa-tech-marathon
`

---

## Step 2 - Install All Dependencies

`ash
pnpm install
`

> This installs dependencies for all apps and packages in the monorepo at once.

---

## Step 3 - Set Up Environment Variables

Copy the example env file and fill in your values:

`ash
cp .env.example .env
`

Edit .env with your actual values:

`env
# Application
NODE_ENV=development
PORT=4000

# Database (matches docker-compose.dev.yml)
DATABASE_URL=postgresql://isa:isa_password@localhost:5432/isa_marathon

# Redis (matches docker-compose.dev.yml)
REDIS_URL=redis://localhost:6379

# JWT - change this to a long random string!
JWT_SECRET=change-this-to-a-very-long-random-string-in-production
JWT_EXPIRES_IN=24h

# Mapbox (get your token at https://mapbox.com)
MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token-here

# CORS - allows all frontend ports
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004

# Frontend URLs
PUBLIC_WEB_URL=http://localhost:3000
RUNNER_APP_URL=http://localhost:3001
SPECTATOR_APP_URL=http://localhost:3002
ADMIN_PANEL_URL=http://localhost:3003
LED_DASHBOARD_URL=http://localhost:3004
API_URL=http://localhost:4000
`

> NOTE: The .env file lives at the ROOT of the monorepo. The api-server reads it from there.

---

## Step 4 - Start Infrastructure (Database + Redis)

`ash
pnpm docker:up
# or directly:
docker compose -f docker-compose.dev.yml up -d
`

Wait for both containers to be healthy:

`ash
docker compose -f docker-compose.dev.yml ps
# Both isa-postgres and isa-redis should show: healthy
`

---

## Step 5 - Run Database Migrations + Seed

`ash
# Generate Prisma client
pnpm --filter @isa/api-server db:generate

# Run migrations
pnpm db:migrate

# Seed initial data (admin user, routes, etc.)
pnpm db:seed
`

---

## Step 6 - Run All Apps (Full Dev Mode)

Run everything at once using Turborepo:

`ash
pnpm dev
`

Or run individual apps:

`ash
pnpm dev:api        # Backend (port 4000)
pnpm dev:admin      # Admin panel (port 3003)
pnpm dev:web        # Public website (port 3000)
pnpm dev:runner     # Runner app (port 3001)
pnpm dev:spectator  # Spectator app (port 3002)
pnpm dev:led        # LED dashboard (port 3004)
`

### Dev URLs

| App            | URL                    |
|----------------|------------------------|
| Public Website | http://localhost:3000  |
| Runner App     | http://localhost:3001  |
| Spectator App  | http://localhost:3002  |
| Admin Panel    | http://localhost:3003  |
| LED Dashboard  | http://localhost:3004  |
| API Server     | http://localhost:4000  |
| Prisma Studio  | http://localhost:5555  |

---

## Step 7 - Verify the Setup

`ash
# Test API health endpoint
curl http://localhost:4000/health

# Open Prisma Studio to inspect the database
pnpm db:studio
`

---

# PART 2: PRODUCTION DEPLOYMENT

## Overview

Production uses Nginx as a reverse proxy, PM2 to manage the Node.js API,
and static files served by Nginx from the build output.

`
Internet --> Nginx (80/443)
  |-- marathon.isatech.dev  --> /var/www/isa-marathon/public/   (static)
  |-- admin.isatech.dev     --> /var/www/isa-marathon/admin/    (static)
  |-- runner.isatech.dev    --> /var/www/isa-marathon/runner/   (static)
  |-- spectator.isatech.dev --> /var/www/isa-marathon/spectator/ (static)
  |-- led.isatech.dev       --> /var/www/isa-marathon/led/      (static)
  +-- /api/, /socket.io/   --> PM2 Node API (port 4000)
                                  |-- PostgreSQL (5432)
                                  +-- Redis (6379)
`

---

## Step 1 - Server Requirements

- Ubuntu 22.04 LTS (or similar)
- 2+ vCPU, 4+ GB RAM recommended
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

Install required tools on the server:

`ash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# PNPM
npm install -g pnpm@9.15.0

# PM2
npm install -g pm2

# Nginx
sudo apt install -y nginx

# Docker + Docker Compose
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker 
`

---

## Step 2 - Clone the Repository on the Server

`ash
git clone <your-repo-url> /opt/isa-tech-marathon
cd /opt/isa-tech-marathon
`

---

## Step 3 - Configure Production Environment

`ash
cp .env.example .env
nano .env
`

Set production values:

`env
NODE_ENV=production
PORT=4000

DATABASE_URL=postgresql://isa:isa_password@localhost:5432/isa_marathon
REDIS_URL=redis://localhost:6379

# Generate with: openssl rand -hex 64
JWT_SECRET=<your-strong-random-secret>
JWT_EXPIRES_IN=24h

MAPBOX_ACCESS_TOKEN=pk.<your-real-mapbox-token>

CORS_ORIGIN=https://marathon.isatech.dev,https://admin.isatech.dev,https://runner.isatech.dev,https://spectator.isatech.dev,https://led.isatech.dev

PUBLIC_WEB_URL=https://marathon.isatech.dev
RUNNER_APP_URL=https://runner.isatech.dev
SPECTATOR_APP_URL=https://spectator.isatech.dev
ADMIN_PANEL_URL=https://admin.isatech.dev
LED_DASHBOARD_URL=https://led.isatech.dev
API_URL=https://marathon.isatech.dev/api
`

---

## Step 4 - Start Infrastructure (PostgreSQL + Redis)

`ash
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml ps
`

---

## Step 5 - Install Dependencies

`ash
pnpm install --frozen-lockfile
`

---

## Step 6 - Run Database Migrations (Production)

`ash
# Generate Prisma client
pnpm --filter @isa/api-server db:generate

# Deploy migrations (safe for production - no data loss)
pnpm --filter @isa/api-server db:migrate:prod

# (First-time only) Seed initial admin user
pnpm db:seed
`

---

## Step 7 - Build All Apps

`ash
# Build everything (Turborepo handles dependency order)
pnpm build
`

Or build individually:

`ash
pnpm build:api        # --> apps/api-server/dist/
pnpm build:web        # --> apps/public-web/dist/
pnpm build:runner     # --> apps/runner-app/dist/
pnpm build:spectator  # --> apps/spectator-app/dist/
pnpm build:admin      # --> apps/admin-panel/dist/
pnpm build:led        # --> apps/led-dashboard/dist/
`

---

## Step 8 - Deploy Frontend Static Files

`ash
# Create web directories
sudo mkdir -p /var/www/isa-marathon/{public,runner,spectator,admin,led}

# Copy build output
sudo cp -r apps/public-web/dist/*    /var/www/isa-marathon/public/
sudo cp -r apps/runner-app/dist/*    /var/www/isa-marathon/runner/
sudo cp -r apps/spectator-app/dist/* /var/www/isa-marathon/spectator/
sudo cp -r apps/admin-panel/dist/*   /var/www/isa-marathon/admin/
sudo cp -r apps/led-dashboard/dist/* /var/www/isa-marathon/led/

# Set correct permissions
sudo chown -R www-data:www-data /var/www/isa-marathon
sudo chmod -R 755 /var/www/isa-marathon
`

---

## Step 9 - Start the Backend with PM2

`ash
# Create logs directory
mkdir -p logs

# Start using the ecosystem config (ecosystem.config.js)
pm2 start ecosystem.config.js

# Save process list (auto-restart on server reboot)
pm2 save
pm2 startup   # Follow the printed command to enable startup on boot
`

Verify the API is running:

`ash
pm2 status
curl http://localhost:4000/health
`

---

## Step 10 - Configure Nginx

### 10a. Install Nginx config

`ash
sudo cp infra/nginx/prod.conf /etc/nginx/nginx.conf
`

The production config routes traffic:

| Domain                | Served From                               |
|-----------------------|-------------------------------------------|
| marathon.isatech.dev  | /var/www/isa-marathon/public/ + API proxy |
| admin.isatech.dev     | /var/www/isa-marathon/admin/              |
| runner.isatech.dev    | /var/www/isa-marathon/runner/             |
| spectator.isatech.dev | /var/www/isa-marathon/spectator/          |
| led.isatech.dev       | /var/www/isa-marathon/led/                |

### 10b. Set up SSL (HTTPS with Lets Encrypt)

`ash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot certonly --nginx \
  -d marathon.isatech.dev \
  -d admin.isatech.dev \
  -d runner.isatech.dev \
  -d spectator.isatech.dev \
  -d led.isatech.dev
`

Or use the included helper script:

`ash
chmod +x infra/scripts/ssl-setup.sh
sudo bash infra/scripts/ssl-setup.sh
`

Copy certs to where Nginx config expects them:

`ash
sudo mkdir -p infra/docker/ssl
sudo cp /etc/letsencrypt/live/marathon.isatech.dev/fullchain.pem infra/docker/ssl/
sudo cp /etc/letsencrypt/live/marathon.isatech.dev/privkey.pem   infra/docker/ssl/
`

### 10c. Test and reload Nginx

`ash
sudo nginx -t                   # Must say: syntax is ok
sudo systemctl restart nginx
sudo systemctl enable nginx     # Start Nginx automatically on reboot
`

---

## Step 11 - Verify Production

`ash
curl https://marathon.isatech.dev/health
pm2 status
pm2 logs isa-api
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
`

---

# PART 3: UPDATING AN EXISTING DEPLOYMENT

Use the built-in deploy script:

`ash
chmod +x infra/scripts/deploy.sh
bash infra/scripts/deploy.sh production
`

What the script does automatically:
1. git pull origin main            - pull latest code
2. pnpm install --frozen-lockfile  - update dependencies
3. prisma migrate deploy           - run new DB migrations
4. pnpm build                      - rebuild all apps
5. Copies frontend dist/ to /var/www/isa-marathon/
6. pm2 restart isa-api             - restarts backend
7. nginx -t && nginx -s reload     - reloads Nginx

### Manual Update Steps

`ash
cd /opt/isa-tech-marathon
git pull origin main
pnpm install --frozen-lockfile
pnpm --filter @isa/api-server db:migrate:prod
pnpm build

sudo cp -r apps/public-web/dist/*    /var/www/isa-marathon/public/
sudo cp -r apps/runner-app/dist/*    /var/www/isa-marathon/runner/
sudo cp -r apps/spectator-app/dist/* /var/www/isa-marathon/spectator/
sudo cp -r apps/admin-panel/dist/*   /var/www/isa-marathon/admin/
sudo cp -r apps/led-dashboard/dist/* /var/www/isa-marathon/led/

pm2 restart isa-api
sudo nginx -s reload
`

---

# PART 4: DATABASE MANAGEMENT

`ash
# Generate Prisma client (required after schema changes)
pnpm --filter @isa/api-server db:generate

# Run migrations (dev - interactive)
pnpm db:migrate

# Run migrations (production - safe, no data loss)
pnpm --filter @isa/api-server db:migrate:prod

# Reset DB - DANGER: destroys all data (dev only!)
pnpm db:reset

# Open Prisma Studio (visual DB browser at localhost:5555)
pnpm db:studio

# Seed initial data
pnpm db:seed

# Backup database
bash infra/scripts/backup.sh
`

---

# PART 5: FULL DOCKER STACK (OPTIONAL)

To run the entire stack including the API inside Docker:

`ash
# Build and start all containers
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop all
docker compose -f docker-compose.prod.yml down
`

---

# PART 6: COMMAND REFERENCE

| Command                      | Description                           |
|------------------------------|---------------------------------------|
| pnpm install                 | Install all workspace dependencies    |
| pnpm dev                     | Run all apps in dev mode              |
| pnpm dev:api                 | Run backend only                      |
| pnpm dev:admin               | Run admin panel only                  |
| pnpm dev:web                 | Run public website only               |
| pnpm dev:runner              | Run runner app only                   |
| pnpm dev:spectator           | Run spectator app only                |
| pnpm dev:led                 | Run LED dashboard only                |
| pnpm build                   | Build all apps                        |
| pnpm build:api               | Build backend only                    |
| pnpm db:migrate              | Run DB migrations (dev)               |
| pnpm db:migrate:prod         | Run DB migrations (production)        |
| pnpm db:seed                 | Seed database                         |
| pnpm db:studio               | Open Prisma Studio                    |
| pnpm docker:up               | Start Docker services (dev)           |
| pnpm docker:down             | Stop Docker services                  |
| pnpm lint                    | Lint all packages                     |
| pnpm type-check              | TypeScript check all packages         |
| pnpm clean                   | Clean all build outputs               |
| pm2 status                   | Check API process status              |
| pm2 logs isa-api             | View API logs                         |
| pm2 restart isa-api          | Restart API                           |

---

# PART 7: TROUBLESHOOTING

### API wont start - Cannot connect to database
- Check Docker is running: docker compose -f docker-compose.dev.yml ps
- Verify DATABASE_URL in .env matches Docker config
- Run: pnpm --filter @isa/api-server db:generate

### Frontend shows blank page in production
- Make sure you ran pnpm build before copying to Nginx
- Check Nginx is serving files from /var/www/isa-marathon/
- Check browser console for API URL errors

### Socket.io connection fails in production
- Verify Nginx has WebSocket upgrade headers (see infra/nginx/prod.conf)
- Check CORS_ORIGIN in .env includes all production domains

### Prisma client out of date after schema change
`ash
pnpm --filter @isa/api-server db:generate
`

### Port already in use
`ash
# Linux
lsof -ti:4000 | xargs kill

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
`

### PM2 process not starting
`ash
pm2 logs isa-api --lines 50    # Check error logs
pm2 delete isa-api             # Remove old process
pm2 start ecosystem.config.js  # Re-add
`

---

Generated for ISA Tech Marathon - Real-time marathon tracking platform.