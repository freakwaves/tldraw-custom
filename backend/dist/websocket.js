"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoomStats = exports.setupWebSocketHandlers = void 0;
const ws_1 = require("ws");
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
const roomConnections = new Map();
const tldrawSyncRooms = new Map();
const setupWebSocketHandlers = (wss, db) => {
    wss.on('connection', (ws, request) => {
        logger_1.logger.info('WebSocket connection established', {
            ip: request.socket.remoteAddress,
            userAgent: request.headers['user-agent']
        });
        let currentRoom = null;
        let currentUser = null;
        let isTldrawSync = false;
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                logger_1.logger.debug('WebSocket message received', { type: message.type, roomId: message.roomId });
                if (message.type === 'sync_join' || message.type === 'sync_update') {
                    isTldrawSync = true;
                    await handleTldrawSyncMessage(ws, message, db);
                    return;
                }
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
                        logger_1.logger.warn('Unknown WebSocket message type', { type: message.type });
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Unknown message type'
                        }));
                }
            }
            catch (error) {
                logger_1.logger.error('Error handling WebSocket message:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format'
                }));
            }
        });
        ws.on('close', async () => {
            if (isTldrawSync && currentRoom) {
                handleTldrawSyncDisconnect(currentRoom, ws);
            }
            else if (currentRoom && currentUser) {
                await handleLeaveRoom(ws, {
                    type: 'leave_room',
                    roomId: currentRoom,
                    userId: currentUser
                });
            }
            logger_1.logger.info('WebSocket connection closed');
        });
        ws.on('error', (error) => {
            logger_1.logger.error('WebSocket error:', error);
        });
        ws.send(JSON.stringify({
            type: 'welcome',
            message: 'Connected to tldraw collaboration server',
            features: {
                collaboration: config_1.config.tldraw.enableCollaboration,
                persistence: config_1.config.tldraw.enablePersistence,
                realtime: true,
                tldrawSync: true,
            },
        }));
    });
    setInterval(() => {
        wss.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.ping();
            }
        });
    }, config_1.config.websocket.pingInterval);
};
exports.setupWebSocketHandlers = setupWebSocketHandlers;
const handleJoinRoom = async (ws, message, db) => {
    const { roomId, userId } = message;
    try {
        const roomResult = await db.query('SELECT id, name, max_users FROM rooms WHERE slug = $1', [roomId]);
        if (roomResult.rows.length === 0) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Room not found'
            }));
            return;
        }
        const room = roomResult.rows[0];
        const currentConnections = roomConnections.get(roomId) || [];
        if (currentConnections.length >= room.max_users) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Room is at maximum capacity'
            }));
            return;
        }
        const connection = {
            ws,
            userId: userId || 'anonymous',
            roomId,
            joinedAt: new Date(),
        };
        roomConnections.set(roomId, [...currentConnections, connection]);
        broadcastToRoom(roomId, {
            type: 'user_joined',
            userId: connection.userId,
            timestamp: Date.now(),
        }, ws);
        ws.send(JSON.stringify({
            type: 'room_joined',
            roomId,
            roomName: room.name,
            participants: currentConnections.map(c => c.userId),
            timestamp: Date.now(),
        }));
        logger_1.logger.info('User joined room', { roomId, userId: connection.userId });
    }
    catch (error) {
        logger_1.logger.error('Error joining room:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to join room'
        }));
    }
};
const handleLeaveRoom = async (ws, message) => {
    const { roomId, userId } = message;
    const currentConnections = roomConnections.get(roomId) || [];
    const updatedConnections = currentConnections.filter(c => c.ws !== ws);
    roomConnections.set(roomId, updatedConnections);
    broadcastToRoom(roomId, {
        type: 'user_left',
        userId: userId || 'anonymous',
        timestamp: Date.now(),
    }, ws);
    logger_1.logger.info('User left room', { roomId, userId });
};
const handleTldrawUpdate = async (ws, message, db) => {
    const { roomId, data } = message;
    try {
        if (config_1.config.tldraw.enablePersistence && data) {
            await db.query('UPDATE rooms SET data = $1, updated_at = NOW() WHERE slug = $2', [JSON.stringify(data), roomId]);
        }
        broadcastToRoom(roomId, {
            type: 'tldraw_update',
            data,
            timestamp: Date.now(),
        }, ws);
        logger_1.logger.debug('tldraw update broadcasted', { roomId });
    }
    catch (error) {
        logger_1.logger.error('Error handling tldraw update:', error);
    }
};
const handleUserActivity = async (ws, message) => {
    const { roomId, userId, data } = message;
    broadcastToRoom(roomId, {
        type: 'user_activity',
        userId,
        data,
        timestamp: Date.now(),
    }, ws);
};
const handleTldrawSyncMessage = async (ws, message, db) => {
    const { roomId, data } = message;
    if (message.type === 'sync_join') {
        tldrawSyncRooms.set(roomId, ws);
        logger_1.logger.debug('tldraw sync connection joined', { roomId });
        ws.send(JSON.stringify({
            type: 'sync_joined',
            roomId,
            timestamp: Date.now()
        }));
    }
    else if (message.type === 'sync_update') {
        if (config_1.config.tldraw.enablePersistence && data) {
            try {
                await db.query('UPDATE rooms SET data = $1, updated_at = NOW() WHERE slug = $2', [JSON.stringify(data), roomId]);
            }
            catch (error) {
                logger_1.logger.error('Error saving tldraw sync data:', error);
            }
        }
        const syncWs = tldrawSyncRooms.get(roomId);
        if (syncWs && syncWs.readyState === ws_1.WebSocket.OPEN) {
            syncWs.send(JSON.stringify({
                type: 'sync_update',
                roomId,
                data,
                timestamp: Date.now()
            }));
            logger_1.logger.debug('tldraw sync update broadcasted', { roomId });
        }
        else {
            logger_1.logger.warn('tldraw sync WebSocket not found or not open for room', { roomId });
        }
    }
};
const handleTldrawSyncDisconnect = (roomId, ws) => {
    tldrawSyncRooms.delete(roomId);
    logger_1.logger.debug('tldraw sync connection disconnected', { roomId });
};
const broadcastToRoom = (roomId, message, excludeWs) => {
    const connections = roomConnections.get(roomId) || [];
    connections.forEach(connection => {
        if (connection.ws !== excludeWs && connection.ws.readyState === ws_1.WebSocket.OPEN) {
            connection.ws.send(JSON.stringify(message));
        }
    });
};
const getRoomStats = () => {
    const stats = {
        totalRooms: roomConnections.size,
        totalConnections: 0,
        rooms: [],
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
exports.getRoomStats = getRoomStats;
//# sourceMappingURL=websocket.js.map