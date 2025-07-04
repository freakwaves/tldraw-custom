import { Router, Request, Response } from 'express';
import { DatabaseConnection } from '../database';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

// Get all rooms
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db as DatabaseConnection;
    const result = await db.query(
      'SELECT id, name, slug, max_users, is_public, created_at, updated_at FROM rooms ORDER BY updated_at DESC LIMIT 50'
    );
    
    res.json({
      success: true,
      rooms: result.rows
    });
  } catch (error) {
    logger.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Create a new room
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, maxUsers = config.tldraw.maxUsersPerRoom, isPublic = false } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Room name is required' });
      return;
    }
    
    const db = req.app.locals.db as DatabaseConnection;
    
    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug exists and generate unique one
    while (true) {
      const existingRoom = await db.query('SELECT id FROM rooms WHERE slug = $1', [slug]);
      if (existingRoom.rows.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    const result = await db.query(
      'INSERT INTO rooms (name, slug, max_users, is_public) VALUES ($1, $2, $3, $4) RETURNING id, name, slug, max_users, is_public, created_at',
      [name.trim(), slug, maxUsers, isPublic]
    );
    
    const room = result.rows[0];
    
    logger.info('Room created successfully', { roomId: room.id, slug: room.slug });
    
    res.status(201).json({
      success: true,
      room: room
    });
    
  } catch (error) {
    logger.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get a specific room
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const db = req.app.locals.db as DatabaseConnection;
    const result = await db.query(
      'SELECT id, name, slug, max_users, is_public, data, created_at, updated_at FROM rooms WHERE slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    const room = result.rows[0];
    
    res.json({
      success: true,
      room: room
    });
    
  } catch (error) {
    logger.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Update room settings
router.put('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { name, maxUsers, isPublic } = req.body;
    
    const db = req.app.locals.db as DatabaseConnection;
    
    // Check if room exists
    const existingRoom = await db.query('SELECT id FROM rooms WHERE slug = $1', [slug]);
    if (existingRoom.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    
    if (maxUsers !== undefined) {
      updates.push(`max_users = $${paramCount++}`);
      values.push(maxUsers);
    }
    
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(isPublic);
    }
    
    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }
    
    values.push(slug);
    const result = await db.query(
      `UPDATE rooms SET ${updates.join(', ')}, updated_at = NOW() WHERE slug = $${paramCount} RETURNING id, name, slug, max_users, is_public, updated_at`,
      values
    );
    
    const room = result.rows[0];
    
    logger.info('Room updated successfully', { roomId: room.id, slug: room.slug });
    
    res.json({
      success: true,
      room: room
    });
    
  } catch (error) {
    logger.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Delete a room
router.delete('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const db = req.app.locals.db as DatabaseConnection;
    const result = await db.query('DELETE FROM rooms WHERE slug = $1 RETURNING id', [slug]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    logger.info('Room deleted successfully', { roomId: result.rows[0].id, slug });
    
    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
    
  } catch (error) {
    logger.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

export default router; 