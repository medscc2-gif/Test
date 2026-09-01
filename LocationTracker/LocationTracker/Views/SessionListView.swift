import SwiftUI

struct SessionListView: View {
    @EnvironmentObject private var storage: StorageService

    var body: some View {
        NavigationStack {
            Group {
                if storage.sessions.isEmpty {
                    ContentUnavailableView(
                        "No Trips Yet",
                        systemImage: "map",
                        description: Text("Start tracking on the Track tab to build your location history.")
                    )
                } else {
                    List(storage.sessions) { session in
                        NavigationLink(value: session.id) {
                            SessionRow(session: session)
                        }
                    }
                }
            }
            .navigationTitle("Trip History")
            .navigationDestination(for: UUID.self) { sessionID in
                if let session = storage.session(with: sessionID) {
                    SessionDetailView(session: session)
                }
            }
        }
    }
}

private struct SessionRow: View {
    let session: TrackingSession

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(session.name)
                .font(.headline)
            HStack {
                Label(session.formattedDistance, systemImage: "ruler")
                Spacer()
                Label(session.formattedDuration, systemImage: "clock")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            Text(session.startDate, style: .date)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    SessionListView()
        .environmentObject(StorageService.shared)
}
