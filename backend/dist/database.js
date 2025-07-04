"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSchema = exports.initializeDatabase = void 0;
const pg_1 = require("pg");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
let pool = null;
const initializeDatabase = async () => {
    if (pool) {
        return createDatabaseConnection(pool);
    }
    try {
        pool = new pg_1.Pool({
            connectionString: config_1.config.database.url,
            ssl: config_1.config.database.ssl,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        logger_1.logger.info('Database connection established successfully');
        return createDatabaseConnection(pool);
    }
    catch (error) {
        logger_1.logger.error('Failed to connect to database:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
const createDatabaseConnection = (pool) => {
    return {
        query: async (text, params) => {
            if (!pool)
                throw new Error('Database pool not initialized');
            const start = Date.now();
            try {
                const result = await pool.query(text, params);
                const duration = Date.now() - start;
                logger_1.logger.debug('Executed query', { text, duration, rows: result.rowCount });
                return result;
            }
            catch (error) {
                logger_1.logger.error('Database query error:', { text, error });
                throw error;
            }
        },
        getClient: async () => {
            if (!pool) {
                throw new Error('Database pool not initialized');
            }
            return await pool.connect();
        },
        close: async () => {
            if (pool) {
                await pool.end();
                pool = null;
            }
        },
    };
};
const initializeSchema = async (db) => {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID,
        is_public BOOLEAN DEFAULT false,
        max_users INTEGER DEFAULT 50
      )
    `);
        await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);
        await db.query(`
      CREATE TABLE IF NOT EXISTS room_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        left_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(room_id, user_id)
      )
    `);
        await db.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        data BYTEA,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES users(id)
      )
    `);
        await db.query(`
      CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug);
      CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
      CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
      CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_assets_room_id ON assets(room_id);
    `);
        logger_1.logger.info('Database schema initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize database schema:', error);
        throw error;
    }
};
exports.initializeSchema = initializeSchema;
//# sourceMappingURL=database.js.map