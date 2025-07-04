import { Express, Request, Response, NextFunction } from 'express';
import { DatabaseConnection } from './database';
import { logger } from './utils/logger';

export const setupRoutes = (app: Express, db: DatabaseConnection) => {
  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    return res.json({
      name: 'tldraw Custom Backend API',
      version: '1.0.0',
      description: 'Backend API server for custom tldraw installation',
      endpoints: {
        health: '/health',
        api: '/api',
        websocket: '/ws',
        rooms: '/api/rooms',
        users: '/api/users',
        assets: '/api/assets',
        stats: '/api/stats',
        wsInfo: '/api/ws-info'
      },
      documentation: 'API endpoints are available under /api/',
      websocket: 'WebSocket connection available at /ws'
    });
  });

  // API routes prefix
  const apiRouter = app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Rooms API
  // Handle OPTIONS for rooms endpoint
  app.options('/api/rooms', (req: Request, res: Response) => {
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).send();
  });

  app.get('/api/rooms', async (req: Request, res: Response) => {
    try {
      const { rows } = await db.query(
        'SELECT id, name, slug, created_at, updated_at, is_public, max_users FROM rooms ORDER BY updated_at DESC LIMIT 50'
      );
      return res.json({ rooms: rows });
    } catch (error) {
      logger.error('Error fetching rooms:', error);
      return res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  });

  app.post('/api/rooms', async (req: Request, res: Response) => {
    try {
      const { name, slug, isPublic = false, maxUsers = 50 } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: 'Name and slug are required' });
      }

      const { rows } = await db.query(
        'INSERT INTO rooms (name, slug, is_public, max_users) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, slug, isPublic, maxUsers]
      );

      return res.status(201).json({ room: rows[0] });
    } catch (error) {
      logger.error('Error creating room:', error);
      return res.status(500).json({ error: 'Failed to create room' });
    }
  });

  app.get('/api/rooms/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { rows } = await db.query(
        'SELECT * FROM rooms WHERE slug = $1',
        [slug]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      return res.json({ room: rows[0] });
    } catch (error) {
      logger.error('Error fetching room:', error);
      return res.status(500).json({ error: 'Failed to fetch room' });
    }
  });

  app.put('/api/rooms/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { name, data, isPublic, maxUsers } = req.body;

      const { rows } = await db.query(
        'UPDATE rooms SET name = COALESCE($1, name), data = COALESCE($2, data), is_public = COALESCE($3, is_public), max_users = COALESCE($4, max_users), updated_at = NOW() WHERE slug = $5 RETURNING *',
        [name, data, isPublic, maxUsers, slug]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      return res.json({ room: rows[0] });
    } catch (error) {
      logger.error('Error updating room:', error);
      return res.status(500).json({ error: 'Failed to update room' });
    }
  });

  app.delete('/api/rooms/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { rowCount } = await db.query(
        'DELETE FROM rooms WHERE slug = $1',
        [slug]
      );

      if (rowCount === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      return res.json({ message: 'Room deleted successfully' });
    } catch (error) {
      logger.error('Error deleting room:', error);
      return res.status(500).json({ error: 'Failed to delete room' });
    }
  });

  // Assets API
  app.post('/api/rooms/:slug/assets', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { filename, mimeType, size, data } = req.body;

      // Get room ID
      const roomResult = await db.query(
        'SELECT id FROM rooms WHERE slug = $1',
        [slug]
      );

      if (roomResult.rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const roomId = roomResult.rows[0].id;

      // Insert asset
      const { rows } = await db.query(
        'INSERT INTO assets (room_id, filename, mime_type, size, data) VALUES ($1, $2, $3, $4, $5) RETURNING id, filename, mime_type, size, created_at',
        [roomId, filename, mimeType, size, data]
      );

      return res.status(201).json({ asset: rows[0] });
    } catch (error) {
      logger.error('Error uploading asset:', error);
      return res.status(500).json({ error: 'Failed to upload asset' });
    }
  });

  app.get('/api/rooms/:slug/assets', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      const { rows } = await db.query(
        `SELECT a.id, a.filename, a.mime_type, a.size, a.created_at 
         FROM assets a 
         JOIN rooms r ON a.room_id = r.id 
         WHERE r.slug = $1 
         ORDER BY a.created_at DESC`,
        [slug]
      );

      return res.json({ assets: rows });
    } catch (error) {
      logger.error('Error fetching assets:', error);
      return res.status(500).json({ error: 'Failed to fetch assets' });
    }
  });

  app.get('/api/assets/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rows } = await db.query(
        'SELECT * FROM assets WHERE id = $1',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const asset = rows[0];
      res.setHeader('Content-Type', asset.mime_type);
      res.setHeader('Content-Length', asset.size);
      return res.send(asset.data);
    } catch (error) {
      logger.error('Error fetching asset:', error);
      return res.status(500).json({ error: 'Failed to fetch asset' });
    }
  });

  // Users API
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const { rows } = await db.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email, created_at',
        [username, email]
      );

      return res.status(201).json({ user: rows[0] });
    } catch (error) {
      logger.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rows } = await db.query(
        'SELECT id, username, email, created_at, last_login FROM users WHERE id = $1',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user: rows[0] });
    } catch (error) {
      logger.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Stats API
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const [roomsResult, usersResult, assetsResult] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM rooms'),
        db.query('SELECT COUNT(*) as count FROM users'),
        db.query('SELECT COUNT(*) as count FROM assets'),
      ]);

      return res.json({
        stats: {
          rooms: parseInt(roomsResult.rows[0].count),
          users: parseInt(usersResult.rows[0].count),
          assets: parseInt(assetsResult.rows[0].count),
        },
      });
    } catch (error) {
      logger.error('Error fetching stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // WebSocket info endpoint
  app.get('/api/ws-info', (req: Request, res: Response) => {
    return res.json({
      wsUrl: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}/ws`,
      features: {
        collaboration: true,
        persistence: true,
        realtime: true,
      },
    });
  });

  // API info endpoint
  app.get('/api', (req: Request, res: Response) => {
    return res.json({
      name: 'tldraw Custom Backend API',
      version: '1.0.0',
      description: 'Backend API server for custom tldraw installation',
      endpoints: {
        rooms: {
          list: 'GET /api/rooms',
          create: 'POST /api/rooms',
          get: 'GET /api/rooms/:slug',
          update: 'PUT /api/rooms/:slug',
          delete: 'DELETE /api/rooms/:slug'
        },
        assets: {
          upload: 'POST /api/rooms/:slug/assets',
          list: 'GET /api/rooms/:slug/assets',
          get: 'GET /api/assets/:id'
        },
        users: {
          create: 'POST /api/users',
          get: 'GET /api/users/:id'
        },
        stats: 'GET /api/stats',
        wsInfo: 'GET /api/ws-info'
      },
      websocket: 'WebSocket connection available at /ws'
    });
  });
}; 