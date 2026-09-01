import SwiftUI

struct RivalryView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.rivalryRecords.isEmpty && !viewModel.isLoadingRivalries {
                    ContentUnavailableView(
                        "No Rivalry Data",
                        systemImage: "flag.2.crossed",
                        description: Text("Pull to refresh rivalry records.")
                    )
                } else {
                    List(viewModel.rivalryRecords) { record in
                        RivalryCard(record: record)
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Rivalries")
            .refreshable {
                await viewModel.loadRivalries()
            }
            .overlay {
                if viewModel.isLoadingRivalries && viewModel.rivalryRecords.isEmpty {
                    ProgressView("Loading rivalries…")
                }
            }
        }
    }
}

private struct RivalryCard: View {
    let record: RivalryRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("vs \(record.rivalry.name)")
                        .font(.headline)
                    if let trophy = record.rivalry.trophyName {
                        Text(trophy)
                            .font(.caption)
                            .foregroundStyle(Color("TechRed"))
                    }
                }
                Spacer()
                Text(record.formattedSeries)
                    .font(.title2.bold())
                    .foregroundStyle(Color("TechRed"))
            }

            Text(record.rivalry.description)
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                StatPill(label: "Wins", value: "\(record.wins)", color: .green)
                StatPill(label: "Losses", value: "\(record.losses)", color: .red)
                StatPill(label: "Games", value: "\(record.games.count)", color: .secondary)
            }

            if let next = record.nextGame {
                Divider()
                Label("Next: \(next.matchupLabel) — \(next.formattedDate)", systemImage: "calendar")
                    .font(.caption)
            }

            if let last = record.lastMeeting, let score = last.scoreLabel {
                Label("Last meeting: \(score) (\(last.formattedDate))", systemImage: "clock.arrow.circlepath")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

private struct StatPill: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(value).font(.headline).foregroundStyle(color)
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    RivalryView()
        .environmentObject(AppViewModel())
}
