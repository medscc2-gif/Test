import Foundation
import UserNotifications

@MainActor
final class NotificationService: ObservableObject {
    static let shared = NotificationService()

    @Published private(set) var isAuthorized = false

    private let center = UNUserNotificationCenter.current()
    private let defaults = UserDefaults.standard

    private enum Keys {
        static let gameAlerts = "notifications.gameAlerts"
        static let newsAlerts = "notifications.newsAlerts"
        static let gameReminderHours = "notifications.gameReminderHours"
        static let seenNewsIDs = "notifications.seenNewsIDs"
    }

    var gameAlertsEnabled: Bool {
        get { defaults.object(forKey: Keys.gameAlerts) as? Bool ?? true }
        set { defaults.set(newValue, forKey: Keys.gameAlerts) }
    }

    var newsAlertsEnabled: Bool {
        get { defaults.object(forKey: Keys.newsAlerts) as? Bool ?? true }
        set { defaults.set(newValue, forKey: Keys.newsAlerts) }
    }

    var gameReminderHours: [Int] {
        get { defaults.array(forKey: Keys.gameReminderHours) as? [Int] ?? [24, 1] }
        set { defaults.set(newValue, forKey: Keys.gameReminderHours) }
    }

    private init() {}

    func refreshAuthorizationStatus() async {
        let settings = await center.notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized
    }

    func requestAuthorization() async -> Bool {
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await refreshAuthorizationStatus()
            return granted
        } catch {
            await refreshAuthorizationStatus()
            return false
        }
    }

    func scheduleGameReminders(for games: [Game]) async {
        guard gameAlertsEnabled, isAuthorized else { return }

        center.removePendingNotificationRequests(withIdentifiers: games.map { "game-\($0.id)" })

        let upcoming = games.filter { $0.status == .scheduled && $0.date > Date() }

        for game in upcoming {
            for hoursBefore in gameReminderHours {
                let fireDate = game.date.addingTimeInterval(-Double(hoursBefore) * 3600)
                guard fireDate > Date() else { continue }

                let content = UNMutableNotificationContent()
                content.title = "Texas Tech Game Reminder"
                content.body = "\(game.matchupLabel) starts in \(hoursBefore) hour\(hoursBefore == 1 ? "" : "s")."
                content.sound = .default

                let components = Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute],
                    from: fireDate
                )
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                let request = UNNotificationRequest(
                    identifier: "game-\(game.id)-\(hoursBefore)h",
                    content: content,
                    trigger: trigger
                )

                try? await center.add(request)
            }
        }
    }

    func notifyFinalScore(for game: Game) async {
        guard gameAlertsEnabled, isAuthorized, game.status == .final,
              let result = game.result, let score = game.scoreLabel else { return }

        let content = UNMutableNotificationContent()
        content.title = "Final: Texas Tech \(result.label)"
        content.body = "\(game.matchupLabel) — \(score)"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "final-\(game.id)",
            content: content,
            trigger: nil
        )
        try? await center.add(request)
    }

    func processNewsAlerts(articles: [NewsArticle]) async {
        guard newsAlertsEnabled, isAuthorized else { return }

        var seen = Set(defaults.stringArray(forKey: Keys.seenNewsIDs) ?? [])
        let isFirstRun = seen.isEmpty

        if isFirstRun {
            seen = Set(articles.map(\.id))
            defaults.set(Array(seen), forKey: Keys.seenNewsIDs)
            return
        }

        let newArticles = articles.filter { !seen.contains($0.id) }
        guard !newArticles.isEmpty else { return }

        for article in newArticles.prefix(3) {
            let content = UNMutableNotificationContent()
            content.title = "Texas Tech Football News"
            content.body = article.headline
            content.sound = .default

            let request = UNNotificationRequest(
                identifier: "news-\(article.id)",
                content: content,
                trigger: nil
            )
            try? await center.add(request)
        }

        seen.formUnion(newArticles.map(\.id))
        defaults.set(Array(seen), forKey: Keys.seenNewsIDs)
    }
}
