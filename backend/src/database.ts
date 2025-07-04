import { Pool, PoolClient } from 'pg';
import { config } from './config';
import { logger } from './utils/logger';

// Database connection pool
let pool: Pool | null = null;

export interface DatabaseConnection {
  query: (text: string, params?: any[]) => Promise<any>;
  getClient: () => Promise<PoolClient>;
  close: () => Promise<void>;
}

// Initialize database connection
export const initializeDatabase = async (): Promise<DatabaseConnection> => {
  if (pool) {
    return createDatabaseConnection(pool);
  }

  try {
    pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connection established successfully');
    return createDatabaseConnection(pool);
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

// Create database connection interface
const createDatabaseConnection = (pool: Pool): DatabaseConnection => {
  return {
    query: async (text: string, params?: any[]) => {
      const start = Date.now();
      try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
        return result;
      } catch (error) {
        logger.error('Database query error:', { text, error });
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
      await pool!.end();
      pool = null;
    },
  };
};

// Database schema initialization
export const initializeSchema = async (db: DatabaseConnection): Promise<void> => {
  try {
    // Create rooms table
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

    // Create users table
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

    // Create room_participants table
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

    // Create assets table
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

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug);
      CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
      CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
      CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_assets_room_id ON assets(room_id);
    `);

    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema:', error);
    throw error;
  }
};

// Database types
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