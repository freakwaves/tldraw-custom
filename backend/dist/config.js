"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3000'),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(32),
    CORS_ORIGIN: zod_1.z.string().optional(),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default('100'),
});
const env = envSchema.parse(process.env);
exports.config = {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    baseUrl: env.NODE_ENV === 'production'
        ? 'https://tldraw-custom.onrender.com'
        : `http://localhost:${env.PORT}`,
    database: {
        url: env.DATABASE_URL,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },
    redis: {
        url: env.REDIS_URL,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
    },
    jwt: {
        secret: env.JWT_SECRET,
        expiresIn: '7d',
        refreshExpiresIn: '30d',
    },
    cors: {
        origin: env.CORS_ORIGIN ?
            env.CORS_ORIGIN.split(',').map(origin => origin.trim()) :
            ['https://freakwav.es', 'http://localhost:3000', '*'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX_REQUESTS,
        message: 'Too many requests from this IP, please try again later.',
    },
    logLevel: env.LOG_LEVEL,
    tldraw: {
        maxRoomsPerUser: 10,
        maxUsersPerRoom: 50,
        roomTimeout: 24 * 60 * 60 * 1000,
        maxAssetSize: 10 * 1024 * 1024,
        allowedAssetTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf'],
        enableCollaboration: true,
        enablePersistence: true,
        enableVersioning: true,
    },
    websocket: {
        pingInterval: 25000,
        pingTimeout: 5000,
        maxPayload: 1024 * 1024,
    },
};
//# sourceMappingURL=config.js.map