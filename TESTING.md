# 🧪 Testing Guide

Complete guide to testing all features of the Collaborative Canvas application.

## Quick Start Test (2 minutes)

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Open two browser tabs**:
   - Tab 1: http://localhost:5173
   - Tab 2: http://localhost:5173

3. **Test basic drawing**:
   - Draw in Tab 1
   - Observe drawing appears in Tab 2
   - Draw in Tab 2
   - Observe drawing appears in Tab 1

4. **Test undo**:
   - Press Ctrl+Z in Tab 1
   - Observe last stroke removed in BOTH tabs

✅ If all above works, core functionality is working!

---

## Complete Feature Testing Checklist

### 1. Connection & Users

```
Test: Connection Status
1. Open browser console (F12)
2. Observe "✅ Connected to server" message
3. Check toolbar shows "🟢 Online" status
4. Open second tab, verify both show "🟢 Online"
5. Check users panel shows 2 users with colors

Expected:
- Connection status updates correctly
- Both tabs see each other in user list
- Each user has unique color
```

### 2. Drawing - Brush Tool

```
Test: Basic Drawing
1. Ensure "🖌️ Brush" is selected (should be default)
2. Draw a simple line on canvas
3. Check line appears instantly in current tab
4. Check line appears in other tab within ~100ms

Expected:
- Line is smooth and continuous
- Color matches the selected color
- Line width matches the slider value
- Appears on remote canvas quickly
```

### 3. Drawing - Color Selection

```
Test: Color Changes
1. Click color picker, select red (#FF0000)
2. Draw a red line
3. Change color to blue (#0000FF)
4. Draw a blue line
5. Check both colors appear correctly
6. Check in other tab colors are correct

Expected:
- Color picker updates drawing color
- Colors are consistent across clients
- Tool info shows current color
```

### 4. Drawing - Width Adjustment

```
Test: Stroke Width
1. Set width slider to minimum (1px)
2. Draw a thin line
3. Set width slider to maximum (50px)
4. Draw a thick line
5. Check width changes apply to new strokes only

Expected:
- Stroke width matches slider
- Thin lines are barely visible
- Thick lines are clearly visible
- Width display updates (shows number)
```

### 5. Drawing - Eraser Tool

```
Test: Eraser Functionality
1. Select "🧹 Eraser" button
2. Draw with brush on canvas
3. Use eraser to erase part of the drawing
4. Check erased area is removed from canvas
5. Switch back to brush, draw over erased area
6. Verify in other tab eraser worked correctly

Expected:
- Eraser button becomes active/highlighted
- Erasing removes content (transparent)
- Can switch between tools freely
- Eraser syncs to other clients
```

### 6. Real-Time Synchronization

```
Test: Real-Time Drawing Sync
1. Open in 3 browser tabs
2. User A draws in Tab 1
3. Simultaneously, User B draws in Tab 2
4. Verify both drawings appear in Tab 3
5. Verify no data loss
6. Check drawing order is correct

Expected:
- All strokes appear on all clients
- No overlap/conflict issues
- Order matches the drawing order
- Real-time feel (not delayed)
```

### 7. Cursor Tracking

```
Test: Remote Cursor Display
1. Move mouse on canvas in Tab 1
2. Check if cursor indicator appears in Tab 2
3. Move mouse around, verify cursor follows
4. Check cursor color matches user color
5. Move quickly, verify cursor keeps up

Expected:
- Remote cursor visible as colored dot
- Shows near actual cursor position
- Updates frequently (~60Hz)
- Smooth tracking without jank
```

### 8. User Indicators

```
Test: Users Panel
1. Open application in Tab 1
2. Check users panel shows 1 user (yourself)
3. Open Tab 2, verify Tab 1 users panel now shows 2 users
4. Check both users have:
   - Unique color indicator
   - User name displayed
5. Close Tab 2, verify Tab 1 updates to show 1 user

Expected:
- Users list updates in real-time
- Colors are unique and consistent
- Names are displayed correctly
- Join/leave updates propagate
```

### 9. Undo Functionality

```
Test: Global Undo
1. User A draws 3 strokes
2. User B draws 2 strokes (canvas shows 5 strokes)
3. User A clicks Undo button
4. Observe last stroke (User B's stroke) is removed
5. Click Undo again
6. Last stroke should be removed
7. Verify in other tab same undo applies

Expected:
- Last drawn stroke is removed
- LIFO order is respected
- Works regardless of who drew the stroke
- All clients see same result
- No network errors in console
```

### 10. Redo Functionality

```
Test: Global Redo
1. Follow Undo test above (3 undos)
2. Click Redo button
3. Last undone stroke should reappear
4. Click Redo again
5. Another stroke reappears
6. Verify in other tab redo works too

Expected:
- Redo restores strokes in reverse order
- Can redo after undo
- Cannot redo without previous undo
- All clients synchronized
```

### 11. Undo/Redo Complex Scenario

```
Test: Multi-user Undo/Redo
1. User A draws stroke SA1
2. User B draws stroke SB1
3. User A draws stroke SA2
4. Canvas shows: SA1, SB1, SA2
5. User B clicks Undo
6. Canvas shows: SA1, SB1 (SA2 removed)
7. User A clicks Undo
8. Canvas shows: SA1 (SB1 removed)
9. User B clicks Redo
10. Canvas shows: SA1, SB1 (restored)

Expected:
- Undo/redo treats all strokes equally
- Undo goes LIFO: SA2 → SB1 → SA1
- Redo reverses the order
- Works across different users
- No conflicts or data loss
```

### 12. Clear Canvas

```
Test: Clear Canvas Feature
1. Draw multiple strokes on canvas
2. Click "🗑️ Clear" button
3. Confirm in dialog box
4. Canvas should be completely empty
5. Check in other tab canvas is also empty
6. Try undoing clear (should restore all strokes)

Expected:
- Clear removes all content
- Requires confirmation to prevent accidents
- Affects all users
- Can be undone
- Confirmation dialog appears
```

### 13. Keyboard Shortcuts

```
Test: Keyboard Controls
1. Draw something on canvas
2. Press Ctrl+Z → Undo (should work)
3. Press Ctrl+Y → Redo (should work)
4. Press B → Switch to Brush tool
5. Press E → Switch to Eraser tool
6. Press C → Open clear confirmation
7. Draw and press Ctrl+Z multiple times
8. Verify all shortcuts work

Expected:
- All shortcuts function
- Fast keyboard control
- Works across browsers
- No page reload on shortcuts
```

### 14. Connection Loss & Reconnection

```
Test: Network Resilience
1. Open in browser, draw something
2. Disconnect network (unplug internet or use DevTools)
3. Attempt to draw (should fail silently)
4. Check status shows "🔴 Offline"
5. Reconnect network
6. Wait 2-3 seconds
7. Status should show "🟢 Online" again
8. Draw something new

Expected:
- Handles offline gracefully
- Status indicator updates
- Reconnects automatically
- Can continue drawing after reconnect
- No crashes or errors
```

### 15. Multiple Rooms (Advanced)

```
Test: Room Isolation
1. Open Tab 1, Tab 2, Tab 3 in same room 'main'
2. Draw in Tab 1 (appears in Tab 2, 3)
3. Open new browser Tab 4 as private window
4. Manually modify SocketManager to join room 'room2'
5. Draw in Tab 4 (should NOT appear in Tab 1,2,3)
6. Return to 'main' room in Tab 4
7. Verify Tab 4 sees all previous draws from other tabs

Expected:
- Rooms are completely isolated
- Different rooms have separate histories
- Switching rooms works correctly
- No cross-talk between rooms
```

### 16. Canvas Download

```
Test: Download Feature
1. Draw something on canvas (multiple colors, tools)
2. Click "⬇️ Download" button
3. Browser should download PNG file
4. Open the PNG in image viewer
5. Verify all drawings are captured
6. Check image dimensions match window size

Expected:
- Download button triggers file download
- PNG file is valid and opens
- All content is preserved
- Correct file naming (timestamp)
```

### 17. Tool Selection UI

```
Test: Tool Selection Interface
1. Check Brush button has "active" styling (highlighted)
2. Click Eraser button
3. Verify Brush becomes unselected
4. Verify Eraser becomes selected
5. Draw with eraser, verify eraser works
6. Click Brush button
7. Verify tool switches back

Expected:
- Only one tool is "active" at a time
- Active button has distinct styling
- Drawing uses the selected tool
- UI accurately reflects current state
```

### 18. Help Panel

```
Test: Help & Documentation
1. Click "?" button in bottom-right
2. Help panel should open with shortcuts
3. Verify all shortcuts are listed:
   - Ctrl+Z (Undo)
   - Ctrl+Y (Redo)
   - B (Brush)
   - E (Eraser)
   - C (Clear)
4. Click "?" again to close
5. Click "?" to reopen (should toggle)

Expected:
- Help button visible in corner
- Panel opens/closes on click
- All shortcuts documented
- Easy to access reference
```

### 19. Responsive Design

```
Test: Mobile/Responsive
1. Open app in desktop browser
2. Resize window to mobile size (375x667)
3. Check UI is still usable
4. Buttons and inputs are accessible
5. Canvas fills remaining space
6. Try drawing on mobile size
7. Test on actual mobile device

Expected:
- Toolbar adjusts for small screen
- User list might hide on very small screens
- All buttons remain clickable
- Drawing still works on mobile
- Touch events work correctly
```

### 20. Performance Under Load

```
Test: Performance with Heavy Drawing
1. Draw for 5 minutes continuously
2. Monitor performance:
   - Check browser DevTools Performance tab
   - Look for FPS (should be ~60 for drawing)
   - Check memory usage
3. Try undo/redo with large history
4. Should remain responsive
5. Connect 5+ browser tabs, all draw together

Expected:
- No FPS drops while drawing
- Memory usage stable
- Undo/redo responsive even with large history
- Handles multiple concurrent users
- No crashes or memory leaks
```

---

## Browser Compatibility Testing

Test on these browsers:

- [x] **Chrome** (latest) - Primary target
- [x] **Firefox** (latest) - Should work
- [x] **Safari** (latest) - Should work
- [ ] **Edge** (latest) - Likely works
- [ ] **Mobile Safari** - Touch support tested
- [ ] **Chrome Mobile** - Touch support tested

### Known Browser Issues

- **IE/Edge (legacy)**: Not supported
- **Mobile Safari**: Touch works, may have minor UI glitches
- **Firefox**: May have slightly different rendering

---

## Error Scenarios & Recovery

### Scenario 1: Server Crash

```
Steps:
1. Start application normally
2. Kill server (Ctrl+C)
3. Try to draw in client
4. Check status shows 🔴 Offline
5. Restart server (npm run dev)
6. Client should reconnect
7. Try drawing - should work again

Expected:
- Client handles server crash gracefully
- Shows offline status
- Reconnects when server returns
- No data loss on reconnection
```

### Scenario 2: WebSocket Timeout

```
Steps:
1. Draw normally for 5 minutes
2. Open network throttling (Chrome DevTools)
3. Set connection to "Slow 3G"
4. Continue drawing
5. Check drawing still works, just slower
6. Reset to normal network

Expected:
- Application works on slow connections
- May see lag, but functional
- Recovers when connection improves
```

### Scenario 3: Rapid Join/Leave

```
Steps:
1. Rapidly open 5 tabs in succession
2. All should connect and see each other
3. Rapidly close tabs one by one
4. Other tabs should see users leave
5. Remaining tabs should be stable

Expected:
- No crashes with many joins
- User list updates correctly
- Remaining clients unaffected
```

---

## Performance Metrics

Track these metrics during testing:

### Network Metrics
- **Draw event size**: ~200 bytes per event
- **History sync size**: Varies, ~5KB per stroke on average
- **Cursor update size**: ~50 bytes

### Latency Metrics
- **Draw to render**: 30-100ms typical (depending on network)
- **Undo latency**: 100-300ms (includes full rebuild)
- **Cursor update**: 10-50ms

### System Metrics
- **Memory per user**: ~5-10MB in browser
- **CPU usage**: <5% when drawing, <1% idle
- **Canvas operations**: ~60 FPS local, sync ~50 FPS

---

## Test Report Template

Use this template to document test results:

```
DATE: ____________
TESTER: __________
VERSION: _________

Browser: Chrome 120
OS: macOS 14
Network: WiFi

RESULTS:
- Basic Drawing: ✓ PASS / ✗ FAIL
- Brush Tool: ✓ PASS / ✗ FAIL
- Eraser Tool: ✓ PASS / ✗ FAIL
- Colors: ✓ PASS / ✗ FAIL
- Undo/Redo: ✓ PASS / ✗ FAIL
- Multiple Users: ✓ PASS / ✗ FAIL
- Connection Status: ✓ PASS / ✗ FAIL
- Performance: ✓ PASS / ✗ FAIL
- Mobile: ✓ PASS / ✗ FAIL

ISSUES FOUND:
1. [Issue description]
2. [Issue description]

NOTES:
[Additional observations]
```

---

## Debugging Tips

### Browser Console Debugging

```javascript
// Check Socket.io connection status
console.log('Connected:', socket.isConnected());

// View all active users
console.log('Socket ID:', socket.getSocketId());

// Check drawing history
// (Add logging to onHistorySync callback)
```

### Server Debugging

```bash
# Check server logs for errors
# Look for error messages indicating issues

# Check WebSocket connections
# Look for "connected" / "disconnected" messages
```

### Network Debugging

```
Chrome DevTools > Network Tab:
1. Filter by "WS" to see WebSocket messages
2. Check message sizes and frequency
3. Look for errors (red messages)
4. Check timing in "Timing" tab
```

---

## Performance Benchmarks

Expected performance on modern hardware:

| Metric | Target | Acceptable | Poor |
|--------|--------|-----------|------|
| Draw FPS | 60 | 50+ | <50 |
| Draw latency | <50ms | <100ms | >100ms |
| Undo latency | <200ms | <300ms | >500ms |
| Cursor latency | <50ms | <100ms | >200ms |
| Memory per user | <20MB | <50MB | >100MB |
| Max concurrent users | 50+ | 20+ | <10 |

---

## Sign-Off

- [ ] All tests passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Ready for production

**Tested by**: ________________
**Date**: ________________
**Sign-off**: ________________

---

**Happy testing!** 🧪🎨
