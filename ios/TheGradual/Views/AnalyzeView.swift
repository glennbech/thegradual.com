import SwiftUI
import Charts

struct AnalyzeView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedExercise: String?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    if appState.userState.sessions.isEmpty {
                        emptyState
                    } else {
                        // Personal Records Section
                        personalRecordsSection

                        // Exercise Progress Grid
                        exerciseProgressSection

                        // E1RM Section
                        e1rmSection
                    }
                }
                .padding()
            }
            .background(ColorPalette.background)
            .navigationTitle("Analyze")
        }
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 24) {
            Image(systemName: "chart.bar.fill")
                .font(.system(size: 80))
                .foregroundColor(ColorPalette.mono400)

            VStack(spacing: 12) {
                Text("No Data Yet")
                    .font(.system(size: 28, weight: .black))
                    .foregroundColor(ColorPalette.textPrimary)

                Text("Complete your first workout to see your progress")
                    .font(.system(size: 16))
                    .foregroundColor(ColorPalette.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 100)
    }

    // MARK: - Personal Records
    private var personalRecordsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Personal Records")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(ColorPalette.textPrimary)

            HStack(spacing: 12) {
                PRCard(
                    title: "Total Sessions",
                    value: "\(appState.userState.sessions.filter { $0.status == .completed }.count)",
                    icon: "flame.fill",
                    color: ColorPalette.chest
                )

                PRCard(
                    title: "Total Volume",
                    value: String(format: "%.0fkg", totalVolume),
                    icon: "chart.bar.fill",
                    color: ColorPalette.back
                )
            }

            HStack(spacing: 12) {
                PRCard(
                    title: "Best Session",
                    value: String(format: "%.0fkg", bestSessionVolume),
                    icon: "trophy.fill",
                    color: ColorPalette.legs
                )

                PRCard(
                    title: "This Month",
                    value: "\(sessionsThisMonth)",
                    icon: "calendar",
                    color: ColorPalette.shoulders
                )
            }
        }
    }

    // MARK: - Exercise Progress
    private var exerciseProgressSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Exercise Progress")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(ColorPalette.textPrimary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(exercisesWithProgress, id: \.exercise.id) { item in
                    ExerciseProgressCard(
                        exercise: item.exercise,
                        bestWeight: item.bestWeight,
                        totalVolume: item.totalVolume,
                        sessionCount: item.sessionCount
                    )
                }
            }
        }
    }

    // MARK: - E1RM Section
    private var e1rmSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Estimated 1 Rep Max")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(ColorPalette.textPrimary)

            Text("Strength estimates based on your heaviest sets")
                .font(.system(size: 14))
                .foregroundColor(ColorPalette.textSecondary)

            ForEach(exercisesWithE1RM, id: \.exercise.id) { item in
                E1RMCard(
                    exercise: item.exercise,
                    e1rm: item.e1rm,
                    history: item.history,
                    isExpanded: selectedExercise == item.exercise.id
                ) {
                    withAnimation {
                        if selectedExercise == item.exercise.id {
                            selectedExercise = nil
                        } else {
                            selectedExercise = item.exercise.id
                        }
                    }
                }
            }
        }
    }

    // MARK: - Computed Properties
    private var totalVolume: Double {
        appState.userState.sessions
            .filter { $0.status == .completed }
            .reduce(0) { $0 + E1RMCalculator.calculateVolume(for: $1) }
    }

    private var bestSessionVolume: Double {
        appState.userState.sessions
            .filter { $0.status == .completed }
            .map { E1RMCalculator.calculateVolume(for: $0) }
            .max() ?? 0
    }

    private var sessionsThisMonth: Int {
        let calendar = Calendar.current
        let now = Date()
        return appState.userState.sessions
            .filter { $0.status == .completed }
            .filter { session in
                let date = Date(timeIntervalSince1970: TimeInterval(session.startTime) / 1000)
                return calendar.isDate(date, equalTo: now, toGranularity: .month)
            }
            .count
    }

    private var exercisesWithProgress: [(exercise: Exercise, bestWeight: Double, totalVolume: Double, sessionCount: Int)] {
        var results: [(Exercise, Double, Double, Int)] = []

        for exercise in appState.allExercises.filter({ $0.exerciseType == .weightAndReps }) {
            var bestWeight: Double = 0
            var totalVolume: Double = 0
            var sessionCount = 0

            for session in appState.userState.sessions.filter({ $0.status == .completed }) {
                if let sessionExercise = session.exercises.first(where: { $0.id == exercise.id }) {
                    sessionCount += 1
                    totalVolume += E1RMCalculator.calculateVolume(for: exercise.id, in: session)

                    for set in sessionExercise.sets where set.completed {
                        if let weight = set.weight {
                            bestWeight = max(bestWeight, weight)
                        }
                    }
                }
            }

            if sessionCount > 0 {
                results.append((exercise, bestWeight, totalVolume, sessionCount))
            }
        }

        return results.sorted { $0.totalVolume > $1.totalVolume }.prefix(6).map { $0 }
    }

    private var exercisesWithE1RM: [(exercise: Exercise, e1rm: Double, history: [(Date, Double)])] {
        var results: [(Exercise, Double, [(Date, Double)])] = []

        for exercise in appState.allExercises.filter({ $0.exerciseType == .weightAndReps }) {
            if let e1rm = E1RMCalculator.getBestE1RM(for: exercise.id, sessions: appState.userState.sessions) {
                let history = E1RMCalculator.getE1RMHistory(for: exercise.id, sessions: appState.userState.sessions)
                if history.count >= 2 { // Only show exercises with progression data
                    results.append((exercise, e1rm, history))
                }
            }
        }

        return results.sorted { $0.e1rm > $1.e1rm }.prefix(5).map { $0 }
    }
}

// MARK: - PR Card
struct PRCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)

            VStack(spacing: 4) {
                Text(value)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(ColorPalette.textPrimary)

                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(ColorPalette.textSecondary)
                    .textCase(.uppercase)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.white)
        .cornerRadius(12)
    }
}

// MARK: - Exercise Progress Card
struct ExerciseProgressCard: View {
    let exercise: Exercise
    let bestWeight: Double
    let totalVolume: Double
    let sessionCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Category badge
            Text(exercise.category)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white)
                .textCase(.uppercase)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(ColorPalette.muscleColor(for: exercise.category))
                .cornerRadius(4)

            // Exercise name
            Text(exercise.name)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(ColorPalette.textPrimary)
                .lineLimit(2)
                .frame(height: 36, alignment: .top)

            // Stats
            VStack(alignment: .leading, spacing: 4) {
                StatRow(label: "Best", value: String(format: "%.0fkg", bestWeight))
                StatRow(label: "Volume", value: String(format: "%.0fkg", totalVolume))
                StatRow(label: "Sessions", value: "\(sessionCount)")
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
    }
}

struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(ColorPalette.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(ColorPalette.textPrimary)
        }
    }
}

// MARK: - E1RM Card (will continue in next file...)
