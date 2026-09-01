import Foundation
import WidgetKit

@MainActor
final class AppViewModel: ObservableObject {
    @Published var overview: TeamOverview?
    @Published var schedule: [Game] = []
    @Published var news: [NewsArticle] = []
    @Published var rivalryRecords: [RivalryRecord] = []
    @Published var isLoading = false
    @Published var isLoadingRivalries = false
    @Published var errorMessage: String?
    @Published var lastRefreshed: Date?

    private let api = ESPNAPIService()
    private let rivalryService = RivalryService()
    private let notifications = NotificationService.shared
    private var previousFinalGameIDs: Set<String> = []

    func loadAll() async {
        isLoading = true
        errorMessage = nil

        do {
            async let overviewTask = api.fetchOverview()
            async let scheduleTask = api.fetchSchedule()
            async let newsTask = api.fetchNews()

            let (fetchedOverview, fetchedSchedule, fetchedNews) = try await (overviewTask, scheduleTask, newsTask)

            overview = fetchedOverview
            schedule = fetchedSchedule
            news = fetchedNews
            lastRefreshed = Date()

            let snapshot = WidgetDataBuilder.buildSnapshot(from: fetchedOverview, schedule: fetchedSchedule)
            SharedDataStore.saveWidgetSnapshot(snapshot)
            WidgetCenter.shared.reloadAllTimelines()

            await notifications.scheduleGameReminders(for: fetchedSchedule)
            await notifications.processNewsAlerts(articles: fetchedNews)
            await notifyNewFinalScores(in: fetchedSchedule)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func refresh() async {
        await loadAll()
        await loadRivalries()
    }

    func loadRivalries() async {
        isLoadingRivalries = true
        do {
            rivalryRecords = try await rivalryService.fetchRivalryRecords()
        } catch {
            if errorMessage == nil {
                errorMessage = error.localizedDescription
            }
        }
        isLoadingRivalries = false
    }

    private func notifyNewFinalScores(in games: [Game]) async {
        let finalGames = games.filter { $0.status == .final }
        let currentIDs = Set(finalGames.map(\.id))

        if !previousFinalGameIDs.isEmpty {
            for game in finalGames where !previousFinalGameIDs.contains(game.id) {
                await notifications.notifyFinalScore(for: game)
            }
        }

        previousFinalGameIDs = currentIDs
    }
}
