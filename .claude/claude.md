# TheGradual - Your Step by Step Gym Tracker

## Project Overview

TheGradual is a **scientifically-oriented gym tracking application** designed to help users log workouts with precision and track their progress using evidence-based principles.

### What We're Building

TheGradual is a **progressive web application (PWA)** that allows gym-goers to:

1. **Plan Workouts**: Create workout sessions using pre-designed templates or by manually selecting exercises from a comprehensive database
2. **Log Performance**: Track sets, reps, and weights during live workout sessions with an intuitive logging interface
3. **Track Progress**: View historical workout data, analyze volume trends, and monitor progressive overload
4. **Learn Proper Form**: Access detailed exercise descriptions with muscle group information and technique guidance

The application is built as a **client-side single-page application (SPA)** with no backend dependency, storing all data locally in the browser's localStorage. This architecture provides:

- **Offline-first functionality**: Works without internet connection
- **Privacy**: All workout data stays on the user's device
- **Speed**: Instant data access with no server round-trips
- **API-ready design**: Service layer abstraction allows easy migration to backend API in the future

### Key Features

- **70+ Exercise Database**: Comprehensive library categorized by muscle groups (Chest, Back, Legs, Shoulders, Arms, Core)
- **12+ Workout Templates**: Pre-designed programs for various goals (strength, hypertrophy, full-body, split routines)
- **Live Session Logging**: Real-time workout tracking with set-by-set data entry
- **Session History**: Browse and analyze past workouts
- **Volume Calculations**: Automatic computation of total volume (sets × reps × weight)
- **Color-Coded UI**: Visual muscle group identification with dedicated color palette
- **Responsive Design**: Mobile-first approach, works on phones, tablets, and desktops
- **Smooth Animations**: Polished UX with Framer Motion transitions

## System Architecture

### Architecture Overview

TheGradual uses a **hybrid architecture** combining local-first storage with optional cloud sync:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       THEGRADUAL ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ FRONTEND - React SPA (Progressive Web App)                    │  │
│  │                                                                │  │
│  │  • React 18 + Vite                                             │  │
│  │  • Tailwind CSS + Framer Motion                                │  │
│  │  • LocalStorage (Primary Data Layer)                           │  │
│  │  • Service Workers (PWA, Offline Support)                      │  │
│  │  • Hosted on: S3 + CloudFront (static hosting)                 │  │
│  │                                                                │  │
│  │  Data Flow:                                                    │  │
│  │    1. User interacts with UI                                   │  │
│  │    2. Data saved to localStorage (instant)                     │  │
│  │    3. Optional sync to backend (when online)                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│                              ↕ HTTPS (API Gateway)                   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ BACKEND - Serverless AWS Infrastructure                       │  │
│  │                                                                │  │
│  │  API Gateway (REST API)                                        │  │
│  │    ↓                                                           │  │
│  │  Lambda Function (Go 1.21)                                     │  │
│  │    - Function: thegradual-user-state                           │  │
│  │    - Runtime: Go (custom runtime on AL2023)                    │  │
│  │    - Handler: main.handleRequest                               │  │
│  │    - Package: bootstrap binary (11MB → 3.4MB zipped)           │  │
│  │    ↓                                                           │  │
│  │  DynamoDB Table                                                │  │
│  │    - Table: thegradual-user-state                              │  │
│  │    - Partition Key: uuid (user identifier)                     │  │
│  │    - Attributes: sessions, customExercises, customTemplates,   │  │
│  │                  activeSession, lastUpdated                    │  │
│  │                                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ INFRASTRUCTURE - Terraform IaC                                 │  │
│  │                                                                │  │
│  │  • Terraform remote state in S3                                │  │
│  │  • Modules: lambda, dynamodb, api-gateway                      │  │
│  │  • Region: us-east-2                                           │  │
│  │                                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### AWS Infrastructure Components

#### 1. Lambda Function (`lambda-user-state/`)

**Purpose**: Handle user state CRUD operations via REST API

**Technology Stack**:
- **Language**: Go 1.21
- **Runtime**: AWS Lambda Go runtime (Amazon Linux 2023)
- **Dependencies**:
  - `github.com/aws/aws-lambda-go` - Lambda handler framework
  - `github.com/aws/aws-sdk-go` - DynamoDB client

**Build Process**:
```bash
# Build for Lambda (cross-compile for Linux AMD64)
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build \
  -tags lambda.norpc \
  -ldflags="-s -w" \
  -o bootstrap .

# Package for deployment
zip user-state.zip bootstrap
```

**API Endpoints**:
```
GET  /api/{uuid}   - Retrieve user state
POST /api/{uuid}   - Save user state
OPTIONS /api/{uuid} - CORS preflight
```

**Handler Logic** (`main.go`):
```go
type UserState struct {
    UUID            string          `json:"uuid"`
    Sessions        json.RawMessage `json:"sessions,omitempty"`
    CustomExercises json.RawMessage `json:"customExercises,omitempty"`
    CustomTemplates json.RawMessage `json:"customTemplates,omitempty"`
    ActiveSession   json.RawMessage `json:"activeSession,omitempty"`
    LastUpdated     string          `json:"lastUpdated,omitempty"`
}
```

**Environment Variables**:
- `DYNAMODB_TABLE` - DynamoDB table name (set by Terraform)

**Features**:
- CORS support for cross-origin requests
- JSON request/response handling
- Error handling with standardized responses
- Logging to CloudWatch

#### 2. DynamoDB Table

**Table Name**: `thegradual-user-state`

**Schema**:
- **Partition Key**: `uuid` (String) - User identifier
- **Attributes**: Schema-less (JSON documents stored as raw messages)

**Access Pattern**:
```
- GetItem by uuid → Retrieve user's complete state
- PutItem by uuid → Save/update user's complete state
```

**Data Structure Example**:
```json
{
  "uuid": "user-12345-test",
  "sessions": [...],           // Workout history
  "customExercises": [...],    // User-created exercises
  "customTemplates": [...],    // Modified templates
  "activeSession": {...},      // In-progress workout
  "lastUpdated": "2024-11-15T19:05:00Z"
}
```

**Capacity**:
- Billing Mode: On-demand (pay per request)
- No capacity planning required
- Auto-scales with usage

#### 3. API Gateway

**Type**: REST API

**Configuration**:
- **Endpoint**: Regional (us-east-2)
- **CORS**: Enabled for `*` (all origins)
- **Authentication**: None (public API)
- **Integration**: Lambda Proxy Integration

**Resource Structure**:
```
/api
  /{uuid}
    GET    → Lambda: handleGetState
    POST   → Lambda: handleSaveState
    OPTIONS → Lambda: CORS preflight
```

#### 4. Terraform Infrastructure

**State Management**:
- Remote state stored in S3 bucket
- Bucket name: `lambda-artifacts-{region}-{account-id}`
- State file: `terraform/terraform.tfstate`

**Deployment Workflow**:
```bash
# 1. Initialize Terraform state bucket
./terraform-init.sh

# 2. Build Lambda
cd lambda-user-state
make package

# 3. Deploy infrastructure
cd ../terraform
terraform init
terraform plan
terraform apply
```

### Data Flow Diagrams

#### User Saves Workout Data

```
┌──────────┐
│  User    │
│ Browser  │
└────┬─────┘
     │
     │ 1. Log workout in UI
     ▼
┌─────────────┐
│ localStorage │  ← Instant save (offline-first)
└─────────────┘
     │
     │ 2. Sync to cloud (when online)
     ▼
┌──────────────┐
│ API Gateway  │
│ POST /api/   │
│ {uuid}       │
└──────┬───────┘
       │
       │ 3. Invoke Lambda
       ▼
┌──────────────┐
│  Lambda      │  ← Parse JSON, validate UUID
│  Handler     │
└──────┬───────┘
       │
       │ 4. Save to database
       ▼
┌──────────────┐
│  DynamoDB    │  ← PutItem operation
│  Table       │
└──────────────┘
```

#### User Retrieves Workout History

```
┌──────────┐
│  User    │
│ Browser  │
└────┬─────┘
     │
     │ 1. Check localStorage first
     ▼
┌─────────────┐
│ localStorage │  ← Load from cache (instant)
└─────┬───────┘
     │
     │ Data exists? → Display
     │ Missing/outdated? → Fetch from API
     ▼
┌──────────────┐
│ API Gateway  │
│ GET /api/    │
│ {uuid}       │
└──────┬───────┘
       │
       │ 2. Invoke Lambda
       ▼
┌──────────────┐
│  Lambda      │  ← Retrieve from DynamoDB
│  Handler     │
└──────┬───────┘
       │
       │ 3. Fetch from database
       ▼
┌──────────────┐
│  DynamoDB    │  ← GetItem operation
│  Table       │
└──────┬───────┘
       │
       │ 4. Return user state (JSON)
       ▼
┌──────────────┐
│  Browser     │  ← Update localStorage + UI
└──────────────┘
```

### Deployment Architecture

#### Frontend Deployment (Planned)
- **Hosting**: AWS S3 (static website hosting)
- **CDN**: CloudFront (global distribution)
- **Domain**: Custom domain with Route 53
- **SSL**: ACM certificate (HTTPS)

#### Backend Deployment (Current)
- **Lambda**: Deployed via Terraform
- **Artifact Storage**: S3 bucket (`lambda-artifacts-{region}-{account}`)
- **Versioning**: Lambda versions for rollback capability
- **Monitoring**: CloudWatch Logs + Metrics

#### CI/CD Pipeline (Future)
```
GitHub Push
  ↓
GitHub Actions
  ├─ Build Lambda (Go)
  │   └─ Upload to S3
  ├─ Build Frontend (npm build)
  │   └─ Deploy to S3
  └─ Terraform Apply
      └─ Update Lambda + API Gateway
```

### Testing Infrastructure

**Test Data**: `lambda-user-state/test-data.json`
- Realistic workout sessions with multiple exercises
- Custom exercises and templates
- Active session (in-progress workout)

**Test Commands**: `lambda-user-state/test-commands.sh`
```bash
# Save user state
curl -X POST ${API_ENDPOINT}/api/${USER_UUID} \
  -H "Content-Type: application/json" \
  -d @test-data.json

# Retrieve user state
curl -X GET ${API_ENDPOINT}/api/${USER_UUID}

# Test CORS
curl -X OPTIONS ${API_ENDPOINT}/api/${USER_UUID} \
  -H "Origin: http://localhost:5173"
```

### Security Considerations

**Current** (MVP):
- Public API (no authentication)
- CORS enabled for all origins
- UUID-based data isolation (security through obscurity)

**Future Enhancements**:
- Cognito User Pools for authentication
- API Gateway authorizer (JWT validation)
- Per-user IAM policies for DynamoDB access
- Rate limiting (API Gateway throttling)
- WAF rules for DDoS protection

### Scalability & Performance

**Frontend**:
- **Offline-first**: Works without backend
- **Fast**: Data read from localStorage (0ms latency)
- **Progressive**: Syncs to cloud when online

**Backend**:
- **Serverless**: Auto-scales with Lambda concurrency
- **DynamoDB**: On-demand scaling (handles spikes automatically)
- **Global**: Can add multi-region with DynamoDB Global Tables
- **Cost-effective**: Pay only for actual usage

**Performance Metrics**:
- Lambda cold start: ~100-200ms (Go runtime)
- Lambda warm execution: ~10-50ms
- DynamoDB GetItem: ~5-10ms
- Total API latency: ~100-300ms (typical)

### Directory Structure

```
thegradual.com/
├── lambda-user-state/              # Go Lambda function
│   ├── main.go                     # Lambda handler
│   ├── go.mod                      # Go dependencies
│   ├── go.sum                      # Dependency checksums
│   ├── Makefile                    # Build automation
│   ├── test-data.json              # Realistic test data
│   └── test-commands.sh            # API test commands
│
├── terraform/                      # Infrastructure as Code
│   ├── main.tf                     # Main configuration
│   ├── variables.tf                # Input variables
│   ├── outputs.tf                  # Output values
│   ├── lambda.tf                   # Lambda resources
│   ├── dynamodb.tf                 # DynamoDB table
│   └── api-gateway.tf              # API Gateway config
│
├── terraform-init.sh               # Initialize Terraform state bucket
│
└── .claude/
    └── CLAUDE.md                   # This file
```

## Terminology

To maintain consistency across the codebase, we use these specific terms:

- **Exercise** (Definition): A type of movement with form instructions (e.g., "Barbell Bench Press" in the exercise database). This is the blueprint/definition stored in `exercises.json`.

- **Template**: A pre-designed list of exercises with no performance data. Templates define which exercises to do but contain no weights, reps, or sets. Stored in `workoutTemplates.json`.

- **Session**: A completed or in-progress workout at the gym. A session is a collection of exercises performed together ("I did a session today at the gym"). Contains actual performance data.

- **Session Exercise**: An instance of an exercise being performed within a session. This is an exercise definition (from the exercise database) combined with actual performance data (sets, reps, weights). For example: "Barbell Bench Press with 3 sets of 10 reps at 80kg performed during today's workout."

**Data Structure Example:**
```javascript
// Exercise (Definition) - in exercises.json
{
  "id": "chest-1",
  "name": "Barbell Bench Press",
  "category": "Chest",
  "description": "..."
}

// Template - in workoutTemplates.json
{
  "id": "push-day",
  "name": "Push Day",
  "exerciseIds": ["chest-1", "chest-2", "shoulders-1"]
}

// Session - in localStorage/sessions
{
  "id": "session-123",
  "startTime": "2024-01-15T10:00:00Z",
  "exercises": [
    // Session Exercise (Exercise + Performance Data)
    {
      "id": "chest-1",
      "name": "Barbell Bench Press",
      "category": "Chest",
      "sets": [
        { "reps": 10, "weight": 80, "setType": "working" },
        { "reps": 8, "weight": 85, "setType": "working" }
      ]
    }
  ]
}
```

## Scientific Approach

This application emphasizes:

- **Muscle Group Categorization**: Exercises are categorized by primary muscle groups for optimal program design
- **Progressive Overload Tracking**: Track sets, reps, and weights to ensure progressive overload
- **Volume Metrics**: Calculate total volume (sets × reps × weight) for each session
- **Exercise Form Guidance**: Each exercise includes proper technique descriptions
- **Structured Programming**: Support for creating balanced workout programs targeting specific muscle groups

## Active Session UX Philosophy

### Core Principle: Checkbox-First Design

The Active Session UI is **optimized for the athlete's primary goal: completing pre-planned sets**, not for adding new sets with manual weight/rep entry.

### The User's Actual Workflow

When an athlete starts an active session:

1. **Primary Task** (90% of interactions): Check off sets as they complete them
2. **Secondary Task** (10% of interactions): Add extra sets beyond the plan

### UI Hierarchy Requirements

**✅ CORRECT HIERARCHY** (User-Goal-Driven Design):

```
┌─────────────────────────────────────┐
│ Exercise Header (minimal)            │
├─────────────────────────────────────┤
│ Previous Session (compact, amber)   │
├─────────────────────────────────────┤
│                                      │
│   ☐ SET 1                           │ ← PRIMARY FOCUS
│   12 reps × 60kg                     │   (60% of screen)
│   [Tap to complete]                  │   Giant checkboxes
│                                      │   Satisfying feedback
│   ☐ SET 2                           │
│   10 reps × 65kg                     │
│                                      │
│   ☐ SET 3                           │
│   8 reps × 70kg                      │
│                                      │
├─────────────────────────────────────┤
│ [+ Add another set] (collapsed)     │ ← SECONDARY
├─────────────────────────────────────┤   (5% of screen)
│ Weight/Rep inputs (only if expanded)│   On-demand only
└─────────────────────────────────────┘
```

**❌ INCORRECT HIERARCHY** (Implementation-Driven Design):

```
┌─────────────────────────────────────┐
│ Exercise Header                      │
├─────────────────────────────────────┤
│ Reps Input: [____]                  │ ← WRONG
│ Weight Input: [____]                 │   (25% of screen)
│                                      │   Not the primary task
│ [LOG SET] ← GIANT BUTTON            │   (15% of screen)
│                                      │   Screaming for attention
├─────────────────────────────────────┤
│ ... scroll down ...                  │
│                                      │
│ Sets List (buried at bottom)        │ ← WRONG
│   ☐ Set 1: 12 × 60kg                │   What user actually wants
│   ☐ Set 2: 10 × 65kg                │   is buried at bottom
└─────────────────────────────────────┘
```

### Design Requirements

**1. Sets List Must Be Center Stage**
- **Position**: Immediately below exercise header (not at bottom)
- **Size**: Occupy 60-70% of viewport
- **Visual Weight**: Giant checkboxes (64-80px), thick borders, high contrast
- **Feedback**: Satisfying animation when checking off sets (scale, color flash, haptic)

**2. LOG SET Form Must Be Secondary**
- **Default State**: Collapsed/hidden, shown via small "+ Add Set" button
- **Position**: Below the sets list, not above it
- **Size**: Minimal footprint when collapsed (~5% of screen)
- **Expanded State**: Only shown when user explicitly wants to add extra sets

**3. Visual Feedback for Completion**
- **Uncompleted Set**: Giant hollow checkbox with set number, thick border, "Tap to complete" prompt
- **Completed Set**: Large filled checkmark, visual celebration (scale animation, color flash)
- **Progression**: Clear visual indication of progress (e.g., "3/5 sets completed")

### Anti-Patterns to Avoid

**❌ Don't make the LOG SET button huge** - It's not the primary task
**❌ Don't position input forms above the sets list** - Buries the main UI
**❌ Don't make weight/rep inputs always visible** - They're only needed for extra sets
**❌ Don't use small checkboxes (8-16px)** - Not thumb-friendly in gym environment
**❌ Don't skip completion feedback** - Users need dopamine hit when checking off sets

### Implementation Checklist

When building the Active Session UI, ensure:

- [ ] Sets list appears BEFORE input forms in DOM order
- [ ] Checkboxes are at least 64×64px (preferably 80×80px)
- [ ] LOG SET form is collapsible and collapsed by default
- [ ] Completion triggers satisfying animation (scale + color)
- [ ] Progress counter is prominently displayed ("3/5 sets done")
- [ ] Scrolling is not required to see planned sets
- [ ] Input forms only expand when user requests to add extra sets

### Why This Matters

This is the difference between:
- **Implementation-driven design**: UI reflects how developers think about data entry
- **User-goal-driven design**: UI reflects what athletes actually do at the gym

Athletes at the gym want to:
1. See their planned sets at a glance
2. Check them off as they go
3. Feel a sense of progress and accomplishment

They do NOT want to:
1. Manually enter weight/reps for every set
2. Navigate through input forms
3. Scroll past giant buttons to find their workout

**Remember**: The checkbox is the hero. Everything else is supporting cast.

## Exercise Data Structure

Each exercise in the database (`src/data/exercises.json`) contains:

```json
{
  "id": "unique-id",
  "name": "Exercise Name",
  "category": "Muscle Category (Chest, Back, Legs, Shoulders, Arms, Core)",
  "muscleGroup": "muscle-group-slug (chest, back, legs, shoulders, arms, core)",
  "description": "Detailed form and execution instructions",
  "primaryMuscles": ["Primary muscles worked"],
  "secondaryMuscles": ["Secondary/stabilizer muscles"],
  "equipment": "Equipment required",
  "difficulty": "beginner|intermediate|advanced"
}
```

### Muscle Group Classification

The app uses a scientifically-sound muscle group categorization:

1. **Chest (Pectorals)**
   - Primary: Pectoralis Major (clavicular, sternal, costal heads)
   - Secondary: Anterior Deltoids, Triceps

2. **Back**
   - Primary: Latissimus Dorsi, Rhomboids, Trapezius, Erector Spinae
   - Secondary: Posterior Deltoids, Biceps

3. **Legs**
   - Primary: Quadriceps, Hamstrings, Glutes, Calves
   - Secondary: Hip Flexors, Adductors, Abductors

4. **Shoulders (Deltoids)**
   - Primary: Anterior Deltoid, Lateral Deltoid, Posterior Deltoid
   - Secondary: Trapezius, Rotator Cuff muscles

5. **Arms**
   - Primary: Biceps Brachii, Triceps Brachii
   - Secondary: Brachialis, Brachioradialis, Forearm muscles

6. **Core**
   - Primary: Rectus Abdominis, Obliques, Transverse Abdominis
   - Secondary: Hip Flexors, Lower Back

## Visual Color Coding

Each muscle group has a dedicated color for quick visual identification:

- 🌸 **Chest** - Pink (#EC4899)
- 🔵 **Back** - Cyan (#06B6D4)
- 💜 **Legs** - Purple (#A855F7)
- 🧡 **Shoulders** - Orange (#F97316)
- 💙 **Arms** - Indigo (#6366F1)
- 💚 **Core** - Emerald (#10B981)

## Tracking Metrics

### Session-Level Metrics
- Total Sets
- Total Reps
- Total Volume (kg)
- Exercise Count
- Session Duration (planned feature)

### Exercise-Level Metrics
- Sets per exercise
- Reps per set
- Weight per set
- Max weight lifted
- Total volume per exercise

### Historical Analysis (Planned)
- Progressive overload tracking
- Volume trends over time
- Personal records (PRs)
- Muscle group frequency
- Recovery time between sessions

## Data Architecture

### LocalStorage → API Ready
The application uses a service layer pattern that abstracts data storage:

```javascript
// Current: localStorage
exerciseService.getAll() // Returns exercises from localStorage

// Future: Easy migration to API
exerciseService.getAll() // Will call API endpoint
```

This allows seamless transition from browser storage to a backend API without changing component code.

### Data Model Architecture

The application uses a **two-tier data model**:

1. **Static Default Data**: Bundled with the application (JSON files in `src/data/`)
2. **User State**: Personal data stored in browser localStorage

#### Quick Summary

```
┌─────────────────────────────────────────────────────────────┐
│ STATIC DEFAULT DATA (src/data/*.json)                       │
│ - Shipped with app, never changes at runtime               │
│ - Only developers can update (requires new deployment)     │
├─────────────────────────────────────────────────────────────┤
│ • exercises.json          → 70+ default exercises           │
│ • workoutTemplates.json   → 12+ default templates           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ USER STATE (localStorage)                                   │
│ - Personal to each user, stored in their browser           │
│ - Starts empty, grows as user customizes                   │
├─────────────────────────────────────────────────────────────┤
│ • customExercises    → User-created exercises               │
│ • customTemplates    → Modified copies of default templates │
│ • sessions           → Workout history                      │
│ • activeSession      → Current in-progress workout          │
└─────────────────────────────────────────────────────────────┘

VIEWING DATA = DEFAULTS + USER STATE
Example: allExercises = [...defaultExercises, ...customExercises]

MODIFYING DEFAULT TEMPLATE = CREATE COPY → SAVE TO customTemplates
Default templates remain unchanged
```

#### Static Default Data (Read-Only)

These are **static JSON files** shipped with the application. They never change at runtime. Only developers update these files:

| File | Contains | Updated By |
|------|----------|------------|
| `src/data/exercises.json` | 70+ default exercises with form instructions | Developer (new app version) |
| `src/data/workoutTemplates.json` | 12+ pre-designed workout templates | Developer (new app version) |

**Key Points:**
- Default data is **never stored in localStorage**
- Users always see default exercises and templates
- Default data is imported directly from JSON files at build time
- Changes require developer to update JSON file and deploy new version

#### User State (localStorage)

User-specific data stored in **browser localStorage**:

| Key | Data Type | Description |
|-----|-----------|-------------|
| `customExercises` | Array | Exercises created by the user (not in defaults) |
| `customTemplates` | Array | Modified templates (copies of defaults with user changes) |
| `sessions` | Array | Historical workout sessions with performance data |
| `activeSession` | Object | Currently in-progress workout session |

**Key Points:**
- User state is **personal and persistent** in their browser
- Fresh users start with **empty localStorage** but see all defaults
- When displaying data, **merge defaults + custom** (defaults + localStorage)
- When user modifies a default template, **create a copy** and save to `customTemplates`

#### Data Flow Examples

**Viewing all exercises:**
```javascript
// Merge defaults + custom
const allExercises = [
  ...defaultExercises,     // from exercises.json
  ...customExercises       // from localStorage
];
```

**User adds custom exercise:**
```javascript
// Only store custom exercises in localStorage
const custom = JSON.parse(localStorage.getItem('customExercises') || '[]');
custom.push(newExercise);
localStorage.setItem('customExercises', JSON.stringify(custom));
// Default exercises remain untouched
```

**User modifies a default template:**
```javascript
// 1. Find default template
const defaultTemplate = defaultTemplates.find(t => t.id === 'push-day');

// 2. Create copy with modifications
const customTemplate = {
  ...defaultTemplate,
  id: 'push-day-custom-' + Date.now(), // New unique ID
  name: 'My Custom Push Day',
  exerciseIds: [...defaultTemplate.exerciseIds, 'custom-exercise-1']
};

// 3. Save to customTemplates
const custom = JSON.parse(localStorage.getItem('customTemplates') || '[]');
custom.push(customTemplate);
localStorage.setItem('customTemplates', JSON.stringify(custom));
```

#### Data Persistence Pattern

**Writing to localStorage:**

```javascript
// Direct approach
localStorage.setItem('sessions', JSON.stringify(sessionsArray));

// Using custom hook
const [sessions, setSessions] = useLocalStorage('sessions', []);
setSessions([...sessions, newSession]); // Automatically saves to localStorage
```

**Reading from localStorage:**

```javascript
// Direct approach
const savedSessions = localStorage.getItem('sessions');
const sessions = savedSessions ? JSON.parse(savedSessions) : [];

// Using custom hook
const [sessions, setSessions] = useLocalStorage('sessions', []);
// Automatically loads from localStorage on mount
```

#### Custom Hook: `useLocalStorage`

Located in `src/hooks/useLocalStorage.js`:

```javascript
import { useState, useEffect } from 'react';

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
```

**Usage:**

```javascript
// Component using useLocalStorage
const [sessions, setSessions] = useLocalStorage('sessions', []);

// Add new session (automatically persisted)
setSessions([...sessions, newSession]);

// Update session (automatically persisted)
setSessions(sessions.map(s =>
  s.id === sessionId ? { ...s, completed: true } : s
));
```

#### Service Layer Pattern

Data access is abstracted through service modules in `src/services/`:

**`exerciseService.js`:**

```javascript
import defaultExercises from '../data/exercises.json';

export const exerciseService = {
  // Get all exercises (default + custom)
  getAll: () => {
    const customExercises = JSON.parse(
      localStorage.getItem('customExercises') || '[]'
    );
    // Merge: defaults (static) + custom (localStorage)
    return [...defaultExercises, ...customExercises];
  },

  // Add custom exercise (only affects localStorage)
  add: (exercise) => {
    const custom = JSON.parse(localStorage.getItem('customExercises') || '[]');
    const newExercise = {
      ...exercise,
      id: 'custom-' + Date.now(),
      isCustom: true // Flag to identify custom exercises
    };
    localStorage.setItem('customExercises', JSON.stringify([...custom, newExercise]));
    return newExercise;
  },

  // Get by ID (searches both defaults and custom)
  getById: (id) => {
    return exerciseService.getAll().find(ex => ex.id === id);
  },

  // Get by category
  getByCategory: (category) => {
    return exerciseService.getAll().filter(ex => ex.category === category);
  },

  // Delete custom exercise (cannot delete defaults)
  delete: (id) => {
    const custom = JSON.parse(localStorage.getItem('customExercises') || '[]');
    const filtered = custom.filter(ex => ex.id !== id);
    localStorage.setItem('customExercises', JSON.stringify(filtered));
  }
};
```

**`templateService.js`:**

```javascript
import defaultTemplates from '../data/workoutTemplates.json';

export const templateService = {
  // Get all templates (default + custom)
  getAll: () => {
    const customTemplates = JSON.parse(
      localStorage.getItem('customTemplates') || '[]'
    );
    // Merge: defaults (static) + custom (localStorage)
    return [...defaultTemplates, ...customTemplates];
  },

  // Create custom template (copy of default with modifications)
  createCustom: (baseTemplateId, modifications) => {
    const baseTemplate = defaultTemplates.find(t => t.id === baseTemplateId);
    if (!baseTemplate) throw new Error('Template not found');

    const customTemplate = {
      ...baseTemplate,
      ...modifications,
      id: 'custom-template-' + Date.now(),
      isCustom: true,
      basedOn: baseTemplateId // Track which default it came from
    };

    const custom = JSON.parse(localStorage.getItem('customTemplates') || '[]');
    localStorage.setItem('customTemplates', JSON.stringify([...custom, customTemplate]));
    return customTemplate;
  },

  // Delete custom template (cannot delete defaults)
  delete: (id) => {
    const custom = JSON.parse(localStorage.getItem('customTemplates') || '[]');
    const filtered = custom.filter(t => t.id !== id);
    localStorage.setItem('customTemplates', JSON.stringify(filtered));
  }
};
```

**Benefits of Service Layer:**

1. **Abstraction**: Components don't know about localStorage implementation
2. **Easy Migration**: Switch to API by changing service methods only
3. **Consistent Data Access**: All components use same methods
4. **Centralized Logic**: Data transformations in one place
5. **Testability**: Mock service methods for testing

#### Data Storage Limits

- **localStorage capacity**: Typically 5-10MB per domain (browser-dependent)
- **Current usage estimate**: ~100-500KB for typical user (hundreds of sessions)
- **No server costs**: All data stored client-side
- **Privacy**: User data never leaves their device

#### Data Migration Strategy (Future)

When migrating to backend API:

```javascript
// Before (localStorage)
export const exerciseService = {
  getAll: () => {
    const saved = localStorage.getItem('exercises');
    return saved ? JSON.parse(saved) : [];
  }
};

// After (API)
export const exerciseService = {
  getAll: async () => {
    const response = await fetch('/api/exercises');
    return response.json();
  }
};
```

Components remain unchanged because they use service methods, not direct localStorage calls.

## Exercise Form & Safety

Each exercise description follows evidence-based form cues:

1. **Starting Position**: Proper setup and positioning
2. **Movement Execution**: Step-by-step movement pattern
3. **Key Cues**: Important technique reminders
4. **Muscle Focus**: Which muscles should be engaged

## Future Enhancements

### Planned Scientific Features
- [ ] Rest timer between sets
- [ ] RPE (Rate of Perceived Exertion) tracking
- [ ] Progressive overload recommendations
- [ ] Deload week suggestions
- [ ] Volume landmarks (MEV, MRV tracking)
- [ ] Exercise substitutions based on equipment
- [ ] Injury history tracking
- [ ] Periodization templates
- [ ] 1RM calculators
- [ ] Form videos/GIFs

## Development Notes

### Adding New Exercises

When adding exercises to `src/data/exercises.json`:

1. Use unique IDs (format: `{muscleGroup}-{number}`)
2. Provide accurate muscle group classification
3. Write clear, concise form descriptions
4. Include primary and secondary muscles (planned)
5. Specify equipment requirements (planned)
6. Rate difficulty level (planned)

### Exercise Descriptions Best Practices

- Focus on proper form and safety
- Include ROM (Range of Motion) cues
- Mention breathing patterns when critical
- Note common mistakes to avoid
- Keep descriptions concise (2-3 sentences)

## Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Data Storage**: LocalStorage (API-ready architecture)
- **State Management**: React Hooks

## Frameworks & Technologies

### React 18

The application is built with **React 18** using modern best practices:

- **Functional Components**: All components use function syntax (no class components)
- **React Hooks**: State management via `useState`, `useEffect`, `useCallback`, `useMemo`
- **Custom Hooks**: Reusable logic abstracted into custom hooks (e.g., `useLocalStorage`)
- **Component Composition**: Modular, reusable components following single responsibility principle

**Key React Patterns Used:**

```javascript
// State management
const [sessions, setSessions] = useState([]);

// Side effects
useEffect(() => {
  // Load data from localStorage on mount
  const savedSessions = localStorage.getItem('sessions');
  if (savedSessions) setSessions(JSON.parse(savedSessions));
}, []);

// Custom hooks for localStorage
const [exercises, setExercises] = useLocalStorage('exercises', []);
```

### Vite

**Vite** is our build tool and development server, providing:

- **Instant Server Start**: No bundling required during development
- **Lightning-fast HMR** (Hot Module Replacement): Changes reflect in <50ms
- **Optimized Production Builds**: Rollup-based bundling with tree-shaking
- **ES Modules**: Native ESM support for modern browsers

**Development Commands:**

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build (outputs to /dist)
npm run preview  # Preview production build locally
```

**Vite Configuration** (`vite.config.js`):

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Additional config for fast refresh, HMR, etc.
})
```

### Tailwind CSS

**Tailwind CSS** is our utility-first CSS framework. We use it for:

- **Rapid UI Development**: Compose styles directly in JSX with utility classes
- **Responsive Design**: Mobile-first breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- **Consistent Design System**: Predefined spacing, colors, and typography scales
- **Dark Mode Support** (planned): Built-in dark mode utilities

**Tailwind Configuration** (`tailwind.config.js`):

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Custom colors for muscle groups
      colors: {
        'muscle-chest': '#EC4899',
        'muscle-back': '#06B6D4',
        'muscle-legs': '#A855F7',
        'muscle-shoulders': '#F97316',
        'muscle-arms': '#6366F1',
        'muscle-core': '#10B981',
      }
    }
  }
}
```

**Common Tailwind Patterns:**

```jsx
// Flexbox layouts
<div className="flex items-center justify-between gap-4">

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Spacing and sizing
<div className="p-4 mb-6 max-w-4xl mx-auto">

// Colors and backgrounds
<div className="bg-gray-900 text-white border border-gray-700">

// Hover and interactive states
<button className="bg-blue-500 hover:bg-blue-600 active:scale-95 transition">
```

**CSS Best Practices:**

1. **Utility-first**: Use Tailwind utilities instead of custom CSS when possible
2. **Component Classes**: Extract repeated patterns into reusable components, not CSS classes
3. **Responsive Mobile-first**: Design for mobile, then add larger breakpoints
4. **Consistent Spacing**: Use Tailwind's spacing scale (4, 8, 12, 16, 20, 24, etc.)
5. **Color Palette**: Use predefined muscle group colors for consistency

### Framer Motion

**Framer Motion** provides smooth, production-ready animations:

- **Declarative API**: Define animations in JSX props
- **Layout Animations**: Automatic FLIP animations for layout changes
- **Gesture Support**: Drag, tap, hover, pan gestures
- **Variants**: Reusable animation states

**Common Animation Patterns:**

```jsx
import { motion } from 'framer-motion';

// Fade in on mount
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>

// Stagger children
<motion.ul variants={containerVariants}>
  {items.map(item => (
    <motion.li variants={itemVariants} key={item.id}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>

// Layout animations (auto-animate position changes)
<motion.div layout>
```

**Animation Variants** (`src/utils/animations.js`):

```javascript
export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};
```

### Lucide React

**Lucide React** provides a comprehensive icon library:

```jsx
import { Dumbbell, Plus, Trash, ChevronRight } from 'lucide-react';

<Dumbbell className="w-5 h-5 text-gray-400" />
```

**Icon Guidelines:**

- Use consistent sizing: `w-4 h-4` (small), `w-5 h-5` (medium), `w-6 h-6` (large)
- Match icon color to text color for visual harmony
- Use semantic icons (Trash for delete, Plus for add, etc.)

## Workout Templates

The app includes scientifically designed workout templates for various training goals:

### Available Templates

1. **Full Body Workout** - Balanced routine hitting all muscle groups (3x/week)
2. **Push Day** - Chest, shoulders, triceps (Push/Pull/Legs split)
3. **Pull Day** - Back and biceps (Push/Pull/Legs split)
4. **Leg Day** - Complete lower body training
5. **Upper Body Focus** - Comprehensive upper body workout
6. **Quick Morning Workout** - Efficient 30-min session (before work)
7. **Home Bodyweight Circuit** - No equipment needed
8. **Beginner Full Body** - Machine-based exercises for beginners
9. **Strength Builder** - Focus on compound lifts for strength
10. **Chest & Arms Blast** - Hypertrophy-focused upper body
11. **Back & Shoulders** - Build wide back and shoulders
12. **Athletic Performance** - Functional movements for power

Each template includes:
- Difficulty rating (beginner/intermediate/advanced)
- Expected duration
- Recommended frequency
- Pre-selected exercise list
- Description of training focus

### Template Data Structure

```json
{
  "id": "template-id",
  "name": "Template Name",
  "description": "Detailed description of the template",
  "duration": "60-75 min",
  "frequency": "3x per week",
  "difficulty": "intermediate",
  "exerciseIds": ["exercise-1", "exercise-2", ...]
}
```

Templates are stored in `src/data/workoutTemplates.json` and loaded dynamically in the SessionPlanner component.

## File Structure

```
src/
├── data/
│   ├── exercises.json          # Exercise database (70 exercises)
│   └── workoutTemplates.json   # Pre-designed workout templates
├── services/
│   └── exerciseService.js      # Data layer (localStorage → API ready)
├── components/
│   ├── SessionPlanner.jsx      # Create workout plans with templates
│   ├── ExerciseLogger.jsx      # Log active workouts
│   ├── SessionHistory.jsx      # View past sessions
│   ├── ExerciseCard.jsx        # Exercise display component
│   ├── ExerciseDetailModal.jsx # Show detailed exercise info
│   └── AddExerciseModal.jsx    # Add custom exercises
├── hooks/
│   └── useLocalStorage.js      # Custom storage hooks
└── utils/
    └── animations.js           # Framer Motion variants
```

## Contributing

When contributing to this project:

1. Maintain scientific accuracy in exercise descriptions
2. Follow the established muscle group categorization
3. Keep the UI playful but informative
4. Ensure all animations are smooth (60fps)
5. Test on mobile devices (responsive design)
6. Validate all exercise data before committing

## Quality Assurance & Build Process

**CRITICAL**: Before marking any task as complete:

1. **Build Verification**: Always run `npm run build` to ensure the app builds successfully without errors
2. **ESLint Check**: Ensure ESLint passes without errors or warnings
3. **Development Server**: Verify the app runs in development mode (`npm run dev`) without console errors
4. **Hot Reload**: Test that changes render correctly in the browser

### Pre-Completion Checklist

Before completing any task, you MUST:

- [ ] Run `npm run build` - confirm no build errors
- [ ] Check ESLint output - confirm no linting errors
- [ ] Test in browser - confirm no runtime errors
- [ ] Verify hot reload works - confirm changes appear correctly
- [ ] Check browser console - confirm no warnings or errors

**Never mark a task as complete if:**
- Build fails
- ESLint reports errors
- Runtime errors appear in console
- Features don't work as expected in browser

This ensures production-ready code quality at all times.

## Lessons Learned - Error Documentation

This section documents errors, failures, and their solutions encountered during development. **CRITICAL**: Always consult this section before making changes to avoid repeating mistakes.

### Terraform Errors

#### S3 Lifecycle Configuration - Parameter Name Case Sensitivity & Required Filter
**Date**: 2024-11-15

**Error 1**: Parameter validation failure
```
Parameter validation failed:
Unknown parameter in LifecycleConfiguration.Rules[0]: "Id", must be one of: Expiration, ID, Prefix, Filter, Status, Transitions, NoncurrentVersionTransitions, NoncurrentVersionExpiration, AbortIncompleteMultipartUpload
```

**Error 2**: MalformedXML error
```
An error occurred (MalformedXML) when calling the PutBucketLifecycleConfiguration operation: The XML you provided was not well-formed or did not validate against our published schema
```

**Root Cause**:
1. AWS S3 lifecycle configuration parameter names are **case-sensitive**. The correct parameter is `ID` (uppercase), not `Id` (camel case).
2. S3 lifecycle rules **require a `Filter` element** even when applying to all objects (use empty object `{}`)

**Solution**:
```json
// WRONG - Will fail validation (Id instead of ID)
{
  "Rules": [{
    "Id": "DeleteOldVersions",  // ❌ Wrong case
    "Status": "Enabled",
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 90
    }
  }]
}

// WRONG - Will fail with MalformedXML (missing Filter)
{
  "Rules": [{
    "ID": "DeleteOldVersions",  // ✅ Correct case
    "Status": "Enabled",         // ❌ Missing Filter
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 90
    }
  }]
}

// CORRECT - Both ID and Filter present
{
  "Rules": [{
    "ID": "DeleteOldVersions",  // ✅ Correct case
    "Filter": {},                // ✅ Required (empty = all objects)
    "Status": "Enabled",
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 90
    },
    "AbortIncompleteMultipartUpload": {
      "DaysAfterInitiation": 7
    }
  }]
}
```

**Terraform equivalent**:
```hcl
# WRONG
lifecycle_rule {
  Id     = "cleanup-old-artifacts"  # ❌ Incorrect case
  status = "Enabled"
}

# CORRECT
lifecycle_rule {
  id     = "cleanup-old-artifacts"  # ✅ Correct (lowercase in Terraform)
  status = "Enabled"

  filter {}  # ✅ Required filter (empty = applies to all objects)

  noncurrent_version_expiration {
    noncurrent_days = 90
  }
}
```

**Prevention**:
- Always refer to official AWS Terraform provider documentation for exact parameter names
- AWS API uses uppercase `ID`, but Terraform uses lowercase `id`
- **Always include a `Filter` element** in S3 lifecycle rules (use `{}` for all objects)
- Test configurations with `terraform validate` or `aws s3api` before applying
- AWS parameter names are case-sensitive and structure-sensitive

**References**:
- [AWS CLI S3 Lifecycle Configuration](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html)
- [Terraform AWS S3 Bucket Lifecycle Configuration](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration)

---

### Build Errors

#### [Template for future build errors]
**Date**: YYYY-MM-DD
**Error**: Error message
**Root Cause**: Why it happened
**Solution**: How to fix it
**Prevention**: How to avoid it

---

### Runtime Errors

#### [Template for future runtime errors]
**Date**: YYYY-MM-DD
**Error**: Error message
**Root Cause**: Why it happened
**Solution**: How to fix it
**Prevention**: How to avoid it

---

### Deployment Errors

#### [Template for future deployment errors]
**Date**: YYYY-MM-DD
**Error**: Error message
**Root Cause**: Why it happened
**Solution**: How to fix it
**Prevention**: How to avoid it

---

### Best Practices from Lessons Learned

1. **Always validate before applying**: Run `terraform validate` and `terraform plan` before `terraform apply`
2. **Check AWS documentation**: AWS parameter names are case-sensitive and may differ from conventions
3. **Test incrementally**: Test changes in small increments rather than large batches
4. **Document immediately**: Add errors to this section as soon as they're resolved
5. **Review before similar changes**: Check this section before making similar infrastructure changes
- you dont have to invalidate cloudfront cache, we have 0 ttl
- always save "we shipped" if we shipped