/**
 * Collaborative Canvas: Main Application Logic
 * 
 * Features:
 * - Real-time drawing with multiple users
 * - Drawing tools: Brush, Eraser
 * - Color and width adjustment
 * - Global undo/redo across all users
 * - User indicators and cursor tracking
 * - Connection status monitoring
 */

import "./style.css";
import { CanvasManager } from "./CanvasManager";
import { SocketManager } from "./SocketManager";
import type { Stroke, Point, DrawingAction, CursorPosition, User } from "./types";
import { DrawingActionType } from "./types";
import { v4 as uuidv4 } from 'uuid';

// Core managers
const socket = new SocketManager();
const canvas = new CanvasManager("drawing-board");
const canvasEl = document.getElementById("drawing-board") as HTMLCanvasElement;

// App State
let isDrawing = false;
let currentStroke: Stroke | null = null;
let history: DrawingAction[] = [];
let myColor = "#000000";
let myWidth = 5;
let myTool: 'brush' | 'eraser' = 'brush';
let currentUsers: User[] = [];
let activeCursors = new Map<string, CursorPosition>();
let lastEmitTime = 0;
const EMIT_THROTTLE = 20; // ms between updates

// --- Connection Handlers ---
socket.onConnect(() => {
  console.log('✅ Connected!');
  updateConnectionStatus(true);
  socket.joinRoom('main').catch(err => console.error('Join room error:', err));
});

socket.onDisconnect(() => {
  console.log('❌ Disconnected');
  updateConnectionStatus(false);
  clearRemoteCursors();
});

// --- History Synchronization ---
socket.onHistorySync((serverHistory: DrawingAction[]) => {
  history = serverHistory;
  redrawAll();
  console.log(`📜 History synced (${history.length} actions)`);
});

// --- Drawing Events ---
socket.onDrawLine((remoteStroke: Stroke) => {
  // Draw remote stroke without redrawing entire history
  canvas.drawStroke(remoteStroke);
});

socket.onErase((remoteStroke: Stroke) => {
  canvas.drawErase(remoteStroke);
});

// --- Cursor Tracking ---
socket.onCursorUpdate((cursor: CursorPosition) => {
  activeCursors.set(cursor.userId, cursor);
  drawRemoteCursors();
});

// --- User Updates ---
socket.onUsersUpdate((users: User[]) => {
  currentUsers = users;
  updateUsersList();
  console.log(`👥 Users updated: ${users.length}`);
});

// --- Canvas Clear ---
socket.onCanvasCleared(() => {
  canvas.clear();
});

// --- Canvas Drawing Events ---
canvasEl.addEventListener("mousedown", handleMouseDown);
canvasEl.addEventListener("mousemove", handleMouseMove);
canvasEl.addEventListener("mouseup", handleMouseUp);
canvasEl.addEventListener("mouseout", handleMouseUp);

// --- Touch Support (Bonus) ---
canvasEl.addEventListener("touchstart", handleTouchStart);
canvasEl.addEventListener("touchmove", handleTouchMove);
canvasEl.addEventListener("touchend", handleTouchEnd);

function handleMouseDown(e: MouseEvent) {
  startDrawing(e.clientX, e.clientY);
}

function handleMouseMove(e: MouseEvent) {
  continueDrawing(e.clientX, e.clientY);
}

function handleMouseUp() {
  finishDrawing();
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    startDrawing(touch.clientX, touch.clientY);
  }
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length === 1) {
    e.preventDefault();
    const touch = e.touches[0];
    continueDrawing(touch.clientX, touch.clientY);
  }
}

function handleTouchEnd() {
  finishDrawing();
}

/**
 * Start a new stroke
 */
function startDrawing(x: number, y: number) {
  if (!socket.isConnected()) {
    console.warn('⚠️ Not connected');
    return;
  }

  isDrawing = true;
  currentStroke = {
    id: uuidv4(),
    userId: socket.getSocketId(),
    color: myColor,
    width: myWidth,
    points: [{ x, y }],
    isFinished: false,
    timestamp: Date.now()
  };

  // Draw locally immediately
  canvas.drawStroke(currentStroke, myTool === 'eraser');
}

/**
 * Continue drawing current stroke
 */
function continueDrawing(x: number, y: number) {
  if (!isDrawing || !currentStroke) return;

  const point: Point = { x, y };
  currentStroke.points.push(point);

  // Draw locally immediately (low latency)
  canvas.drawStroke(currentStroke, myTool === 'eraser');

  // Emit cursor position (high frequency, can be dropped)
  socket.emitCursorMove(x, y);

  // Throttle drawing updates to server
  const now = Date.now();
  if (now - lastEmitTime > EMIT_THROTTLE) {
    if (myTool === 'eraser') {
      socket.emitErase(currentStroke);
    } else {
      socket.emitDraw(currentStroke);
    }
    lastEmitTime = now;
  }
}

/**
 * Finish current stroke
 */
function finishDrawing() {
  if (!isDrawing || !currentStroke) return;

  isDrawing = false;
  currentStroke.isFinished = true;

  // Send final stroke for reliable storage
  if (myTool === 'eraser') {
    socket.emitErase(currentStroke);
  } else {
    socket.emitFinish(currentStroke);
  }

  currentStroke = null;
}

/**
 * Redraw entire canvas from history
 */
function redrawAll() {
  canvas.clear();

  // Sort actions by timestamp and replay them in order
  const sortedActions = [...history]
    .filter(action =>
      action.type === DrawingActionType.STROKE_DRAW ||
      action.type === DrawingActionType.STROKE_ERASE
    )
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  for (const action of sortedActions) {
    const stroke = action.data as Stroke;
    const isEraser = action.type === DrawingActionType.STROKE_ERASE;
    canvas.drawStroke(stroke, isEraser);
  }
}

/**
 * Draw remote user cursors
 */
function drawRemoteCursors() {
  // Get canvas overlay
  const overlay = document.getElementById('cursor-overlay') as HTMLCanvasElement;
  if (!overlay) return;

  const ctx = overlay.getContext('2d')!;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  for (const [userId, cursor] of activeCursors.entries()) {
    if (userId === socket.getSocketId()) continue; // Don't draw own cursor

    // Draw cursor circle
    ctx.fillStyle = cursor.color;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw cursor label
    ctx.fillStyle = cursor.color;
    ctx.font = '12px Arial';
    ctx.fillText(cursor.name, cursor.x + 10, cursor.y);
  }
}

/**
 * Clear remote cursors
 */
function clearRemoteCursors() {
  activeCursors.clear();
  const overlay = document.getElementById('cursor-overlay') as HTMLCanvasElement;
  if (overlay) {
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }
}

/**
 * Update users list UI
 */
function updateUsersList() {
  const usersList = document.getElementById('users-list');
  if (!usersList) return;

  usersList.innerHTML = currentUsers.map(user => `
        <div class="user-item" style="border-left: 4px solid ${user.color}">
            <span class="user-color" style="background-color: ${user.color}"></span>
            <span class="user-name">${user.name}</span>
        </div>
    `).join('');
}

/**
 * Update connection status
 */
function updateConnectionStatus(connected: boolean) {
  const status = document.getElementById("connection-status");
  if (status) {
    status.innerText = connected ? "🟢 Online" : "🔴 Offline";
    status.style.color = connected ? "#10b981" : "#ef4444";
  }
}

// --- UI Controls ---

// Color picker
document.getElementById("color-picker")?.addEventListener("change", (e: any) => {
  myColor = e.target.value;
  updateToolInfo();
});

// Width picker
document.getElementById("width-picker")?.addEventListener("change", (e: any) => {
  myWidth = parseInt(e.target.value);
  updateToolInfo();
});

// Tool selection
document.getElementById("brush-btn")?.addEventListener("click", () => {
  myTool = 'brush';
  updateToolSelection();
});

document.getElementById("eraser-btn")?.addEventListener("click", () => {
  myTool = 'eraser';
  updateToolSelection();
});

// Undo button
document.getElementById("undo-btn")?.addEventListener("click", () => {
  socket.emitUndo();
  console.log('↩️ Undo');
});

// Redo button
document.getElementById("redo-btn")?.addEventListener("click", () => {
  socket.emitRedo();
  console.log('↪️ Redo');
});

// Clear canvas button
document.getElementById("clear-btn")?.addEventListener("click", () => {
  if (confirm('Clear entire canvas? This will affect all users.')) {
    socket.emitClear();
  }
});

// Download canvas button
document.getElementById("download-btn")?.addEventListener("click", () => {
  const data = canvas.getSnapshot();
  const link = document.createElement('a');
  link.href = data;
  link.download = `canvas-${Date.now()}.png`;
  link.click();
});

/**
 * Update tool selection UI
 */
function updateToolSelection() {
  document.getElementById("brush-btn")?.classList.remove('active');
  document.getElementById("eraser-btn")?.classList.remove('active');

  if (myTool === 'brush') {
    document.getElementById("brush-btn")?.classList.add('active');
  } else {
    document.getElementById("eraser-btn")?.classList.add('active');
  }
}

/**
 * Update tool info display
 */
function updateToolInfo() {
  const toolInfo = document.getElementById("tool-info");
  if (toolInfo) {
    toolInfo.innerHTML = `
            <span style="color: ${myColor}; font-weight: bold;">■</span>
            Tool: ${myTool.charAt(0).toUpperCase() + myTool.slice(1)} | 
            Width: ${myWidth}px
        `;
  }
}

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Z: Undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    socket.emitUndo();
  }
  // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
  else if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
    ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
    e.preventDefault();
    socket.emitRedo();
  }
  // B: Brush
  else if (e.key.toLowerCase() === 'b') {
    e.preventDefault();
    myTool = 'brush';
    updateToolSelection();
  }
  // E: Eraser
  else if (e.key.toLowerCase() === 'e') {
    e.preventDefault();
    myTool = 'eraser';
    updateToolSelection();
  }
  // C: Clear
  else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (confirm('Clear entire canvas? This will affect all users.')) {
      socket.emitClear();
    }
  }
});

// --- Help Toggle ---
document.getElementById('help-toggle')?.addEventListener('click', () => {
  const content = document.getElementById('help-content');
  if (content) {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  }
});

// --- Width Picker Display Update ---
document.getElementById('width-picker')?.addEventListener('input', (e: any) => {
  const display = document.querySelector('.width-display');
  if (display) {
    display.textContent = e.target.value;
  }
});

// Initialize UI
updateToolSelection();
updateToolInfo();

// Resize cursor overlay on window resize
window.addEventListener('resize', () => {
  const overlay = document.getElementById('cursor-overlay') as HTMLCanvasElement;
  if (overlay) {
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
  }
});

console.log('✅ Collaborative Canvas Initialized');