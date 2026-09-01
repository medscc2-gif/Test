import SwiftUI

@main
struct TexasTechFootballApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var viewModel = AppViewModel()
    @StateObject private var notifications = NotificationService.shared
    @StateObject private var pushManager = PushNotificationManager.shared

    init() {
        BackgroundRefreshService.register()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
                .environmentObject(notifications)
                .environmentObject(pushManager)
                .task {
                    await notifications.refreshAuthorizationStatus()
                    if notifications.isAuthorized {
                        pushManager.registerForRemoteNotifications()
                    }
                    await viewModel.loadAll()
                    await viewModel.loadRivalries()
                }
        }
        .backgroundTask(.appRefresh("com.example.TexasTechFootball.refresh")) {
            await viewModel.refresh()
        }
    }
}
