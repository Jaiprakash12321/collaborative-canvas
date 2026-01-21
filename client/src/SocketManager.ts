/**
 * SocketManager: WebSocket client for communicating with server
 * 
 * Handles:
 * - Connection lifecycle
 * - Real-time drawing events
 * - Cursor tracking
 * - Undo/redo synchronization
 * - User list updates
 */

import { io, Socket } from 'socket.io-client';
import type { Stroke, DrawingAction, CursorPosition } from './types';

export class SocketManager {
    private socket: Socket;
    private callbacks = {
        onConnect: [] as (() => void)[],
        onDisconnect: [] as (() => void)[],
        onHistorySync: [] as ((history: DrawingAction[]) => void)[],
        onDrawLine: [] as ((stroke: Stroke) => void)[],
        onErase: [] as ((stroke: Stroke) => void)[],
        onCursorUpdate: [] as ((cursor: CursorPosition) => void)[],
        onUsersUpdate: [] as ((users: any[]) => void)[],
        onCanvasCleared: [] as (() => void)[]
    };

    constructor() {
        // Connect to backend server
        const serverUrl = import.meta.env.PROD ? '/' : 'http://localhost:3000';
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            reconnectionDelay: 1000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelayMax: 5000
        });

        this.setupEventListeners();
    }

    /**
     * Setup internal event listeners
     */
    private setupEventListeners(): void {
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.callbacks.onConnect.forEach(cb => cb());
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.callbacks.onDisconnect.forEach(cb => cb());
        });

        this.socket.on('history_sync', (history: DrawingAction[]) => {
            this.callbacks.onHistorySync.forEach(cb => cb(history));
        });

        this.socket.on('draw_line', (stroke: Stroke) => {
            this.callbacks.onDrawLine.forEach(cb => cb(stroke));
        });

        this.socket.on('erase', (stroke: Stroke) => {
            this.callbacks.onErase.forEach(cb => cb(stroke));
        });

        this.socket.on('cursor_update', (cursor: CursorPosition) => {
            this.callbacks.onCursorUpdate.forEach(cb => cb(cursor));
        });

        this.socket.on('users_update', (users: any[]) => {
            this.callbacks.onUsersUpdate.forEach(cb => cb(users));
        });

        this.socket.on('canvas_cleared', () => {
            this.callbacks.onCanvasCleared.forEach(cb => cb());
        });

        this.socket.on('error', (error: any) => {
            console.error('❌ Socket error:', error);
        });
    }

    /**
     * Join a room
     */
    joinRoom(roomId: string = 'main'): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.emit('join_room', roomId, (error?: string) => {
                if (error) {
                    console.error(`❌ Failed to join room: ${error}`);
                    reject(new Error(error));
                } else {
                    console.log(`✅ Joined room: ${roomId}`);
                    resolve();
                }
            });
        });
    }

    /**
     * Emit drawing stroke
     */
    emitDraw(stroke: Stroke): void {
        this.socket.emit('draw_line', stroke, () => {
            // Acknowledged
        });
    }

    /**
     * Emit finished stroke
     */
    emitFinish(stroke: Stroke): void {
        this.socket.emit('draw_finish', stroke, () => {
            // Acknowledged
        });
    }

    /**
     * Emit eraser stroke
     */
    emitErase(stroke: Stroke): void {
        this.socket.emit('erase', stroke, () => {
            // Acknowledged
        });
    }

    /**
     * Emit cursor movement
     */
    emitCursorMove(x: number, y: number): void {
        this.socket.emit('cursor_move', { x, y });
    }

    /**
     * Emit undo
     */
    emitUndo(): void {
        this.socket.emit('undo', (history?: DrawingAction[]) => {
            console.log(`↩️ Undo executed`);
        });
    }

    /**
     * Emit redo
     */
    emitRedo(): void {
        this.socket.emit('redo', (history?: DrawingAction[]) => {
            console.log(`↪️ Redo executed`);
        });
    }

    /**
     * Clear canvas
     */
    emitClear(): void {
        this.socket.emit('clear_canvas', () => {
            console.log('🗑️ Canvas cleared');
        });
    }

    /**
     * Register connection callback
     */
    onConnect(callback: () => void): void {
        this.callbacks.onConnect.push(callback);
    }

    /**
     * Register disconnect callback
     */
    onDisconnect(callback: () => void): void {
        this.callbacks.onDisconnect.push(callback);
    }

    /**
     * Register history sync callback
     */
    onHistorySync(callback: (history: DrawingAction[]) => void): void {
        this.callbacks.onHistorySync.push(callback);
    }

    /**
     * Register draw line callback
     */
    onDrawLine(callback: (stroke: Stroke) => void): void {
        this.callbacks.onDrawLine.push(callback);
    }

    /**
     * Register erase callback
     */
    onErase(callback: (stroke: Stroke) => void): void {
        this.callbacks.onErase.push(callback);
    }

    /**
     * Register cursor update callback
     */
    onCursorUpdate(callback: (cursor: CursorPosition) => void): void {
        this.callbacks.onCursorUpdate.push(callback);
    }

    /**
     * Register users update callback
     */
    onUsersUpdate(callback: (users: any[]) => void): void {
        this.callbacks.onUsersUpdate.push(callback);
    }

    /**
     * Register canvas cleared callback
     */
    onCanvasCleared(callback: () => void): void {
        this.callbacks.onCanvasCleared.push(callback);
    }

    /**
     * Get socket ID
     */
    getSocketId(): string {
        return this.socket.id || '';
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.socket.connected;
    }

    /**
     * Disconnect
     */
    disconnect(): void {
        this.socket.disconnect();
    }
}