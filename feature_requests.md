# Feature Requests & Future Improvements

This document tracks planned enhancements and feature ideas for TheGradual.

---

## Workout Duration Estimation

### Current Implementation
- All workout durations are **dynamically calculated** based on exercise count
- Formula: `exerciseCount × 10-15 minutes`
- Works for both built-in and custom templates

### Planned Enhancement
**Custom Template Duration Input**

Allow users to manually set workout duration when creating/editing custom templates:
- Add optional "Duration" field to save template modal
- Override auto-calculated duration if user provides custom value
- Store in `customTemplates` as `customDuration` field
- Useful for users who know their actual workout pace:
  - Beginners might take longer (stretching, form checks)
  - Advanced lifters might be faster (supersets, efficient transitions)
  - Specific training styles (circuits, HIIT) have different timing

**Benefits:**
- More accurate time estimates for custom workouts
- Helps users plan their schedule better
- Accounts for individual workout pace/style

**Implementation Notes:**
- Keep auto-calculated duration as default/fallback
- Allow clearing custom duration to revert to auto-calculation
- Display both in UI: "Custom: 45 min (Estimated: 60-90 min)"

---

## Future Features

*(Add new feature requests below)*

