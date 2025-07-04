"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
const rooms_1 = __importDefault(require("./routes/rooms"));
const assets_1 = __importDefault(require("./routes/assets"));
const app = (0, express_1.default)();
exports.app = app;
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: config_1.config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.max,
    message: {
        error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        next();
    }
    else {
        limiter(req, res, next);
    }
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/assets', express_1.default.static('public/assets'));
app.use('/api/rooms', rooms_1.default);
app.use('/api/assets', assets_1.default);
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error:', err);
    if (err.type === 'entity.too.large') {
        res.status(413).json({
            error: 'Request entity too large',
            message: 'The uploaded file exceeds the maximum allowed size.',
        });
        return;
    }
    res.status(500).json({
        error: 'Internal server error',
        message: config_1.config.isDevelopment ? err.message : 'Something went wrong',
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The requested resource was not found.',
    });
});
//# sourceMappingURL=app.js.map