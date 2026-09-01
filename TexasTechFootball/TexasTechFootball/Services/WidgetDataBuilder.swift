import Foundation

enum WidgetDataBuilder {
    static func buildSnapshot(from overview: TeamOverview?, schedule: [Game]) -> WidgetSnapshot {
        let liveGame = schedule.first { $0.status == .inProgress }
        let nextGame = schedule.first { $0.status == .scheduled && $0.date > Date() }
            ?? schedule.first { $0.status == .scheduled }

        return WidgetSnapshot(
            updatedAt: Date(),
            recordSummary: overview?.record.formattedRecord ?? "0-0",
            apRanking: overview?.rankings.apPoll,
            nextGameOpponent: nextGame?.opponent,
            nextGameMatchup: nextGame?.matchupLabel,
            nextGameDate: nextGame?.date,
            liveGameOpponent: liveGame?.opponent,
            liveGameScore: liveGame?.scoreLabel,
            liveGameStatus: liveGame?.status.label
        )
    }
}
