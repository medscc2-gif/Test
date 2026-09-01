import SwiftUI

struct NewsView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.news.isEmpty && !viewModel.isLoading {
                    ContentUnavailableView(
                        "No News",
                        systemImage: "newspaper",
                        description: Text("Pull to refresh for the latest Texas Tech football news.")
                    )
                } else {
                    List(viewModel.news) { article in
                        NewsRow(article: article)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("News")
            .refreshable {
                await viewModel.refresh()
            }
        }
    }
}

private struct NewsRow: View {
    let article: NewsArticle

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AsyncImage(url: article.imageURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Rectangle()
                    .fill(Color("TechRed").opacity(0.15))
                    .overlay {
                        Image(systemName: "newspaper")
                            .foregroundStyle(Color("TechRed"))
                    }
            }
            .frame(width: 72, height: 72)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 6) {
                Text(article.headline)
                    .font(.headline)
                    .lineLimit(3)

                if let description = article.description {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                Text(article.formattedDate)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            if let url = article.articleURL {
                UIApplication.shared.open(url)
            }
        }
    }
}

#Preview {
    NewsView()
        .environmentObject(AppViewModel())
}
