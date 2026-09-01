import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerSection
                    recordSection
                    rankingsSection
                    nextGameSection
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Red Raiders")
            .refreshable {
                await viewModel.refresh()
            }
            .overlay {
                if viewModel.isLoading && viewModel.overview == nil {
                    ProgressView("Loading Texas Tech data…")
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 12) {
            AsyncImage(url: viewModel.overview?.logoURL) { image in
                image.resizable().scaledToFit()
            } placeholder: {
                Image(systemName: "football.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(Color("TechRed"))
            }
            .frame(width: 80, height: 80)

            Text(viewModel.overview?.displayName ?? "Texas Tech Red Raiders")
                .font(.title2.bold())
                .multilineTextAlignment(.center)

            if let standing = viewModel.overview?.standingSummary {
                Text(standing)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var recordSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Season Record")
                .font(.headline)

            if let record = viewModel.overview?.record {
                HStack(spacing: 24) {
                    RecordStat(label: "Wins", value: "\(record.wins)", color: .green)
                    RecordStat(label: "Losses", value: "\(record.losses)", color: .red)
                    RecordStat(label: "Record", value: record.formattedRecord, color: Color("TechRed"))
                }
            } else {
                Text("Record unavailable")
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var rankingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Rankings")
                .font(.headline)

            if let rankings = viewModel.overview?.rankings {
                RankingRow(title: "AP Top 25", rank: rankings.apPoll)
                RankingRow(title: "Coaches Poll", rank: rankings.coachesPoll)
                RankingRow(title: "CFP Ranking", rank: rankings.cfpRanking, unavailableText: "Not yet released")
            } else {
                Text("Rankings unavailable")
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private var nextGameSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Next Game")
                .font(.headline)

            if let game = viewModel.overview?.nextGame {
                GameCard(game: game)
            } else {
                Text("No upcoming games scheduled.")
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct RecordStat: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title.bold())
                .foregroundStyle(color)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct RankingRow: View {
    let title: String
    let rank: Int?
    var unavailableText: String = "Unranked"

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            if let rank {
                Text("#\(rank)")
                    .font(.headline)
                    .foregroundStyle(Color("TechRed"))
            } else {
                Text(unavailableText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    DashboardView()
        .environmentObject(AppViewModel())
}
