import Foundation

struct E1RMCalculator {
    // MARK: - Calculate Estimated 1 Rep Max
    static func calculate(weight: Double, reps: Int) -> Double? {
        guard reps > 0 && reps <= 15 else { return nil }
        guard weight > 0 else { return nil }

        if reps == 1 {
            return weight
        }

        // Use Epley formula: weight × (1 + reps/30)
        return weight * (1 + Double(reps) / 30.0)
    }

    // MARK: - Get Best E1RM from Session History
    static func getBestE1RM(for exerciseId: String, sessions: [WorkoutSession]) -> Double? {
        let completedSessions = sessions.filter { $0.status == .completed }

        var maxE1RM: Double = 0

        for session in completedSessions {
            guard let exercise = session.exercises.first(where: { $0.id == exerciseId }) else {
                continue
            }

            for set in exercise.sets where set.completed {
                if let weight = set.weight,
                   let reps = set.reps,
                   let e1rm = calculate(weight: weight, reps: reps) {
                    maxE1RM = max(maxE1RM, e1rm)
                }
            }
        }

        return maxE1RM > 0 ? maxE1RM : nil
    }

    // MARK: - Get E1RM History (for charting)
    static func getE1RMHistory(for exerciseId: String, sessions: [WorkoutSession]) -> [(date: Date, e1rm: Double)] {
        let completedSessions = sessions
            .filter { $0.status == .completed }
            .sorted { $0.startTime < $1.startTime }

        var history: [(Date, Double)] = []

        for session in completedSessions {
            guard let exercise = session.exercises.first(where: { $0.id == exerciseId }) else {
                continue
            }

            var sessionBestE1RM: Double = 0

            for set in exercise.sets where set.completed {
                if let weight = set.weight,
                   let reps = set.reps,
                   let e1rm = calculate(weight: weight, reps: reps) {
                    sessionBestE1RM = max(sessionBestE1RM, e1rm)
                }
            }

            if sessionBestE1RM > 0 {
                let date = Date(timeIntervalSince1970: TimeInterval(session.startTime) / 1000)
                history.append((date, sessionBestE1RM))
            }
        }

        return history
    }

    // MARK: - Strength Standards
    struct StrengthLevel {
        let name: String
        let multiplier: Double  // As ratio of bodyweight
        let color: String

        static let beginner = StrengthLevel(name: "Beginner", multiplier: 0.5, color: "#A3A3A3")
        static let intermediate = StrengthLevel(name: "Intermediate", multiplier: 1.0, color: "#06B6D4")
        static let advanced = StrengthLevel(name: "Advanced", multiplier: 1.5, color: "#A855F7")
        static let elite = StrengthLevel(name: "Elite", multiplier: 2.0, color: "#F97316")

        static let all = [beginner, intermediate, advanced, elite]
    }

    static func getStrengthLevel(e1rm: Double, bodyweight: Double = 75) -> StrengthLevel {
        let ratio = e1rm / bodyweight

        if ratio >= StrengthLevel.elite.multiplier {
            return .elite
        } else if ratio >= StrengthLevel.advanced.multiplier {
            return .advanced
        } else if ratio >= StrengthLevel.intermediate.multiplier {
            return .intermediate
        } else {
            return .beginner
        }
    }

    // MARK: - Volume Calculations
    static func calculateVolume(for session: WorkoutSession) -> Double {
        var totalVolume: Double = 0

        for exercise in session.exercises {
            for set in exercise.sets where set.completed {
                if let weight = set.weight, let reps = set.reps {
                    totalVolume += weight * Double(reps)
                }
            }
        }

        return totalVolume
    }

    static func calculateVolume(for exerciseId: String, in session: WorkoutSession) -> Double {
        guard let exercise = session.exercises.first(where: { $0.id == exerciseId }) else {
            return 0
        }

        var volume: Double = 0
        for set in exercise.sets where set.completed {
            if let weight = set.weight, let reps = set.reps {
                volume += weight * Double(reps)
            }
        }

        return volume
    }
}
