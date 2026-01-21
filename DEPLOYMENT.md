# 🚀 Deployment Guide

Complete guide to deploying the Collaborative Canvas application to production.

## Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] No console errors or warnings
- [ ] Environment variables documented
- [ ] Dependencies updated and locked
- [ ] Code reviewed and committed to git
- [ ] README.md updated with any changes
- [ ] CHANGELOG created with release notes

## Local Production Build

Test production build locally before deploying:

```bash
# Build everything
npm run build

# Start production server
npm start

# Visit http://localhost:3000
```

The production build will:
- Serve pre-built static client files from `/public`
- Run server in production mode (no hot reload)
- Use compiled JavaScript instead of TypeScript

## Deployment Options

### Option 1: Heroku (Easiest for beginners)

#### Prerequisites
- Heroku account (free tier available)
- Heroku CLI installed

#### Steps

```bash
# 1. Login to Heroku
heroku login

# 2. Create app
heroku create my-collaborative-canvas

# 3. Build and deploy
git push heroku main

# 4. View logs
heroku logs --tail

# 5. Open app
heroku open
```

#### Configuration

```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://my-collaborative-canvas.herokuapp.com
heroku config:set PORT=

# View current config
heroku config
```

#### Cost
- **Free tier**: 
  - Sleeps after 30 mins of inactivity
  - Good for testing
  - Limited to 1 app

- **Hobby tier**: 
  - $7/month
  - Always running
  - 512MB RAM

- **Standard tier**: 
  - $25/month
  - Better performance
  - 1GB RAM

### Option 2: DigitalOcean

#### Prerequisites
- DigitalOcean account
- Droplet with Node.js installed

#### Setup Droplet

```bash
# SSH into droplet
ssh root@YOUR_IP

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Clone repository
cd /var/www
git clone <your-repo-url>
cd collaborative-canvas

# Install dependencies
npm install:all

# Build
npm run build

# Start with PM2
pm2 start npm --name "canvas" -- start

# Make it auto-start on reboot
pm2 startup
pm2 save

# View logs
pm2 logs canvas
```

#### Setup Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt install -y nginx

# Edit config
sudo nano /etc/nginx/sites-available/default
```

Configuration:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Test and restart
sudo nginx -t
sudo systemctl restart nginx

# Enable SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Cost
- **$5/month**: 512MB RAM, 1 vCPU, 20GB SSD - Good for low traffic
- **$10/month**: 1GB RAM, 1 vCPU, 30GB SSD - Recommended
- **$20+/month**: More resources if needed

### Option 3: AWS Elastic Beanstalk

#### Prerequisites
- AWS account
- AWS CLI configured

#### Deploy

```bash
# Install EB CLI
pip install awsebcli --upgrade --user

# Initialize EB app
eb init -p node.js-18 collaborative-canvas

# Create environment and deploy
eb create production-env
eb deploy

# View logs
eb logs

# Open app
eb open
```

#### Cost
- EC2 instance: $0.0116/hour (~$8/month)
- Data transfer: $0.09/GB (first 1GB free per month)
- Total: ~$10-50/month depending on usage

### Option 4: Vercel (Frontend) + Any Backend

**Frontend on Vercel**:
```bash
cd client
npm run build
# Push dist/ to Vercel or connect GitHub
```

**Backend on DigitalOcean/AWS/Heroku**:
```bash
cd server
npm run build
# Deploy as shown above
```

Connect in SocketManager.ts:
```typescript
const SERVER_URL = 'https://your-api-domain.com';
this.socket = io(SERVER_URL);
```

---

## Environment Variables

### Server Production Environment

Create `.env` in server directory:

```env
# Server
NODE_ENV=production
PORT=3000

# CORS - IMPORTANT: Set to your frontend domain
CORS_ORIGIN=https://your-domain.com

# WebSocket
WS_TRANSPORTS=websocket,polling

# Database (if adding persistence)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Auth (if adding authentication)
JWT_SECRET=your-secret-key

# Monitoring
LOG_LEVEL=info
```

### Client Production Build

Update SocketManager.ts for production:

```typescript
// Detect production
const isProd = window.location.hostname !== 'localhost';
const SERVER_URL = isProd ? '/' : 'http://localhost:3000';

this.socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnection: true,
    reconnectionAttempts: 10
});
```

---

## Performance Optimization for Production

### 1. Enable Compression

**Server** (index.ts):
```typescript
import compression from 'compression';
app.use(compression());
```

Install:
```bash
npm install compression
npm install -D @types/compression
```

### 2. Set Correct CORS

```typescript
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});
```

### 3. Add Request Logging

```typescript
import morgan from 'morgan';

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
```

### 4. Implement Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 5. Add Health Check Endpoint

```typescript
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: Date.now() });
});
```

### 6. Client Asset Optimization

vite.config.ts already includes minification. For additional optimization:

```typescript
export default defineConfig({
    build: {
        minify: 'terser',
        sourcemap: false, // Disable in production
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['socket.io-client', 'uuid']
                }
            }
        }
    }
});
```

---

## SSL/TLS Certificate

### Using Let's Encrypt (Free)

**Via Certbot**:
```bash
sudo certbot certonly --standalone -d your-domain.com
```

**Via Nginx** (recommended):
```bash
sudo certbot --nginx -d your-domain.com
```

**Auto-renewal**:
```bash
sudo certbot renew --dry-run  # Test
sudo systemctl enable certbot.timer
```

### Redirect HTTP to HTTPS

**Nginx**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        # ... proxy settings
    }
}
```

---

## Monitoring & Logging

### Application Monitoring

**PM2 Monitoring** (DigitalOcean):
```bash
pm2 web  # Opens web dashboard on port 9615
pm2 logs # View logs

# Setup monitoring
pm2 install pm2-auto-pull  # Auto-pull from git
pm2 install pm2-logrotate  # Rotate logs
```

### Error Tracking (Optional)

Add Sentry for error tracking:

```bash
npm install @sentry/node
```

In server/index.ts:
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Uptime Monitoring

**UptimeRobot** (free):
1. Go to uptimerobot.com
2. Add monitor for http://your-domain.com
3. Get notifications if down

---

## Database Integration (Optional)

To persist drawings, add a database:

### Using PostgreSQL

```bash
# Install driver
npm install pg

# Create HistoryService.ts
// Store history in database
// Load history on server restart
```

### Using MongoDB

```bash
# Install driver
npm install mongodb

# Use MongoDB for history storage
```

---

## Scaling to Multiple Users

### Load Balancing

**Nginx Load Balancer**:
```nginx
upstream app {
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
    server 192.168.1.12:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://app;
    }
}
```

### Cross-Server Communication

**Using Redis**:
```bash
npm install redis
```

Sync rooms between servers:
```typescript
const redis = require('redis');
const client = redis.createClient();

// Broadcast to all servers
client.publish('canvas:draw', JSON.stringify(stroke));

// Listen for events from other servers
client.subscribe('canvas:draw');
```

---

## Backup & Disaster Recovery

### Backup Strategy

```bash
# Daily backups
0 2 * * * tar -czf /backups/canvas-$(date +\%Y\%m\%d).tar.gz /var/www/collaborative-canvas

# Upload to cloud storage
0 3 * * * aws s3 cp /backups/ s3://my-backups/ --recursive
```

### Restore from Backup

```bash
# Stop app
pm2 stop canvas

# Restore files
tar -xzf /backups/canvas-20240101.tar.gz -C /var/www/

# Restart
pm2 restart canvas
```

---

## Security Hardening

### 1. Update Dependencies

```bash
npm audit fix
npm update
```

### 2. Environment Variables

Never commit `.env` - use `.env.example`

### 3. Input Validation

Add validation for all user inputs:

```typescript
function isValidStroke(stroke: any): boolean {
    if (!stroke.id || !stroke.userId || !stroke.points) return false;
    if (stroke.width < 1 || stroke.width > 100) return false;
    if (stroke.points.length > 10000) return false; // Prevent huge strokes
    return true;
}

socket.on('draw_line', (stroke, ack) => {
    if (!isValidStroke(stroke)) {
        ack?.(new Error('Invalid stroke'));
        return;
    }
    // Process stroke
});
```

### 4. Rate Limiting

Already shown in performance section.

### 5. HTTPS/WSS Only

Configure in production to use secure WebSocket (WSS):

```typescript
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    },
    transports: ['websocket'] // Force websocket over polling
});
```

---

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install and build
        run: |
          npm install:all
          npm run build
      
      - name: Deploy to DigitalOcean
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # Your deployment script
```

---

## Post-Deployment Checklist

- [ ] Application loads on production URL
- [ ] Multiple users can draw together
- [ ] Undo/redo works globally
- [ ] No errors in browser console
- [ ] Server logs show no errors
- [ ] SSL certificate valid (if using HTTPS)
- [ ] Monitoring/logging active
- [ ] Backups configured
- [ ] All features tested in production
- [ ] Performance acceptable under load

---

## Troubleshooting Production Issues

### Application won't start

```bash
# Check error logs
pm2 logs app-name

# Verify Node.js version
node --version

# Check environment variables
echo $NODE_ENV
echo $PORT
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart app
pm2 restart app-name

# Review code for memory leaks
# Check history size isn't growing indefinitely
```

### WebSocket Connection Issues

```bash
# Verify server is running
netstat -tlnp | grep 3000

# Check firewall
sudo ufw status

# Test from client
# Check browser DevTools Network tab
```

### Slow Performance

1. Check network latency
2. Monitor server CPU/memory
3. Review database queries (if using DB)
4. Reduce throttle rate if needed
5. Scale horizontally with load balancing

---

## Cost Estimation (Monthly)

| Provider | Tier | Price | Capacity |
|----------|------|-------|----------|
| Heroku | Hobby | $7 | ~100 users |
| DigitalOcean | $10 | $10 | ~500 users |
| AWS EC2 | t3.small | $8 | ~300 users |
| Vercel (frontend only) | Free | $0 | Unlimited |

**Recommendation**: Start with Heroku for simplicity, move to DigitalOcean as you scale.

---

## Resources

- [Heroku Docs](https://devcenter.heroku.com/)
- [DigitalOcean Docs](https://docs.digitalocean.com/)
- [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/)
- [PM2 Process Manager](https://pm2.keymetrics.io/)
- [Nginx Reverse Proxy](https://nginx.org/en/docs/)
- [Let's Encrypt SSL](https://letsencrypt.org/)

---

**Ready to deploy!** 🚀
