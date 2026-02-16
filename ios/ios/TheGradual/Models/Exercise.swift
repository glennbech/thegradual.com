import Foundation

// MARK: - Exercise
struct Exercise: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let category: String
    let exerciseType: ExerciseType
    let description: String?

    enum ExerciseType: String, Codable {
        case weightAndReps = "weight+reps"
        case repsOnly = "reps-only"
        case timeBased = "time-based"
    }
}

// MARK: - Workout Template
struct WorkoutTemplate: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let exercises: [TemplateExercise]
    let difficulty: String
    let duration: String
    let isCustom: Bool

    struct TemplateExercise: Codable, Identifiable {
        let id: String
        let sets: [TemplateSet]

        struct TemplateSet: Codable {
            let reps: Int
            let weight: Double?
            let setType: String
        }
    }
}

// MARK: - Workout Session
struct WorkoutSession: Codable, Identifiable {
    let id: String
    var exercises: [SessionExercise]
    let startTime: Int64
    var completedAt: Int64?
    var status: SessionStatus
    var currentExerciseIndex: Int
    var restStartTime: Int64?
    var isResting: Bool
    let templateReference: TemplateReference?
    let createdAt: String

    enum SessionStatus: String, Codable {
        case active
        case completed
        case discarded
    }

    struct TemplateReference: Codable {
        let templateId: String
        let templateName: String
    }
}

// MARK: - Session Exercise
struct SessionExercise: Codable, Identifiable {
    let id: String
    let name: String
    let category: String
    let exerciseType: String
    var sets: [ExerciseSet]
}

// MARK: - Exercise Set
struct ExerciseSet: Codable, Identifiable {
    let id: String
    var reps: Int?
    var weight: Double?
    var completed: Bool
    let setType: String
    var completedAt: String?
    var plannedFromPrevious: Bool?
    var restDuration: Int?
}

// MARK: - User State
struct UserState: Codable {
    var sessions: [WorkoutSession]
    var customExercises: [Exercise]
    var customTemplates: [WorkoutTemplate]
    var activeSession: WorkoutSession?
    var version: Int

    static let empty = UserState(
        sessions: [],
        customExercises: [],
        customTemplates: [],
        activeSession: nil,
        version: 1
    )
}
