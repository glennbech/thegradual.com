# TheGradual - Gym Tracker

## CRITICAL RULES

- ⛔ **NEVER** use AWS CLI to modify infrastructure - use Terraform only
- ✅ Use AWS CLI ONLY for read-only operations (describe, get, list)
- Don't invalidate CloudFront cache (0 TTL configured)
- Always document shipped features
- ⛔ **NEVER** reorder or change existing exercise IDs in `exercises.json` - they are used in saved workouts/sessions
  - Changing exercise IDs will break existing user data (sessions reference exercises by ID)
  - Only ADD new exercises with sequential IDs (e.g., `arms-11`, `chest-11`)
  - Never delete or modify existing exercise IDs

## Project Overview

TheGradual is a **scientifically-oriented PWA gym tracker** for logging workouts and tracking progress.

**Core Features:**
- 70+ Exercise Database (6 muscle groups: Chest, Back, Legs, Shoulders, Arms, Core)
- 12+ Workout Templates
- Live session logging with set-by-set tracking
- Session history and volume calculations
- Mobile-first responsive design

## Architecture

**Stack:**
- Frontend: React 18 + Vite + Tailwind CSS + Framer Motion
- State: localStorage (offline-first) → DynamoDB (cloud sync)
- Backend: API Gateway → Lambda (Go) → DynamoDB
- Infrastructure: Terraform (S3 remote state, us-east-2)
- Hosting: S3 + CloudFront

**Data Flow:**
```
User → localStorage (instant) → API Gateway → Lambda → DynamoDB
```

**Lambda Build:**
```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -ldflags="-s -w" -o bootstrap .
```

**API Endpoints:**
- `GET /api/{uuid}` - Retrieve user state
- `POST /api/{uuid}` - Save user state
- `OPTIONS /api/{uuid}` - CORS

**DynamoDB Schema:**
```json
{
  "uuid": "user-id",
  "sessions": [...],
  "customExercises": [...],
  "customTemplates": [...],
  "activeSession": {...}
}
```

## Terminology

- **Exercise**: Movement definition from `exercises.json` (e.g., "Barbell Bench Press")
- **Template/Workout**: Pre-designed exercise list (no performance data) from `workoutTemplates.json`
- **Session**: Completed/in-progress workout with actual performance data
- **Session Exercise**: Exercise definition + performance data (sets/reps/weight)

## Data Model

**Two-Tier Architecture:**

1. **Static Defaults** (`src/data/*.json`):
   - `exercises.json` - 70+ default exercises
   - `workoutTemplates.json` - 12+ templates
   - Never modified at runtime

2. **User State** (localStorage):
   - `customExercises` - User-created exercises
   - `customTemplates` - Modified template copies
   - `sessions` - Workout history
   - `activeSession` - Current workout

**Pattern:** Display = Defaults + Custom
```javascript
const allExercises = [...defaultExercises, ...customExercises];
```

**Service Layer:** `src/services/` abstracts storage (easy localStorage → API migration)

## Design System

**Muscle Group Colors:**
- Chest: Pink (#EC4899)
- Back: Cyan (#06B6D4)
- Legs: Purple (#A855F7)
- Shoulders: Orange (#F97316)
- Arms: Indigo (#6366F1)
- Core: Emerald (#10B981)

**UI Philosophy:** Flat, minimalist 2D design
- Dark backgrounds (#1F2937, #111827)
- White/gray text (#FFFFFF, #E5E7EB)
- Use muscle colors ONLY for semantic meaning (badges, categories)
- NO gradients, 3D effects, or decorative colors
- Tailwind spacing scale (4, 8, 12, 16, 24, 32)

**Active Session UX:** Checkbox-first design
- 90% of interactions: Check off pre-planned sets
- 10% of interactions: Add extra sets

## File Structure

```
src/
├── data/
│   ├── exercises.json
│   └── workoutTemplates.json
├── services/
│   ├── exerciseService.js
│   └── stateService.js
├── components/
│   ├── SessionPlanner.jsx
│   ├── ExerciseLogger.jsx
│   ├── SessionHistory.jsx
│   └── [modals/cards]
├── hooks/
│   └── useLocalStorage.js
└── utils/
    └── animations.js
```

## Development

**Commands:**
```bash
npm run dev      # Dev server (localhost:5173)
npm run build    # Production build
npm run preview  # Preview build
```

**Pre-Completion Checklist:**
- [ ] `npm run build` passes
- [ ] No ESLint errors
- [ ] No browser console errors
- [ ] Changes render correctly

**Deploy:**
```bash
./terraform-init.sh        # Initialize state
cd lambda-user-state && make package
cd ../terraform && terraform apply
```

## User Interface & Functionality

> **Note:** Keep this section updated when making UI changes to maintain accurate feature documentation.

### Navigation Structure

**5 Main Pages** (bottom navigation):
1. **Work Out** (`/`) - Choose and start workouts
2. **Plan** - Browse exercises, create custom workouts
3. **Logger** - Active session logging (only visible during workout)
4. **History** - View completed sessions
5. **Analyze** - Progress metrics and strength analytics
6. **Profile** - Account info, cloud sync, data export

**Global UI Elements:**
- **Header:** Logo (clickable home), auth button/avatar
- **Active Session Header:** Appears when workout in progress (sticky, shows progress, timer, resume button)
- **Bottom Nav:** Always visible, 5 tabs with icons

### Page Breakdown

#### 1. Work Out (Home Page)
**Component:** `SessionPlanner.jsx`

**UI Elements:**
- Hero section with rotating background images
- Workout template cards (custom + built-in)
  - Template name, description, muscle badges
  - Duration, exercise count
  - Edit/Delete buttons

**User Actions:**
- Click template → Opens **Workout Preview Modal** (exercise list, "START WORKOUT" button)
- Edit template → Navigates to Plan page with template loaded
- Delete custom template → Confirmation dialog

**Workflow:** Browse → Preview → Start Session

---

#### 2. Plan Page
**Component:** `Plan.jsx`

**UI Elements:**
- Search bar (filter exercises)
- Category filter chips (All, Chest, Back, Legs, Shoulders, Arms, Core)
- Exercise grid (1-3 columns, responsive)
  - Exercise cards with "+" button
  - Custom exercises show delete option
- Bottom collapsible panel: "Your Workout"
  - Selected exercises (draggable reorder)
  - Save button

**User Actions:**
- Search/filter exercises
- Add exercise to workout (+ button)
- Remove exercise (X button)
- Reorder exercises (drag handles)
- Save → Opens **Save Workout Modal** (name, description, difficulty, duration)
- Create custom exercise (when search has no results)
- Delete custom exercises

**Workflow:** Browse → Select → Organize → Save Template

---

#### 3. Workout Logger
**Components:** `SessionContainer.jsx` → `ExerciseLogger.jsx`

**UI Elements:**
- **Active Session Header** (sticky):
  - Exercise progress (e.g., "3/8")
  - Current exercise name (color-coded)
  - Timer (exercise/rest modes)
  - Discard button
- Previous session banner (shows last performance)
- **Sets List:**
  - Planned sets (unchecked, editable)
  - Completed sets (checked, locked)
  - Checkbox, reps × weight, volume, set type badge
  - Rest duration (if completed)
  - Tap uncompleted set to edit inline
- Add set form (expandable)
- Navigation buttons (Previous/Next Exercise, Complete Workout)

**User Actions:**
- **Primary:** Click checkbox to complete set → Confetti + rest timer (90s countdown)
- Tap set to edit reps/weight inline
- Add extra sets (+ button)
- Delete sets
- Navigate between exercises (← / →)
- View exercise details (info icon)
- Complete workout → **Complete Workout Dialog** (warns if sets incomplete)
- Discard workout → Confirmation dialog

**Workflow:** Check Sets → Rest → Next Exercise → Complete → Celebration

**Timer Behavior:**
- Exercise mode: Counts up, black header
- Rest mode: Counts down from 90s, orange header
- Auto-switches on set completion
- Persists when navigating away

---

#### 4. History Page
**Component:** `SessionHistory.jsx` + `SessionDetailSheet.jsx`

**UI Elements:**
- Page header + session count
- **Bubble Calendar:** Visual calendar with colored bubbles for workout days
- **Session Cards** (tap to open bottom sheet):
  - Template name/date header
  - Muscle group badges
  - Quick stats: Sets / Reps / Volume
  - Date, exercise count, "Again" button
  - Delete button

**Bottom Sheet (slides up from bottom when card tapped):**
- Drag handle (swipe down to dismiss)
- Session name/date header
- Action buttons row:
  - **"Again"** - Start new session with same exercises (primary, black button)
  - **"Save Template"** - Create workout template from session (secondary, outlined)
  - **Delete** - Remove session (red outlined)
- Scrollable content:
  - Session timeline visualization
  - Exercise breakdown with stats
  - Inline set editing (tap set to edit reps/weight)

**User Actions:**
- Tap card → Opens bottom sheet
- Swipe down / tap backdrop → Close sheet
- "Again" button → Starts new session with same exercises
- **"Save Template" button → Opens template creation modal** (new feature!)
- Delete session → Confirmation modal
- Edit individual sets (tap set in sheet)
- Load more sessions (pagination)

**Workflow:** Browse History → Tap Card → Bottom Sheet Opens → Actions (Again/Save Template/Delete) → Edit Data

**Template Creation from History:**
1. Tap session card → Bottom sheet opens
2. Tap "Save Template" button
3. Modal opens with pre-filled data:
   - Template name (defaults to session name or "Workout from {date}")
   - Description
   - Difficulty
   - Duration
   - Exercise list (auto-populated from session)
4. Adjust details, tap "Create Template"
5. Template appears on Work Out page

---

#### 5. Analyze Page
**Component:** `Analyze.jsx`

**UI Elements:**
- **Personal Records Section:** Achievement cards with trophies
- **Exercise Progress Grid:** 3-column cards showing:
  - Exercise name (muscle-colored)
  - Current stats (best weight, total volume, sessions)
  - Trend indicator (↑ / → / ↓)
- **Estimated 1RM Section:** Expandable cards for exercises with strength standards
  - Current e1RM (Estimated 1 Rep Max)
  - Strength level badge (Beginner/Intermediate/Advanced/Elite)
  - Progress bar to next level
  - Sessions tracked
  - **Expanded view:**
    - Stats grid (Latest/Best/Gain)
    - Progression rate (kg/month)
    - e1RM line chart
    - Formula breakdown (Epley/Brzycki/Lombardi)
- Info section explaining 1RM methodology

**User Actions:**
- Click exercise progress card → **Exercise Progress Detail Modal** (full history, volume chart)
- Expand 1RM card → View detailed metrics and progression chart
- View personal records

**Workflow:** View Overview → Drill Down → Analyze Progress

---

#### 6. Profile Page
**Component:** `Profile.jsx`

**Unauthenticated State:**
- Anonymous avatar
- "Sign In to unlock cloud features" prompt
- Benefits list (cloud sync, backup, security)
- "Sign In Now" button

**Authenticated State:**
- Profile picture/initial avatar
- User name + "Member since" date
- User details cards (email, plan, identity ID)
- Cloud sync status (green "Connected" indicator)
- Debug info (dev mode only): LocalStorage stats, AWS config, ID token
- "Download All Your Data" button (exports JSON)
- "Sign Out" button

**User Actions:**
- Sign in (unauthenticated)
- Download data export
- Sign out
- View sync status

---

### Key User Workflows

**Starting a Workout:**
1. Work Out page → Click template → Preview modal → START WORKOUT
2. Session initializes with pre-populated sets (from previous session if available)
3. Navigate to Logger → Timer starts

**Logging Sets:**
1. View planned sets (checkboxes)
2. Perform set, click checkbox
3. Confetti + 90s rest timer (orange header)
4. Rest complete → Confetti + back to exercise mode
5. Repeat for all sets
6. Next Exercise → Repeat
7. Complete Workout → Confirmation → Massive confetti → Save to history

**Creating Custom Workout:**
1. Plan page → Search/filter exercises
2. Click + to add exercises
3. Reorder in bottom panel
4. Save → Fill details (name, description, difficulty, duration)
5. Template appears on Work Out page

**Resuming Abandoned Session:**
1. Navigate away from Logger
2. Active Session Header remains visible (sticky)
3. Click "Resume" button
4. Returns to Logger with state preserved

---

### Data Models (UI State)

**Active Session:**
```javascript
{
  id: "uuid",
  exercises: [
    {
      id: "chest-1",
      name: "Barbell Bench Press",
      category: "Chest",
      sets: [
        {
          reps: 10,
          weight: 80,
          completed: false,  // Planned (unchecked)
          plannedFromPrevious: true,
          setType: "working"
        },
        {
          reps: 8,
          weight: 85,
          completed: true,  // Completed (checked)
          completedAt: "2025-11-26T10:30:00Z",
          restDuration: 90,
          setType: "working"
        }
      ]
    }
  ],
  templateReference: {
    templateId: "push-day",
    templateName: "Push Day"
  },
  currentExerciseIndex: 0,
  createdAt: "2025-11-26T10:00:00Z",
  status: "in-progress"
}
```

**Completed Session:**
- Same structure as active session
- All sets marked `completed: true`
- Includes `completedAt` timestamp
- Status: `"completed"`

---

### Interaction Patterns

**Checkbox-First UX:**
- Primary interaction: Check off planned sets (90% of use)
- Secondary: Add extra sets (10% of use)
- Unchecked: White bg, black border, set number
- Checked: Black bg, white checkmark
- Triggers: Confetti + rest timer

**Animations (Framer Motion):**
- Page transitions: Fade + slide
- Card hover: Lift up
- Button tap: Scale down (0.95-0.98)
- Bottom sheet: Slide up from bottom (spring animation)
- List items: Stagger
- **Confetti:** Set completion, exercise completion, workout completion (massive)

**Bottom Sheet Pattern:**
- Slides up from bottom (spring physics)
- 85% max screen height
- Draggable (swipe down to dismiss, 150px threshold)
- Backdrop blur + semi-transparent overlay
- Scrollable content area
- Header with close button
- Action buttons at top

**Timer States:**
- Exercise: Counts up, black header, stopwatch icon
- Rest: Counts down from 90s, orange header, timer icon
- Continues when navigating away from Logger
- Reset on new exercise

**Edit Patterns:**
- Inline editing: Tap element → Edit → Save/Cancel
- Modal editing: Complex forms (templates, exercise creation)
- Bottom sheet: View details, actions (modern mobile pattern)
- Auto-select on focus (numeric inputs)

## Key Patterns

**useLocalStorage Hook:**
```javascript
const [sessions, setSessions] = useLocalStorage('sessions', []);
setSessions([...sessions, newSession]); // Auto-persists
```

**Framer Motion Animations:**
```javascript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
/>
```

**Tailwind Utilities:**
```jsx
<div className="flex items-center gap-4">
<div className="grid grid-cols-1 md:grid-cols-2">
<button className="bg-white hover:bg-gray-100 px-4 py-2 rounded">
```

## Lessons Learned

### Terraform: S3 Lifecycle Rules
**Problem:** Parameter validation failures
**Solution:**
- Use lowercase `id` in Terraform (not `Id`)
- Always include `filter {}` (even for all objects)
```hcl
lifecycle_rule {
  id     = "cleanup"
  status = "Enabled"
  filter {}  # Required!
  noncurrent_version_expiration {
    noncurrent_days = 90
  }
}
```

### Best Practices
1. Run `terraform validate` before `terraform apply`
2. Check AWS docs for case-sensitive parameters
3. Document errors immediately
4. Test incrementally

### Mobile UX Patterns
**Bottom Navigation Spacing:**
- Bottom navigation is 64px tall (`h-16`)
- Fixed panels positioned with `bottom-16` to sit above nav
- Scrollable content inside panels needs extra bottom padding (`pb-8` or more)
- Example: Plan page workout panel uses `pt-4 pb-8` to ensure last exercise is visible

**Bottom Sheets (2025 Best Practice):**
- Replaced expandable cards with bottom sheets for better mobile UX
- Bottom sheets don't disrupt page scroll position
- Swipe-to-dismiss gesture (threshold: 150px)
- Spring animation (damping: 30, stiffness: 300)
- Max height: 85vh to ensure visibility
- Used in: History page (SessionDetailSheet.jsx)
