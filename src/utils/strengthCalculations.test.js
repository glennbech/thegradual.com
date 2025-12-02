import { describe, it, expect } from 'vitest';
import {
  calculateE1RM,
  getBestE1RM,
  getE1RMProgression,
  calculateProgressionRate,
  getStrengthLevel,
  getExercisesWithStandards,
  getVolumeForDay,
  getVolumeHeatmapData
} from './strengthCalculations';

describe('calculateE1RM', () => {
  it('should return weight for 1 rep', () => {
    const result = calculateE1RM(100, 1);
    expect(result.epley).toBe(100);
    expect(result.brzycki).toBe(100);
    expect(result.lombardi).toBe(100);
    expect(result.average).toBe(100);
  });

  it('should calculate correct e1RM for 5 reps at 100kg', () => {
    const result = calculateE1RM(100, 5);

    // Epley: 100 * (1 + 5/30) = 116.67
    expect(result.epley).toBeCloseTo(116.7, 1);

    // Brzycki: 100 * (36/(37-5)) = 112.5
    expect(result.brzycki).toBeCloseTo(112.5, 1);

    // Lombardi: 100 * 5^0.10 = 114.87
    expect(result.lombardi).toBeCloseTo(114.9, 1);

    // Average should be between 112 and 117
    expect(result.average).toBeGreaterThan(112);
    expect(result.average).toBeLessThan(117);
  });

  it('should return null for 0 reps', () => {
    const result = calculateE1RM(100, 0);
    expect(result).toBeNull();
  });

  it('should return null for more than 12 reps', () => {
    const result = calculateE1RM(100, 13);
    expect(result).toBeNull();
  });

  it('should return null for negative reps', () => {
    const result = calculateE1RM(100, -5);
    expect(result).toBeNull();
  });

  it('should handle decimal weights', () => {
    const result = calculateE1RM(82.5, 8);
    expect(result).not.toBeNull();
    expect(result.average).toBeGreaterThan(82.5);
  });
});

describe('getBestE1RM', () => {
  it('should return null for empty sets', () => {
    expect(getBestE1RM([])).toBeNull();
    expect(getBestE1RM(null)).toBeNull();
  });

  it('should return best e1RM from multiple sets', () => {
    const sets = [
      { weight: 80, reps: 10, completed: true, setType: 'working' },
      { weight: 100, reps: 5, completed: true, setType: 'working' },
      { weight: 90, reps: 8, completed: true, setType: 'working' }
    ];

    const result = getBestE1RM(sets);
    expect(result).not.toBeNull();
    // 100kg x 5 reps should give highest e1RM
    expect(result.average).toBeGreaterThan(110);
  });

  it('should skip warm-up sets', () => {
    const sets = [
      { weight: 60, reps: 10, completed: true, setType: 'warm-up' },
      { weight: 80, reps: 8, completed: true, setType: 'working' }
    ];

    const result = getBestE1RM(sets);
    // Should only consider the 80kg set
    expect(result.average).toBeCloseTo(96, 0);
  });

  it('should skip incomplete sets', () => {
    const sets = [
      { weight: 100, reps: 5, completed: false, setType: 'working' },
      { weight: 80, reps: 8, completed: true, setType: 'working' }
    ];

    const result = getBestE1RM(sets);
    // Should only consider the completed 80kg set
    expect(result.average).toBeCloseTo(96, 0);
  });
});

describe('getE1RMProgression', () => {
  it('should return empty array for no sessions', () => {
    expect(getE1RMProgression([], 'chest-1')).toEqual([]);
    expect(getE1RMProgression(null, 'chest-1')).toEqual([]);
  });

  it('should track e1RM progression over time', () => {
    const sessions = [
      {
        id: '1',
        status: 'completed',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          sets: [{ weight: 80, reps: 8, completed: true, setType: 'working' }]
        }]
      },
      {
        id: '2',
        status: 'completed',
        completedAt: '2024-01-08',
        exercises: [{
          id: 'chest-1',
          sets: [{ weight: 85, reps: 8, completed: true, setType: 'working' }]
        }]
      }
    ];

    const progression = getE1RMProgression(sessions, 'chest-1');
    expect(progression).toHaveLength(2);
    expect(progression[0].e1rm).toBeLessThan(progression[1].e1rm);
    expect(new Date(progression[0].date)).toBeLessThan(new Date(progression[1].date));
  });

  it('should skip incomplete sessions', () => {
    const sessions = [
      {
        id: '1',
        status: 'in-progress',
        createdAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          sets: [{ weight: 80, reps: 8, completed: true, setType: 'working' }]
        }]
      }
    ];

    const progression = getE1RMProgression(sessions, 'chest-1');
    expect(progression).toEqual([]);
  });
});

describe('calculateProgressionRate', () => {
  it('should return null for insufficient data', () => {
    expect(calculateProgressionRate([])).toBeNull();
    expect(calculateProgressionRate([{ date: '2024-01-01', e1rm: 100 }])).toBeNull();
  });

  it('should calculate positive progression rate', () => {
    const progression = [
      { date: '2024-01-01', e1rm: 100 },
      { date: '2024-01-15', e1rm: 105 },
      { date: '2024-02-01', e1rm: 110 }
    ];

    const result = calculateProgressionRate(progression);
    expect(result).not.toBeNull();
    expect(result.slopePerMonth).toBeGreaterThan(0);
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(1);
  });

  it('should calculate negative progression rate', () => {
    const progression = [
      { date: '2024-01-01', e1rm: 110 },
      { date: '2024-01-15', e1rm: 105 },
      { date: '2024-02-01', e1rm: 100 }
    ];

    const result = calculateProgressionRate(progression);
    expect(result.slopePerMonth).toBeLessThan(0);
  });

  it('should provide prediction function', () => {
    const progression = [
      { date: '2024-01-01', e1rm: 100 },
      { date: '2024-01-15', e1rm: 105 }
    ];

    const result = calculateProgressionRate(progression);
    const predicted = result.prediction(30); // 30 days
    expect(predicted).toBeGreaterThan(100);
  });
});

describe('getStrengthLevel', () => {
  it('should return null for exercises without standards', () => {
    const result = getStrengthLevel('unknown-exercise', 100);
    expect(result).toBeNull();
  });

  it('should classify novice correctly', () => {
    const result = getStrengthLevel('chest-1', 45); // Bench press, 45kg
    expect(result.level).toBe('novice');
    expect(result.nextLevel).toBe('beginner');
    expect(result.percentage).toBeGreaterThanOrEqual(0);
    expect(result.percentage).toBeLessThanOrEqual(100);
  });

  it('should classify beginner correctly', () => {
    const result = getStrengthLevel('chest-1', 65); // Bench press, 65kg
    expect(result.level).toBe('beginner');
    expect(result.nextLevel).toBe('intermediate');
  });

  it('should classify intermediate correctly', () => {
    const result = getStrengthLevel('chest-1', 85); // Bench press, 85kg
    expect(result.level).toBe('intermediate');
    expect(result.nextLevel).toBe('advanced');
  });

  it('should classify advanced correctly', () => {
    const result = getStrengthLevel('chest-1', 105); // Bench press, 105kg
    expect(result.level).toBe('advanced');
    expect(result.nextLevel).toBe('elite');
  });

  it('should classify elite correctly', () => {
    const result = getStrengthLevel('chest-1', 150); // Bench press, 150kg
    expect(result.level).toBe('elite');
    expect(result.nextLevel).toBeNull();
    expect(result.percentage).toBe(100);
  });

  it('should calculate correct percentage to next level', () => {
    // Bench press standards: novice=40, beginner=60, intermediate=80
    const result = getStrengthLevel('chest-1', 70); // 70kg
    expect(result.level).toBe('beginner');
    expect(result.nextLevel).toBe('intermediate');
    // 70kg is halfway between 60 and 80, so should be ~50%
    expect(result.percentage).toBeCloseTo(50, 0);
  });
});

describe('getExercisesWithStandards', () => {
  it('should return array of exercise IDs', () => {
    const exercises = getExercisesWithStandards();
    expect(Array.isArray(exercises)).toBe(true);
    expect(exercises.length).toBeGreaterThan(0);
  });

  it('should include common exercises', () => {
    const exercises = getExercisesWithStandards();
    expect(exercises).toContain('chest-1'); // Bench Press
    expect(exercises).toContain('back-1');  // Deadlift
    expect(exercises).toContain('legs-1');  // Squat
  });
});

describe('getVolumeForDay', () => {
  it('should return 0 for no sessions', () => {
    expect(getVolumeForDay([], '2024-01-01')).toBe(0);
    expect(getVolumeForDay(null, '2024-01-01')).toBe(0);
  });

  it('should calculate volume for specific day', () => {
    const sessions = [
      {
        id: '1',
        status: 'completed',
        completedAt: '2024-01-01T10:00:00Z',
        exercises: [{
          id: 'chest-1',
          sets: [
            { weight: 80, reps: 10, completed: true, setType: 'working' },
            { weight: 80, reps: 8, completed: true, setType: 'working' }
          ]
        }]
      }
    ];

    const volume = getVolumeForDay(sessions, '2024-01-01');
    // 80*10 + 80*8 = 800 + 640 = 1440
    expect(volume).toBe(1440);
  });

  it('should skip warm-up sets', () => {
    const sessions = [
      {
        id: '1',
        status: 'completed',
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

    const volume = getVolumeForDay(sessions, '2024-01-01');
    // Only 80*10 = 800 (warm-up excluded)
    expect(volume).toBe(800);
  });

  it('should skip incomplete sets', () => {
    const sessions = [
      {
        id: '1',
        status: 'completed',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          sets: [
            { weight: 80, reps: 10, completed: false, setType: 'working' },
            { weight: 80, reps: 8, completed: true, setType: 'working' }
          ]
        }]
      }
    ];

    const volume = getVolumeForDay(sessions, '2024-01-01');
    // Only 80*8 = 640 (incomplete excluded)
    expect(volume).toBe(640);
  });

  it('should return 0 for different day', () => {
    const sessions = [
      {
        id: '1',
        status: 'completed',
        completedAt: '2024-01-01',
        exercises: [{
          id: 'chest-1',
          sets: [{ weight: 80, reps: 10, completed: true, setType: 'working' }]
        }]
      }
    ];

    const volume = getVolumeForDay(sessions, '2024-01-02');
    expect(volume).toBe(0);
  });
});

describe('getVolumeHeatmapData', () => {
  it('should return array of correct length', () => {
    const data = getVolumeHeatmapData([], 30);
    expect(data).toHaveLength(30);
  });

  it('should include date, volume, and metadata', () => {
    const data = getVolumeHeatmapData([], 7);

    data.forEach(day => {
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('volume');
      expect(day).toHaveProperty('dayOfWeek');
      expect(day).toHaveProperty('weekNumber');
      expect(day.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(day.dayOfWeek).toBeLessThanOrEqual(6);
    });
  });

  it('should default to 90 days', () => {
    const data = getVolumeHeatmapData([]);
    expect(data).toHaveLength(90);
  });
});
