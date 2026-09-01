import Foundation

struct TeamRecord: Codable, Equatable {
    let wins: Int
    let losses: Int
    let ties: Int
    let summary: String
    let conferenceSummary: String?

    var formattedRecord: String {
        ties > 0 ? "\(wins)-\(losses)-\(ties)" : "\(wins)-\(losses)"
    }
}

struct TeamRankings: Codable, Equatable {
    let apPoll: Int?
    let coachesPoll: Int?
    let cfpRanking: Int?
    let lastUpdated: Date?

    var hasAnyRanking: Bool {
        apPoll != nil || coachesPoll != nil || cfpRanking != nil
    }
}

struct TeamOverview: Codable, Equatable {
    let displayName: String
    let logoURL: URL?
    let record: TeamRecord
    let rankings: TeamRankings
    let standingSummary: String?
    let nextGame: Game?
}
