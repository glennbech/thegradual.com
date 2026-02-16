import Foundation
import Combine

class APIClient: ObservableObject {
    static let shared = APIClient()

    private let baseURL = "https://api.thegradual.com/api"
    @Published var isOnline = true

    private init() {
        // Monitor network status
        checkNetworkStatus()
    }

    private func checkNetworkStatus() {
        // Simple online check
        isOnline = true // TODO: Implement proper reachability
    }

    // MARK: - Fetch User State
    func fetchUserState(uuid: String) async throws -> UserState {
        guard let url = URL(string: "\(baseURL)/\(uuid)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = AuthService.shared.idToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if httpResponse.statusCode == 404 {
                // New user - return empty state
                return UserState(
                    sessions: [],
                    activeSession: nil,
                    customExercises: [],
                    customTemplates: [],
                    version: 1,
                    lastModified: nil
                )
            }
            throw APIError.httpError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(UserState.self, from: data)
    }

    // MARK: - Save User State
    func saveUserState(uuid: String, state: UserState) async throws -> UserState {
        guard let url = URL(string: "\(baseURL)/\(uuid)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = AuthService.shared.idToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        request.httpBody = try encoder.encode(state)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 409 {
            // Version conflict
            throw APIError.versionConflict
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.httpError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(UserState.self, from: data)
    }

    enum APIError: Error, LocalizedError {
        case invalidURL
        case invalidResponse
        case httpError(Int)
        case versionConflict

        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "Invalid API URL"
            case .invalidResponse:
                return "Invalid server response"
            case .httpError(let code):
                return "HTTP error: \(code)"
            case .versionConflict:
                return "Your data has been modified on another device. Please refresh."
            }
        }
    }
}
