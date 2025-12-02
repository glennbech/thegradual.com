import { describe, it, expect } from 'vitest';
import {
  sessionHasCompletedSets,
  filterSessionsWithCompletedSets,
  getPerformedExercises,
  getExerciseStats,
  calculateTrend,
  getPersonalRecords,
  getVolumeMilestones,
  formatWeight,
  formatVolume
} from './progressCalculations';

describe('sessionHasCompletedSets', () => {
  it('should return true for session with completed sets', () => {
    const session = {
      exercises: [{
        sets: [{ completed: true, reps: 10, weight: 80 }]
      }]
    };
    expect(sessionHasCompletedSets(session)).toBe(true);
  });

  it('should return false for session with no completed sets', () => {
    const session = {
      exercises: [{
        sets: [{ completed: false, reps: 10, weight: 80 }]
      }]
    };
    expect(sessionHasCompletedSets(session)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(sessionHasCompletedSets(null)).toBe(false);
    expect(sessionHasCompletedSets(undefined)).toBe(false);
  });

  it('should return false for session without exercises', () => {
    expect(sessionHasCompletedSets({})).toBe(false);
  });

  it('should return false for empty exercises array', () => {
    const session = { exercises: [] };
    expect(sessionHasCompletedSets(session)).toBe(false);
  });
});

describe('filterSessionsWithCompletedSets', () => {
  it('should filter out sessions without completed sets', () => {
    const sessions = [
      {
        id: '1',
        exercises: [{
          sets: [{ completed: true, reps: 10, weight: 80 }]
        }]
      },
      {
        id: '2',
        exercises: [{
          sets: [{ completed: false, reps: 10, weight: 80 }]
        }]
      },
      {
        id: '3',
        exercises: [{
          sets: [{ completed: true, reps: 12, weight: 85 }]
        }]
      }
    ];

    const filtered = filterSessionsWithCompletedSets(sessions);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe('1');
    expect(filtered[1].id).toBe('3');
  });

  it('should return empty array for null or undefined', () => {
    expect(filterSessionsWithCompletedSets(null)).toEqual([]);
    expect(filterSessionsWithCompletedSets(undefined)).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(filterSessionsWithCompletedSets([])).toEqual([]);
  });
});

describe('getPerformedExercises', () => {
  it('should return unique exercise IDs', () => {
    const sessions = [
      {
        exercises: [
          { id: 'chest-1' },
          { id: 'chest-2' }
        ]
      },
      {
        exercises: [
          { id: 'chest-1' },
          { id: 'back-1' }
        ]
      }
    ];

    const exerciseIds = getPerformedExercises(sessions);
    expect(exerciseIds).toHaveLength(3);
    expect(exerciseIds).toContain('chest-1');
    expect(exerciseIds).toContain('chest-2');
    expect(exerciseIds).toContain('back-1');
  });

  it('should return empty array for no sessions', () => {
    expect(getPerformedExercises([])).toEqual([]);
  });
});

describe('getExerciseStats', () => {
  it('should calculate stats for weight+reps exercise', () => {
    const sessions = [
      {
        id: '1',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          sets: [
            { weight: 80, reps: 10, completed: true, setType: 'working' },
            { weight: 85, reps: 8, completed: true, setType: 'working' }
          ]
        }]
      },
      {
        id: '2',
        completedAt: '2024-01-08',
        exercises: [{
          id: 'chest-1',
          sets: [
            { weight: 90, reps: 10, completed: true, setType: 'working' }
          ]
        }]
      }
    ];

    const stats = getExerciseStats('chest-1', sessions);
    expect(stats.sessionCount).toBe(2);
    expect(stats.exerciseType).toBe('weight+reps');
    expect(stats.maxWeight).toBe(90);
    expect(stats.totalVolume).toBe(80*10 + 85*8 + 90*10);
  });

  it('should skip warm-up sets', () => {
    const sessions = [
      {
        id: '1',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          sets: [
            { weight: 60, reps: 10, completed: true, setType: 'warm-up' },
            { weight: 80, reps: 10, completed: true, setType: 'working' }
          ]
        }]
      }
    ];

    const stats = getExerciseStats('chest-1', sessions);
    expect(stats.maxWeight).toBe(80);
    expect(stats.totalVolume).toBe(800);
  });

  it('should handle time-based exercises', () => {
    const sessions = [
      {
        id: '1',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'core-1',
          exerciseType: 'time-based',
          sets: [
            { duration: 60, completed: true, setType: 'working' },
            { duration: 45, completed: true, setType: 'working' }
          ]
        }]
      }
    ];

    const stats = getExerciseStats('core-1', sessions);
    expect(stats.exerciseType).toBe('time-based');
    expect(stats.maxDuration).toBe(60);
    expect(stats.totalDuration).toBe(105);
  });

  it('should handle reps-only exercises', () => {
    const sessions = [
      {
        id: '1',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'core-2',
          exerciseType: 'reps-only',
          sets: [
            { reps: 20, completed: true, setType: 'working' },
            { reps: 15, completed: true, setType: 'working' }
          ]
        }]
      }
    ];

    const stats = getExerciseStats('core-2', sessions);
    expect(stats.exerciseType).toBe('reps-only');
    expect(stats.maxReps).toBe(20);
    expect(stats.totalReps).toBe(35);
  });

  it('should return zero stats for non-existent exercise', () => {
    const sessions = [{
      exercises: [{ id: 'chest-1', sets: [] }]
    }];

    const stats = getExerciseStats('chest-999', sessions);
    expect(stats.sessionCount).toBe(0);
    expect(stats.maxWeight).toBe(0);
  });
});

describe('calculateTrend', () => {
  it('should return insufficient data for too few sessions', () => {
    const sessions = [
      {
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          sets: [{ weight: 80, reps: 10, completed: true, setType: 'working' }]
        }]
      }
    ];

    const trend = calculateTrend('chest-1', sessions, 3);
    expect(trend.status).toBe('insufficient_data');
  });

  it('should calculate upward trend', () => {
    const sessions = [];
    for (let i = 0; i < 10; i++) {
      sessions.push({
        completedAt: `2024-01-${String(i + 1).padStart(2, '0')}`,
        exercises: [{
          id: 'chest-1',
          sets: [{ weight: 80 + i * 2, reps: 10, completed: true, setType: 'working' }]
        }]
      });
    }

    const trend = calculateTrend('chest-1', sessions, 3);
    expect(trend.direction).toBe('up');
    expect(trend.status).toBe('success');
    expect(trend.percentage).toBeGreaterThan(0);
  });

  it('should calculate downward trend', () => {
    const sessions = [];
    for (let i = 0; i < 10; i++) {
      sessions.push({
        completedAt: `2024-01-${String(i + 1).padStart(2, '0')}`,
        exercises: [{
          id: 'chest-1',
          sets: [{ weight: 100 - i * 2, reps: 10, completed: true, setType: 'working' }]
        }]
      });
    }

    const trend = calculateTrend('chest-1', sessions, 3);
    expect(trend.direction).toBe('down');
  });

  it('should detect neutral/plateau trend', () => {
    const sessions = [];
    for (let i = 0; i < 10; i++) {
      sessions.push({
        completedAt: `2024-01-${String(i + 1).padStart(2, '0')}`,
        exercises: [{
          id: 'chest-1',
          sets: [{ weight: 80, reps: 10, completed: true, setType: 'working' }]
        }]
      });
    }

    const trend = calculateTrend('chest-1', sessions, 3);
    expect(trend.direction).toBe('neutral');
  });
});

describe('getPersonalRecords', () => {
  it('should find PRs across sessions', () => {
    const sessions = [
      {
        id: '1',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          name: 'Bench Press',
          category: 'Chest',
          muscleGroup: 'chest',
          sets: [{ weight: 80, reps: 10, completed: true, setType: 'working' }]
        }]
      },
      {
        id: '2',
        completedAt: '2024-01-08',
        exercises: [{
          id: 'chest-1',
          name: 'Bench Press',
          category: 'Chest',
          muscleGroup: 'chest',
          sets: [{ weight: 90, reps: 8, completed: true, setType: 'working' }]
        }]
      }
    ];

    const prs = getPersonalRecords(sessions);
    expect(prs).toHaveLength(1);
    expect(prs[0].weight).toBe(90);
    expect(prs[0].exerciseId).toBe('chest-1');
  });

  it('should exclude warm-up sets from PRs', () => {
    const sessions = [
      {
        id: '1',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          name: 'Bench Press',
          category: 'Chest',
          muscleGroup: 'chest',
          sets: [
            { weight: 100, reps: 10, completed: true, setType: 'warm-up' },
            { weight: 80, reps: 10, completed: true, setType: 'working' }
          ]
        }]
      }
    ];

    const prs = getPersonalRecords(sessions);
    expect(prs[0].weight).toBe(80);
  });

  it('should handle multiple exercises', () => {
    const sessions = [
      {
        id: '1',
        completedAt: '2024-01-01',
        exercises: [
          {
            id: 'chest-1',
            name: 'Bench Press',
            category: 'Chest',
            muscleGroup: 'chest',
            sets: [{ weight: 80, reps: 10, completed: true, setType: 'working' }]
          },
          {
            id: 'back-1',
            name: 'Deadlift',
            category: 'Back',
            muscleGroup: 'back',
            sets: [{ weight: 120, reps: 5, completed: true, setType: 'working' }]
          }
        ]
      }
    ];

    const prs = getPersonalRecords(sessions);
    expect(prs).toHaveLength(2);
    expect(prs[0].weight).toBe(120); // Sorted by weight desc
    expect(prs[1].weight).toBe(80);
  });
});

describe('getVolumeMilestones', () => {
  it('should calculate total volume', () => {
    const sessions = [
      {
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          muscleGroup: 'chest',
          sets: [
            { weight: 80, reps: 10, completed: true },
            { weight: 80, reps: 8, completed: true }
          ]
        }]
      }
    ];

    const milestones = getVolumeMilestones(sessions);
    expect(milestones.totalVolume).toBe(80*10 + 80*8);
    expect(milestones.totalSets).toBe(2);
    expect(milestones.totalReps).toBe(18);
  });

  it('should skip incomplete sets', () => {
    const sessions = [
      {
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          muscleGroup: 'chest',
          sets: [
            { weight: 80, reps: 10, completed: true },
            { weight: 80, reps: 10, completed: false }
          ]
        }]
      }
    ];

    const milestones = getVolumeMilestones(sessions);
    expect(milestones.totalVolume).toBe(800);
    expect(milestones.totalSets).toBe(1);
  });

  it('should track volume by muscle group', () => {
    const sessions = [
      {
        completedAt: '2024-01-01',
        exercises: [
          {
            id: 'chest-1',
            muscleGroup: 'chest',
            sets: [{ weight: 80, reps: 10, completed: true }]
          },
          {
            id: 'back-1',
            muscleGroup: 'back',
            sets: [{ weight: 100, reps: 5, completed: true }]
          }
        ]
      }
    ];

    const milestones = getVolumeMilestones(sessions);
    expect(milestones.volumeByMuscleGroup).toHaveLength(2);

    const chestVolume = milestones.volumeByMuscleGroup.find(v => v.muscleGroup === 'chest');
    const backVolume = milestones.volumeByMuscleGroup.find(v => v.muscleGroup === 'back');

    expect(chestVolume.volume).toBe(800);
    expect(backVolume.volume).toBe(500);
  });

  it('should identify achieved milestones', () => {
    const sessions = [
      {
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          muscleGroup: 'chest',
          sets: [{ weight: 100, reps: 50, completed: true }] // 5000kg
        }]
      }
    ];

    const milestones = getVolumeMilestones(sessions);
    expect(milestones.achievedMilestones.length).toBeGreaterThan(0);
    expect(milestones.achievedMilestones[0].threshold).toBe(1000);
  });

  it('should calculate progress to next milestone', () => {
    const sessions = [
      {
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          muscleGroup: 'chest',
          sets: [{ weight: 50, reps: 10, completed: true }] // 500kg
        }]
      }
    ];

    const milestones = getVolumeMilestones(sessions);
    expect(milestones.nextMilestone).toBeDefined();
    expect(milestones.nextMilestone.threshold).toBe(1000);
    expect(parseFloat(milestones.progressToNext)).toBeCloseTo(50, 0);
  });
});

describe('formatWeight', () => {
  it('should format whole numbers without decimals', () => {
    expect(formatWeight(100)).toBe('100');
    expect(formatWeight(80)).toBe('80');
  });

  it('should format decimals with one decimal place', () => {
    expect(formatWeight(82.5)).toBe('82.5');
    expect(formatWeight(67.7)).toBe('67.7');
  });

  it('should handle zero', () => {
    expect(formatWeight(0)).toBe('0');
  });

  it('should handle null/undefined', () => {
    expect(formatWeight(null)).toBe('0');
    expect(formatWeight(undefined)).toBe('0');
  });
});

describe('formatVolume', () => {
  it('should format small volumes in kg', () => {
    expect(formatVolume(500)).toBe('500 kg');
    expect(formatVolume(999)).toBe('999 kg');
  });

  it('should format thousands with k suffix', () => {
    expect(formatVolume(1000)).toBe('1.0k kg');
    expect(formatVolume(5500)).toBe('5.5k kg');
    expect(formatVolume(12000)).toBe('12.0k kg');
  });

  it('should format millions with M suffix', () => {
    expect(formatVolume(1000000)).toBe('1.0M kg');
    expect(formatVolume(2500000)).toBe('2.5M kg');
  });
});
