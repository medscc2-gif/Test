import WidgetKit
import SwiftUI

struct TexasTechLiveScoreWidget: Widget {
    let kind = "TexasTechLiveScoreWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LiveScoreProvider()) { entry in
            LiveScoreWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Texas Tech Live Score")
        .description("Shows the live score, next game, and season record.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct LiveScoreEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct LiveScoreProvider: TimelineProvider {
    func placeholder(in context: Context) -> LiveScoreEntry {
        LiveScoreEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (LiveScoreEntry) -> Void) {
        let snapshot = SharedDataStore.loadWidgetSnapshot() ?? .placeholder
        completion(LiveScoreEntry(date: Date(), snapshot: snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LiveScoreEntry>) -> Void) {
        let snapshot = SharedDataStore.loadWidgetSnapshot() ?? .placeholder
        let entry = LiveScoreEntry(date: Date(), snapshot: snapshot)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

struct LiveScoreWidgetView: View {
    let entry: LiveScoreEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "football.fill")
                    .foregroundStyle(Color(red: 0.855, green: 0.161, blue: 0.110))
                Text("Texas Tech")
                    .font(.headline)
                Spacer()
                if let rank = entry.snapshot.apRanking {
                    Text("#\(rank)")
                        .font(.caption.bold())
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.855, green: 0.161, blue: 0.110).opacity(0.15))
                        .clipShape(Capsule())
                }
            }

            if let opponent = entry.snapshot.liveGameOpponent,
               let score = entry.snapshot.liveGameScore {
                Text("LIVE")
                    .font(.caption2.bold())
                    .foregroundStyle(.red)
                Text("vs \(opponent)")
                    .font(.subheadline)
                Text(score)
                    .font(.title.bold())
            } else {
                Text(entry.snapshot.recordSummary)
                    .font(.title2.bold())
                if let matchup = entry.snapshot.nextGameMatchup {
                    Text("Next: \(matchup)")
                        .font(.caption)
                }
                if let date = entry.snapshot.nextGameDate {
                    Text(date, style: .date)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer(minLength: 0)
        }
        .padding()
    }
}

#Preview(as: .systemSmall) {
    TexasTechLiveScoreWidget()
} timeline: {
    LiveScoreEntry(date: .now, snapshot: .placeholder)
}
