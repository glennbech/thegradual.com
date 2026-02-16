import SwiftUI
import Charts

struct E1RMCard: View {
    let exercise: Exercise
    let e1rm: Double
    let history: [(Date, Double)]
    let isExpanded: Bool
    let onTap: () -> Void

    private let strengthLevel = E1RMCalculator.getStrengthLevel(e1rm: 100) // Simplified

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header (always visible)
            Button(action: onTap) {
                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(exercise.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(ColorPalette.textPrimary)

                        HStack(spacing: 8) {
                            Text(exercise.category)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .textCase(.uppercase)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(ColorPalette.muscleColor(for: exercise.category))
                                .cornerRadius(4)

                            Text("\(history.count) sessions")
                                .font(.system(size: 12))
                                .foregroundColor(ColorPalette.textSecondary)
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 4) {
                        Text(String(format: "%.0fkg", e1rm))
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(ColorPalette.textPrimary)

                        Text("e1RM")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(ColorPalette.textSecondary)
                            .textCase(.uppercase)
                    }

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(ColorPalette.textSecondary)
                        .padding(.leading, 8)
                }
                .padding()
            }
            .buttonStyle(PlainButtonStyle())

            // Expanded content
            if isExpanded {
                VStack(alignment: .leading, spacing: 16) {
                    Divider()

                    // Progress Stats
                    HStack(spacing: 16) {
                        StatColumn(label: "Latest", value: String(format: "%.0fkg", latestE1RM))
                        StatColumn(label: "Best", value: String(format: "%.0fkg", e1rm))
                        StatColumn(label: "Gain", value: gainText)
                    }
                    .padding(.horizontal)

                    // Chart
                    if #available(iOS 16.0, *) {
                        Chart {
                            ForEach(Array(history.enumerated()), id: \.offset) { index, point in
                                LineMark(
                                    x: .value("Date", point.0),
                                    y: .value("e1RM", point.1)
                                )
                                .foregroundStyle(ColorPalette.muscleColor(for: exercise.category))
                                .interpolationMethod(.catmullRom)

                                PointMark(
                                    x: .value("Date", point.0),
                                    y: .value("e1RM", point.1)
                                )
                                .foregroundStyle(ColorPalette.muscleColor(for: exercise.category))
                            }
                        }
                        .chartXAxis {
                            AxisMarks(values: .automatic(desiredCount: 3)) { _ in
                                AxisGridLine()
                                AxisTick()
                                AxisValueLabel(format: .dateTime.month(.abbreviated))
                            }
                        }
                        .chartYAxis {
                            AxisMarks(position: .leading) { _ in
                                AxisGridLine()
                                AxisTick()
                                AxisValueLabel()
                            }
                        }
                        .frame(height: 200)
                        .padding(.horizontal)
                    } else {
                        // Fallback for older iOS versions
                        Text("Chart requires iOS 16+")
                            .font(.system(size: 14))
                            .foregroundColor(ColorPalette.textSecondary)
                            .frame(height: 200)
                            .frame(maxWidth: .infinity)
                    }

                    // Formula info
                    Text("Calculated using Epley formula: weight × (1 + reps/30)")
                        .font(.system(size: 12))
                        .foregroundColor(ColorPalette.textSecondary)
                        .padding(.horizontal)
                        .padding(.bottom)
                }
            }
        }
        .background(Color.white)
        .cornerRadius(12)
    }

    private var latestE1RM: Double {
        history.last?.1 ?? e1rm
    }

    private var gainText: String {
        guard history.count >= 2,
              let first = history.first?.1,
              let last = history.last?.1 else {
            return "+0kg"
        }

        let gain = last - first
        return gain > 0 ? "+\(String(format: "%.0f", gain))kg" : "\(String(format: "%.0f", gain))kg"
    }
}

struct StatColumn: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(ColorPalette.textPrimary)

            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(ColorPalette.textSecondary)
                .textCase(.uppercase)
        }
        .frame(maxWidth: .infinity)
    }
}
