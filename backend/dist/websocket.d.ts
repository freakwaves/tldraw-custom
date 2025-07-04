import { WebSocketServer } from 'ws';
import { DatabaseConnection } from './database';
export declare const setupWebSocketHandlers: (wss: WebSocketServer, db: DatabaseConnection) => void;
export declare const getRoomStats: () => {
    totalRooms: number;
    totalConnections: number;
    rooms: any[];
};
//# sourceMappingURL=websocket.d.ts.map