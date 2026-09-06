(() => {
  const {
    DEMO_CENTER,
    generateOfficersAround,
    formatDistance,
    findNearestOfficer,
    rankOfficersByDistance,
  } = window.BeatLinkData;

  const els = {
    statusText: document.getElementById("statusText"),
    statusDot: document.getElementById("statusDot"),
    nearestCard: document.getElementById("nearestCard"),
    nearestName: document.getElementById("nearestName"),
    nearestMeta: document.getElementById("nearestMeta"),
    rosterSection: document.getElementById("rosterSection"),
    rosterList: document.getElementById("rosterList"),
    rosterCount: document.getElementById("rosterCount"),
    permissionPanel: document.getElementById("permissionPanel"),
    locateBtn: document.getElementById("locateBtn"),
    demoBtn: document.getElementById("demoBtn"),
    refreshBtn: document.getElementById("refreshBtn"),
    focusNearestBtn: document.getElementById("focusNearestBtn"),
  };

  const state = {
    map: null,
    userMarker: null,
    officerMarkers: new Map(),
    user: null,
    officers: [],
    nearest: null,
    usingDemo: false,
  };

  function setStatus(message, tone = "pending") {
    els.statusText.textContent = message;
    els.statusDot.classList.remove("ready", "error");
    if (tone === "ready") els.statusDot.classList.add("ready");
    if (tone === "error") els.statusDot.classList.add("error");
  }

  function createDivIcon(className, label) {
    return L.divIcon({
      className: "",
      html: `<div class="marker-pin ${className}"><span>${label}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
      popupAnchor: [0, -28],
    });
  }

  function initMap() {
    state.map = L.map("map", {
      zoomControl: false,
      attributionControl: true,
    }).setView([DEMO_CENTER.lat, DEMO_CENTER.lng], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(state.map);

    L.control.zoom({ position: "topright" }).addTo(state.map);

    // Keep controls clear of the floating chrome on iPhone.
    const zoomEl = document.querySelector(".leaflet-top.leaflet-right");
    if (zoomEl) {
      zoomEl.style.top = "88px";
      zoomEl.style.right = "12px";
    }
  }

  function placeUser(user) {
    state.user = user;

    if (!state.userMarker) {
      const icon = L.divIcon({
        className: "",
        html: `<div class="user-pulse" title="You"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      state.userMarker = L.marker([user.lat, user.lng], { icon, zIndexOffset: 1000 })
        .addTo(state.map)
        .bindPopup("<strong>You are here</strong>");
    } else {
      state.userMarker.setLatLng([user.lat, user.lng]);
    }
  }

  function clearOfficerMarkers() {
    for (const marker of state.officerMarkers.values()) {
      state.map.removeLayer(marker);
    }
    state.officerMarkers.clear();
  }

  function renderOfficers() {
    clearOfficerMarkers();
    const ranked = rankOfficersByDistance(state.user, state.officers);
    state.nearest = findNearestOfficer(state.user, state.officers);

    ranked.forEach((officer, index) => {
      const isNearest = state.nearest && officer.id === state.nearest.id;
      const icon = createDivIcon(
        isNearest ? "nearest" : "officer",
        isNearest ? "★" : String(index + 1)
      );
      const marker = L.marker([officer.lat, officer.lng], {
        icon,
        zIndexOffset: isNearest ? 800 : 400,
      })
        .addTo(state.map)
        .bindPopup(
          `<strong>${officer.name}</strong><br>${officer.callSign} · ${officer.status}<br>${formatDistance(officer.distance)} away`
        );

      marker.on("click", () => {
        focusOfficer(officer.id);
      });

      state.officerMarkers.set(officer.id, marker);
    });

    updateSheet(ranked);
    fitMap();
  }

  function updateSheet(ranked) {
    els.permissionPanel.hidden = true;
    els.nearestCard.hidden = false;
    els.rosterSection.hidden = false;

    if (!state.nearest) {
      setStatus("No officers found nearby.", "error");
      return;
    }

    const source = state.usingDemo ? "Demo location" : "Live location";
    setStatus(`${source} · ${ranked.length} units on map`, "ready");

    els.nearestName.textContent = state.nearest.name;
    els.nearestMeta.textContent = `${state.nearest.callSign} · ${state.nearest.status} · ${formatDistance(state.nearest.distance)} away`;

    els.rosterCount.textContent = `${ranked.length} units`;
    els.rosterList.innerHTML = ranked
      .map((officer) => {
        const nearestClass = officer.id === state.nearest.id ? "is-nearest" : "";
        return `
          <li class="${nearestClass}" data-id="${officer.id}">
            <span class="name">${officer.name}</span>
            <span class="distance">${formatDistance(officer.distance)}</span>
            <span class="detail">${officer.callSign} · ${officer.status}</span>
          </li>
        `;
      })
      .join("");
  }

  function fitMap() {
    if (!state.user || !state.officers.length) return;
    const points = [
      [state.user.lat, state.user.lng],
      ...state.officers.map((o) => [o.lat, o.lng]),
    ];
    const bounds = L.latLngBounds(points);
    state.map.fitBounds(bounds, {
      paddingTopLeft: [24, 110],
      paddingBottomRight: [24, window.innerWidth >= 768 ? 40 : 280],
      maxZoom: 15,
      animate: true,
    });
  }

  function focusOfficer(id) {
    const officer = state.officers.find((o) => o.id === id) || state.nearest;
    if (!officer) return;
    state.map.flyTo([officer.lat, officer.lng], 16, { duration: 0.8 });
    const marker = state.officerMarkers.get(officer.id);
    if (marker) marker.openPopup();
  }

  function loadUnitsFor(user, usingDemo = false) {
    state.usingDemo = usingDemo;
    placeUser(user);
    state.officers = generateOfficersAround(user);
    renderOfficers();
  }

  function requestLocation() {
    setStatus("Requesting your location…", "pending");
    els.permissionPanel.hidden = true;

    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported in this browser.", "error");
      els.permissionPanel.hidden = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadUnitsFor(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          false
        );
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in Settings, or use demo location."
            : "Could not read your location. Try again or use demo location.";
        setStatus(message, "error");
        els.permissionPanel.hidden = false;
        els.nearestCard.hidden = true;
        els.rosterSection.hidden = true;
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      }
    );
  }

  function useDemoLocation() {
    loadUnitsFor({ ...DEMO_CENTER }, true);
  }

  function bindEvents() {
    els.locateBtn.addEventListener("click", requestLocation);
    els.demoBtn.addEventListener("click", useDemoLocation);
    els.refreshBtn.addEventListener("click", () => {
      if (state.user) {
        loadUnitsFor(state.user, state.usingDemo);
      } else {
        requestLocation();
      }
    });
    els.focusNearestBtn.addEventListener("click", () => {
      if (state.nearest) focusOfficer(state.nearest.id);
    });
    els.rosterList.addEventListener("click", (event) => {
      const item = event.target.closest("li[data-id]");
      if (!item) return;
      focusOfficer(item.dataset.id);
    });
  }

  function boot() {
    initMap();
    bindEvents();
    requestLocation();
  }

  boot();
})();
