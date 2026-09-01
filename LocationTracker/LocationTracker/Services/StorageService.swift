import Foundation

@MainActor
final class StorageService: ObservableObject {
    static let shared = StorageService()

    @Published private(set) var sessions: [TrackingSession] = []

    private let fileURL: URL

    private init() {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        fileURL = documents.appendingPathComponent("tracking_sessions.json")
        load()
    }

    func load() {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            sessions = []
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            sessions = try JSONDecoder().decode([TrackingSession].self, from: data)
                .sorted { $0.startDate > $1.startDate }
        } catch {
            sessions = []
        }
    }

    func save() {
        do {
            let data = try JSONEncoder().encode(sessions)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            // Persistence failures are surfaced through unchanged in-memory state.
        }
    }

    func upsert(_ session: TrackingSession) {
        if let index = sessions.firstIndex(where: { $0.id == session.id }) {
            sessions[index] = session
        } else {
            sessions.insert(session, at: 0)
        }
        save()
    }

    func delete(_ session: TrackingSession) {
        sessions.removeAll { $0.id == session.id }
        save()
    }

    func session(with id: UUID) -> TrackingSession? {
        sessions.first { $0.id == id }
    }
}
