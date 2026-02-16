import Foundation
import Combine

@MainActor
class AppState: ObservableObject {
    // MARK: - Published State
    @Published var userState: UserState
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var defaultExercises: [Exercise] = []
    @Published var defaultTemplates: [WorkoutTemplate] = []

    // MARK: - Computed Properties
    var allExercises: [Exercise] {
        defaultExercises + userState.customExercises
    }

    var allTemplates: [WorkoutTemplate] {
        defaultTemplates + userState.customTemplates
    }

    private let apiClient = APIClient.shared
    private let authService = AuthService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        // Initialize with empty state
        self.userState = UserState(
            sessions: [],
            activeSession: nil,
            customExercises: [],
            customTemplates: [],
            version: 1,
            lastModified: nil
        )

        // Load bundled data
        loadBundledData()

        // Observe auth changes
        authService.$isAuthenticated
            .sink { [weak self] isAuth in
                if isAuth {
                    Task {
                        await self?.loadUserState()
                    }
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Load Bundled Data
    private func loadBundledData() {
        // Load exercises.json
        if let exercisesURL = Bundle.main.url(forResource: "exercises", withExtension: "json"),
           let data = try? Data(contentsOf: exercisesURL) {
            let decoder = JSONDecoder()
            defaultExercises = (try? decoder.decode([Exercise].self, from: data)) ?? []
        }

        // Load workoutTemplates.json
        if let templatesURL = Bundle.main.url(forResource: "workoutTemplates", withExtension: "json"),
           let data = try? Data(contentsOf: templatesURL) {
            let decoder = JSONDecoder()
            defaultTemplates = (try? decoder.decode([WorkoutTemplate].self, from: data)) ?? []
        }
    }

    // MARK: - Load User State from API
    func loadUserState() async {
        guard let uuid = authService.user?.sub else { return }

        isLoading = true
        errorMessage = nil

        do {
            let state = try await apiClient.fetchUserState(uuid: uuid)
            self.userState = state
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Save User State to API
    func saveUserState() async {
        guard let uuid = authService.user?.sub else { return }

        do {
            let updatedState = try await apiClient.saveUserState(uuid: uuid, state: userState)
            self.userState = updatedState
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Session Management
    func startSession(exercises: [Exercise], templateReference: WorkoutSession.TemplateReference?) async {
        let sessionExercises = exercises.map { exercise -> SessionExercise in
            // Get previous session data for this exercise
            let previousSets = getPreviousSetsForExercise(exerciseId: exercise.id)

            // Create sets (pre-populated from previous or defaults)
            let sets: [ExerciseSet]
            if !previousSets.isEmpty {
                sets = previousSets.map { ExerciseSet(
                    reps: $0.reps,
                    weight: $0.weight,
                    duration: $0.duration,
                    completed: false,
                    setType: $0.setType,
                    plannedFromPrevious: true
                )}
            } else {
                // Default sets based on exercise type
                sets = createDefaultSets(for: exercise.exerciseType)
            }

            return SessionExercise(
                id: exercise.id,
                name: exercise.name,
                category: exercise.category,
                exerciseType: exercise.exerciseType,
                sets: sets
            )
        }

        let session = WorkoutSession(
            id: "session-\(Date().timeIntervalSince1970)",
            exercises: sessionExercises,
            startTime: Int64(Date().timeIntervalSince1970 * 1000),
            createdAt: ISO8601DateFormatter().string(from: Date()),
            status: .active,
            currentExerciseIndex: 0,
            templateReference: templateReference,
            restStartTime: nil,
            isResting: false
        )

        userState.activeSession = session
        await saveUserState()
    }

    func updateActiveSession(_ session: WorkoutSession) async {
        userState.activeSession = session
        await saveUserState()
    }

    func completeSession() async {
        guard var session = userState.activeSession else { return }

        session.status = .completed
        session.endTime = Int64(Date().timeIntervalSince1970 * 1000)
        session.completedAt = ISO8601DateFormatter().string(from: Date())

        userState.sessions.append(session)
        userState.activeSession = nil

        await saveUserState()
    }

    func clearActiveSession() async {
        userState.activeSession = nil
        await saveUserState()
    }

    // MARK: - Helper Functions
    private func getPreviousSetsForExercise(exerciseId: String) -> [ExerciseSet] {
        let completedSessions = userState.sessions
            .filter { $0.status == .completed }
            .sorted { $0.startTime > $1.startTime }

        for session in completedSessions {
            if let exercise = session.exercises.first(where: { $0.id == exerciseId }) {
                return exercise.sets.filter { $0.completed }
            }
        }

        return []
    }

    private func createDefaultSets(for type: Exercise.ExerciseType) -> [ExerciseSet] {
        switch type {
        case .timeBased:
            return (0..<3).map { _ in
                ExerciseSet(duration: 30, completed: false, setType: .working)
            }
        case .repsOnly:
            return (0..<3).map { _ in
                ExerciseSet(reps: 10, completed: false, setType: .working)
            }
        case .weightAndReps:
            return (0..<3).map { _ in
                ExerciseSet(reps: 10, weight: 20, completed: false, setType: .working)
            }
        }
    }

    // MARK: - Template Management
    func addCustomTemplate(_ template: WorkoutTemplate) async {
        userState.customTemplates.append(template)
        await saveUserState()
    }

    func deleteCustomTemplate(id: String) async {
        userState.customTemplates.removeAll { $0.id == id }
        await saveUserState()
    }

    // MARK: - Exercise Management
    func addCustomExercise(_ exercise: Exercise) async {
        userState.customExercises.append(exercise)
        await saveUserState()
    }

    func deleteCustomExercise(id: String) async {
        userState.customExercises.removeAll { $0.id == id }
        await saveUserState()
    }
}
