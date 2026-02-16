import Foundation
import AuthenticationServices
import Combine

class AuthService: NSObject, ObservableObject {
    static let shared = AuthService()

    @Published var isAuthenticated = false
    @Published var user: User?
    @Published var idToken: String?

    private let cognitoUserPoolId = "us-east-2_CAmZVp7Au"
    private let cognitoClientId = "1gmn5mu9odm80u0uj8dm4a46pv"
    private let cognitoDomain = "auth.thegradual.com"

    struct User {
        let sub: String
        let email: String
        let name: String?
    }

    private override init() {
        super.init()
        checkStoredAuth()
    }

    private func checkStoredAuth() {
        // Check for stored tokens in Keychain
        if let token = KeychainHelper.load(key: "idToken") {
            self.idToken = token
            self.isAuthenticated = true
            decodeToken(token)
        }
    }

    // MARK: - Sign In with Cognito (Web OAuth)
    func signIn(presentingViewController: UIViewController) {
        let authURL = buildAuthURL()

        let session = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: "thegradual"
        ) { [weak self] callbackURL, error in
            guard let self = self else { return }

            if let error = error {
                print("Auth error: \(error)")
                return
            }

            guard let callbackURL = callbackURL else { return }

            // Extract code from callback
            if let code = self.extractCode(from: callbackURL) {
                Task {
                    await self.exchangeCodeForTokens(code: code)
                }
            }
        }

        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        session.start()
    }

    private func buildAuthURL() -> URL {
        var components = URLComponents()
        components.scheme = "https"
        components.host = cognitoDomain
        components.path = "/oauth2/authorize"
        components.queryItems = [
            URLQueryItem(name: "client_id", value: cognitoClientId),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "email openid profile"),
            URLQueryItem(name: "redirect_uri", value: "thegradual://callback")
        ]
        return components.url!
    }

    private func extractCode(from url: URL) -> String? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            return nil
        }
        return code
    }

    private func exchangeCodeForTokens(code: String) async {
        var components = URLComponents()
        components.scheme = "https"
        components.host = cognitoDomain
        components.path = "/oauth2/token"

        guard let url = components.url else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "grant_type": "authorization_code",
            "client_id": cognitoClientId,
            "code": code,
            "redirect_uri": "thegradual://callback"
        ]

        request.httpBody = body.percentEncoded()

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let response = try JSONDecoder().decode(TokenResponse.self, from: data)

            await MainActor.run {
                self.idToken = response.id_token
                self.isAuthenticated = true

                // Save to keychain
                KeychainHelper.save(key: "idToken", value: response.id_token)
                KeychainHelper.save(key: "accessToken", value: response.access_token)

                decodeToken(response.id_token)
            }
        } catch {
            print("Token exchange error: \(error)")
        }
    }

    private func decodeToken(_ token: String) {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return }

        var base64 = String(parts[1])
        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return
        }

        self.user = User(
            sub: json["sub"] as? String ?? "",
            email: json["email"] as? String ?? "",
            name: json["name"] as? String
        )
    }

    // MARK: - Sign Out
    func signOut() {
        KeychainHelper.delete(key: "idToken")
        KeychainHelper.delete(key: "accessToken")
        idToken = nil
        isAuthenticated = false
        user = nil
    }

    struct TokenResponse: Codable {
        let id_token: String
        let access_token: String
        let refresh_token: String
        let expires_in: Int
        let token_type: String
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding
extension AuthService: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return ASPresentationAnchor()
    }
}

// MARK: - Dictionary Extension for URL Encoding
extension Dictionary {
    func percentEncoded() -> Data? {
        return map { key, value in
            let escapedKey = "\(key)".addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) ?? ""
            let escapedValue = "\(value)".addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) ?? ""
            return escapedKey + "=" + escapedValue
        }
        .joined(separator: "&")
        .data(using: .utf8)
    }
}

extension CharacterSet {
    static let urlQueryValueAllowed: CharacterSet = {
        let generalDelimitersToEncode = ":#[]@"
        let subDelimitersToEncode = "!$&'()*+,;="

        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "\(generalDelimitersToEncode)\(subDelimitersToEncode)")
        return allowed
    }()
}

// MARK: - Keychain Helper
struct KeychainHelper {
    static func save(key: String, value: String) {
        let data = value.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)

        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
