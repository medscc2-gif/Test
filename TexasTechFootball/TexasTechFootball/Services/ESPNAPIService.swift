import Foundation

enum ESPNAPIError: LocalizedError {
    case invalidResponse
    case decodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidResponse: "Received an invalid response from ESPN."
        case .decodingFailed: "Unable to parse ESPN data."
        }
    }
}

struct ESPNAPIService {
    static let texasTechTeamID = "2641"
    private static let baseURL = "https://site.api.espn.com/apis/site/v2/sports/football/college-football"

    private let session: URLSession
    private let decoder: JSONDecoder

    init(session: URLSession = .shared) {
        self.session = session
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
    }

    func fetchOverview(season: Int = Calendar.current.component(.year, from: Date())) async throws -> TeamOverview {
        async let teamData = fetchTeam()
        async let schedule = fetchSchedule(season: season)
        async let rankings = fetchRankings()

        let (team, games, teamRankings) = try await (teamData, schedule, rankings)
        let nextGame = games.first { $0.status == .scheduled || $0.status == .inProgress }

        return TeamOverview(
            displayName: team.displayName,
            logoURL: team.logoURL,
            record: team.record,
            rankings: teamRankings,
            standingSummary: team.standingSummary,
            nextGame: nextGame
        )
    }

    func fetchSchedule(season: Int = Calendar.current.component(.year, from: Date())) async throws -> [Game] {
        let url = URL(string: "\(Self.baseURL)/teams/\(Self.texasTechTeamID)/schedule?season=\(season)")!
        let data = try await fetchData(from: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let events = json?["events"] as? [[String: Any]] ?? []
        return events.compactMap { parseGame(from: $0) }
            .sorted { $0.date < $1.date }
    }

    func fetchNews(limit: Int = 25) async throws -> [NewsArticle] {
        let url = URL(string: "\(Self.baseURL)/news?team=\(Self.texasTechTeamID)")!
        let data = try await fetchData(from: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let articles = json?["articles"] as? [[String: Any]] ?? []

        return articles.prefix(limit).compactMap { article in
            guard let id = article["id"] as? String ?? (article["id"] as? Int).map(String.init),
                  let headline = article["headline"] as? String,
                  let publishedString = article["published"] as? String,
                  let published = ISO8601DateFormatter().date(from: publishedString) else {
                return nil
            }

            let description = article["description"] as? String
            let imageURL = ((article["images"] as? [[String: Any]])?.first)?["url"] as? String
            let articleURL = (article["links"] as? [String: Any])?["web"] as? [String: Any]
            let href = articleURL?["href"] as? String

            return NewsArticle(
                id: id,
                headline: headline,
                description: description,
                published: published,
                imageURL: imageURL.flatMap(URL.init(string:)),
                articleURL: href.flatMap(URL.init(string:))
            )
        }
    }

    func fetchRankings() async throws -> TeamRankings {
        let url = URL(string: "\(Self.baseURL)/rankings")!
        let data = try await fetchData(from: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let rankings = json?["rankings"] as? [[String: Any]] ?? []

        var apPoll: Int?
        var coachesPoll: Int?
        var cfpRanking: Int?
        var lastUpdated: Date?

        for poll in rankings {
            let name = (poll["name"] as? String ?? "").lowercased()
            let shortName = (poll["shortName"] as? String ?? "").lowercased()
            let ranks = poll["ranks"] as? [[String: Any]] ?? []

            guard let rank = ranks.first(where: { ($0["team"] as? [String: Any])?["id"] as? String == Self.texasTechTeamID }),
                  let current = rank["current"] as? Int, current > 0 else { continue }

            if name.contains("ap top") || shortName.contains("ap poll") {
                apPoll = current
            } else if name.contains("coaches") || shortName.contains("afca") {
                coachesPoll = current
            } else if name.contains("college football playoff") || shortName.contains("cfp") {
                cfpRanking = current
            }

            if let lastUpdatedString = poll["lastUpdated"] as? String {
                lastUpdated = ISO8601DateFormatter().date(from: lastUpdatedString) ?? lastUpdated
            }
        }

        return TeamRankings(apPoll: apPoll, coachesPoll: coachesPoll, cfpRanking: cfpRanking, lastUpdated: lastUpdated)
    }

    // MARK: - Private

    private struct ParsedTeam {
        let displayName: String
        let logoURL: URL?
        let record: TeamRecord
        let standingSummary: String?
    }

    private func fetchTeam() async throws -> ParsedTeam {
        let url = URL(string: "\(Self.baseURL)/teams/\(Self.texasTechTeamID)")!
        let data = try await fetchData(from: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let team = json?["team"] as? [String: Any] ?? [:]

        let displayName = team["displayName"] as? String ?? "Texas Tech Red Raiders"
        let logoURL = ((team["logos"] as? [[String: Any]])?.first)?["href"] as? String
        let standingSummary = team["standingSummary"] as? String

        let recordItems = (team["record"] as? [String: Any])?["items"] as? [[String: Any]] ?? []
        let overall = recordItems.first { ($0["type"] as? String) == "total" }
        let stats = overall?["stats"] as? [[String: Any]] ?? []

        func statValue(_ name: String) -> Int {
            Int(stats.first { ($0["name"] as? String) == name }?["value"] as? Double ?? 0)
        }

        let record = TeamRecord(
            wins: statValue("wins"),
            losses: statValue("losses"),
            ties: statValue("ties"),
            summary: overall?["summary"] as? String ?? "0-0",
            conferenceSummary: standingSummary
        )

        return ParsedTeam(
            displayName: displayName,
            logoURL: logoURL.flatMap(URL.init(string:)),
            record: record,
            standingSummary: standingSummary
        )
    }

    private func fetchData(from url: URL) async throws -> Data {
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ESPNAPIError.invalidResponse
        }
        return data
    }

    private func parseGame(from event: [String: Any]) -> Game? {
        guard let id = event["id"] as? String ?? (event["id"] as? Int).map(String.init),
              let dateString = event["date"] as? String,
              let date = ISO8601DateFormatter().date(from: dateString),
              let competition = (event["competitions"] as? [[String: Any]])?.first,
              let competitors = competition["competitors"] as? [[String: Any]] else {
            return nil
        }

        guard let tech = competitors.first(where: { ($0["team"] as? [String: Any])?["id"] as? String == Self.texasTechTeamID }),
              let opponentEntry = competitors.first(where: { ($0["team"] as? [String: Any])?["id"] as? String != Self.texasTechTeamID }),
              let opponentTeam = opponentEntry["team"] as? [String: Any] else {
            return nil
        }

        let opponent = opponentTeam["displayName"] as? String ?? "Opponent"
        let opponentAbbreviation = opponentTeam["abbreviation"] as? String ?? opponent
        let isHome = tech["homeAway"] as? String == "home"
        let week = (event["week"] as? [String: Any])?["number"] as? Int

        let venue = (competition["venue"] as? [String: Any])?["fullName"] as? String ?? "TBD"
        let status = parseStatus(competition["status"] as? [String: Any])
        let techScore = tech["score"] as? String ?? (tech["score"] as? Int).map(String.init)
        let opponentScore = opponentEntry["score"] as? String ?? (opponentEntry["score"] as? Int).map(String.init)

        let broadcast = ((competition["broadcasts"] as? [[String: Any]])?.first)?["media"] as? [String: Any]
        let broadcastName = broadcast?["shortName"] as? String

        let notes = competition["notes"] as? [[String: Any]] ?? []
        let isConferenceGame = notes.contains { ($0["type"] as? String) == "event" && (($0["headline"] as? String)?.contains("Conference") == true) }

        return Game(
            id: id,
            date: date,
            opponent: opponent,
            opponentAbbreviation: opponentAbbreviation,
            isHome: isHome,
            week: week,
            venue: venue,
            status: status,
            techScore: techScore,
            opponentScore: opponentScore,
            broadcast: broadcastName,
            isConferenceGame: isConferenceGame
        )
    }

    private func parseStatus(_ status: [String: Any]?) -> GameStatus {
        let typeName = (status?["type"] as? [String: Any])?["name"] as? String ?? ""
        switch typeName {
        case "STATUS_SCHEDULED", "STATUS_DELAYED":
            return .scheduled
        case "STATUS_IN_PROGRESS", "STATUS_HALFTIME", "STATUS_END_PERIOD":
            return .inProgress
        case "STATUS_FINAL", "STATUS_FULL_TIME":
            return .final
        case "STATUS_POSTPONED":
            return .postponed
        case "STATUS_CANCELED":
            return .canceled
        default:
            return .scheduled
        }
    }
}
