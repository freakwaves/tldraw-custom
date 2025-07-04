# Custom tldraw Installation

This project sets up a custom tldraw installation with:
- **Backend services** hosted on Render.com (free tier)
- **Frontend** served through Bluehost web hosting
- **PostgreSQL database** for data persistence
- **Redis** for caching and sessions

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Bluehost      │    │   Render.com    │    │   Render.com    │
│   (Frontend)    │◄──►│   (API Server)  │◄──►│   (Database)    │
│                 │    │                 │    │                 │
│ - Static files  │    │ - tldraw API    │    │ - PostgreSQL    │
│ - Custom UI     │    │ - WebSocket     │    │ - Redis         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Project Structure

```
StreamOverlay/
├── backend/                 # Render.com deployment
│   ├── src/
│   │   ├── server.ts       # Main API server
│   │   ├── database.ts     # Database connection
│   │   └── config.ts       # Configuration
│   ├── package.json
│   ├── render.yaml         # Render.com configuration
│   └── Dockerfile
├── frontend/               # Bluehost deployment
│   ├── public/
│   │   ├── index.html
│   │   ├── assets/
│   │   └── config.js
│   └── README.md
├── database/               # Database setup
│   ├── init.sql
│   └── migrations/
└── README.md
```

## Setup Instructions

### 1. Render.com Setup

1. **Create PostgreSQL Database:**
   - Go to Render.com dashboard
   - Create new PostgreSQL service
   - Note the connection details

2. **Create Redis Instance:**
   - Create new Redis service
   - Note the connection details

3. **Deploy API Server:**
   - Connect your GitHub repository
   - Deploy the `backend/` directory
   - Set environment variables

### 2. Bluehost Setup

1. **Upload Frontend Files:**
   - Upload `frontend/public/` contents to your Bluehost public_html
   - Update `config.js` with your Render.com API URL

2. **Configure Domain:**
   - Point your domain to the Bluehost hosting
   - Ensure CORS is properly configured

## Environment Variables

### Backend (Render.com)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://yourdomain.com
```

### Frontend (Bluehost)
```javascript
// config.js
window.TLDRAW_CONFIG = {
  apiUrl: 'https://your-render-app.onrender.com',
  // other configuration
};
```

## Development

### Local Development
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
# Serve with any static file server
```

### Production Deployment
1. Push changes to GitHub
2. Render.com will auto-deploy backend changes
3. Manually upload frontend changes to Bluehost

## Features

- ✅ Real-time collaboration
- ✅ Custom branding
- ✅ Database persistence
- ✅ Session management
- ✅ CORS configuration
- ✅ Production-ready setup

## Troubleshooting

### Common Issues
1. **CORS errors**: Check CORS_ORIGIN in backend config
2. **Database connection**: Verify DATABASE_URL in Render.com
3. **WebSocket issues**: Ensure proper proxy configuration

### Support
- Check Render.com logs for backend issues
- Verify Bluehost file permissions for frontend
- Test API endpoints directly

## License

MIT License - see LICENSE file for details 