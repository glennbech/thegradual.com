import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var authService = AuthService.shared
    @State private var selectedTab = 2 // Start on Analyze tab

    var body: some View {
        TabView(selection: $selectedTab) {
            // Home Tab
            PlaceholderView(
                icon: "house.fill",
                title: "Work Out",
                description: "Coming Soon",
                color: ColorPalette.mono900
            )
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(0)

            // Plan Tab
            PlaceholderView(
                icon: "calendar",
                title: "Plan",
                description: "Coming Soon",
                color: ColorPalette.mono900
            )
            .tabItem {
                Label("Plan", systemImage: "calendar")
            }
            .tag(1)

            // Analyze Tab (FULLY FUNCTIONAL)
            AnalyzeView()
                .tabItem {
                    Label("Analyze", systemImage: "chart.bar.fill")
                }
                .tag(2)

            // History Tab
            PlaceholderView(
                icon: "clock.fill",
                title: "History",
                description: "Coming Soon",
                color: ColorPalette.mono900
            )
            .tabItem {
                Label("History", systemImage: "clock.fill")
            }
            .tag(3)

            // Profile Tab
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(4)
        }
        .accentColor(ColorPalette.mono900)
        .task {
            if authService.isAuthenticated {
                await appState.loadUserState()
            }
        }
    }
}

// MARK: - Placeholder View
struct PlaceholderView: View {
    let icon: String
    let title: String
    let description: String
    let color: Color

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: icon)
                .font(.system(size: 80))
                .foregroundColor(color.opacity(0.3))

            VStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 28, weight: .black))
                    .foregroundColor(ColorPalette.textPrimary)

                Text(description)
                    .font(.system(size: 16))
                    .foregroundColor(ColorPalette.textSecondary)
            }

            Text("This feature is under development")
                .font(.system(size: 14))
                .foregroundColor(ColorPalette.textSecondary)
                .padding(.horizontal, 40)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ColorPalette.background)
    }
}
