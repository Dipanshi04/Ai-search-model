#!/bin/bash
# ISA Marathon - First Time Server Setup
# Run this ONCE on a fresh EC2 instance
# Usage: bash setup-server.sh

set -e

echo "=== ISA Marathon Server Setup ==="

# 1. Update system
echo "[1/5] Updating system..."
sudo yum update -y

# 2. Install Node.js 20.x
echo "[2/5] Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 3. Install pnpm
echo "[3/5] Installing pnpm..."
sudo npm install -g pnpm

# 4. Install Nginx
echo "[4/5] Installing Nginx..."
sudo yum install -y nginx

# 5. Configure firewall
echo "[5/5] Configuring firewall..."
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Create project directory
sudo mkdir -p /var/www/isa-marathon
sudo chown ec2-user:ec2-user /var/www/isa-marathon

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Clone your repo: cd /var/www && git clone <your-repo-url> isa-tech-marathon"
echo "2. Run: bash deploy.sh"
echo ""
echo "For SSL certificates:"
echo "  sudo certbot --nginx -d marathon.com -d admin.marathon.com"
