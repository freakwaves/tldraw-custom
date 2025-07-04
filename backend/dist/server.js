"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const ws_1 = require("ws");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const database_1 = require("./database");
const websocket_1 = require("./websocket");
const routes_1 = require("./routes");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({
    server,
    path: '/ws',
    maxPayload: config_1.config.websocket.maxPayload,
});
let db = null;
const setupMiddleware = () => {
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', 'https://freakwav.es');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        return next();
    });
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-eval'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'", "ws:", "wss:"],
            },
        },
    }));
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: config_1.config.rateLimit.windowMs,
        max: config_1.config.rateLimit.max,
        message: config_1.config.rateLimit.message,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.method === 'OPTIONS',
    });
    app.use('/api/', limiter);
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger_1.logger.request(req.method, req.url, res.statusCode, duration);
        });
        return next();
    });
    app.get('/health', (req, res) => {
        return res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config_1.config.nodeEnv,
        });
    });
};
const initializeApp = async () => {
    try {
        db = await (0, database_1.initializeDatabase)();
        await (0, database_1.initializeSchema)(db);
        setupMiddleware();
        (0, routes_1.setupRoutes)(app, db);
        (0, websocket_1.setupWebSocketHandlers)(wss, db);
        app.use((err, req, res, next) => {
            logger_1.logger.error('Unhandled error:', err);
            return res.status(500).json({
                error: 'Internal server error',
                message: config_1.config.isDevelopment ? err.message : 'Something went wrong',
            });
        });
        app.use('*', (req, res) => {
            return res.status(404).json({
                error: 'Not found',
                message: 'The requested resource was not found',
            });
        });
        logger_1.logger.info('Application initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize application:', error);
        process.exit(1);
    }
};
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    wss.close(() => {
        logger_1.logger.info('WebSocket server closed');
    });
    if (db) {
        await db.close();
        logger_1.logger.info('Database connection closed');
    }
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => {
        logger_1.logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};
const startServer = async () => {
    await initializeApp();
    server.listen(config_1.config.port, () => {
        logger_1.logger.info(`Server running on port ${config_1.config.port} in ${config_1.config.nodeEnv} mode`);
        logger_1.logger.info(`WebSocket server available at ws://localhost:${config_1.config.port}/ws`);
        logger_1.logger.info(`Health check available at http://localhost:${config_1.config.port}/health`);
    });
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled rejection at:', { promise, reason });
    process.exit(1);
});
startServer().catch((error) => {
    logger_1.logger.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map