# Complete Deployment Guide

This guide walks you through deploying your custom tldraw installation on Render.com (backend) and Bluehost (frontend).

## Prerequisites

- Render.com free account
- Bluehost hosting account
- Domain name (optional but recommended)
- Git repository (GitHub, GitLab, etc.)

## Step 1: Prepare Your Repository

1. **Push to Git**:
   ```bash
   git init
   git add .
   git commit -m "Initial tldraw setup"
   git remote add origin https://github.com/yourusername/tldraw-custom.git
   git push -u origin main
   ```

2. **Verify Structure**:
   ```
   StreamOverlay/
   ├── backend/           # Render.com deployment
   ├── frontend/          # Bluehost deployment
   ├── database/          # Database setup
   └── README.md
   ```

## Step 2: Deploy Backend on Render.com

### 2.1 Create PostgreSQL Database

1. **Log into Render.com**
2. **Create New → PostgreSQL**
3. **Configure**:
   - Name: `tldraw-db`
   - Database: `tldraw`
   - User: `tldraw_user`
   - Plan: Free
4. **Note the connection details**

### 2.2 Create Redis Instance

1. **Create New → Redis**
2. **Configure**:
   - Name: `tldraw-redis`
   - Plan: Free
   - Max Memory Policy: `allkeys-lru`
3. **Note the connection details**

### 2.3 Deploy Web Service

1. **Create New → Web Service**
2. **Connect your Git repository**
3. **Configure**:
   - Name: `tldraw-api`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Free

### 2.4 Set Environment Variables

In your Render.com web service, add these environment variables:

```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
DATABASE_URL=postgresql://... (from your PostgreSQL service)
REDIS_URL=redis://... (from your Redis service)
```

### 2.5 Deploy

1. **Click "Create Web Service"**
2. **Wait for deployment** (5-10 minutes)
3. **Note your service URL** (e.g., `https://tldraw-api.onrender.com`)

## Step 3: Deploy Frontend on Bluehost

### 3.1 Prepare Frontend Files

1. **Update Configuration**:
   - Open `frontend/public/config.js`
   - Update `apiUrl` to your Render.com service URL:
   ```javascript
   apiUrl: 'https://tldraw-api.onrender.com'
   ```

2. **Customize Branding** (Optional):
   - Edit `frontend/public/index.html` title
   - Modify colors in `frontend/public/assets/styles.css`

### 3.2 Upload to Bluehost

1. **Log into Bluehost Control Panel**
2. **Open File Manager**
3. **Navigate to `public_html`**
4. **Upload all files from `frontend/public/`**
5. **Set permissions**:
   - Files: 644
   - Directories: 755

### 3.3 Configure Domain

1. **Point domain to Bluehost** (if using custom domain)
2. **Enable HTTPS** (required for WebSocket)
3. **Test the application**

## Step 4: Test Your Deployment

### 4.1 Backend Testing

Test your Render.com backend:

```bash
# Health check
curl https://your-app.onrender.com/health

# Test API endpoints
curl https://your-app.onrender.com/api/stats
curl https://your-app.onrender.com/api/ws-info
```

### 4.2 Frontend Testing

1. **Visit your Bluehost domain**
2. **Test room creation**
3. **Test room joining**
4. **Test real-time collaboration**
5. **Test WebSocket connection**

### 4.3 Database Testing

1. **Check Render.com logs** for database connection
2. **Verify tables were created**:
   ```sql
   \dt  -- List tables
   SELECT * FROM rooms;  -- Check sample data
   ```

## Step 5: Troubleshooting

### Common Issues

#### Backend Issues

1. **Build Failures**:
   - Check Render.com build logs
   - Verify `package.json` dependencies
   - Ensure TypeScript compilation works

2. **Database Connection**:
   - Verify `DATABASE_URL` environment variable
   - Check PostgreSQL service is running
   - Test connection manually

3. **WebSocket Issues**:
   - Verify WebSocket endpoint is accessible
   - Check CORS configuration
   - Test with WebSocket client

#### Frontend Issues

1. **CORS Errors**:
   - Update `CORS_ORIGIN` in backend
   - Include your Bluehost domain
   - Test with browser developer tools

2. **API Connection**:
   - Verify `apiUrl` in `config.js`
   - Test API endpoints directly
   - Check network tab in browser

3. **WebSocket Connection**:
   - Ensure HTTPS is enabled
   - Verify WebSocket URL generation
   - Test WebSocket connection

### Debug Commands

```bash
# Test backend health
curl -v https://your-app.onrender.com/health

# Test WebSocket
wscat -c wss://your-app.onrender.com/ws

# Test database connection
psql $DATABASE_URL -c "SELECT version();"
```

## Step 6: Production Optimization

### Backend Optimization

1. **Enable Caching**:
   - Configure Redis caching
   - Implement response caching
   - Cache database queries

2. **Monitor Performance**:
   - Use Render.com metrics
   - Monitor database performance
   - Track API response times

3. **Security**:
   - Enable rate limiting
   - Implement proper authentication
   - Use HTTPS everywhere

### Frontend Optimization

1. **Performance**:
   - Enable GZIP compression
   - Minify CSS/JS files
   - Use CDN for static assets

2. **Caching**:
   - Set cache headers
   - Use browser caching
   - Implement service workers

3. **Monitoring**:
   - Add error tracking
   - Monitor user experience
   - Track performance metrics

## Step 7: Maintenance

### Regular Tasks

1. **Monitor Logs**:
   - Check Render.com logs weekly
   - Monitor error rates
   - Review performance metrics

2. **Database Maintenance**:
   - Run cleanup procedures
   - Monitor storage usage
   - Backup important data

3. **Security Updates**:
   - Update dependencies
   - Review security patches
   - Monitor for vulnerabilities

### Scaling Considerations

1. **Free Tier Limits**:
   - Render.com: 750 hours/month
   - PostgreSQL: 1GB storage
   - Redis: 25MB storage

2. **Upgrade Path**:
   - Consider paid plans for more resources
   - Implement proper monitoring
   - Plan for user growth

## Support Resources

- **Render.com Documentation**: https://render.com/docs
- **Bluehost Support**: https://www.bluehost.com/help
- **tldraw Documentation**: https://tldraw.dev/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

## Next Steps

1. **Customize the UI** to match your brand
2. **Add authentication** if needed
3. **Implement additional features**
4. **Set up monitoring and alerts**
5. **Plan for scaling**

---

**Need Help?** Check the troubleshooting section or refer to the individual README files in each directory. 