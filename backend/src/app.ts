import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { setupWebSocketHandlers } from './websocket';
import { DatabaseConnection } from './database';
import { logger } from './utils/logger';
import { config } from './config';

// Import routes
import roomsRouter from './routes/rooms';
import assetsRouter from './routes/assets';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://esm.sh"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes except OPTIONS
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    next();
  } else {
    limiter(req, res, next);
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for assets
app.use('/assets', express.static('public/assets'));

// API routes
app.use('/api/rooms', roomsRouter);
app.use('/api/assets', assetsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  logger.error('Unhandled error:', err);
  
  if (err.type === 'entity.too.large') {
    res.status(413).json({
      error: 'Request entity too large',
      message: 'The uploaded file exceeds the maximum allowed size.',
    });
    return;
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: config.isDevelopment ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found.',
  });
});

export { app }; 