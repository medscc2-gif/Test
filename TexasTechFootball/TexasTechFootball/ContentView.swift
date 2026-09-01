import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }

            ScheduleView()
                .tabItem {
                    Label("Schedule", systemImage: "calendar")
                }

            NewsView()
                .tabItem {
                    Label("News", systemImage: "newspaper.fill")
                }

            RivalryView()
                .tabItem {
                    Label("Rivalries", systemImage: "flag.2.crossed.fill")
                }

            SettingsView()
                .tabItem {
                    Label("Alerts", systemImage: "bell.fill")
                }
        }
        .tint(Color("TechRed"))
    }
}

#Preview {
    ContentView()
        .environmentObject(AppViewModel())
        .environmentObject(NotificationService.shared)
}
