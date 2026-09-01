import MapKit
import SwiftUI

struct SessionDetailView: View {
    @EnvironmentObject private var storage: StorageService
    @Environment(\.dismiss) private var dismiss
    @State private var session: TrackingSession
    @State private var cameraPosition: MapCameraPosition = .automatic
    @State private var showingReport = false

    init(session: TrackingSession) {
        _session = State(initialValue: session)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                mapSection
                summarySection
                waypointSection
            }
            .padding()
        }
        .navigationTitle(session.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Report") {
                    showingReport = true
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(role: .destructive) {
                    storage.delete(session)
                    dismiss()
                } label: {
                    Image(systemName: "trash")
                }
            }
        }
        .sheet(isPresented: $showingReport) {
            ReportView(session: session)
        }
        .onAppear {
            updateCamera()
        }
    }

    private var mapSection: some View {
        Map(position: $cameraPosition) {
            if session.points.count > 1 {
                MapPolyline(coordinates: session.points.map(\.coordinate))
                    .stroke(.blue, lineWidth: 4)
            }

            if let first = session.points.first {
                Annotation("Start", coordinate: first.coordinate) {
                    Image(systemName: "flag.fill")
                        .foregroundStyle(.green)
                }
            }

            if let last = session.points.last, session.points.count > 1 {
                Annotation("End", coordinate: last.coordinate) {
                    Image(systemName: "flag.checkered")
                        .foregroundStyle(.red)
                }
            }
        }
        .frame(height: 240)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
        }
    }

    private var summarySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Summary")
                .font(.title3.bold())

            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 10) {
                GridRow {
                    SummaryItem(title: "Distance", value: session.formattedDistance)
                    SummaryItem(title: "Duration", value: session.formattedDuration)
                }
                GridRow {
                    SummaryItem(title: "Avg Speed", value: session.formattedAverageSpeed)
                    SummaryItem(title: "Waypoints", value: "\(session.points.count)")
                }
            }

            LabeledContent("Started") {
                Text(session.startDate, style: .date)
                Text(session.startDate, style: .time)
            }
            if let endDate = session.endDate {
                LabeledContent("Ended") {
                    Text(endDate, style: .date)
                    Text(endDate, style: .time)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var waypointSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Waypoints")
                .font(.title3.bold())

            if session.points.isEmpty {
                Text("No location points were recorded for this trip.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(Array(session.points.enumerated()), id: \.element.id) { index, point in
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Point \(index + 1)")
                            .font(.headline)
                        Text(point.formattedCoordinates)
                            .font(.caption.monospaced())
                        Text(point.timestamp, style: .time)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                    Divider()
                }
            }
        }
    }

    private func updateCamera() {
        guard let first = session.points.first else { return }
        cameraPosition = .region(
            MKCoordinateRegion(
                center: first.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            )
        )
    }
}

private struct SummaryItem: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    NavigationStack {
        SessionDetailView(session: TrackingSession(name: "Morning Run"))
    }
    .environmentObject(StorageService.shared)
}
