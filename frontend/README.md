# tldraw Frontend - Bluehost Deployment

This directory contains the frontend files for the custom tldraw installation that will be deployed on Bluehost.

## Files Structure

```
frontend/
├── public/
│   ├── index.html          # Main HTML file
│   ├── config.js           # Configuration file
│   └── assets/
│       ├── styles.css      # Custom styles
│       └── app.js          # Main application logic
└── README.md               # This file
```

## Deployment Instructions

### 1. Prepare Files for Upload

1. **Update Configuration**: 
   - Open `public/config.js`
   - Update the `apiUrl` to point to your Render.com backend URL
   - Example: `apiUrl: 'https://your-app-name.onrender.com'`

2. **Customize Branding** (Optional):
   - Edit `public/index.html` to change the title and branding
   - Modify `public/assets/styles.css` to customize colors and styling
   - Update the favicon in `public/assets/favicon.svg`

### 2. Upload to Bluehost

1. **Access Bluehost File Manager**:
   - Log into your Bluehost control panel
   - Navigate to File Manager
   - Go to `public_html` directory

2. **Upload Files**:
   - Upload all contents of the `public/` folder to your `public_html/`
   - Ensure the file structure is maintained:
     ```
     public_html/
     ├── index.html
     ├── config.js
     └── assets/
         ├── styles.css
         └── app.js
     ```

3. **Set Permissions**:
   - Set all files to 644 permissions
   - Set all directories to 755 permissions

### 3. Configure Domain

1. **Point Domain to Bluehost**:
   - Ensure your domain is pointing to Bluehost nameservers
   - Wait for DNS propagation (can take up to 48 hours)

2. **Test the Application**:
   - Visit your domain to ensure the application loads
   - Test creating and joining rooms
   - Verify WebSocket connections work

## Configuration Options

### Backend Connection

Update the `apiUrl` in `config.js`:

```javascript
window.TLDRAW_CONFIG = {
  apiUrl: 'https://your-render-app.onrender.com',
  // ... other config
};
```

### Custom Styling

Modify `assets/styles.css` to customize:

- Colors and themes
- Layout and spacing
- Typography
- Responsive design

### Feature Flags

Control which features are enabled in `config.js`:

```javascript
features: {
  roomCreation: true,
  roomJoining: true,
  roomSettings: true,
  userManagement: true,
  assetUpload: true,
  export: true,
  import: true,
  sharing: true,
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure your Render.com backend has the correct CORS configuration
   - Check that `CORS_ORIGIN` includes your Bluehost domain

2. **WebSocket Connection Failed**:
   - Verify the WebSocket URL is correct
   - Check that your Render.com app supports WebSocket connections
   - Ensure your domain uses HTTPS (WebSocket requires secure connection)

3. **Assets Not Loading**:
   - Check file permissions on Bluehost
   - Verify file paths are correct
   - Clear browser cache

4. **Room Creation/Joining Fails**:
   - Check browser console for API errors
   - Verify backend API endpoints are working
   - Test API endpoints directly using curl or Postman

### Debug Mode

Enable debug logging by adding this to your browser console:

```javascript
localStorage.setItem('tldraw_debug', 'true');
```

### Testing

1. **Local Testing**:
   - Serve files locally using a static file server
   - Test with your Render.com backend

2. **Production Testing**:
   - Test on different browsers
   - Test on mobile devices
   - Verify all features work as expected

## Security Considerations

1. **HTTPS Only**:
   - Ensure your Bluehost domain uses HTTPS
   - WebSocket connections require secure connections

2. **Content Security Policy**:
   - The application includes basic CSP headers
   - Adjust as needed for your specific requirements

3. **API Security**:
   - Backend API should validate all requests
   - Implement rate limiting on the backend
   - Use proper authentication if needed

## Performance Optimization

1. **File Compression**:
   - Enable GZIP compression on Bluehost
   - Minify CSS and JavaScript files

2. **Caching**:
   - Set appropriate cache headers for static assets
   - Use browser caching for better performance

3. **CDN** (Optional):
   - Consider using a CDN for better global performance
   - Cloudflare is a popular free option

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify your Render.com backend is running
3. Test API endpoints directly
4. Check Bluehost error logs
5. Ensure all configuration is correct

## Updates

To update the application:

1. Download the latest files
2. Update `config.js` with your current settings
3. Upload new files to Bluehost
4. Clear browser cache
5. Test all functionality 