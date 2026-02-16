import Foundation

// MARK: - Exercise (from exercises.json)
struct Exercise: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let category: String
    let description: String?
    let equipment: String?
    let exerciseType: ExerciseType
    let isCustom: Bool?

    enum ExerciseType: String, Codable {
        case weightAndReps = "weight+reps"
        case repsOnly = "reps-only"
        case timeBased = "time-based"
    }
}

// MARK: - Set (within a session exercise)
struct ExerciseSet: Codable, Identifiable, Hashable {
    var id = UUID()
    var reps: Int?
    var weight: Double?
    var duration: Int?
    var completed: Bool
    var completedAt: String?
    var restDuration: Int?
    var setType: SetType
    var plannedFromPrevious: Bool?

    enum SetType: String, Codable {
        case warmup = "warm-up"
        case working = "working"
        case drop = "drop"
        case failure = "failure"
    }

    enum CodingKeys: String, CodingKey {
        case reps, weight, duration, completed, completedAt, restDuration, setType, plannedFromPrevious
    }
}

// MARK: - Session Exercise (exercise with performance data)
struct SessionExercise: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let category: String
    let exerciseType: Exercise.ExerciseType
    var sets: [ExerciseSet]
}

// MARK: - Workout Template
struct WorkoutTemplate: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String
    let difficulty: Difficulty
    let duration: String
    let exerciseIds: [String]
    let isCustom: Bool?

    enum Difficulty: String, Codable {
        case beginner
        case intermediate
        case advanced
    }
}

// MARK: - Session (workout session)
struct WorkoutSession: Codable, Identifiable {
    let id: String
    var exercises: [SessionExercise]
    let startTime: Int64
    let createdAt: String
    var endTime: Int64?
    var completedAt: String?
    var status: SessionStatus
    var currentExerciseIndex: Int
    var templateReference: TemplateReference?
    var restStartTime: Int64?
    var isResting: Bool

    enum SessionStatus: String, Codable {
        case active
        case completed
    }

    struct TemplateReference: Codable {
        let templateId: String
        let templateName: String
    }
}

// MARK: - User State (DynamoDB root object)
struct UserState: Codable {
    var sessions: [WorkoutSession]
    var activeSession: WorkoutSession?
    var customExercises: [Exercise]
    var customTemplates: [WorkoutTemplate]
    var version: Int
    var lastModified: String?
}
