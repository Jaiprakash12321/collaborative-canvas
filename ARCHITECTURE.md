# 🏗 Collaborative Canvas Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐      ┌──────────────────┐                     │
│  │   HTML Canvas    │      │    SocketManager │                     │
│  │  (CanvasManager) │◄────►│  (WebSocket)     │                     │
│  │                  │      │                  │                     │
│  │ • Draw Strokes   │      │ • Emit Events    │                     │
│  │ • Erase Areas    │      │ • Receive Events │                     │
│  │ • Render History │      │ • Acknowledge    │                     │
│  └──────────────────┘      └──────────────────┘                     │
│         ▲                            │                               │
│         │                            │ WebSocket                     │
│         │ Canvas                     │ (Socket.io)                   │
│         │ Updates                    │                               │
│         │                            ▼                               │
│  ┌──────────────────┐                                                │
│  │   main.ts        │                                                │
│  │ (App Logic)      │                                                │
│  │                  │                                                │
│  │ • Input Handler  │                                                │
│  │ • History Mgmt   │                                                │
│  │ • UI Controls    │                                                │
│  └──────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Real-Time WebSocket
                                    │ (TCP + Socket.io Protocol)
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER (Node.js)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              Socket.io Server (index.ts)                │       │
│  │                                                          │       │
│  │  Event Handlers:                                         │       │
│  │  • join_room      → RoomManager                          │       │
│  │  • draw_line      → Broadcast to room                    │       │
│  │  • draw_finish    → HistoryStore                         │       │
│  │  • erase          → HistoryStore + Broadcast            │       │
│  │  • cursor_move    → Volatile broadcast                   │       │
│  │  • undo           → HistoryStore + Sync history         │       │
│  │  • redo           → HistoryStore + Sync history         │       │
│  │  • disconnect     → RoomManager cleanup                  │       │
│  └──────────────────────────────────────────────────────────┘       │
│         │                                    │                      │
│         │ Manages                           │ Updates               │
│         ▼                                    ▼                      │
│  ┌──────────────────┐            ┌──────────────────┐              │
│  │  RoomManager     │            │  HistoryStore    │              │
│  │                  │            │                  │              │
│  │ • Users per room │            │ • Action list    │              │
│  │ • User colors    │            │ • Undo stack     │              │
│  │ • Room isolation │            │ • Redo stack     │              │
│  │ • User metadata  │            │ • Current state  │              │
│  └──────────────────┘            └──────────────────┘              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Drawing Flow (Real-Time Sync)

```
┌─────────────────────────────────────────────────────────────────┐
│ User Draws Stroke on Client                                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ mousedown event
                            ▼
                ┌──────────────────────────┐
                │ Create Stroke object     │
                │ - id: unique ID          │
                │ - userId: socket ID      │
                │ - color, width, points   │
                │ - timestamp              │
                └──────────────────────────┘
                            │
                            │ mousemove events (throttled 20ms)
                            ▼
    ┌──────────────────────────────────────────────────────┐
    │ Local Canvas Draw                                    │
    │ (Immediate visual feedback ~0ms latency)             │
    └──────────────────────────────────────────────────────┘
                            │
                            │ Every 20ms
                            ▼
    ┌──────────────────────────────────────────────────────┐
    │ Emit 'draw_line' to Server                           │
    │ (Partial stroke with points accumulated so far)      │
    └──────────────────────────────────────────────────────┘
                            │
                            │ Network latency (typical 30-80ms)
                            ▼
    ┌──────────────────────────────────────────────────────┐
    │ Server Receives 'draw_line'                          │
    │ (Validates and broadcasts to room)                   │
    └──────────────────────────────────────────────────────┘
                            │
                            │ Broadcasts to other users
                            ▼
    ┌──────────────────────────────────────────────────────┐
    │ Other Clients Receive 'draw_line'                    │
    │ (Partial stroke from sender)                         │
    └──────────────────────────────────────────────────────┘
                            │
                            │ Immediately render
                            ▼
    ┌──────────────────────────────────────────────────────┐
    │ Other Users' Canvas Updated                          │
    │ (See drawing happen in real-time)                    │
    └──────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │ mouseup event on original user      │
         ▼                                     ▼
    ┌─────────────────┐               ┌──────────────────┐
    │ Stroke finished │               │ Idle on remotes  │
    │ Emit           │               │ (Wait for next)  │
    │ 'draw_finish'  │               └──────────────────┘
    └─────────────────┘
         │
         │ Network (reliable ACK)
         ▼
    ┌──────────────────────────────────────────────────────┐
    │ Server Receives 'draw_finish'                        │
    │ - Store in HistoryStore                              │
    │ - Add to action history for persistence              │
    │ - Acknowledge to client                              │
    └──────────────────────────────────────────────────────┘
```

### 2. Undo/Redo Flow (Global Synchronization)

```
User A pressed Undo (Ctrl+Z)
        │
        │ emit 'undo' to server
        ▼
    ┌──────────────────────────────────────────────────────┐
    │ Server HistoryStore.undo()                           │
    │ - Pop last action from history array                 │
    │ - Push to redo stack                                 │
    │ - Get updated history                                │
    └──────────────────────────────────────────────────────┘
        │
        │ Broadcast 'history_sync' to ALL users in room
        ▼
    ┌──────────────────────────────────────────────────────┐
    │ All Connected Clients Receive 'history_sync'         │
    │ Including:                                            │
    │ - User A (sender)                                     │
    │ - User B (other user)                                │
    │ - User C (yet another user)                          │
    │ - New users joining later (rejoined)                 │
    └──────────────────────────────────────────────────────┘
        │
        │ Each client:
        ├─────────────────────────────────────────────────┐
        │ 1. Clear canvas                                 │
        │ 2. Extract all strokes from history             │
        │ 3. Redraw all strokes in order                  │
        │ 4. Canvas shows unified state                   │
        └─────────────────────────────────────────────────┘
        │
        ▼
    All users see same canvas state (consistency achieved)


REDO Flow:
User A pressed Redo (Ctrl+Y)
        │
        │ emit 'redo' to server
        ▼
    ┌──────────────────────────────────────────────────────┐
    │ Server HistoryStore.redo()                           │
    │ - Pop from redo stack                                │
    │ - Push back to history array                         │
    │ - Get updated history                                │
    └──────────────────────────────────────────────────────┘
        │
        │ Same broadcast flow as undo...
        ▼
    All users see redo applied
```

### 3. User Join Flow

```
New Client Opens Browser
        │
        │ Connects to WebSocket server
        ▼
    ┌──────────────────────────────────────────────────────┐
    │ SocketManager connects                               │
    │ - Initiates Socket.io connection                     │
    │ - Receives socket ID from server                     │
    └──────────────────────────────────────────────────────┘
        │
        │ emit 'join_room' to server with room ID
        ▼
    ┌──────────────────────────────────────────────────────┐
    │ Server Receives 'join_room'                          │
    │ - RoomManager.addUserToRoom(socketId, roomId)        │
    │ - Generate random color for user                     │
    │ - Add to room's user list                            │
    └──────────────────────────────────────────────────────┘
        │
        ├──────────────────────────────────────────────────┐
        │ To Joining User:                                 │
        │ emit 'history_sync' with entire history array    │
        │ (All previous strokes uploaded)                  │
        │                                                  │
        │ Result: Canvas pre-populated with all prior      │
        │ drawings                                         │
        ├──────────────────────────────────────────────────┘
        │
        │ To All Users in Room:
        │ emit 'users_update' with all room users
        │ (Updated user list with new member's color)
        ▼
    All users see:
    - New user appears in users list
    - Their assigned color is shown
    - Joining user sees all prior drawings
```

## WebSocket Protocol Specification

### Event Message Format

All events use Socket.io format with optional acknowledgment callbacks.

#### Client → Server Events

```typescript
// Join a drawing room
socket.emit('join_room', roomId: string, (error?: string) => void)

// Drawing - In progress (throttled, may be dropped)
socket.emit('draw_line', stroke: Stroke, () => void)

// Drawing - Final (reliable delivery)
socket.emit('draw_finish', stroke: Stroke, () => void)

// Erasing
socket.emit('erase', stroke: Stroke, () => void)

// Cursor position (high frequency, volatile, may drop)
socket.emit('cursor_move', {x, y}: Point)

// Undo
socket.emit('undo', (history?: DrawingAction[]) => void)

// Redo
socket.emit('redo', (history?: DrawingAction[]) => void)

// Clear entire canvas
socket.emit('clear_canvas', () => void)
```

#### Server → Client Events

```typescript
// Full history sync (on join, undo, redo)
socket.emit('history_sync', history: DrawingAction[])

// Remote drawing stroke
socket.emit('draw_line', stroke: Stroke)

// Remote eraser stroke
socket.emit('erase', stroke: Stroke)

// Remote cursor position
socket.emit('cursor_update', cursor: CursorPosition)

// Updated users list
socket.emit('users_update', users: User[])

// Canvas cleared by someone
socket.emit('canvas_cleared')
```

### Data Structures

```typescript
// Stroke: Single drawing action
interface Stroke {
    id: string;                    // Unique ID (UUID)
    userId: string;                // Socket ID of drawer
    color: string;                 // Hex color (#RRGGBB)
    width: number;                 // Stroke width in pixels
    points: Point[];               // Array of coordinates
    isFinished: boolean;           // Completion flag
    timestamp?: number;            // When created (Date.now())
}

// DrawingAction: Stored history entry
interface DrawingAction {
    id: string;                    // Unique action ID
    type: DrawingActionType;       // 'stroke_draw' | 'stroke_erase' | 'clear_all'
    userId: string;                // Who performed action
    timestamp: number;             // When performed
    data: any;                     // Stroke or other action data
}

// CursorPosition: Remote cursor info
interface CursorPosition {
    userId: string;                // User's socket ID
    x: number;                     // X coordinate
    y: number;                     // Y coordinate
    color: string;                 // User's assigned color
    name: string;                  // User name
}

// User: User in room
interface User {
    id: string;                    // Socket ID
    color: string;                 // Assigned color
    name: string;                  // Display name
}
```

## Undo/Redo Strategy in Detail

### Challenge Statement

**Problem**: How to implement global undo/redo when any user can undo any other user's stroke?

Example problematic scenario:
```
Timeline:
t=0ms  User A draws stroke SA
t=50ms User B draws stroke SB
t=100ms User A draws stroke SA2
t=150ms User A hits UNDO

What should happen?
- If LIFO: Undo SA2 ✓ (makes sense)
- But what if User A undoes multiple times?
- Should it undo SA2, then SA, then SB?
- Or stop at SA2 and SA (only their own)?
```

### Our Solution

**Strategy: Last-In-First-Out (LIFO) Global Undo**

1. **Single Unified History**: One ordered list of all actions, regardless of who performed them
   ```
   History = [ActionA, ActionB, ActionA2, ...]
   ```

2. **Immutable History**: Never delete actions, use stacks
   ```
   history: [Action1, Action2, Action3]  // Main history
   redoStack: []                          // Undone actions (empty initially)
   ```

3. **Undo Operation**: Pop from history, push to redo stack
   ```
   Before: history=[A,B,C], redoStack=[]
   After undo: history=[A,B], redoStack=[C]
   ```

4. **Redo Operation**: Pop from redo stack, push back to history
   ```
   Before: history=[A,B], redoStack=[C]
   After redo: history=[A,B,C], redoStack=[]
   ```

5. **Full Rebuild**: All clients rebuild canvas from new history
   ```
   canvas.clear()
   for each action in history:
       render(action)
   ```

### Why This Works

**Consistency**: All users always rebuild from same history array → same visual result

**Simplicity**: LIFO is intuitive and matches user expectations

**Global Coordination**: No need for complex OT (Operational Transform) algorithms

**Fairness**: Everyone's strokes treated equally - no special user rules

### Conflict Resolution

Our global undo/redo doesn't create "conflicts" in the traditional sense:

- **Overlapping Strokes**: Standard z-ordering (last drawn on top) - Canvas handles automatically
- **Simultaneous Drawing**: Timestamps order actions deterministically
- **Erase + Draw**: Both are actions in history, undo/redo applies to both

Example:
```
t=0ms  User A draws red line (0,0) to (100,100)
t=20ms User B draws blue line (50,50) to (150,50)  [overlaps red at (50,100)]

Visual result: Blue line on top in overlap area (correct)

If User A undoes:
t=1000ms User A hits UNDO

Result: Blue line remains, red line disappears
History: [UserB_stroke]
redo_stack: [UserA_stroke]

Consistent across all users ✓
```

## Performance Optimization Decisions

### 1. Event Throttling (20ms)

**Why**: Mouse events fire at ~60Hz (16ms per event) on modern browsers

**Without Throttling**:
- 60 draw_line events per second
- Server broadcasts to all users
- Network saturation for 3+ users
- 5-10 Mbps bandwidth per user

**With Throttling**:
- Max 50 draw_line events per second (every 20ms)
- Actually ~3-5 events per second in practice
- 50-100 kbps bandwidth per user
- **Reduction: 50-100x less data**

**Code**:
```typescript
let lastEmitTime = 0;
const EMIT_THROTTLE = 20;

canvasEl.addEventListener("mousemove", (e) => {
    // Draw locally (instant)
    canvas.drawStroke(currentStroke);
    
    // Emit throttled
    const now = Date.now();
    if (now - lastEmitTime > EMIT_THROTTLE) {
        socket.emitDraw(currentStroke);
        lastEmitTime = now;
    }
});
```

**Trade-off**: Remote strokes appear in bursts every 20ms, but imperceptible to human eye

### 2. Volatile Events for Cursor Updates

**Why**: Cursor position is non-critical, high frequency

**Volatile Mode**:
- Socket.io drops packets if network congested
- Prevents message queue buildup
- Maintains responsiveness

**Code**:
```typescript
// Server broadcasts cursor updates as volatile
socket.broadcast.to(roomId).volatile.emit('cursor_update', cursor);
```

**Benefit**: Even on slow networks, drawing remains smooth because cursor drops aren't critical

### 3. Acknowledgment Callbacks

**Why**: Ensure final stroke is stored reliably

**Code**:
```typescript
// Unreliable throttled updates
socket.emitDraw(currentStroke);  // May be dropped

// Reliable final stroke
socket.emitFinish(currentStroke);  // Waits for ACK

// Server side
socket.on('draw_finish', (data, ack) => {
    history.addStroke(data);
    ack?.();  // Send acknowledgment
});
```

**Benefit**: Guarantees strokes are stored while reducing overhead

### 4. Client-Side Prediction (Immediate Local Draw)

**Why**: Mask network latency

**Timeline**:
```
Network latency: 30-80ms
Human perception threshold: ~100ms

Without prediction:
User draws → emit to server → broadcast to self → render
  0ms         20ms throttle   +30-80ms net        +10ms render
Total: ~50-110ms → User notices delay ❌

With prediction:
User draws → render locally → emit to server → broadcast → render
  0ms        +0ms (instant)   20ms throttle  +30-80ms   +10ms (redundant)
Total: ~0ms perceived → Feels instant ✓
```

**Code**:
```typescript
canvas.drawStroke(currentStroke);  // Immediate
socket.emitDraw(currentStroke);    // Background async
```

### 5. Offscreen Canvas Layers

**Why**: Efficient eraser composition

**Standard Approach**:
- Erase: Re-render entire canvas, skip erased area
- Performance: O(n) where n = strokes

**Our Approach**:
```typescript
// Draw to offscreen layer
const ctx = layers.drawing;
ctx.globalCompositeOperation = 'destination-out';
ctx.strokeStyle = 'rgba(0,0,0,1)';
ctx.stroke();  // Removes pixels

// Copy back to main canvas
this.ctx.drawImage(this.layerCanvases.drawing, 0, 0);
```

**Benefit**: Eraser uses canvas composition for pixel-perfect removal

### 6. Quadratic Curve Path Smoothing

**Why**: Linear interpolation looks jagged on high-speed movements

**Standard** (lineTo):
```
Point 1 (0,0)
Point 2 (10,0)
Point 3 (20,0)
→ Straight line segments
```

**Our Approach** (quadraticCurveTo):
```
Point 1 (0,0)
Point 2 (10,0)        ← Control point
Point 3 (20,0)
→ Smooth curve through points
```

**Code**:
```typescript
for (let i = 1; i < stroke.points.length; i++) {
    const curr = stroke.points[i];
    const prev = stroke.points[i - 1];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    
    // Smooth curve instead of line
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
}
```

**Benefit**: Strokes feel natural and smooth even with sparse sample points

## Scalability Analysis

### Current Implementation (Single Server)

**Bottleneck**: Server CPU and WebSocket connections

**Capacity**:
- ~100 concurrent rooms (depending on drawing activity)
- ~1000 concurrent users (5-10 users per room average)
- ~1000 messages/second total
- Server CPU: <20% on modern hardware

**Limits Reached At**:
- ~10,000 messages/second (CPU-bound)
- ~10,000 concurrent WebSocket connections (file descriptor limit)

### Scaling to 1000 Concurrent Users

**Strategy 1: Horizontal Scaling (Multiple Servers)**

```
Load Balancer (Round-robin or sticky sessions)
    ↓
┌────────────────────────────────────────────┐
│ Server 1    │ Server 2    │ Server 3       │
│ Rooms:      │ Rooms:      │ Rooms:         │
│ 1-33        │ 34-66       │ 67-100         │
│ ~300 users  │ ~300 users  │ ~300 users     │
└────────────────────────────────────────────┘
    ↑
    └─────────────── Cross-server Room Sync (Redis) ────────────
```

**Strategy 2: Room Sharding**

- Each server owns subset of rooms
- Sticky sessions (user → same server)
- Redis for room discovery and cross-server drawing
- Inter-server drawing events: ~100ms latency

**Estimated Capacity**: 3 servers × 1000 users = 3000 concurrent users

### Further Improvements

1. **UDP for cursor updates** (instead of TCP WebSockets)
   - Lower latency, acceptable packet loss
   - Extra 20-30% throughput

2. **Compression** (gzip on history_sync)
   - 5-10x smaller history payloads
   - Saves bandwidth on join

3. **Incremental history** (send only since timestamp)
   - Instead of full history, send only recent actions
   - Especially helpful for large histories

4. **Worker threads** (for rendering)
   - Offload canvas rendering to separate thread
   - Free up main thread for message processing

## Security Considerations

### Current Implementation

**Security Posture**: Not suitable for sensitive data

**Vulnerabilities**:
1. **No authentication**: Anyone can join as any user
2. **No authorization**: All users can clear canvas
3. **No validation**: Stroke data not verified
4. **No encryption**: Data sent in plaintext (unless HTTPS/WSS)

### Mitigation Strategies

1. **Authentication**:
   ```typescript
   socket.on('connect', (socket) => {
       const token = socket.handshake.auth.token;
       const user = verifyToken(token);
       if (!user) socket.disconnect();
   });
   ```

2. **Authorization**:
   ```typescript
   socket.on('clear_canvas', (socket) => {
       if (!socket.data.user.canModerate) return;
       // ... clear
   });
   ```

3. **Input Validation**:
   ```typescript
   socket.on('draw_line', (data, socket) => {
       if (!isValidStroke(data)) return;
       // Validate: color in range, width in range, points reasonable
   });
   ```

4. **TLS/SSL**:
   - Use WSS (WebSocket Secure) instead of WS
   - Automatic with HTTPS endpoints

## Monitoring & Debugging

### Metrics to Track

- **Connection rate**: New users joining per minute
- **Message rate**: Events per second
- **Latency**: P50, P95, P99 latencies
- **Error rate**: Failed deliveries
- **Memory usage**: Per server and global
- **CPU usage**: Per server

### Debug Techniques

1. **Console logging** (already in code):
   ```typescript
   console.log(`👤 User joined: ${user.id}`);
   ```

2. **Socket.io debugger**:
   ```javascript
   // In browser console
   localStorage.debug = 'socket.io-client:*'
   ```

3. **Network inspector**:
   - Chrome DevTools → Network → WS
   - See actual WebSocket messages

4. **Server logging**:
   ```typescript
   socket.on('draw_line', (data) => {
       console.log(`📝 Draw from ${socket.id}: ${data.points.length} points`);
   });
   ```

---

## Summary

This architecture prioritizes:
- **Real-time responsiveness** over perfect consistency
- **User experience** over resource optimization  
- **Code simplicity** over advanced algorithms
- **Horizontal scalability** for future growth

The system handles multi-user drawing with global undo/redo through a simple but effective approach: maintain a single ordered history, rebuild state when needed, and let the Canvas API handle rendering details.
