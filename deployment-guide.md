# Deployment Guide for DurgaShaktifoils E-commerce

## Prerequisites
- Node.js 16+ and Yarn
- Python 3.11+
- MongoDB running
- Web server (Apache/Nginx)

## Backend Deployment

### 1. Install Python Dependencies
```bash
cd /app/backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Edit `/app/backend/.env` with production values:
```bash
MONGO_URL="mongodb://your-production-mongodb:27017"
DB_NAME="durgashaktifoils_production"
JWT_SECRET="your-strong-random-secret-key-here"
FRONTEND_URL="https://yourdomain.com"

# Add real payment gateway keys
STRIPE_SECRET_KEY="sk_live_your_key"
STRIPE_PUBLISHABLE_KEY="pk_live_your_key"
RAZORPAY_KEY_ID="rzp_live_your_key"
RAZORPAY_KEY_SECRET="your_secret"
PAYPAL_MODE="live"
PAYPAL_CLIENT_ID="your_client_id"
PAYPAL_SECRET="your_secret"

# Email delivery. Render/Vercel commonly block SMTP ports 587/465,
# so configure one HTTPS email provider instead of Gmail SMTP.
EMAIL_PROVIDER="resend"  # resend, brevo, or sendgrid
EMAIL_FROM="notifications@yourdomain.com"
EMAIL_FROM_NAME="Durga Shakti Foils"
RESEND_API_KEY="re_your_key"
# or BREVO_API_KEY="xkeysib-your_key"
# or SENDGRID_API_KEY="SG.your_key"
```

### 3. Run Backend with Gunicorn (Production)
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8001
```

Or use systemd service (recommended):
```bash
sudo nano /etc/systemd/system/durgashakti-backend.service
```

Add:
```ini
[Unit]
Description=DurgaShakti Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/app/backend
Environment="PATH=/usr/local/bin"
ExecStart=/usr/local/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8001
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable durgashakti-backend
sudo systemctl start durgashakti-backend
```

## Frontend Deployment

### 1. Update Frontend Environment
Edit `/app/frontend/.env`:
```bash
REACT_APP_BACKEND_URL=https://yourdomain.com
```

### 2. Build React App
```bash
cd /app/frontend
yarn install
yarn build
```

This creates `/app/frontend/build` folder.

### 3. Deploy Build Folder

#### Option A: Apache Server

1. Copy build folder:
```bash
sudo cp -r /app/frontend/build/* /var/www/html/
```

2. Copy .htaccess:
```bash
sudo cp /app/frontend/public/.htaccess /var/www/html/
```

3. Enable mod_rewrite:
```bash
sudo a2enmod rewrite
sudo a2enmod deflate
sudo a2enmod expires
sudo a2enmod proxy
sudo a2enmod proxy_http
```

4. Configure virtual host:
```bash
sudo cp /app/deployment-config/apache-vhost.conf /etc/apache2/sites-available/durgashakti.conf
sudo a2ensite durgashakti
sudo systemctl restart apache2
```

#### Option B: Nginx Server

1. Copy build folder:
```bash
sudo cp -r /app/frontend/build/* /var/www/html/
```

2. Configure Nginx:
```bash
sudo cp /app/deployment-config/nginx.conf /etc/nginx/sites-available/durgashakti
sudo ln -s /etc/nginx/sites-available/durgashakti /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate (HTTPS)

Using Let's Encrypt (Free):

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx  # For Nginx
# OR
sudo apt install certbot python3-certbot-apache  # For Apache

# Get certificate
sudo certbot --nginx -d yourdomain.com  # For Nginx
# OR
sudo certbot --apache -d yourdomain.com  # For Apache
```

## Verification

1. Check backend:
```bash
curl http://localhost:8001/api/products
```

2. Check frontend:
```bash
curl http://yourdomain.com
```

3. Test complete flow:
- Visit https://yourdomain.com
- Register/Login
- Add products to cart
- Complete checkout

## Common Issues & Solutions

### Issue: Directory Listing Instead of Website
**Solution:** Ensure you're serving the `/build` folder, not `/src` or `/public`

### Issue: 404 on Page Refresh
**Solution:** Configure server for SPA routing (use provided .htaccess or nginx.conf)

### Issue: API Calls Failing
**Solution:** 
- Check CORS settings in backend
- Verify REACT_APP_BACKEND_URL is correct
- Ensure backend is running on port 8001

### Issue: White Screen
**Solution:**
- Check browser console for errors
- Verify all environment variables are set
- Rebuild with `yarn build`

## Monitoring

### Backend Logs
```bash
sudo journalctl -u durgashakti-backend -f
```

### Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Apache Logs
```bash
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/apache2/access.log
```

## Performance Optimization

1. Enable Gzip compression (included in configs)
2. Set proper cache headers (included in configs)
3. Use CDN for static assets
4. Enable HTTP/2 in Nginx/Apache
5. Optimize images before uploading

## Security Checklist

- [ ] Change default JWT_SECRET to strong random string
- [ ] Use HTTPS (SSL certificate)
- [ ] Set proper CORS origins (not '*' in production)
- [ ] Use real payment gateway keys (not test keys)
- [ ] Enable firewall (UFW/iptables)
- [ ] Regular security updates
- [ ] MongoDB authentication enabled
- [ ] Rate limiting on API endpoints

## Backup Strategy

### MongoDB Backup
```bash
mongodump --db durgashaktifoils_production --out /backups/mongo/$(date +%Y%m%d)
```

### Automated Daily Backup (Cron)
```bash
crontab -e
# Add:
0 2 * * * mongodump --db durgashaktifoils_production --out /backups/mongo/$(date +\%Y\%m\%d)
```

## Scaling Considerations

1. **Database**: Use MongoDB Atlas or replica set
2. **Backend**: Run multiple Gunicorn workers
3. **Frontend**: Use CDN (Cloudflare, AWS CloudFront)
4. **Load Balancer**: Nginx as reverse proxy for multiple backend instances
