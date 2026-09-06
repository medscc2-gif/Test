/**
 * Demo police officer units.
 * Positions are generated relative to the user's location so the map always
 * has nearby officers without needing a live CAD feed.
 */
const OFFICER_TEMPLATES = [
  { id: "u-14", name: "Ofc. Rivera", callSign: "Adam-14", status: "Patrol" },
  { id: "u-07", name: "Ofc. Chen", callSign: "Adam-07", status: "Available" },
  { id: "u-22", name: "Sgt. Brooks", callSign: "Sam-22", status: "Supervisor" },
  { id: "u-03", name: "Ofc. Patel", callSign: "Adam-03", status: "Traffic" },
  { id: "u-19", name: "Ofc. Morales", callSign: "Adam-19", status: "Patrol" },
  { id: "u-11", name: "Ofc. Nguyen", callSign: "Adam-11", status: "Available" },
];

/** Demo fallback: downtown Austin, TX */
const DEMO_CENTER = { lat: 30.2672, lng: -97.7431 };

/**
 * Offset a lat/lng by roughly metersNorth / metersEast.
 */
function offsetLatLng(lat, lng, metersNorth, metersEast) {
  const dLat = metersNorth / 111320;
  const dLng = metersEast / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

/**
 * Build officer positions around a center point.
 * Distances are deterministic so refreshes feel stable for a given center.
 */
function generateOfficersAround(center) {
  const rings = [
    [420, 80],
    [780, 210],
    [1100, -40],
    [640, 310],
    [1500, 140],
    [980, -260],
  ];

  return OFFICER_TEMPLATES.map((template, index) => {
    const [distanceM, bearingDeg] = rings[index % rings.length];
    const rad = (bearingDeg * Math.PI) / 180;
    const metersNorth = Math.cos(rad) * distanceM;
    const metersEast = Math.sin(rad) * distanceM;
    const position = offsetLatLng(center.lat, center.lng, metersNorth, metersEast);

    return {
      ...template,
      lat: position.lat,
      lng: position.lng,
    };
  });
}

/**
 * Haversine distance in meters.
 */
function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function findNearestOfficer(user, officers) {
  let nearest = null;
  let best = Infinity;

  for (const officer of officers) {
    const d = distanceMeters(user, officer);
    if (d < best) {
      best = d;
      nearest = { ...officer, distance: d };
    }
  }

  return nearest;
}

function rankOfficersByDistance(user, officers) {
  return officers
    .map((officer) => ({
      ...officer,
      distance: distanceMeters(user, officer),
    }))
    .sort((a, b) => a.distance - b.distance);
}

window.BeatLinkData = {
  DEMO_CENTER,
  generateOfficersAround,
  distanceMeters,
  formatDistance,
  findNearestOfficer,
  rankOfficersByDistance,
};
