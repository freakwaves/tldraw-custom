export declare const config: {
    readonly port: number;
    readonly nodeEnv: "development" | "production" | "test";
    readonly isProduction: boolean;
    readonly isDevelopment: boolean;
    readonly baseUrl: string;
    readonly database: {
        readonly url: string;
        readonly ssl: false | {
            rejectUnauthorized: boolean;
        };
    };
    readonly redis: {
        readonly url: string;
        readonly retryDelayOnFailover: 100;
        readonly maxRetriesPerRequest: 3;
    };
    readonly jwt: {
        readonly secret: string;
        readonly expiresIn: "7d";
        readonly refreshExpiresIn: "30d";
    };
    readonly cors: {
        readonly origin: string[];
        readonly credentials: true;
        readonly methods: readonly ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
        readonly allowedHeaders: readonly ["Content-Type", "Authorization", "X-Requested-With"];
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly max: number;
        readonly message: "Too many requests from this IP, please try again later.";
    };
    readonly logLevel: "error" | "warn" | "info" | "debug";
    readonly tldraw: {
        readonly maxRoomsPerUser: 10;
        readonly maxUsersPerRoom: 50;
        readonly roomTimeout: number;
        readonly maxAssetSize: number;
        readonly allowedAssetTypes: readonly ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "video/mp4", "video/webm", "application/pdf"];
        readonly enableCollaboration: true;
        readonly enablePersistence: true;
        readonly enableVersioning: true;
    };
    readonly websocket: {
        readonly pingInterval: 25000;
        readonly pingTimeout: 5000;
        readonly maxPayload: number;
    };
};
export type Config = typeof config;
//# sourceMappingURL=config.d.ts.map