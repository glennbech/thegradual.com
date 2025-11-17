# StateManager Architecture Guide

## Overview

All persistence logic is now centralized in **StateManager** - a singleton class that manages all user state with an API-first, localStorage-cache architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYER                           │
│  React Components use hooks or services                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   ABSTRACTION LAYER                          │
│  • useStateManager hooks (React integration)                │
│  • stateService (familiar service API)                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   STATEMANAGER (CORE)                        │
│  Single source of truth for ALL persistence logic           │
│  • API-first (cloud is source of truth)                     │
│  • localStorage as fast cache                               │
│  • Debounced saves (2s)                                     │
│  • Offline support                                          │
│  • State change subscriptions                               │
└─────────────────────────────────────────────────────────────┘
           ↓                            ↓
    ┌──────────┐                 ┌──────────────┐
    │   API    │                 │ localStorage │
    │ (Cloud)  │                 │   (Cache)    │
    └──────────┘                 └──────────────┘
```

## How It Works

### 1. API-First Strategy

- **Read**: Try API first, fallback to cache if offline
- **Write**: Save to API immediately (debounced), update cache on success
- **Offline**: Gracefully degrades to cache-only mode

### 2. Debouncing

Writes are debounced to prevent API spam:
```javascript
// Add 3 sets rapidly
await stateManager.setActiveSession(session1); // Timer starts
await stateManager.setActiveSession(session2); // Timer resets
await stateManager.setActiveSession(session3); // Timer resets
// ... wait 2 seconds ...
// Single API call saves all changes
```

### 3. State Subscriptions

Components can subscribe to state changes:
```javascript
const unsubscribe = StateManager.subscribe('sessions', (newSessions) => {
  console.log('Sessions updated:', newSessions);
});
```

## Usage Examples

### Option 1: Use Services (Recommended for existing code)

```javascript
import { sessionService, exerciseService, templateService } from './services/stateService';

// Sessions
const sessions = await sessionService.getAll();
const active = await sessionService.getActive();
await sessionService.create(newSession);
await sessionService.update(id, updates);
await sessionService.complete(id);
await sessionService.delete(id);

// Exercises
const exercises = await exerciseService.getAll(); // default + custom
await exerciseService.create(exercise);
await exerciseService.update(id, updates);
await exerciseService.delete(id);

// Templates
const templates = await templateService.getAll();
await templateService.createFromSession(session, 'My Template');
```

### Option 2: Use React Hooks (Recommended for new code)

```javascript
import { useSessions, useActiveSession, useSyncStatus } from './hooks/useStateManager';

function MyComponent() {
  const { sessions, loading, error, deleteSession } = useSessions();
  const { activeSession, setActiveSession } = useActiveSession();
  const { isOnline, lastSync, forceSync } = useSyncStatus();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Online: {isOnline ? 'Yes' : 'No'}</p>
      <p>Last sync: {lastSync?.toLocaleString()}</p>
      <button onClick={forceSync}>Sync Now</button>
    </div>
  );
}
```

### Option 3: Use StateManager Directly (Advanced)

```javascript
import StateManager from './services/StateManager';

// Initialize on app startup
await StateManager.init();

// Direct access
const sessions = await StateManager.getSessions();
await StateManager.addSession(newSession);
await StateManager.setActiveSession(session);
await StateManager.forceSyncToAPI();
```

## Migration Path

### Step 1: Initialize StateManager on App Startup

```javascript
// App.jsx
import { initializeState } from './services/stateService';

function App() {
  useEffect(() => {
    initializeState().then(() => {
      console.log('StateManager initialized');
    });
  }, []);
}
```

### Step 2: Replace Old Hooks/Services

**Before:**
```javascript
import { sessionService } from './services/exerciseService'; // OLD
import { useLocalStorage } from './hooks/useLocalStorage'; // OLD

const [sessions, setSessions] = useLocalStorage('gymbot_sessions', []);
```

**After:**
```javascript
import { sessionService } from './services/stateService'; // NEW
import { useSessions } from './hooks/useStateManager'; // NEW

const { sessions, loading, error } = useSessions();
```

### Step 3: Update Components

Components that use the old `exerciseService` need minimal changes:

**Before:**
```javascript
import { sessionService } from './services/exerciseService';

const sessions = sessionService.getAll(); // Sync
```

**After:**
```javascript
import { sessionService } from './services/stateService';

const sessions = await sessionService.getAll(); // Async
```

## Key Files

| File | Purpose |
|------|---------|
| `src/services/StateManager.js` | **Core singleton class** - All persistence logic lives here |
| `src/services/stateService.js` | Service wrappers (sessionService, exerciseService, templateService) |
| `src/hooks/useStateManager.js` | React hooks for state management |
| `src/services/apiClient.js` | Low-level API communication (used by StateManager) |

## Benefits

✅ **Single Source of Truth** - All persistence logic in one file
✅ **API-First** - Cloud is authoritative, localStorage is cache
✅ **Offline Support** - Gracefully degrades when offline
✅ **Debounced Saves** - Prevents API spam
✅ **Type Safety** - Clear method signatures
✅ **Easy Testing** - Mock StateManager singleton
✅ **Migration Friendly** - Services maintain similar API

## Data Flow

```
User adds a set
    ↓
Component calls sessionService.update()
    ↓
StateManager.setActiveSession()
    ↓
In-memory state updated immediately (this.state.activeSession = ...)
    ↓
Notify subscribers (React components re-render)
    ↓
Debounce timer starts (2 seconds)
    ↓
... user stops making changes ...
    ↓
Timer expires → saveToAPI() executes
    ↓
POST to https://api.thegradual.com/api/{uuid}
    ↓
API responds with success
    ↓
Cache updated (localStorage.setItem)
    ↓
Done!
```

## Offline Behavior

**When online:**
- Reads: Try API first, fallback to cache
- Writes: Save to API (debounced), update cache

**When offline:**
- Reads: Use cache only
- Writes: Update cache, queue for sync when online

**When reconnects:**
- Auto-sync queued changes to API

## Debugging

```javascript
// Check initialization status
console.log(StateManager.initialized);

// Check online status
console.log(StateManager.isOnlineMode());

// Get last sync time
console.log(StateManager.getLastSyncTime());

// Get full state snapshot
const state = await StateManager.getState();
console.log(state);

// Force immediate sync
await StateManager.forceSyncToAPI();
```

## Testing

```javascript
// Mock StateManager in tests
jest.mock('./services/StateManager', () => ({
  init: jest.fn().mockResolvedValue({}),
  getSessions: jest.fn().mockResolvedValue([]),
  addSession: jest.fn().mockImplementation(s => Promise.resolve(s)),
}));
```

## Performance

- **In-memory cache**: State stored in `this.state` for instant access
- **Debounced API calls**: Max 1 API call per 2 seconds during rapid changes
- **localStorage**: Only updated after successful API save
- **Subscriptions**: Efficient listener pattern (not polling)

## Next Steps

1. ✅ StateManager created
2. ✅ Services created (sessionService, exerciseService, templateService)
3. ✅ React hooks created (useSessions, useActiveSession, etc.)
4. ⏳ Update App.jsx to initialize StateManager
5. ⏳ Update components to use new services/hooks
6. ⏳ Remove old localStorage code
7. ⏳ Test end-to-end flow
