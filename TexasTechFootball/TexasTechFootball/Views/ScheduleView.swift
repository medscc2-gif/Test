import SwiftUI

struct ScheduleView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.schedule.isEmpty && !viewModel.isLoading {
                    ContentUnavailableView(
                        "No Schedule",
                        systemImage: "calendar.badge.exclamationmark",
                        description: Text("Pull to refresh and load the season schedule.")
                    )
                } else {
                    List(viewModel.schedule) { game in
                        GameCard(game: game)
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Schedule")
            .refreshable {
                await viewModel.refresh()
            }
        }
    }
}

struct GameCard: View {
    let game: Game

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                if let week = game.week {
                    Text("Week \(week)")
                        .font(.caption.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color("TechRed").opacity(0.15))
                        .foregroundStyle(Color("TechRed"))
                        .clipShape(Capsule())
                }

                if game.isConferenceGame {
                    Text("Big 12")
                        .font(.caption.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.08))
                        .clipShape(Capsule())
                }

                Spacer()

                if let result = game.result {
                    Text(result.label)
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(result == .win ? Color.green : (result == .loss ? Color.red : Color.gray))
                        .clipShape(Capsule())
                } else {
                    Text(game.status.label)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Text(game.opponent)
                .font(.headline)

            Text(game.matchupLabel)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                Label(game.formattedDate, systemImage: "clock")
                Spacer()
                if let score = game.scoreLabel {
                    Text(score)
                        .font(.headline)
                        .foregroundStyle(Color("TechRed"))
                }
            }
            .font(.caption)

            HStack {
                Label(game.venue, systemImage: "mappin.and.ellipse")
                if let broadcast = game.broadcast {
                    Spacer()
                    Label(broadcast, systemImage: "tv")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

#Preview {
    ScheduleView()
        .environmentObject(AppViewModel())
}
