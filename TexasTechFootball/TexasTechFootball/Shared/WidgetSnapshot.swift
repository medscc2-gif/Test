import Foundation

enum AppGroupConstants {
    static let identifier = "group.com.example.TexasTechFootball"
    static let widgetDataKey = "widgetSnapshot"
}

struct WidgetSnapshot: Codable {
    let updatedAt: Date
    let recordSummary: String
    let apRanking: Int?
    let nextGameOpponent: String?
    let nextGameMatchup: String?
    let nextGameDate: Date?
    let liveGameOpponent: String?
    let liveGameScore: String?
    let liveGameStatus: String?

    static let placeholder = WidgetSnapshot(
        updatedAt: Date(),
        recordSummary: "0-0",
        apRanking: nil,
        nextGameOpponent: "Opponent",
        nextGameMatchup: "vs OPP",
        nextGameDate: Date(),
        liveGameOpponent: nil,
        liveGameScore: nil,
        liveGameStatus: nil
    )
}

enum SharedDataStore {
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppGroupConstants.identifier)
    }

    static func saveWidgetSnapshot(_ snapshot: WidgetSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        defaults?.set(data, forKey: AppGroupConstants.widgetDataKey)
    }

    static func loadWidgetSnapshot() -> WidgetSnapshot? {
        guard let data = defaults?.data(forKey: AppGroupConstants.widgetDataKey),
              let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) else {
            return nil
        }
        return snapshot
    }
}
