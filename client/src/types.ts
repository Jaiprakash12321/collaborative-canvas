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

export enum DrawingActionType {
    STROKE_DRAW = 'stroke_draw',
    STROKE_ERASE = 'stroke_erase',
    CLEAR_ALL = 'clear_all'
}

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