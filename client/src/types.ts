export interface Point {
    x: number;
    y: number;
}

export interface Stroke {
    id: string;
    userId: string;
    color: string;
    width: number;
    points: Point[];
    isFinished: boolean;
    timestamp?: number;
}

// FIX: Changed 'enum' to 'const object' to fix Vercel TS1294 error
export const DrawingActionType = {
    STROKE_DRAW: 'stroke_draw',
    STROKE_ERASE: 'stroke_erase',
    CLEAR_ALL: 'clear_all'
} as const;

// This creates a type that allows 'stroke_draw' | 'stroke_erase' | 'clear_all'
export type DrawingActionType = typeof DrawingActionType[keyof typeof DrawingActionType];

export interface DrawingAction {
    id: string;
    type: DrawingActionType;
    userId: string;
    timestamp: number;
    data: any;
}

export interface CursorPosition {
    userId: string;
    x: number;
    y: number;
    color: string;
    name: string;
}

export interface User {
    id: string;
    color: string;
    name: string;
}