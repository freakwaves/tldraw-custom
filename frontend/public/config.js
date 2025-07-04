// tldraw Frontend Configuration
window.TLDRAW_CONFIG = {
  // Backend API URL (Update this with your Render.com app URL)
  apiUrl: 'https://tldraw-custom.onrender.com', // Your actual Render.com URL
  
  // WebSocket URL (Will be auto-generated from apiUrl)
  wsUrl: null, // Will be set dynamically
  
  // App Configuration
  app: {
    name: 'Custom tldraw',
    version: '1.0.0',
    description: 'Collaborative drawing and whiteboarding',
  },
  
  // tldraw Configuration
  tldraw: {
    // Default room settings
    defaultRoomName: 'New Drawing',
    defaultMaxUsers: 10,
    defaultPublic: false,
    
    // UI Configuration
    showMenu: true,
    showPages: true,
    showStyles: true,
    showUI: true,
    showZoom: true,
    showGrid: true,
    
    // Collaboration settings
    enableCollaboration: true,
    enablePersistence: true,
    enableVersioning: true,
    
    // Drawing settings
    defaultColor: '#000000',
    defaultSize: 2,
    defaultStyle: 'draw',
    
    // Asset settings
    maxAssetSize: 10 * 1024 * 1024, // 10MB
    allowedAssetTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  
  // UI Theme
  theme: {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
  },
  
  // Feature flags
  features: {
    roomCreation: true,
    roomJoining: true,
    roomSettings: true,
    userManagement: true,
    assetUpload: true,
    export: true,
    import: true,
    sharing: true,
  },
  
  // Analytics (optional)
  analytics: {
    enabled: false,
    provider: 'none', // 'google', 'plausible', 'none'
    trackingId: null,
  },
  
  // Error reporting
  errorReporting: {
    enabled: false,
    provider: 'none', // 'sentry', 'rollbar', 'none'
    dsn: null,
  },
};

// Auto-generate WebSocket URL from API URL
window.TLDRAW_CONFIG.wsUrl = window.TLDRAW_CONFIG.apiUrl.replace(/^https?/, 'ws');

// Environment detection
window.TLDRAW_CONFIG.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.TLDRAW_CONFIG.isProduction = !window.TLDRAW_CONFIG.isDevelopment;

// Log configuration in development
if (window.TLDRAW_CONFIG.isDevelopment) {
  console.log('tldraw Configuration:', window.TLDRAW_CONFIG);
} 