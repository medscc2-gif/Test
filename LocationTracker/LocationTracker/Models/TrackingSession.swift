import CoreLocation
import Foundation

struct TrackingSession: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    let startDate: Date
    var endDate: Date?
    var points: [LocationPoint]

    init(name: String = "Untitled Trip", startDate: Date = Date(), points: [LocationPoint] = []) {
        id = UUID()
        self.name = name
        self.startDate = startDate
        endDate = nil
        self.points = points
    }

    var isActive: Bool {
        endDate == nil
    }

    var duration: TimeInterval {
        let end = endDate ?? Date()
        return max(end.timeIntervalSince(startDate), 0)
    }

    var totalDistanceMeters: Double {
        guard points.count > 1 else { return 0 }

        var distance: Double = 0
        for index in 1..<points.count {
            distance += points[index - 1].clLocation.distance(from: points[index].clLocation)
        }
        return distance
    }

    var averageSpeedMetersPerSecond: Double {
        guard duration > 0 else { return 0 }
        return totalDistanceMeters / duration
    }

    var formattedDuration: String {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.hour, .minute, .second]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: duration) ?? "0s"
    }

    var formattedDistance: String {
        let miles = totalDistanceMeters / 1609.34
        if miles < 0.1 {
            let feet = totalDistanceMeters * 3.28084
            return String(format: "%.0f ft", feet)
        }
        return String(format: "%.2f mi", miles)
    }

    var formattedAverageSpeed: String {
        let mph = averageSpeedMetersPerSecond * 2.23694
        return String(format: "%.1f mph", mph)
    }
}
