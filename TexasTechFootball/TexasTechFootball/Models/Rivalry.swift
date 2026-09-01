import Foundation

struct Rivalry: Identifiable, Equatable {
    let id: String
    let name: String
    let opponentAbbreviations: [String]
    let trophyName: String?
    let description: String
}

struct RivalryRecord: Identifiable, Equatable {
    let rivalry: Rivalry
    let wins: Int
    let losses: Int
    let ties: Int
    let games: [Game]

    var id: String { rivalry.id }

    var formattedSeries: String {
        ties > 0 ? "\(wins)-\(losses)-\(ties)" : "\(wins)-\(losses)"
    }

    var nextGame: Game? {
        games.first { $0.status == .scheduled || $0.status == .inProgress }
    }

    var lastMeeting: Game? {
        games.filter { $0.status == .final }.sorted { $0.date > $1.date }.first
    }
}

enum RivalryCatalog {
    static let all: [Rivalry] = [
        Rivalry(
            id: "texas",
            name: "Texas",
            opponentAbbreviations: ["TEX", "UT"],
            trophyName: "Chancellor's Spurs",
            description: "The Red Raiders and Longhorns share one of college football's most heated in-state rivalries."
        ),
        Rivalry(
            id: "tcu",
            name: "TCU",
            opponentAbbreviations: ["TCU"],
            trophyName: "West Texas Championship",
            description: "Texas Tech and TCU battle for bragging rights across West Texas."
        ),
        Rivalry(
            id: "baylor",
            name: "Baylor",
            opponentAbbreviations: ["BAY"],
            trophyName: "Texas Shootout",
            description: "A Big 12 rivalry defined by close games and high stakes."
        ),
        Rivalry(
            id: "okstate",
            name: "Oklahoma State",
            opponentAbbreviations: ["OKST"],
            trophyName: nil,
            description: "A longtime Big 12 matchup with conference title implications."
        ),
        Rivalry(
            id: "texasam",
            name: "Texas A&M",
            opponentAbbreviations: ["TA&M", "TAMU", "AM"],
            trophyName: nil,
            description: "A historic Texas rivalry whenever the schedules align."
        )
    ]
}

struct RivalryService {
    private let api = ESPNAPIService()

    func fetchRivalryRecords(seasonsBack: Int = 10) async throws -> [RivalryRecord] {
        let currentYear = Calendar.current.component(.year, from: Date())
        let years = (0..<seasonsBack).map { currentYear - $0 }

        var allGames: [Game] = []
        for year in years {
            let games = try await api.fetchSchedule(season: year)
            allGames.append(contentsOf: games)
        }

        return RivalryCatalog.all.map { rivalry in
            let rivalryGames = allGames.filter { game in
                rivalry.opponentAbbreviations.contains {
                    game.opponentAbbreviation.uppercased() == $0.uppercased()
                } || rivalry.opponentAbbreviations.contains(where: { game.opponent.localizedCaseInsensitiveContains($0) })
            }

            let finals = rivalryGames.filter { $0.status == .final }
            let wins = finals.filter { $0.result == .win }.count
            let losses = finals.filter { $0.result == .loss }.count
            let ties = finals.filter { $0.result == .tie }.count

            return RivalryRecord(
                rivalry: rivalry,
                wins: wins,
                losses: losses,
                ties: ties,
                games: rivalryGames.sorted { $0.date > $1.date }
            )
        }
        .filter { !$0.games.isEmpty }
        .sorted { ($0.nextGame?.date ?? .distantPast) < ($1.nextGame?.date ?? .distantPast) }
    }
}
