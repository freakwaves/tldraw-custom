export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
declare class Logger {
    private logLevel;
    constructor();
    private getLogLevelFromConfig;
    private formatMessage;
    private shouldLog;
    error(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    info(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    request(method: string, url: string, statusCode: number, duration: number): void;
    database(operation: string, table: string, duration: number, rows?: number): void;
    websocket(event: string, roomId: string, userId?: string): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map