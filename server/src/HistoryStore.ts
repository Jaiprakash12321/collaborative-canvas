/**
 * HistoryStore: Manages global drawing history with undo/redo support
 * 
 * Strategy:
 * - Maintains an ordered list of drawing actions
 * - Supports undo operations that can be replayed for all clients
 * - When User A undoes User B's stroke, all clients rebuild from history
 * - Timestamps ensure ordering even with network latency
 */

import { DrawingAction, DrawingActionType, Stroke } from './types';
import { randomUUID } from 'crypto';

export class HistoryStore {
    private history: DrawingAction[] = [];
    private redoStack: DrawingAction[] = [];

    /**
     * Add a new stroke action to history
     */
    addStroke(stroke: Stroke): DrawingAction {
        const action: DrawingAction = {
            id: randomUUID(),
            type: DrawingActionType.STROKE_DRAW,
            userId: stroke.userId,
            timestamp: Date.now(),
            data: stroke
        };

        this.history.push(action);
        this.redoStack = []; // Clear redo stack when new action is added

        return action;
    }

    /**
     * Add an erase action to history
     */
    addErase(stroke: Stroke): DrawingAction {
        const action: DrawingAction = {
            id: randomUUID(),
            type: DrawingActionType.STROKE_ERASE,
            userId: stroke.userId,
            timestamp: Date.now(),
            data: stroke
        };

        this.history.push(action);
        this.redoStack = [];

        return action;
    }

    /**
     * Undo the last action
     * Returns the updated history for all clients to rebuild
     */
    undo(): DrawingAction[] {
        if (this.history.length === 0) {
            return this.history;
        }

        const lastAction = this.history.pop()!;
        this.redoStack.push(lastAction);

        return this.history;
    }

    /**
     * Redo the last undone action
     */
    redo(): DrawingAction[] {
        if (this.redoStack.length === 0) {
            return this.history;
        }

        const action = this.redoStack.pop()!;
        this.history.push(action);

        return this.history;
    }

    /**
     * Get the complete history for a new client joining
     */
    getHistory(): DrawingAction[] {
        return [...this.history];
    }

    /**
     * Clear all history (for clear canvas action)
     */
    clear(): void {
        this.history = [];
        this.redoStack = [];
    }

    /**
     * Get history length (for debugging)
     */
    getHistoryLength(): number {
        return this.history.length;
    }

    /**
     * Rebuild the current canvas state from history
     * Used by clients to render the canvas
     */
    getCurrentState(): Stroke[] {
        return this.history
            .filter(action =>
                action.type === DrawingActionType.STROKE_DRAW ||
                action.type === DrawingActionType.STROKE_ERASE
            )
            .map(action => action.data as Stroke)
            .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    }

    /**
     * Get action by ID (for debugging/logging)
     */
    getAction(actionId: string): DrawingAction | undefined {
        return this.history.find(action => action.id === actionId);
    }

    /**
     * Get history since a specific timestamp (for incremental updates)
     */
    getHistorySince(timestamp: number): DrawingAction[] {
        return this.history.filter(action => action.timestamp > timestamp);
    }
}
