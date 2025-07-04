import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
});

// Validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  // Server configuration
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  
  // Database configuration
  database: {
    url: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  
  // Redis configuration
  redis: {
    url: env.REDIS_URL,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },
  
  // Security configuration
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: '7d',
    refreshExpiresIn: '30d',
  },
  
  // CORS configuration
  cors: {
    origin: env.CORS_ORIGIN ? 
      env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
      ['https://freakwav.es', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
  },
  
  // Logging
  logLevel: env.LOG_LEVEL,
  
  // tldraw specific configuration
  tldraw: {
    // Room configuration
    maxRoomsPerUser: 10,
    maxUsersPerRoom: 50,
    roomTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    
    // Asset configuration
    maxAssetSize: 10 * 1024 * 1024, // 10MB
    allowedAssetTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // Collaboration settings
    enableCollaboration: true,
    enablePersistence: true,
    enableVersioning: true,
  },
  
  // WebSocket configuration
  websocket: {
    pingInterval: 25000,
    pingTimeout: 5000,
    maxPayload: 1024 * 1024, // 1MB
  },
} as const;

export type Config = typeof config; 