import SwiftUI

struct ProfileView: View {
    @StateObject private var authService = AuthService.shared
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    if authService.isAuthenticated {
                        authenticatedContent
                    } else {
                        unauthenticatedContent
                    }
                }
                .padding()
            }
            .background(ColorPalette.background)
            .navigationTitle("Profile")
        }
    }

    // MARK: - Authenticated Content
    private var authenticatedContent: some View {
        VStack(spacing: 24) {
            // Profile Header
            VStack(spacing: 12) {
                Circle()
                    .fill(ColorPalette.mono900)
                    .frame(width: 80, height: 80)
                    .overlay(
                        Text(authService.user?.email.prefix(1).uppercased() ?? "U")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)
                    )

                Text(authService.user?.name ?? authService.user?.email ?? "User")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(ColorPalette.textPrimary)

                Text(authService.user?.email ?? "")
                    .font(.system(size: 14))
                    .foregroundColor(ColorPalette.textSecondary)
            }
            .padding(.vertical, 24)

            // Stats Cards
            HStack(spacing: 16) {
                StatCard(
                    title: "Sessions",
                    value: "\(appState.userState.sessions.count)",
                    color: ColorPalette.chest
                )

                StatCard(
                    title: "Templates",
                    value: "\(appState.allTemplates.count)",
                    color: ColorPalette.back
                )

                StatCard(
                    title: "Exercises",
                    value: "\(appState.allExercises.count)",
                    color: ColorPalette.legs
                )
            }

            // Actions
            VStack(spacing: 12) {
                Button {
                    exportData()
                } label: {
                    HStack {
                        Image(systemName: "square.and.arrow.down")
                        Text("Export Data")
                        Spacer()
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(8)
                }
                .foregroundColor(ColorPalette.textPrimary)

                Button {
                    authService.signOut()
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Sign Out")
                        Spacer()
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(8)
                }
                .foregroundColor(.red)
            }

            Spacer()
        }
    }

    // MARK: - Unauthenticated Content
    private var unauthenticatedContent: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "person.circle")
                .font(.system(size: 100))
                .foregroundColor(ColorPalette.mono400)

            VStack(spacing: 12) {
                Text("Sign In to TheGradual")
                    .font(.system(size: 28, weight: .black))
                    .foregroundColor(ColorPalette.textPrimary)

                Text("Unlock cloud sync, backup, and cross-device access")
                    .font(.system(size: 16))
                    .foregroundColor(ColorPalette.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            VStack(spacing: 16) {
                FeatureRow(icon: "icloud", title: "Cloud Sync", description: "Access your data anywhere")
                FeatureRow(icon: "lock.shield", title: "Secure", description: "Your data is encrypted")
                FeatureRow(icon: "arrow.clockwise", title: "Backup", description: "Never lose your progress")
            }
            .padding(.horizontal, 32)

            Button {
                // Get the root view controller
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let rootVC = windowScene.windows.first?.rootViewController {
                    authService.signIn(presentingViewController: rootVC)
                }
            } label: {
                Text("Sign In with Google")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(ColorPalette.mono900)
                    .cornerRadius(8)
            }
            .padding(.horizontal, 32)

            Spacer()
        }
    }

    // MARK: - Helper Functions
    private func exportData() {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted

        guard let data = try? encoder.encode(appState.userState),
              let jsonString = String(data: data, encoding: .utf8) else {
            return
        }

        let av = UIActivityViewController(activityItems: [jsonString], applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(av, animated: true)
        }
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Text(value)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(color)

            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(ColorPalette.textSecondary)
                .textCase(.uppercase)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.white)
        .cornerRadius(8)
    }
}

// MARK: - Feature Row
struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(ColorPalette.mono900)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(ColorPalette.textPrimary)

                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(ColorPalette.textSecondary)
            }

            Spacer()
        }
    }
}
