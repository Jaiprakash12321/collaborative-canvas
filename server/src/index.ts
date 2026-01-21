/**
 * Collaborative Canvas Server
 * 
 * Architecture:
 * - Socket.io for real-time WebSocket communication
 * - Room-based isolation for multiple canvases
 * - HistoryStore for undo/redo across all users
 * - Efficient event broadcasting with throttling
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { HistoryStore } from './HistoryStore';
import { RoomManager } from './RoomManager';
import { Stroke, CursorPosition } from './types';

const app = express();
app.use(cors());

// Serve static files from client/public
const staticPath = path.join(__dirname, '../../client/public');
app.use(express.static(staticPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize managers
const roomManager = new RoomManager();
const roomHistories = new Map<string, HistoryStore>(); // One history per room

// Initialize default room history
roomHistories.set('main', new HistoryStore());

/**
 * Get or create history store for a room
 */
function getHistoryStore(roomId: string): HistoryStore {
    if (!roomHistories.has(roomId)) {
        roomHistories.set(roomId, new HistoryStore());
    }
    return roomHistories.get(roomId)!;
}

io.on('connection', (socket: Socket) => {
    const socketId = socket.id;
    let currentRoomId: string | undefined;

    console.log(`🔌 Client connected: ${socketId}`);

    /**
     * Handle user joining a room
     */
    socket.on('join_room', (roomId: string = 'main', callback?: (error?: string) => void) => {
        try {
            // Leave previous room if in one
            if (currentRoomId) {
                socket.leave(currentRoomId);
                const prevRoom = roomManager.getRoomIdForUser(socketId);
                if (prevRoom) {
                    io.to(prevRoom).emit('users_update',
                        roomManager.getUsersInRoom(prevRoom)
                    );
                }
            }

            // Add user to new room
            const user = roomManager.addUserToRoom(socketId, roomId);
            currentRoomId = roomId;

            // Join socket.io room
            socket.join(roomId);

            console.log(`👤 User joined room '${roomId}': ${user.id} (${user.name})`);

            // Send history to new user
            const history = getHistoryStore(roomId).getHistory();
            socket.emit('history_sync', history);

            // Notify all users in room
            const roomUsers = roomManager.getUsersInRoom(roomId);
            io.to(roomId).emit('users_update', roomUsers);

            callback?.();
        } catch (error: any) {
            console.error(`❌ Error joining room: ${error.message}`);
            callback?.(error.message);
        }
    });

    /**
     * Handle drawing strokes
     */
    socket.on('draw_line', (data: Stroke, ack?: () => void) => {
        try {
            if (!currentRoomId) {
                console.warn(`⚠️ Draw from user not in room: ${socketId}`);
                return;
            }

            // Broadcast to others in the room (exclude sender for performance)
            socket.broadcast.to(currentRoomId).emit('draw_line', data);
            ack?.();
        } catch (error) {
            console.error(`❌ Error drawing line: ${error}`);
        }
    });

    /**
     * Handle stroke completion (final reliable stroke)
     */
    socket.on('draw_finish', (data: Stroke, ack?: () => void) => {
        try {
            if (!currentRoomId) return;

            const history = getHistoryStore(currentRoomId);
            history.addStroke(data);

            // Acknowledge successful storage
            ack?.();
        } catch (error) {
            console.error(`❌ Error finishing stroke: ${error}`);
        }
    });

    /**
     * Handle eraser strokes
     */
    socket.on('erase', (data: Stroke, ack?: () => void) => {
        try {
            if (!currentRoomId) return;

            const history = getHistoryStore(currentRoomId);
            history.addErase(data);

            // Broadcast to others
            socket.broadcast.to(currentRoomId).emit('erase', data);
            ack?.();
        } catch (error) {
            console.error(`❌ Error erasing: ${error}`);
        }
    });

    /**
     * Handle cursor movement (high frequency, volatile)
     */
    socket.on('cursor_move', (position: { x: number; y: number }) => {
        try {
            if (!currentRoomId) return;

            const user = roomManager.getUser(socketId);
            if (!user) return;

            const cursorData: CursorPosition = {
                userId: socketId,
                x: position.x,
                y: position.y,
                color: user.color,
                name: user.name
            };

            // Volatile = drop if network congested
            socket.broadcast.to(currentRoomId).volatile.emit('cursor_update', cursorData);
        } catch (error) {
            console.error(`❌ Error updating cursor: ${error}`);
        }
    });

    /**
     * Handle undo (global across all users)
     */
    socket.on('undo', (ack?: (history?: any) => void) => {
        try {
            if (!currentRoomId) return;

            const history = getHistoryStore(currentRoomId);
            const updatedHistory = history.undo();

            // Send updated history to all users in room
            io.to(currentRoomId).emit('history_sync', updatedHistory);
            ack?.(updatedHistory);
        } catch (error) {
            console.error(`❌ Error undoing: ${error}`);
        }
    });

    /**
     * Handle redo
     */
    socket.on('redo', (ack?: (history?: any) => void) => {
        try {
            if (!currentRoomId) return;

            const history = getHistoryStore(currentRoomId);
            const updatedHistory = history.redo();

            // Send updated history to all users in room
            io.to(currentRoomId).emit('history_sync', updatedHistory);
            ack?.(updatedHistory);
        } catch (error) {
            console.error(`❌ Error redoing: ${error}`);
        }
    });

    /**
     * Handle clear canvas
     */
    socket.on('clear_canvas', (ack?: () => void) => {
        try {
            if (!currentRoomId) return;

            const history = getHistoryStore(currentRoomId);
            history.clear();

            // Notify all users
            io.to(currentRoomId).emit('canvas_cleared');
            io.to(currentRoomId).emit('history_sync', []);
            ack?.();
        } catch (error) {
            console.error(`❌ Error clearing canvas: ${error}`);
        }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
        try {
            console.log(`❌ Client disconnected: ${socketId}`);

            if (currentRoomId) {
                roomManager.removeUser(socketId);
                const roomUsers = roomManager.getUsersInRoom(currentRoomId);
                io.to(currentRoomId).emit('users_update', roomUsers);
            }
        } catch (error) {
            console.error(`❌ Error handling disconnect: ${error}`);
        }
    });

    /**
     * Handle errors
     */
    socket.on('error', (error: any) => {
        console.error(`❌ Socket error from ${socketId}: ${error}`);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`\n✅ Collaborative Canvas Server running on http://localhost:${PORT}\n`);
    console.log(`📝 Open this URL in multiple browser tabs to test\n`);
});