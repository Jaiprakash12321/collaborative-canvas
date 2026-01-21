# 🚀 Setup & Installation Guide

## Prerequisites

Before starting, make sure you have:

- **Node.js v16 or higher** - Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for cloning the repo)
- A text editor or IDE (VS Code recommended)

### Check Installation

```bash
# Check Node version
node --version  # Should be v16+

# Check npm version
npm --version   # Should be v7+
```

## Installation Steps

### Option 1: Quick Installation (Recommended)

```bash
# 1. Clone or download the repository
git clone <repo-url>
cd collaborative-canvas

# 2. Install all dependencies at once
npm install:all

# 3. Start development servers
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

### Option 2: Manual Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd collaborative-canvas

# 2. Install server dependencies
cd server
npm install

# 3. In a new terminal, install client dependencies
cd ../client
npm install

# 4. Start the server (from server directory)
cd ../server
npm run dev

# 5. In another terminal, start the client (from client directory)
cd ../client
npm run dev
```

### Option 3: Production Build

```bash
# 1. Build the client
cd client
npm run build

# 2. Build the server
cd ../server
npm run build

# 3. Start production server
npm start

# The server will serve the built client from /public directory
# Visit http://localhost:3000
```

## Troubleshooting

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# On macOS/Linux - Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# On Windows - Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npm run dev
```

### WebSocket Connection Failed

**Problem**: `❌ Disconnected from server` in console

**Solution**:
1. Make sure server is running on port 3000
2. Check browser console for errors (F12)
3. Verify no firewall is blocking WebSocket connections
4. Try clearing browser cache (Ctrl+Shift+Delete)

### Module Not Found Errors

**Problem**: `Cannot find module 'socket.io'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For server
cd server
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

**Problem**: `Type 'any' is not assignable to type...`

**Solution**:
1. Restart TypeScript compiler: Reload VS Code
2. Check that all type definitions are installed: `npm install --save-dev @types/node`
3. Verify tsconfig.json is correct

## Configuration

### Server Configuration

Edit `.env` in the `server/` directory:

```env
# Server port (default: 3000)
PORT=3000

# Development or production
NODE_ENV=development

# CORS settings
CORS_ORIGIN=*

# WebSocket transports (websocket is primary, polling is fallback)
WS_TRANSPORTS=websocket,polling
```

### Client Configuration

For development, the client connects to `http://localhost:3000` (see SocketManager.ts).

For production deployed with server:
- Remove the hardcoded URL from SocketManager
- It will auto-connect to the same host

## Running the Application

### Development Mode

**Using combined script (recommended)**:
```bash
npm run dev
```

This starts:
- Vite dev server on http://localhost:5173 (hot reload)
- Node server on http://localhost:3000 (auto-restart with ts-node-dev)

**Manually**:
```bash
# Terminal 1: Server
cd server && npm run dev

# Terminal 2: Client
cd client && npm run dev
```

### Testing Multiplayer

1. Open http://localhost:5173 in first browser/tab
2. Open http://localhost:5173 in second browser/tab (same or different browser)
3. Start drawing in one tab - changes appear instantly in the other
4. Try all features:
   - Brush and eraser tools
   - Color/width changes
   - Undo/redo (should affect both users)
   - User list updates
   - Cursor tracking

### Production Mode

```bash
# Build and run
npm run build
npm start

# Visit http://localhost:3000
```

## Project Structure

```
collaborative-canvas/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── main.ts        # App initialization
│   │   ├── CanvasManager.ts  # Canvas drawing logic
│   │   ├── SocketManager.ts  # WebSocket client
│   │   ├── types.ts       # TypeScript definitions
│   │   └── style.css      # Styling
│   ├── index.html         # HTML entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                # Backend application
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── HistoryStore.ts # Drawing history management
│   │   ├── RoomManager.ts # Multi-room management
│   │   └── types.ts       # TypeScript definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── README.md              # Main documentation
├── ARCHITECTURE.md        # Technical architecture
├── package.json           # Root package (for dev convenience)
└── .gitignore
```

## Scripts Reference

### Root Level

```bash
npm install:all      # Install all dependencies
npm run dev          # Start dev servers (server + client)
npm run build        # Build for production
npm start            # Start production server
```

### Server (`cd server`)

```bash
npm run dev          # Development with auto-restart
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled JavaScript
```

### Client (`cd client`)

```bash
npm run dev          # Development server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally
```

## Environment Variables

### Server `.env` (optional)

```env
PORT=3000                    # Server port
NODE_ENV=development         # development or production
CORS_ORIGIN=*               # CORS allowed origins
WS_TRANSPORTS=websocket,polling  # Socket.io transports
```

Create this file or use `.env.example` as template.

## Common Tasks

### Change Drawing Canvas Size

The canvas automatically fills the browser window. To set fixed size:

**In main.ts**:
```typescript
// After canvas manager initialization
const dims = canvas.getDimensions();
console.log(`Canvas: ${dims.width}x${dims.height}`);
```

### Change Default Room

In **client/src/main.ts**:
```typescript
socket.joinRoom('my-room');  // Change 'main' to custom room
```

### Add New Drawing Tool

1. Add to **types.ts** DrawingActionType:
   ```typescript
   enum DrawingActionType {
       STROKE_DRAW = 'stroke_draw',
       STROKE_ERASE = 'stroke_erase',
       STROKE_LINE = 'stroke_line',  // New!
   }
   ```

2. Add handler in **SocketManager.ts**:
   ```typescript
   emitLine(stroke: Stroke): void {
       this.socket.emit('draw_line', stroke);
   }
   ```

3. Handle in **server/index.ts**:
   ```typescript
   socket.on('draw_line', (data: Stroke) => {
       socket.broadcast.to(currentRoomId).emit('draw_line', data);
   });
   ```

4. Add UI button in **index.html** and **main.ts**

## Performance Tuning

### If Drawing is Slow

1. **Reduce stroke width**: Users might be drawing very thick lines
2. **Reduce throttle rate**: Change in **main.ts**:
   ```typescript
   const EMIT_THROTTLE = 50;  // Increase for less updates
   ```
3. **Clear canvas occasionally**: Large history degrades performance
4. **Check network**: Very high latency causes visible lag

### If Server is Slow with Many Users

1. **Increase event throttle** (as above)
2. **Clear old rooms**: Rooms stay in memory forever
3. **Deploy on faster machine**: 8GB RAM, 4 cores minimum
4. **Use Redis** for multi-server scaling (see ARCHITECTURE.md)

## Deployment

### Deploy to Heroku

```bash
# Create Heroku app
heroku create my-collaborative-canvas

# Deploy
git push heroku main

# View logs
heroku logs -t

# Open app
heroku open
```

### Deploy to DigitalOcean App Platform

1. Push code to GitHub
2. Connect repo in DigitalOcean App Platform
3. Create web service pointing to `server/`
4. Set environment variables in dashboard
5. Deploy

### Deploy Frontend Separately (Vercel)

```bash
# Build frontend
cd client && npm run build

# Deploy dist/ folder to Vercel
# Or connect GitHub repo directly to Vercel
```

Connect backend API in environment variables or SocketManager.ts.

## Next Steps

1. **Read Documentation**:
   - [README.md](./README.md) - Feature overview
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical deep dive

2. **Test the App**:
   - Open in multiple tabs/windows
   - Try all drawing tools
   - Test undo/redo
   - Check cursor tracking

3. **Customize**:
   - Change colors in style.css
   - Add new drawing tools
   - Modify room names
   - Add authentication

4. **Deploy**:
   - Follow deployment instructions above
   - Monitor server logs
   - Test with real users

## Getting Help

If you encounter issues:

1. **Check Logs**:
   - Browser console: F12 → Console tab
   - Server console: Check terminal output

2. **Common Issues** (above in Troubleshooting)

3. **Debug Tips**:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Restart both servers
   - Check network tab in DevTools (F12 → Network)
   - Verify ports are not blocked

4. **Performance Debug**:
   - Open DevTools → Performance tab
   - Record drawing action
   - Check for bottlenecks

---

**Happy drawing!** 🎨
