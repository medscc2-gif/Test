import Foundation
import UIKit

@MainActor
final class PushNotificationManager: ObservableObject {
    static let shared = PushNotificationManager()

    @Published private(set) var isRegistered = false
    @Published private(set) var lastRegistrationError: String?

    private let defaults = UserDefaults.standard
    private let session = URLSession.shared

    private enum Keys {
        static let serverURL = "push.serverURL"
        static let pushEnabled = "push.enabled"
        static let registeredToken = "push.registeredToken"
    }

    var serverURL: String {
        get { defaults.string(forKey: Keys.serverURL) ?? "" }
        set { defaults.set(newValue, forKey: Keys.serverURL) }
    }

    var pushEnabled: Bool {
        get { defaults.object(forKey: Keys.pushEnabled) as? Bool ?? true }
        set { defaults.set(newValue, forKey: Keys.pushEnabled) }
    }

    private init() {}

    func registerForRemoteNotifications() {
        guard pushEnabled else { return }
        UIApplication.shared.registerForRemoteNotifications()
    }

    func registerDeviceToken(_ tokenData: Data) {
        let token = tokenData.map { String(format: "%02x", $0) }.joined()
        guard pushEnabled, !serverURL.isEmpty, let url = URL(string: "\(serverURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")))/register") else {
            defaults.set(token, forKey: Keys.registeredToken)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "token": token,
            "platform": "ios",
            "team": "texas-tech"
        ])

        Task {
            do {
                let (_, response) = try await session.data(for: request)
                if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) {
                    isRegistered = true
                    lastRegistrationError = nil
                    defaults.set(token, forKey: Keys.registeredToken)
                } else {
                    isRegistered = false
                    lastRegistrationError = "Server rejected device registration."
                }
            } catch {
                isRegistered = false
                lastRegistrationError = error.localizedDescription
            }
        }
    }

    func handleRegistrationFailure(_ error: Error) {
        lastRegistrationError = error.localizedDescription
        isRegistered = false
    }
}
