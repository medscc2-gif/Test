import SwiftUI

@main
struct LocationTrackerApp: App {
    @StateObject private var locationManager = LocationManager()
    @StateObject private var storage = StorageService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(locationManager)
                .environmentObject(storage)
        }
    }
}
