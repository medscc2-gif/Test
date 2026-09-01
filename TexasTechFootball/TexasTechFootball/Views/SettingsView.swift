import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var notifications: NotificationService
    @EnvironmentObject private var viewModel: AppViewModel
    @EnvironmentObject private var pushManager: PushNotificationManager

    @State private var gameAlerts: Bool = true
    @State private var newsAlerts: Bool = true
    @State private var pushAlerts: Bool = true
    @State private var serverURL: String = ""
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
                                    pushManager.registerForRemoteNotifications()
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

                Section("Push Alerts (Server)") {
                    Toggle("Server push notifications", isOn: $pushAlerts)
                        .onChange(of: pushAlerts) { _, value in
                            pushManager.pushEnabled = value
                            if value, notifications.isAuthorized {
                                pushManager.registerForRemoteNotifications()
                            }
                        }

                    TextField("Push server URL", text: $serverURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    Button("Save Server URL") {
                        pushManager.serverURL = serverURL
                        pushManager.registerForRemoteNotifications()
                    }

                    if pushManager.isRegistered {
                        Label("Device registered with server", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                            .font(.caption)
                    } else if let error = pushManager.lastRegistrationError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                } footer: {
                    Text("Server push delivers live score, news, and rivalry game alerts even when the app is closed. Deploy the included server/ folder and paste your server URL here.")
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
                pushAlerts = pushManager.pushEnabled
                serverURL = pushManager.serverURL
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
        .environmentObject(PushNotificationManager.shared)
}
