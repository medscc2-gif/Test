import MapKit
import SwiftUI

struct TrackingView: View {
    @EnvironmentObject private var locationManager: LocationManager
    @State private var tripName = ""
    @State private var cameraPosition: MapCameraPosition = .automatic

    private var mapPoints: [LocationPoint] {
        locationManager.activeSession?.points ?? []
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                mapSection
                statusSection
                controlsSection
            }
            .padding()
            .navigationTitle("Location Tracker")
            .onChange(of: locationManager.currentLocation) { _, location in
                guard let location else { return }
                cameraPosition = .region(
                    MKCoordinateRegion(
                        center: location.coordinate,
                        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                    )
                )
            }
        }
    }

    private var mapSection: some View {
        Map(position: $cameraPosition) {
            if let current = locationManager.currentLocation {
                Annotation("Current", coordinate: current.coordinate) {
                    Image(systemName: "location.circle.fill")
                        .font(.title)
                        .foregroundStyle(.blue)
                        .background(Circle().fill(.white))
                }
            }

            if mapPoints.count > 1 {
                MapPolyline(coordinates: mapPoints.map(\.coordinate))
                    .stroke(.blue, lineWidth: 4)
            }
        }
        .frame(height: 280)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
        }
    }

    private var statusSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if locationManager.isTracking {
                TextField("Trip name", text: $tripName)
                    .textFieldStyle(.roundedBorder)
                    .onChange(of: tripName) { _, newValue in
                        locationManager.updateSessionName(newValue)
                    }
            }

            HStack {
                StatusPill(
                    title: "Status",
                    value: locationManager.isTracking ? "Recording" : "Idle",
                    color: locationManager.isTracking ? .green : .secondary
                )
                StatusPill(
                    title: "Points",
                    value: "\(mapPoints.count)",
                    color: .blue
                )
            }

            if let session = locationManager.activeSession {
                HStack {
                    StatusPill(title: "Distance", value: session.formattedDistance, color: .orange)
                    StatusPill(title: "Duration", value: session.formattedDuration, color: .purple)
                }
            }

            if let location = locationManager.currentLocation {
                Text("Current: \(String(format: "%.5f", location.coordinate.latitude)), \(String(format: "%.5f", location.coordinate.longitude))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let error = locationManager.lastError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var controlsSection: some View {
        VStack(spacing: 12) {
            if needsPermission {
                Button("Enable Location Access") {
                    locationManager.requestPermission()
                }
                .buttonStyle(.borderedProminent)
            } else if locationManager.isTracking {
                Button(role: .destructive) {
                    locationManager.stopTracking()
                    tripName = ""
                } label: {
                    Label("Stop Tracking", systemImage: "stop.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            } else {
                Button {
                    let name = tripName.isEmpty ? defaultTripName : tripName
                    tripName = name
                    locationManager.startTracking(name: name)
                } label: {
                    Label("Start Tracking", systemImage: "play.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private var needsPermission: Bool {
        switch locationManager.authorizationStatus {
        case .notDetermined, .denied, .restricted:
            true
        default:
            false
        }
    }

    private var defaultTripName: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return "Trip \(formatter.string(from: Date()))"
    }
}

private struct StatusPill: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline)
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    TrackingView()
        .environmentObject(LocationManager())
}
