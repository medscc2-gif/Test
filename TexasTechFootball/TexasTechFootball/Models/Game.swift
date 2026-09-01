import Foundation

struct Game: Identifiable, Codable, Equatable {
    let id: String
    let date: Date
    let opponent: String
    let opponentAbbreviation: String
    let isHome: Bool
    let week: Int?
    let venue: String
    let status: GameStatus
    let techScore: String?
    let opponentScore: String?
    let broadcast: String?
    let isConferenceGame: Bool

    var matchupLabel: String {
        isHome ? "vs \(opponentAbbreviation)" : "@ \(opponentAbbreviation)"
    }

    var scoreLabel: String? {
        guard let techScore, let opponentScore else { return nil }
        return isHome ? "\(techScore)-\(opponentScore)" : "\(opponentScore)-\(techScore)"
    }

    var result: GameResult? {
        guard status == .final, let techScore, let opponentScore,
              let tech = Int(techScore), let opp = Int(opponentScore) else { return nil }
        if tech > opp { return .win }
        if tech < opp { return .loss }
        return .tie
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

enum GameStatus: String, Codable {
    case scheduled
    case inProgress
    case final
    case postponed
    case canceled

    var label: String {
        switch self {
        case .scheduled: "Scheduled"
        case .inProgress: "In Progress"
        case .final: "Final"
        case .postponed: "Postponed"
        case .canceled: "Canceled"
        }
    }
}

enum GameResult {
    case win
    case loss
    case tie

    var label: String {
        switch self {
        case .win: "W"
        case .loss: "L"
        case .tie: "T"
        }
    }

    var colorName: String {
        switch self {
        case .win: "winGreen"
        case .loss: "lossRed"
        case .tie: "tieGray"
        }
    }
}
