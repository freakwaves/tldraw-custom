"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
const config_1 = require("../config");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.logLevel = this.getLogLevelFromConfig();
    }
    getLogLevelFromConfig() {
        switch (config_1.config.logLevel) {
            case 'error':
                return LogLevel.ERROR;
            case 'warn':
                return LogLevel.WARN;
            case 'info':
                return LogLevel.INFO;
            case 'debug':
                return LogLevel.DEBUG;
            default:
                return LogLevel.INFO;
        }
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const dataString = data ? ` ${JSON.stringify(data)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${dataString}`;
    }
    shouldLog(level) {
        return level <= this.logLevel;
    }
    error(message, data) {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatMessage('error', message, data));
        }
    }
    warn(message, data) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage('warn', message, data));
        }
    }
    info(message, data) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.formatMessage('info', message, data));
        }
    }
    debug(message, data) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.formatMessage('debug', message, data));
        }
    }
    request(method, url, statusCode, duration) {
        this.info('HTTP Request', {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
        });
    }
    database(operation, table, duration, rows) {
        this.debug('Database Operation', {
            operation,
            table,
            duration: `${duration}ms`,
            rows,
        });
    }
    websocket(event, roomId, userId) {
        this.debug('WebSocket Event', {
            event,
            roomId,
            userId,
        });
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map