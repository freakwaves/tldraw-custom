import { PoolClient } from 'pg';
export interface DatabaseConnection {
    query: (text: string, params?: any[]) => Promise<any>;
    getClient: () => Promise<PoolClient>;
    close: () => Promise<void>;
}
export declare const initializeDatabase: () => Promise<DatabaseConnection>;
export declare const initializeSchema: (db: DatabaseConnection) => Promise<void>;
export interface Room {
    id: string;
    name: string;
    slug: string;
    data?: any;
    created_at: Date;
    updated_at: Date;
    created_by?: string;
    is_public: boolean;
    max_users: number;
}
export interface User {
    id: string;
    username: string;
    email?: string;
    password_hash?: string;
    created_at: Date;
    updated_at: Date;
    last_login?: Date;
}
export interface RoomParticipant {
    id: string;
    room_id: string;
    user_id: string;
    joined_at: Date;
    left_at?: Date;
}
export interface Asset {
    id: string;
    room_id: string;
    filename: string;
    mime_type: string;
    size: number;
    data?: Buffer;
    created_at: Date;
    created_by?: string;
}
//# sourceMappingURL=database.d.ts.map