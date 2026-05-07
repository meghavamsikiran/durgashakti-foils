# Quick Deployment Guide - DurgaShaktifoils

## The Issue You're Facing

**Problem:** Getting directory listing instead of website.

**Reason:** You're serving the source code (`/app/frontend/src`) instead of the compiled production build.

## Quick Fix (3 Steps)

### Step 1: Build the React App
```bash
cd /app/frontend
yarn build
```

This creates a `/app/frontend/build` folder with your website.

### Step 2: Point Your Server to the Build Folder

**For Apache:**
```bash
# Your DocumentRoot should point to:
DocumentRoot /app/frontend/build

# NOT to:
DocumentRoot /app/frontend/src  ❌
DocumentRoot /app/frontend  ❌
```

**For Nginx:**
```nginx
root /app/frontend/build;
```

### Step 3: Configure SPA Routing

Copy the `.htaccess` file to your build folder:
```bash
cp /app/frontend/public/.htaccess /app/frontend/build/.htaccess
```

## Complete Server Setup Examples

### Apache Configuration

1. **Enable required modules:**
```bash
sudo a2enmod rewrite
sudo a2enmod deflate
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl restart apache2
```

2. **Virtual Host Configuration:**
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /app/frontend/build

    <Directory /app/frontend/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Proxy API to backend
    ProxyPass /api http://localhost:8001/api
    ProxyPassReverse /api http://localhost:8001/api
</VirtualHost>
```

3. **Restart Apache:**
```bash
sudo systemctl restart apache2
```

### Nginx Configuration

1. **Create Nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /app/frontend/build;
    index index.html;

    # Serve React app
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to backend
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

2. **Restart Nginx:**
```bash
sudo systemctl restart nginx
```

## Testing Your Deployment

### 1. Verify Build Folder Exists
```bash
ls -la /app/frontend/build/
# You should see: index.html, static/, asset-manifest.json, etc.
```

### 2. Test Locally
```bash
# Serve the build folder
cd /app/frontend/build
python3 -m http.server 8080
# Visit: http://localhost:8080
```

### 3. Check Backend
```bash
curl http://localhost:8001/api/products
# Should return JSON with products
```

## Common Mistakes to Avoid

❌ **Wrong:** Serving `/app/frontend` folder
✅ **Correct:** Serving `/app/frontend/build` folder

❌ **Wrong:** No .htaccess or SPA routing config
✅ **Correct:** .htaccess in build folder OR nginx try_files config

❌ **Wrong:** Forgetting to run `yarn build`
✅ **Correct:** Always build before deploying

❌ **Wrong:** Using `npm start` on server
✅ **Correct:** Use `yarn build` then serve build folder

## Development vs Production

| Environment | Command | Serves | Port |
|------------|---------|--------|------|
| Development | `yarn start` | Source files | 3000 |
| Production | Serve `build` folder | Compiled files | 80/443 |

## File Structure After Build

```
/app/frontend/
├── build/              ← SERVE THIS FOLDER
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── media/
│   └── .htaccess
├── src/               ← Don't serve this
├── public/            ← Don't serve this
└── package.json
```

## Environment Variables for Production

Update `/app/frontend/.env` BEFORE building:
```bash
REACT_APP_BACKEND_URL=https://yourdomain.com
```

Then rebuild:
```bash
yarn build
```

## Still Having Issues?

### Check 1: Is index.html in root?
```bash
cat /app/frontend/build/index.html
# Should show HTML content
```

### Check 2: Are permissions correct?
```bash
sudo chown -R www-data:www-data /app/frontend/build
sudo chmod -R 755 /app/frontend/build
```

### Check 3: Is .htaccess being read?
```bash
# Apache only - check if AllowOverride is enabled
grep -r "AllowOverride" /etc/apache2/
# Should show "AllowOverride All"
```

### Check 4: Server logs
```bash
# Apache
sudo tail -f /var/log/apache2/error.log

# Nginx  
sudo tail -f /var/log/nginx/error.log
```

## Need Help?

1. Check the full deployment guide: `/app/deployment-guide.md`
2. Verify backend is running: `sudo systemctl status durgashakti-backend`
3. Check browser console for JavaScript errors
4. Verify network requests in browser DevTools

## Quick Commands Reference

```bash
# Build app
cd /app/frontend && yarn build

# Copy to web root (Apache/Nginx)
sudo cp -r /app/frontend/build/* /var/www/html/

# Restart servers
sudo systemctl restart apache2  # OR nginx

# Check if website is working
curl http://yourdomain.com
```
