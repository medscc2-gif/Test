import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var notifications: NotificationService
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var gameAlerts: Bool = true
    @State private var newsAlerts: Bool = true
    @State private var reminder24h: Bool = true
    @State private var reminder1h: Bool = true

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Label("Notifications", systemImage: "bell.badge")
                        Spacer()
                        Text(notifications.isAuthorized ? "Enabled" : "Disabled")
                            .foregroundStyle(notifications.isAuthorized ? .green : .secondary)
                    }

                    if !notifications.isAuthorized {
                        Button("Enable Notifications") {
                            Task {
                                await notifications.requestAuthorization()
                                if notifications.isAuthorized {
                                    await viewModel.refresh()
                                }
                            }
                        }
                    }
                } footer: {
                    Text("Allow notifications to get game reminders and breaking Texas Tech football news.")
                }

                Section("Game Alerts") {
                    Toggle("Upcoming game reminders", isOn: $gameAlerts)
                        .onChange(of: gameAlerts) { _, value in
                            notifications.gameAlertsEnabled = value
                            Task { await viewModel.refresh() }
                        }

                    Toggle("24 hours before kickoff", isOn: $reminder24h)
                        .disabled(!gameAlerts)
                        .onChange(of: reminder24h) { _, _ in updateReminderHours() }

                    Toggle("1 hour before kickoff", isOn: $reminder1h)
                        .disabled(!gameAlerts)
                        .onChange(of: reminder1h) { _, _ in updateReminderHours() }

                } footer: {
                    Text("Final score alerts are sent automatically when a game ends and the app refreshes.")
                }

                Section("News Alerts") {
                    Toggle("Breaking news notifications", isOn: $newsAlerts)
                        .onChange(of: newsAlerts) { _, value in
                            notifications.newsAlertsEnabled = value
                        }
                } footer: {
                    Text("News alerts check for new articles when the app refreshes in the background.")
                }

                if let lastRefreshed = viewModel.lastRefreshed {
                    Section("Data") {
                        LabeledContent("Last updated") {
                            Text(lastRefreshed, style: .relative)
                        }
                        Button("Refresh Now") {
                            Task { await viewModel.refresh() }
                        }
                    }
                }
            }
            .navigationTitle("Alerts")
            .onAppear {
                gameAlerts = notifications.gameAlertsEnabled
                newsAlerts = notifications.newsAlertsEnabled
                reminder24h = notifications.gameReminderHours.contains(24)
                reminder1h = notifications.gameReminderHours.contains(1)
            }
        }
    }

    private func updateReminderHours() {
        var hours: [Int] = []
        if reminder24h { hours.append(24) }
        if reminder1h { hours.append(1) }
        notifications.gameReminderHours = hours
        Task { await viewModel.refresh() }
    }
}

#Preview {
    SettingsView()
        .environmentObject(NotificationService.shared)
        .environmentObject(AppViewModel())
}
