# GoodBerry - Production Deployment Guide

This document provides a comprehensive guide for deploying the GoodBerry application using Docker, an Nginx reverse proxy with automated SSL/TLS certificates, and GitHub Actions CI/CD.

---

## 1. System Architecture

The deployment architecture utilizes Docker containers isolated on a shared bridge network (`web-network`), orchestrated behind a central reverse proxy.

```
[ Internet Client ]
       |
       v
[ AWS EC2 Port 80 / 443 ]
       |
       +---> [ nginx-proxy & acme-companion ]
                   |
                   +---> [ goodberry-frontend (Port 80) ]
                   |
                   +---> [ goodberry-backend  (Port 5000) ]
```

### Components
- **Central Reverse Proxy**: `nginx-proxy` monitors running Docker containers and routes incoming web traffic based on environment variables.
- **Automated SSL/TLS**: `acme-companion` manages Let's Encrypt certificates automatically for all exposed domains.
- **Frontend Container**: Multi-stage Nginx container serving built React SPA assets.
- **Backend Container**: Node.js runtime executing the Express REST API.

---

## 2. Prerequisites

### Infrastructure Requirements
- AWS EC2 Instance running Ubuntu 22.04 or 24.04 LTS.
- Allocated Elastic IP assigned to the EC2 instance.
- DNS `A` records pointing your domain (e.g., `goodberry.shamnadt.in`) to the EC2 Elastic IP.

### Security Group Inbound Rules
- `HTTP` (Port 80) from `0.0.0.0/0`
- `HTTPS` (Port 443) from `0.0.0.0/0`
- `SSH` (Port 22) from authorized IP addresses

### Server Dependencies
Install Docker Engine and Docker Compose v2 on the EC2 host:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io

# Install Docker Compose v2 plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verify installation
docker compose version
```

---

## 3. Central Reverse Proxy Setup

The central proxy must be running before starting individual application stacks.

### Step 1: Create Docker Network
```bash
docker network create web-network
```

### Step 2: Configure Central Proxy Stack
Create directory `~/nginx-proxy` and add `docker-compose.yml`:

```yaml
version: '3.8'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - conf:/etc/nginx/conf.d
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - certs:/etc/nginx/certs:ro
      - /var/run/docker.sock:/tmp/docker.sock:ro
    networks:
      - web-network

  acme-companion:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    restart: always
    volumes_from:
      - nginx-proxy
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - DEFAULT_EMAIL=your-email@example.com

networks:
  web-network:
    external: true

volumes:
  conf:
  vhost:
  html:
  certs:
  acme:
```

### Step 3: Start Central Proxy
```bash
cd ~/nginx-proxy
docker compose up -d
```

---

## 4. Application Environment Configuration

Create a `.env` file inside `~/apps/GoodBerry/.env` on the EC2 host:

```env
# Docker & Reverse Proxy Domain Settings
REGISTRY_OWNER=your_github_username
VIRTUAL_HOST=goodberry.yourdomain.com
LETSENCRYPT_HOST=goodberry.yourdomain.com

# Server Configuration
PORT=5000
SERVER_URL=https://goodberry.yourdomain.com
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/goodberry?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
SESSION_SECRET=your_session_secret

# Third-Party Integrations
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://goodberry.yourdomain.com/api/auth/google/callback

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM="Good Berry <your_email@gmail.com>"

# Client Configuration
CLIENT_URL=https://goodberry.yourdomain.com
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_API_BASE=https://goodberry.yourdomain.com
```

---

## 5. Deployment Options

### Option A: Automated CI/CD (GitHub Actions)

1. Add the following Repository Secrets in GitHub (`Settings -> Secrets and variables -> Actions`):
   - `EC2_HOST`: Elastic IP address of your EC2 instance.
   - `EC2_USERNAME`: SSH username (`ubuntu`).
   - `EC2_SSH_KEY`: Content of your private SSH key (`.pem`).

2. Push code to the `main` branch. GitHub Actions will build Docker images, publish them to GitHub Container Registry (`ghcr.io`), connect via SSH to EC2, pull updated images, and restart application containers.

### Option B: Manual Server Deployment

To deploy manually on the EC2 server:

```bash
cd ~/apps/GoodBerry
git pull origin main
export REGISTRY_OWNER=your_github_username
docker compose pull
docker compose down --remove-orphans || true
docker compose up -d --remove-orphans
```

---

## 6. Maintenance & Diagnostics

### View Running Containers
```bash
docker ps
```

### Inspect Container Logs
```bash
# View proxy logs
docker logs --tail 50 nginx-proxy

# View application backend logs
docker logs --tail 50 goodberry-backend

# View application frontend logs
docker logs --tail 50 goodberry-frontend
```

### Verify Proxy Route Generation
```bash
docker exec nginx-proxy cat /etc/nginx/conf.d/default.conf | grep goodberry
```

---

## 7. Troubleshooting

### 404 Not Found
- Ensure `~/apps/GoodBerry/.env` exists and contains correct `VIRTUAL_HOST` and `LETSENCRYPT_HOST`.
- Verify the container is attached to `web-network`.

### Cannot POST //auth/login
- Ensure `VIRTUAL_DEST=/api` is set on `goodberry-backend` in `docker-compose.yml`.
- Ensure `VIRTUAL_PATH` and `VIRTUAL_DEST` are NOT defined inside `.env` to prevent frontend container inheritance.
