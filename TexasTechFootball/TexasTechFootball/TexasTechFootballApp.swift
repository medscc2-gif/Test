import SwiftUI

@main
struct TexasTechFootballApp: App {
    @StateObject private var viewModel = AppViewModel()
    @StateObject private var notifications = NotificationService.shared

    init() {
        BackgroundRefreshService.register()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
                .environmentObject(notifications)
                .task {
                    await notifications.refreshAuthorizationStatus()
                    await viewModel.loadAll()
                }
        }
        .backgroundTask(.appRefresh("com.example.TexasTechFootball.refresh")) {
            await viewModel.refresh()
        }
    }
}
