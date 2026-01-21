import { User, Room } from './types';
import { HistoryStore } from './HistoryStore';
import { v4 as uuidv4 } from 'uuid';

/**
 * RoomManager: Manages multiple isolated drawing rooms
 * Each room has its own users, drawing history, and state
 * 
 * Architecture:
 * - Rooms are isolated canvases
 * - Users can join a room and see all other users' drawings
 * - Each room maintains its own HistoryStore for undo/redo
 */
export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    private userToRoom: Map<string, string> = new Map(); // Maps userId to roomId
    private socketToUser: Map<string, User> = new Map(); // Maps socketId to User

    constructor() {
        // Create a default "main" room
        this.createRoom('main', 'Main Canvas');
    }

    /**
     * Create a new room
     */
    createRoom(roomId: string, roomName: string): Room {
        const room: Room = {
            id: roomId,
            name: roomName,
            users: new Map(),
            history: [],
            historyIndex: 0
        };
        this.rooms.set(roomId, room);
        return room;
    }

    /**
     * Get a room by ID
     */
    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * Get all rooms
     */
    getAllRooms(): Room[] {
        return Array.from(this.rooms.values());
    }

    /**
     * Add a user to a room
     */
    addUserToRoom(socketId: string, roomId: string): User {
        const room = this.getRoom(roomId);
        if (!room) {
            throw new Error(`Room ${roomId} not found`);
        }

        const color = this.generateRandomColor();
        const user: User = {
            id: socketId,
            color: color,
            name: `User-${socketId.substring(0, 5)}`
        };

        room.users.set(socketId, user);
        this.userToRoom.set(socketId, roomId);
        this.socketToUser.set(socketId, user);

        return user;
    }

    /**
     * Remove a user from their room
     */
    removeUser(socketId: string): void {
        const roomId = this.userToRoom.get(socketId);
        if (roomId) {
            const room = this.getRoom(roomId);
            if (room) {
                room.users.delete(socketId);
            }
            this.userToRoom.delete(socketId);
        }
        this.socketToUser.delete(socketId);
    }

    /**
     * Get a user by socket ID
     */
    getUser(socketId: string): User | undefined {
        return this.socketToUser.get(socketId);
    }

    /**
     * Get all users in a room
     */
    getUsersInRoom(roomId: string): User[] {
        const room = this.getRoom(roomId);
        if (!room) return [];
        return Array.from(room.users.values());
    }

    /**
     * Get the room a user is in
     */
    getRoomForUser(socketId: string): Room | undefined {
        const roomId = this.userToRoom.get(socketId);
        if (!roomId) return undefined;
        return this.getRoom(roomId);
    }

    /**
     * Get room ID for a user
     */
    getRoomIdForUser(socketId: string): string | undefined {
        return this.userToRoom.get(socketId);
    }

    /**
     * Update user name
     */
    updateUserName(socketId: string, name: string): void {
        const user = this.socketToUser.get(socketId);
        if (user) {
            user.name = name;
        }
    }

    /**
     * Generate a random color for a user
     */
    private generateRandomColor(): string {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
}