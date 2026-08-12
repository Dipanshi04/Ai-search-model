#!/bin/bash
set -e

DOMAIN=${1:-marathon.isatech.dev}
EMAIL=${2:-admin@isatech.dev}

echo "Setting up SSL for $DOMAIN"

# Install certbot
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Stop nginx if running
sudo systemctl stop nginx 2>/dev/null || true

# Get certificate
sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "admin.$DOMAIN" \
    -d "runner.$DOMAIN" \
    -d "spectator.$DOMAIN" \
    -d "led.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

# Create SSL directory
mkdir -p infra/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem infra/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem infra/ssl/
sudo chmod 600 infra/ssl/privkey.pem

# Setup auto-renewal
sudo systemctl enable certbot.timer 2>/dev/null || true
sudo systemctl start certbot.timer 2>/dev/null || true

# Start nginx
sudo systemctl start nginx 2>/dev/null || true

echo "SSL setup complete!"
echo "Certificates saved to infra/ssl/"
