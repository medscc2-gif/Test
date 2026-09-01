import Foundation

struct NewsArticle: Identifiable, Codable, Equatable {
    let id: String
    let headline: String
    let description: String?
    let published: Date
    let imageURL: URL?
    let articleURL: URL?

    var formattedDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: published, relativeTo: Date())
    }
}
