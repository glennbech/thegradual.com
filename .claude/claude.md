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
