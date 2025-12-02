export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  description?: string;
  equipment?: string;
  difficulty?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  videoUrl?: string;
  isCustom?: boolean;
}

export interface Set {
  reps: number;
  weight: number;
  duration?: number;
  completed: boolean;
  completedAt?: string;
  restDuration?: number;
  setType?: 'working' | 'warmup' | 'dropset' | 'failure';
  plannedFromPrevious?: boolean;
}

export interface SessionExercise extends Exercise {
  sets: Set[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  difficulty?: string;
  duration?: string;
  exercises: string[]; // Exercise IDs
  isCustom?: boolean;
  createdAt?: string;
}

export interface Session {
  id: string;
  exercises: SessionExercise[];
  templateReference?: {
    templateId: string;
    templateName: string;
  };
  currentExerciseIndex?: number;
  createdAt: string;
  completedAt?: string;
  status: 'in-progress' | 'completed';
}
