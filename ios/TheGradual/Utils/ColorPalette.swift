import SwiftUI

struct ColorPalette {
    // MARK: - Muscle Group Colors (from web app)
    static let chest = Color(hex: "#EC4899")      // Pink
    static let back = Color(hex: "#06B6D4")       // Cyan
    static let legs = Color(hex: "#A855F7")       // Purple
    static let shoulders = Color(hex: "#F97316")  // Orange
    static let arms = Color(hex: "#6366F1")       // Indigo
    static let core = Color(hex: "#10B981")       // Emerald

    // MARK: - Mono Colors
    static let mono50 = Color(hex: "#FAFAFA")
    static let mono100 = Color(hex: "#F5F5F5")
    static let mono200 = Color(hex: "#E5E5E5")
    static let mono400 = Color(hex: "#A3A3A3")
    static let mono500 = Color(hex: "#737373")
    static let mono600 = Color(hex: "#525252")
    static let mono700 = Color(hex: "#404040")
    static let mono800 = Color(hex: "#262626")
    static let mono900 = Color(hex: "#171717")

    // MARK: - Semantic Colors
    static let background = mono50
    static let cardBackground = Color.white
    static let textPrimary = mono900
    static let textSecondary = mono500
    static let border = mono200

    // MARK: - Helper Function
    static func muscleColor(for category: String) -> Color {
        switch category.lowercased() {
        case "chest": return chest
        case "back": return back
        case "legs": return legs
        case "shoulders": return shoulders
        case "arms": return arms
        case "core": return core
        default: return mono500
        }
    }
}

// MARK: - Color Extension for Hex
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
