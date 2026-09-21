import * as THREE from "three";

const canvas = document.getElementById("game");
const overlay = document.getElementById("overlay");
const panelKicker = document.getElementById("panelKicker");
const panelTitle = document.getElementById("panelTitle");
const panelCopy = document.getElementById("panelCopy");
const panelHint = document.getElementById("panelHint");
const primaryBtn = document.getElementById("primaryBtn");
const scoreEl = document.getElementById("scoreValue");
const waveEl = document.getElementById("waveValue");
const hullEl = document.getElementById("hullValue");

const MAX_HULL = 3;
const STORAGE_KEY = "iron-shell-3d-hi";
const WORLD = 220;

const state = {
  mode: "title",
  score: 0,
  hi: Number(localStorage.getItem(STORAGE_KEY) || 0),
  wave: 1,
  hull: MAX_HULL,
  invuln: 0,
  spawnTimer: 0,
  waveClearTimer: 0,
  aliensLeft: 0,
  aliensSpawned: 0,
  waveQuota: 0,
  keys: Object.create(null),
  pointerDown: false,
  pointerNdc: new THREE.Vector2(0, 0.2),
  ready: false,
};

const clock = new THREE.Clock();
const bullets = [];
const aliens = [];
const pickups = [];
const buildings = [];
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const aimPoint = new THREE.Vector3();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();

let renderer, scene, camera, sun, hemi;
let sandTex, scoutTex, bruteTex, razorTex, orbTex;
let tank, hullMesh, turretPivot, barrelMesh, muzzle;
let camTarget = new THREE.Vector3();
let camPos = new THREE.Vector3(0, 8, 14);

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

function makeDuneTerrain(texture) {
  const geo = new THREE.PlaneGeometry(WORLD * 1.4, WORLD * 1.4, 96, 96);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d =
      Math.sin(x * 0.045) * Math.cos(z * 0.038) * 1.8 +
      Math.sin(x * 0.11 + z * 0.07) * 0.7 +
      Math.sin((x + z) * 0.02) * 2.4;
    // Keep center relatively flat for driving start
    const fall = clamp(Math.hypot(x, z) / 40, 0, 1);
    pos.setY(i, d * fall * 0.85);
  }
  geo.computeVertexNormals();

  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(28, 28);
  texture.anisotropy = 8;

  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.95,
    metalness: 0.02,
    color: 0xd2b48c,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function makeBuilding(x, z, w, h, d) {
  const group = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.08, 0.08, rand(0.28, 0.42)),
    roughness: 0.92,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), concrete);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Broken top edge chunks
  const rubble = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.45, h * 0.12, d * 0.35),
    concrete
  );
  rubble.position.set(rand(-w * 0.2, w * 0.2), h + 0.2, rand(-d * 0.15, d * 0.15));
  rubble.rotation.y = rand(-0.4, 0.4);
  rubble.castShadow = true;
  group.add(rubble);

  // Window holes as darker insets
  const voidMat = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.05 });
  for (let i = 0; i < 3; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.18, h * 0.14, 0.2), voidMat);
    win.position.set(-w * 0.25 + i * w * 0.25, h * (0.35 + (i % 2) * 0.25), d / 2 + 0.01);
    group.add(win);
  }

  group.position.set(x, 0, z);
  group.userData.radius = Math.max(w, d) * 0.65;
  return group;
}

function makeWaterTower(x, z) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0xb8b0a4,
    roughness: 0.55,
    metalness: 0.45,
  });
  const rust = new THREE.MeshStandardMaterial({
    color: 0x8a6a48,
    roughness: 0.8,
    metalness: 0.2,
  });
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 10, 6), metal);
    const a = (i / 4) * Math.PI * 2 + 0.4;
    leg.position.set(Math.cos(a) * 1.4, 5, Math.sin(a) * 1.4);
    leg.castShadow = true;
    g.add(leg);
  }
  const tank = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12), rust);
  tank.position.y = 11;
  tank.castShadow = true;
  g.add(tank);
  g.position.set(x, 0, z);
  g.userData.radius = 3;
  return g;
}

function makeTank() {
  const root = new THREE.Group();
  const olive = new THREE.MeshStandardMaterial({
    color: 0x5a6844,
    roughness: 0.78,
    metalness: 0.18,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x2e3424,
    roughness: 0.85,
    metalness: 0.1,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xb8923a,
    roughness: 0.45,
    metalness: 0.55,
  });

  const tracksL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 3.2), dark);
  tracksL.position.set(-1.15, 0.35, 0);
  tracksL.castShadow = true;
  root.add(tracksL);
  const tracksR = tracksL.clone();
  tracksR.position.x = 1.15;
  root.add(tracksR);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 3.0), olive);
  body.position.y = 0.75;
  body.castShadow = true;
  root.add(body);
  hullMesh = body;

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.8), olive);
  nose.position.set(0, 0.7, -1.55);
  nose.castShadow = true;
  root.add(nose);

  turretPivot = new THREE.Group();
  turretPivot.position.set(0, 1.2, -0.1);
  root.add(turretPivot);

  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.55, 12), olive);
  turret.castShadow = true;
  turretPivot.add(turret);

  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), dark);
  hatch.position.y = 0.32;
  turretPivot.add(hatch);

  barrelMesh = new THREE.Group();
  turretPivot.add(barrelMesh);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 10), dark);
  tube.rotation.x = Math.PI / 2;
  tube.position.z = -1.5;
  tube.castShadow = true;
  barrelMesh.add(tube);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 10), brass);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = -2.75;
  barrelMesh.add(tip);

  muzzle = new THREE.Object3D();
  muzzle.position.z = -2.95;
  barrelMesh.add(muzzle);

  root.position.set(0, 0, 0);
  root.userData = {
    yaw: 0,
    speed: 0,
    maxSpeed: 22,
    accel: 28,
    turnRate: 1.8,
    cooldown: 0,
    radius: 2.2,
  };
  return root;
}

function makeAlien(kind, tex) {
  const group = new THREE.Group();
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.15,
  });
  const sprite = new THREE.Sprite(mat);
  const scale =
    kind === "brute" ? 4.2 : kind === "orb" ? 3.2 : kind === "razor" ? 2.6 : 3.0;
  sprite.scale.set(scale, scale, 1);
  sprite.position.y = scale * 0.45;
  group.add(sprite);

  // Soft ground blob
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(scale * 0.28, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);

  return group;
}

function heightAt(x, z) {
  // Approximate dune height used in terrain generation
  const fall = clamp(Math.hypot(x, z) / 40, 0, 1);
  const d =
    Math.sin(x * 0.045) * Math.cos(z * 0.038) * 1.8 +
    Math.sin(x * 0.11 + z * 0.07) * 0.7 +
    Math.sin((x + z) * 0.02) * 2.4;
  return d * fall * 0.85;
}

function placeOnGround(obj, x, z) {
  obj.position.set(x, heightAt(x, z), z);
}

async function init() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth || 960, canvas.clientHeight || 640, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1018);
  scene.fog = new THREE.FogExp2(0xc4783a, 0.012);

  // Dusk gradient sky via large dome
  const skyGeo = new THREE.SphereGeometry(260, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 top = vec3(0.08, 0.05, 0.14);
        vec3 mid = vec3(0.75, 0.35, 0.22);
        vec3 bot = vec3(0.95, 0.72, 0.42);
        vec3 col = mix(bot, mid, smoothstep(-0.2, 0.15, h));
        col = mix(col, top, smoothstep(0.15, 0.75, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  camera = new THREE.PerspectiveCamera(55, 1.5, 0.1, 400);
  camera.position.copy(camPos);

  hemi = new THREE.HemisphereLight(0xffd2a8, 0x3a2a18, 0.85);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffb078, 1.35);
  sun.position.set(-40, 35, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x402818, 0.35));

  const [sand, scout, brute, razor, orb] = await Promise.all([
    loadTexture("assets/ground-sand.jpg"),
    loadTexture("assets/alien-scout.png"),
    loadTexture("assets/alien-brute.png"),
    loadTexture("assets/alien-razor.png"),
    loadTexture("assets/alien-orb.png"),
  ]);
  sandTex = sand;
  scoutTex = scout;
  bruteTex = brute;
  razorTex = razor;
  orbTex = orb;

  scene.add(makeDuneTerrain(sandTex));

  // Outpost buildings around the map (not on spawn)
  const spots = [
    [28, -22, 8, 10, 6],
    [36, -8, 6, 14, 6],
    [22, 18, 7, 9, 5],
    [-30, 24, 9, 12, 7],
    [-38, -16, 6, 8, 6],
    [-18, -34, 10, 7, 8],
    [8, -40, 5, 11, 5],
    [42, 20, 7, 9, 7],
    [-45, 5, 6, 13, 5],
  ];
  for (const [x, z, w, h, d] of spots) {
    const b = makeBuilding(x, z, w, h, d);
    placeOnGround(b, x, z);
    // placeOnGround overwrites y; lift by ground already included — buildings sit on height
    b.position.y = heightAt(x, z);
    scene.add(b);
    buildings.push(b);
  }
  const tower = makeWaterTower(18, -28);
  tower.position.y = heightAt(18, -28);
  scene.add(tower);
  buildings.push(tower);

  // Distant ruin silhouettes
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const dist = rand(85, 110);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    const b = makeBuilding(x, z, rand(5, 12), rand(8, 20), rand(5, 10));
    b.position.y = heightAt(x, z);
    scene.add(b);
  }

  tank = makeTank();
  scene.add(tank);

  window.addEventListener("resize", onResize);
  onResize();
  state.ready = true;
  primaryBtn.disabled = false;
  primaryBtn.textContent = "Deploy tank";
  showOverlay("title");
  requestAnimationFrame(frame);
}

function onResize() {
  const wrap = canvas.parentElement;
  const w = Math.max(1, wrap.clientWidth);
  const h = Math.max(1, wrap.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  waveEl.textContent = String(state.wave);
  hullEl.querySelectorAll(".pip").forEach((pip, i) => {
    pip.classList.toggle("lost", i >= state.hull);
  });
}

function showOverlay(kind) {
  overlay.hidden = false;
  overlay.dataset.screen = kind;
  const panel = overlay.querySelector(".panel");
  panel.style.animation = "none";
  void panel.offsetWidth;
  panel.style.animation = "";

  if (kind === "title") {
    panelKicker.textContent = "Desert breach";
    panelTitle.textContent = "Iron Shell";
    panelCopy.textContent =
      "Drive the hull through the ruined outpost. Steer into the swarm and blast aliens before they reach you.";
    primaryBtn.textContent = "Deploy tank";
    panelHint.textContent = "W/S drive · A/D steer · mouse aim · click or Space fire";
  } else if (kind === "wave") {
    panelKicker.textContent = `Sector clear · best ${state.hi}`;
    panelTitle.textContent = `Wave ${state.wave}`;
    panelCopy.textContent = "Reload and roll out — denser swarm inbound.";
    primaryBtn.textContent = "Continue";
    panelHint.textContent = "Press Enter or tap Continue";
  } else if (kind === "gameover") {
    panelKicker.textContent = state.score >= state.hi ? "New high score" : "Hull breached";
    panelTitle.textContent = "Game Over";
    panelCopy.textContent = `Score ${state.score} · Wave ${state.wave} · Best ${state.hi}`;
    primaryBtn.textContent = "Redeploy";
    panelHint.textContent = "Press Enter or tap Redeploy";
  }
}

function hideOverlay() {
  overlay.hidden = true;
}

function clearWorldActors() {
  for (const b of bullets) scene.remove(b.mesh);
  bullets.length = 0;
  for (const a of aliens) scene.remove(a.mesh);
  aliens.length = 0;
  for (const p of pickups) scene.remove(p.mesh);
  pickups.length = 0;
}

function beginWave(n) {
  state.wave = n;
  state.waveQuota = 6 + n * 2;
  state.aliensLeft = state.waveQuota;
  state.aliensSpawned = 0;
  state.spawnTimer = 1.2;
  state.waveClearTimer = 0;
  waveEl.textContent = String(n);
}

function resetRun() {
  clearWorldActors();
  state.score = 0;
  state.wave = 1;
  state.hull = MAX_HULL;
  state.invuln = 0;
  tank.position.set(0, 0, 0);
  tank.userData.yaw = 0;
  tank.userData.speed = 0;
  tank.userData.cooldown = 0;
  tank.rotation.y = 0;
  turretPivot.rotation.set(0, 0, 0);
  barrelMesh.rotation.set(0, 0, 0);
  updateHud();
  beginWave(1);
}

function startGame() {
  if (!state.ready) return;
  resetRun();
  state.mode = "playing";
  hideOverlay();
  clock.getDelta();
}

function continueWave() {
  beginWave(state.wave + 1);
  state.mode = "playing";
  hideOverlay();
}

function gameOver() {
  state.mode = "gameover";
  if (state.score > state.hi) {
    state.hi = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.hi));
  }
  showOverlay("gameover");
}

function spawnAlien() {
  const roll = Math.random();
  let kind = "scout";
  let tex = scoutTex;
  let hp = 1;
  let speed = 7 + state.wave * 0.6;
  let score = 100;
  let radius = 1.4;
  if (state.wave >= 2 && roll > 0.55) {
    kind = "brute";
    tex = bruteTex;
    hp = 3;
    speed = 5 + state.wave * 0.4;
    score = 250;
    radius = 2.0;
  } else if (state.wave >= 3 && roll > 0.78) {
    kind = "razor";
    tex = razorTex;
    hp = 2;
    speed = 10 + state.wave * 0.7;
    score = 180;
    radius = 1.2;
  } else if (state.wave >= 4 && roll > 0.9) {
    kind = "orb";
    tex = orbTex;
    hp = 2;
    speed = 6.5 + state.wave * 0.5;
    score = 200;
    radius = 1.5;
  }

  const ang = Math.random() * Math.PI * 2;
  const dist = rand(38, 55);
  const x = tank.position.x + Math.cos(ang) * dist;
  const z = tank.position.z + Math.sin(ang) * dist;
  const mesh = makeAlien(kind, tex);
  placeOnGround(mesh, x, z);
  scene.add(mesh);
  aliens.push({ mesh, kind, hp, speed, score, radius, hitFlash: 0, bob: Math.random() * Math.PI * 2 });
  state.aliensSpawned++;
}

function fire() {
  const ud = tank.userData;
  if (ud.cooldown > 0) return;
  ud.cooldown = 0.22;

  muzzle.getWorldPosition(tmpV);
  // Barrel faces local -Z
  tmpV2.set(0, 0, -1).applyQuaternion(barrelMesh.getWorldQuaternion(_q)).normalize();

  const geo = new THREE.SphereGeometry(0.18, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(tmpV);
  scene.add(mesh);

  const flash = new THREE.PointLight(0xffaa55, 3, 12);
  flash.position.copy(tmpV);
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 60);

  bullets.push({
    mesh,
    vel: tmpV2.clone().multiplyScalar(55),
    life: 1.6,
  });
}

function damageTank() {
  if (state.invuln > 0) return;
  state.hull--;
  state.invuln = 1.5;
  updateHud();
  if (state.hull <= 0) gameOver();
}

function maybeDrop(pos) {
  if (Math.random() > 0.14 || state.hull >= MAX_HULL) return;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x7dff9a,
      emissive: 0x2a8a44,
      emissiveIntensity: 0.8,
    })
  );
  mesh.position.copy(pos);
  mesh.position.y += 1;
  scene.add(mesh);
  pickups.push({ mesh, life: 10 });
}

function updateAim() {
  raycaster.setFromCamera(state.pointerNdc, camera);
  if (raycaster.ray.intersectPlane(groundPlane, aimPoint)) {
    // Aim a bit above ground for nicer arcs
    const from = muzzle.getWorldPosition(tmpV);
    const dir = aimPoint.clone().sub(from);
    // Keep aim mostly forward-ish relative to hull for playability
    const local = dir.clone();
    const yaw = Math.atan2(-local.x, -local.z);
    // Smooth turret toward world yaw relative to tank
    const desiredTurret = yaw - tank.userData.yaw;
    let diff = desiredTurret - turretPivot.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    turretPivot.rotation.y += clamp(diff, -0.12, 0.12);

    const flatDist = Math.hypot(dir.x, dir.z);
    const pitch = -Math.atan2(dir.y + 1.2, flatDist);
    barrelMesh.rotation.x = clamp(pitch, -0.45, 0.15);
  }
}

function collideBuildings(nx, nz, radius) {
  for (const b of buildings) {
    const dx = nx - b.position.x;
    const dz = nz - b.position.z;
    const min = radius + (b.userData.radius || 4);
    if (dx * dx + dz * dz < min * min) return true;
  }
  return false;
}

function updatePlaying(dt) {
  const ud = tank.userData;
  let throttle = 0;
  let steer = 0;
  if (state.keys.w || state.keys.arrowup) throttle += 1;
  if (state.keys.s || state.keys.arrowdown) throttle -= 1;
  if (state.keys.a || state.keys.arrowleft) steer += 1;
  if (state.keys.d || state.keys.arrowright) steer -= 1;

  const targetSpeed = throttle * ud.maxSpeed;
  ud.speed += (targetSpeed - ud.speed) * Math.min(1, ud.accel * dt * 0.08);
  if (Math.abs(throttle) < 0.1) ud.speed *= 1 - Math.min(1, 3 * dt);

  const turn = steer * ud.turnRate * (0.45 + Math.min(1, Math.abs(ud.speed) / ud.maxSpeed));
  ud.yaw += turn * dt;
  tank.rotation.y = ud.yaw;

  const forwardX = -Math.sin(ud.yaw);
  const forwardZ = -Math.cos(ud.yaw);
  const nx = tank.position.x + forwardX * ud.speed * dt;
  const nz = tank.position.z + forwardZ * ud.speed * dt;
  const limited = clamp(Math.hypot(nx, nz), 0, WORLD * 0.48);
  const ang = Math.atan2(nx, nz);
  const fx = limited === 0 ? nx : Math.sin(ang) * limited;
  const fz = limited === 0 ? nz : Math.cos(ang) * limited;

  if (!collideBuildings(fx, fz, ud.radius)) {
    tank.position.x = fx;
    tank.position.z = fz;
  } else {
    ud.speed *= 0.3;
  }
  tank.position.y = heightAt(tank.position.x, tank.position.z);

  // Subtle body pitch/roll from dunes
  hullMesh.rotation.x = Math.sin(tank.position.x * 0.08 + tank.position.z * 0.05) * 0.04;
  hullMesh.rotation.z = Math.cos(tank.position.z * 0.07) * 0.03;

  if (ud.cooldown > 0) ud.cooldown -= dt;
  updateAim();
  if (state.keys[" "] || state.pointerDown || state.keys.fire) fire();

  if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);

  // Spawn
  if (state.aliensSpawned < state.waveQuota) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnAlien();
      state.spawnTimer = Math.max(0.55, 1.4 - state.wave * 0.08);
    }
  }

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.mesh.position.addScaledVector(b.vel, dt);
    b.life -= dt;
    if (b.life <= 0 || b.mesh.position.y < -2) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    }
  }

  // Aliens
  for (let i = aliens.length - 1; i >= 0; i--) {
    const a = aliens[i];
    a.bob += dt * 3;
    const toTank = tmpV.copy(tank.position).sub(a.mesh.position);
    toTank.y = 0;
    const dist = toTank.length();
    if (dist > 0.001) {
      toTank.multiplyScalar(1 / dist);
      a.mesh.position.x += toTank.x * a.speed * dt;
      a.mesh.position.z += toTank.z * a.speed * dt;
    }
    a.mesh.position.y = heightAt(a.mesh.position.x, a.mesh.position.z) + Math.sin(a.bob) * 0.25;

    // Bullet hits
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const d = b.mesh.position.distanceTo(a.mesh.position.clone().setY(a.mesh.position.y + 1.2));
      if (d < a.radius + 0.4) {
        scene.remove(b.mesh);
        bullets.splice(j, 1);
        a.hp -= 1;
        a.hitFlash = 0.12;
        if (a.hp <= 0) {
          state.score += a.score;
          state.aliensLeft--;
          maybeDrop(a.mesh.position.clone());
          scene.remove(a.mesh);
          aliens.splice(i, 1);
          updateHud();
          break;
        }
      }
    }
    if (!aliens[i]) continue;

    if (a.hitFlash > 0) {
      a.hitFlash -= dt;
      a.mesh.children[0].material.opacity = 0.45;
    } else {
      a.mesh.children[0].material.opacity = 1;
    }

    const hitDist = a.mesh.position.distanceTo(tank.position);
    if (hitDist < a.radius + ud.radius) {
      scene.remove(a.mesh);
      aliens.splice(i, 1);
      state.aliensLeft--;
      damageTank();
    }
  }

  // Pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.mesh.position.y = heightAt(p.mesh.position.x, p.mesh.position.z) + 1 + Math.sin(clock.elapsedTime * 5) * 0.2;
    if (p.mesh.position.distanceTo(tank.position) < 3) {
      if (state.hull < MAX_HULL) {
        state.hull++;
        updateHud();
      }
      scene.remove(p.mesh);
      pickups.splice(i, 1);
    } else if (p.life <= 0) {
      scene.remove(p.mesh);
      pickups.splice(i, 1);
    }
  }

  if (
    state.aliensSpawned >= state.waveQuota &&
    aliens.length === 0 &&
    state.aliensLeft <= 0
  ) {
    state.waveClearTimer += dt;
    if (state.waveClearTimer > 0.9) {
      state.mode = "wave";
      if (state.score > state.hi) {
        state.hi = state.score;
        localStorage.setItem(STORAGE_KEY, String(state.hi));
      }
      showOverlay("wave");
    }
  }
}

function updateCamera(dt) {
  const ud = tank.userData;
  const back = 11;
  const height = 5.5;
  const desired = tmpV.set(
    tank.position.x + Math.sin(ud.yaw) * back,
    tank.position.y + height,
    tank.position.z + Math.cos(ud.yaw) * back
  );
  camPos.lerp(desired, 1 - Math.pow(0.001, dt));
  camTarget.lerp(
    tmpV2.set(tank.position.x, tank.position.y + 1.6, tank.position.z),
    1 - Math.pow(0.0008, dt)
  );
  camera.position.copy(camPos);
  camera.lookAt(camTarget);

  // Keep sun relative-ish for consistent lighting
  sun.position.set(tank.position.x - 40, 35, tank.position.z + 20);
  sun.target.position.copy(tank.position);
  sun.target.updateMatrixWorld();
}

function frame() {
  const dt = Math.min(0.033, clock.getDelta());
  if (state.mode === "playing") updatePlaying(dt);
  else if (tank) updateAim();

  if (tank) updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// Input
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  state.keys[k] = true;
  if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) e.preventDefault();
  if (k === "enter") {
    if (state.mode === "title" || state.mode === "gameover") startGame();
    else if (state.mode === "wave") continueWave();
  }
});
window.addEventListener("keyup", (e) => {
  state.keys[e.key.toLowerCase()] = false;
});

function setPointerFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  state.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointerNdc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
}

canvas.addEventListener("pointerdown", (e) => {
  if (state.mode !== "playing") return;
  setPointerFromEvent(e);
  state.pointerDown = true;
  canvas.setPointerCapture(e.pointerId);
  fire();
});
canvas.addEventListener("pointermove", setPointerFromEvent);
canvas.addEventListener("pointerup", () => {
  state.pointerDown = false;
});
canvas.addEventListener("pointercancel", () => {
  state.pointerDown = false;
});

primaryBtn.addEventListener("click", () => {
  if (state.mode === "title" || state.mode === "gameover") startGame();
  else if (state.mode === "wave") continueWave();
});

document.querySelectorAll(".pad-btn[data-key]").forEach((btn) => {
  const key = btn.dataset.key;
  const on = (e) => {
    e.preventDefault();
    state.keys[key] = true;
    btn.classList.add("active");
  };
  const off = (e) => {
    e.preventDefault();
    state.keys[key] = false;
    btn.classList.remove("active");
  };
  btn.addEventListener("pointerdown", on);
  btn.addEventListener("pointerup", off);
  btn.addEventListener("pointerleave", off);
  btn.addEventListener("pointercancel", off);
});

const fireBtn = document.getElementById("fireBtn");
fireBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  state.keys.fire = true;
  fireBtn.classList.add("active");
  if (state.mode === "playing") fire();
});
const fireOff = (e) => {
  e.preventDefault();
  state.keys.fire = false;
  fireBtn.classList.remove("active");
};
fireBtn.addEventListener("pointerup", fireOff);
fireBtn.addEventListener("pointerleave", fireOff);
fireBtn.addEventListener("pointercancel", fireOff);

window.addEventListener("blur", () => {
  state.keys = Object.create(null);
  state.pointerDown = false;
});

primaryBtn.disabled = true;
primaryBtn.textContent = "Loading…";
updateHud();
init().catch((err) => {
  console.error(err);
  panelCopy.textContent = "Could not start the 3D outpost. Check the console and reload.";
  primaryBtn.disabled = false;
  primaryBtn.textContent = "Retry";
  primaryBtn.onclick = () => location.reload();
});
