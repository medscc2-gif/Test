import Combine
import CoreLocation
import Foundation

@MainActor
final class LocationManager: NSObject, ObservableObject {
    @Published private(set) var authorizationStatus: CLAuthorizationStatus
    @Published private(set) var currentLocation: CLLocation?
    @Published private(set) var isTracking = false
    @Published private(set) var activeSession: TrackingSession?
    @Published var lastError: String?

    private let manager = CLLocationManager()
    private let storage = StorageService.shared

    override init() {
        authorizationStatus = manager.authorizationStatus
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 10
        manager.pausesLocationUpdatesAutomatically = false
        manager.activityType = .fitness
        updateBackgroundCapability()
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func startTracking(name: String = "Untitled Trip") {
        guard authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways else {
            requestPermission()
            return
        }

        let session = TrackingSession(name: name)
        activeSession = session
        isTracking = true
        lastError = nil
        manager.startUpdatingLocation()
    }

    func stopTracking() {
        guard var session = activeSession else { return }

        session.endDate = Date()
        storage.upsert(session)

        activeSession = nil
        isTracking = false
        manager.stopUpdatingLocation()
    }

    func updateSessionName(_ name: String) {
        guard var session = activeSession else { return }
        session.name = name
        activeSession = session
    }

    private func updateBackgroundCapability() {
        manager.allowsBackgroundLocationUpdates = authorizationStatus == .authorizedAlways
    }

    private func append(_ location: CLLocation) {
        guard isTracking, var session = activeSession else { return }

        let point = LocationPoint(from: location)
        session.points.append(point)
        activeSession = session
        currentLocation = location
    }
}

extension LocationManager: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            authorizationStatus = manager.authorizationStatus
            updateBackgroundCapability()
            if authorizationStatus == .denied || authorizationStatus == .restricted {
                lastError = "Location access is required to track your trips."
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            append(location)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            lastError = error.localizedDescription
        }
    }
}
