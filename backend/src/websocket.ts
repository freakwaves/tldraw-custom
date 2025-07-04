import { WebSocketServer, WebSocket } from 'ws';
import { DatabaseConnection } from './database';
import { logger } from './utils/logger';
import { config } from './config';

interface WebSocketMessage {
  type: string;
  roomId: string;
  userId?: string;
  data?: any;
}

interface RoomConnection {
  ws: WebSocket;
  userId: string;
  roomId: string;
  joinedAt: Date;
}

// Store active connections by room
const roomConnections = new Map<string, RoomConnection[]>();

export const setupWebSocketHandlers = (wss: WebSocketServer, db: DatabaseConnection) => {
  wss.on('connection', (ws: WebSocket, request) => {
    logger.info('WebSocket connection established', { 
      ip: request.socket.remoteAddress,
      userAgent: request.headers['user-agent']
    });

    let currentRoom: string | null = null;
    let currentUser: string | null = null;

    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        logger.debug('WebSocket message received', { type: message.type, roomId: message.roomId });

        switch (message.type) {
          case 'join_room':
            await handleJoinRoom(ws, message, db);
            break;
          
          case 'leave_room':
            await handleLeaveRoom(ws, message);
            break;
          
          case 'tldraw_update':
            await handleTldrawUpdate(ws, message, db);
            break;
          
          case 'user_activity':
            await handleUserActivity(ws, message);
            break;
          
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          
          default:
            logger.warn('Unknown WebSocket message type', { type: message.type });
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown message type' 
            }));
        }
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    // Handle connection close
    ws.on('close', async () => {
      if (currentRoom && currentUser) {
        await handleLeaveRoom(ws, { 
          type: 'leave_room', 
          roomId: currentRoom, 
          userId: currentUser 
        });
      }
      logger.info('WebSocket connection closed');
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to tldraw collaboration server',
      features: {
        collaboration: config.tldraw.enableCollaboration,
        persistence: config.tldraw.enablePersistence,
        realtime: true,
      },
    }));
  });

  // Set up ping/pong for connection health
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, config.websocket.pingInterval);
};

// Handle room joining
const handleJoinRoom = async (ws: WebSocket, message: WebSocketMessage, db: DatabaseConnection) => {
  const { roomId, userId } = message;
  
  try {
    // Verify room exists
    const roomResult = await db.query(
      'SELECT id, name, max_users FROM rooms WHERE slug = $1',
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room not found'
      }));
      return;
    }

    const room = roomResult.rows[0];
    const currentConnections = roomConnections.get(roomId) || [];

    // Check room capacity
    if (currentConnections.length >= room.max_users) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room is at maximum capacity'
      }));
      return;
    }

    // Add connection to room
    const connection: RoomConnection = {
      ws,
      userId: userId || 'anonymous',
      roomId,
      joinedAt: new Date(),
    };

    roomConnections.set(roomId, [...currentConnections, connection]);

    // Notify other users in the room
    broadcastToRoom(roomId, {
      type: 'user_joined',
      userId: connection.userId,
      timestamp: Date.now(),
    }, ws);

    // Send room info to the joining user
    ws.send(JSON.stringify({
      type: 'room_joined',
      roomId,
      roomName: room.name,
      participants: currentConnections.map(c => c.userId),
      timestamp: Date.now(),
    }));

    logger.info('User joined room', { roomId, userId: connection.userId });

  } catch (error) {
    logger.error('Error joining room:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join room'
    }));
  }
};

// Handle room leaving
const handleLeaveRoom = async (ws: WebSocket, message: WebSocketMessage) => {
  const { roomId, userId } = message;
  
  const currentConnections = roomConnections.get(roomId) || [];
  const updatedConnections = currentConnections.filter(c => c.ws !== ws);
  
  roomConnections.set(roomId, updatedConnections);

  // Notify other users
  broadcastToRoom(roomId, {
    type: 'user_left',
    userId: userId || 'anonymous',
    timestamp: Date.now(),
  }, ws);

  logger.info('User left room', { roomId, userId });
};

// Handle tldraw updates
const handleTldrawUpdate = async (ws: WebSocket, message: WebSocketMessage, db: DatabaseConnection) => {
  const { roomId, data } = message;
  
  try {
    // Save to database if persistence is enabled
    if (config.tldraw.enablePersistence && data) {
      await db.query(
        'UPDATE rooms SET data = $1, updated_at = NOW() WHERE slug = $2',
        [JSON.stringify(data), roomId]
      );
    }

    // Broadcast to other users in the room
    broadcastToRoom(roomId, {
      type: 'tldraw_update',
      data,
      timestamp: Date.now(),
    }, ws);

    logger.debug('tldraw update broadcasted', { roomId });

  } catch (error) {
    logger.error('Error handling tldraw update:', error);
  }
};

// Handle user activity
const handleUserActivity = async (ws: WebSocket, message: WebSocketMessage) => {
  const { roomId, userId, data } = message;
  
  // Broadcast activity to other users in the room
  broadcastToRoom(roomId, {
    type: 'user_activity',
    userId,
    data,
    timestamp: Date.now(),
  }, ws);
};

// Broadcast message to all users in a room except the sender
const broadcastToRoom = (roomId: string, message: any, excludeWs?: WebSocket) => {
  const connections = roomConnections.get(roomId) || [];
  
  connections.forEach(connection => {
    if (connection.ws !== excludeWs && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  });
};

// Get room statistics
export const getRoomStats = () => {
  const stats = {
    totalRooms: roomConnections.size,
    totalConnections: 0,
    rooms: [] as any[],
  };

  roomConnections.forEach((connections, roomId) => {
    stats.totalConnections += connections.length;
    stats.rooms.push({
      roomId,
      connectionCount: connections.length,
      users: connections.map(c => c.userId),
    });
  });

  return stats;
}; 