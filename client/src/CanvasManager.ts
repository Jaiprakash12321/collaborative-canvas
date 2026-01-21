
import type { Stroke, Point } from "./types";

export class CanvasManager {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private layers = {
        background: null as CanvasRenderingContext2D | null,
        drawing: null as CanvasRenderingContext2D | null
    };
    private layerCanvases = {
        background: null as HTMLCanvasElement | null,
        drawing: null as HTMLCanvasElement | null
    };

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        // Setup offscreen canvases for layering
        this.layerCanvases.background = document.createElement('canvas');
        this.layerCanvases.drawing = document.createElement('canvas');
        this.layers.background = this.layerCanvases.background!.getContext('2d')!;
        this.layers.drawing = this.layerCanvases.drawing!.getContext('2d')!;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Resize canvas and offscreen layers
     */
    private resize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.canvas.width = width;
        this.canvas.height = height;

        // Resize layer canvases
        if (this.layerCanvases.background) {
            this.layerCanvases.background.width = width;
            this.layerCanvases.background.height = height;
        }
        if (this.layerCanvases.drawing) {
            this.layerCanvases.drawing.width = width;
            this.layerCanvases.drawing.height = height;
        }
    }

    /**
     * Clear the entire canvas
     */
    clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.layers.background) {
            this.layers.background.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        if (this.layers.drawing) {
            this.layers.drawing.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Draw a stroke with smooth path rendering
     * Uses quadratic curves for smooth interpolation
     */
    drawStroke(stroke: Stroke, isEraser: boolean = false): void {
        if (stroke.points.length < 1) return;

        // Always draw on main canvas - eraser needs to erase from where drawings exist
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1;

        // Set eraser mode if needed
        if (isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        // Start from first point
        if (stroke.points.length === 1) {
            // Draw single point
            ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw smooth path using quadratic curves
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            for (let i = 1; i < stroke.points.length; i++) {
                const curr = stroke.points[i];
                const prev = stroke.points[i - 1];

                // Use quadratic curve for smoother rendering
                const midX = (prev.x + curr.x) / 2;
                const midY = (prev.y + curr.y) / 2;

                ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }

            // Draw to last point
            const last = stroke.points[stroke.points.length - 1];
            ctx.lineTo(last.x, last.y);
        }

        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Draw an eraser stroke (removes content)
     */
    drawErase(stroke: Stroke): void {
        this.drawStroke(stroke, true);
    }

    /**
     * Redraw everything from scratch
     * Used when history is synced or undone
     */
    redrawAll(strokes: Stroke[]): void {
        this.clear();

        // Sort strokes by timestamp for correct layering
        const sorted = [...strokes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        for (const stroke of sorted) {
            this.drawStroke(stroke);
        }
    }

    /**
     * Draw multiple strokes efficiently
     */
    drawStrokes(strokes: Stroke[]): void {
        for (const stroke of strokes) {
            this.drawStroke(stroke);
        }
    }

    /**
     * Get a snapshot of the current canvas as a data URL
     */
    getSnapshot(): string {
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Smooth a path by interpolating between points
     * Reduces jank and improves visual quality
     */
    // private smoothPath(points: Point[], tension: number = 0.5): Point[] {
    //     if (points.length <= 2) return points;

    //     const smoothed: Point[] = [points[0]];

    //     for (let i = 1; i < points.length; i++) {
    //         const p0 = points[i - 1];
    //         const p1 = points[i];
    //         const p2 = i + 1 < points.length ? points[i + 1] : points[i];
    //         const p3 = i + 2 < points.length ? points[i + 2] : points[i];

    //         // Add interpolated points
    //         for (let t = 0; t < 1; t += 0.3) {
    //             const x = this.catmullRom(p0.x, p1.x, p2.x, p3.x, t, tension);
    //             const y = this.catmullRom(p0.y, p1.y, p2.y, p3.y, t, tension);
    //             smoothed.push({ x, y });
    //         }
    //     }

    //     smoothed.push(points[points.length - 1]);
    //     return smoothed;
    // }

    /**
     * Catmull-Rom spline interpolation for smooth curves
     */
    private catmullRom(p0: number, p1: number, p2: number, p3: number, t: number, tension: number): number {
        const v0 = (p2 - p0) * tension;
        const v1 = (p3 - p1) * tension;
        const t2 = t * t;
        const t3 = t2 * t;

        return (2 * p1 - 2 * p2 + v0 + v1) * t3 +
            (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
            v0 * t +
            p1;
    }

    /**
     * Get canvas dimensions
     */
    getDimensions(): { width: number; height: number } {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }
}