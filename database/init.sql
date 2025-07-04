-- tldraw Database Initialization Script
-- This script sets up the database schema for the tldraw application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    is_public BOOLEAN DEFAULT false,
    max_users INTEGER DEFAULT 50
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create room_participants table
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, user_id)
);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    data BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_rooms_updated_at ON rooms(updated_at);
CREATE INDEX IF NOT EXISTS idx_rooms_is_public ON rooms(is_public);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_joined_at ON room_participants(joined_at);

CREATE INDEX IF NOT EXISTS idx_assets_room_id ON assets(room_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_mime_type ON assets(mime_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete rooms older than 30 days that are not public
    DELETE FROM rooms 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_public = false;
    
    -- Delete assets older than 90 days
    DELETE FROM assets 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up room participants where left_at is set
    DELETE FROM room_participants 
    WHERE left_at IS NOT NULL 
    AND left_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO rooms (name, slug, is_public, max_users) VALUES
    ('Welcome Room', 'welcome', true, 50),
    ('Sample Drawing', 'sample', false, 10)
ON CONFLICT (slug) DO NOTHING;

-- Create a view for room statistics
CREATE OR REPLACE VIEW room_stats AS
SELECT 
    r.id,
    r.name,
    r.slug,
    r.is_public,
    r.max_users,
    COUNT(rp.id) as current_participants,
    COUNT(a.id) as asset_count,
    r.created_at,
    r.updated_at
FROM rooms r
LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.left_at IS NULL
LEFT JOIN assets a ON r.id = a.room_id
GROUP BY r.id, r.name, r.slug, r.is_public, r.max_users, r.created_at, r.updated_at;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tldraw_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tldraw_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tldraw_user; 