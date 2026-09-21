(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const panelKicker = document.getElementById("panelKicker");
  const panelTitle = document.getElementById("panelTitle");
  const panelCopy = document.getElementById("panelCopy");
  const panelHint = document.getElementById("panelHint");
  const primaryBtn = document.getElementById("primaryBtn");
  const scoreEl = document.getElementById("scoreValue");
  const waveEl = document.getElementById("waveValue");
  const hullEl = document.getElementById("hullValue");

  const W = 960;
  const H = 640;
  const MAX_HULL = 3;
  const STORAGE_KEY = "iron-shell-hi";

  const state = {
    mode: "title", // title | playing | wave | gameover
    score: 0,
    hi: Number(localStorage.getItem(STORAGE_KEY) || 0),
    wave: 1,
    hull: MAX_HULL,
    invuln: 0,
    shake: 0,
    flash: 0,
    spawnTimer: 0,
    waveClearTimer: 0,
    aliensLeftInWave: 0,
    aliensSpawned: 0,
    waveQuota: 0,
    keys: Object.create(null),
    pointerDown: false,
    aimX: W / 2,
    t: 0,
    stars: [],
    dust: [],
    tank: null,
    bullets: [],
    aliens: [],
    particles: [],
    blasts: [],
    pickups: [],
  };

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function initBackdrop() {
    state.stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.55,
      r: rand(0.6, 2.1),
      tw: rand(0.4, 1.6),
      ph: Math.random() * Math.PI * 2,
    }));
    state.dust = Array.from({ length: 28 }, () => ({
      x: Math.random() * W,
      y: rand(H * 0.55, H),
      s: rand(20, 90),
      a: rand(0.04, 0.12),
      vx: rand(-8, 8),
    }));
  }

  function makeTank() {
    return {
      x: W / 2,
      y: H - 72,
      w: 64,
      h: 36,
      speed: 280,
      cooldown: 0,
      barrelAngle: -Math.PI / 2,
      recoil: 0,
      tread: 0,
    };
  }

  function resetRun() {
    state.score = 0;
    state.wave = 1;
    state.hull = MAX_HULL;
    state.invuln = 0;
    state.shake = 0;
    state.flash = 0;
    state.bullets = [];
    state.aliens = [];
    state.particles = [];
    state.blasts = [];
    state.pickups = [];
    state.tank = makeTank();
    updateHud();
    beginWave(1);
  }

  function beginWave(n) {
    state.wave = n;
    state.waveQuota = 6 + n * 3;
    state.aliensLeftInWave = state.waveQuota;
    state.aliensSpawned = 0;
    state.spawnTimer = 0.6;
    state.waveClearTimer = 0;
    waveEl.textContent = String(n);
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    waveEl.textContent = String(state.wave);
    const pips = hullEl.querySelectorAll(".pip");
    pips.forEach((pip, i) => {
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
      panelKicker.textContent = "Incoming breach";
      panelTitle.textContent = "Iron Shell";
      panelCopy.textContent =
        "Roll the hull across the veldt and blast the swarm before they reach the trench.";
      primaryBtn.textContent = "Deploy tank";
      panelHint.textContent =
        "A / D or ← → move · Space or click fire · touch pads on mobile";
    } else if (kind === "wave") {
      panelKicker.textContent = `Sector cleared · best ${state.hi}`;
      panelTitle.textContent = `Wave ${state.wave}`;
      panelCopy.textContent = "Reload. The next swarm is denser — and meaner.";
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

  function startGame() {
    resetRun();
    state.mode = "playing";
    hideOverlay();
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
    const tier = Math.min(3, 1 + Math.floor((state.wave - 1) / 2) + (Math.random() < 0.25 ? 1 : 0));
    const kinds = [
      { kind: "scout", r: 16, hp: 1, speed: 55 + state.wave * 6, score: 100, color: "#7dff9a" },
      { kind: "brute", r: 24, hp: 3, speed: 35 + state.wave * 4, score: 250, color: "#c8ff4d" },
      { kind: "razor", r: 14, hp: 2, speed: 90 + state.wave * 8, score: 180, color: "#ff5e4d" },
      { kind: "orb", r: 20, hp: 2, speed: 45 + state.wave * 5, score: 200, color: "#5ee7ff" },
    ];
    const def = kinds[Math.min(tier, kinds.length - 1)];
    const x = rand(40, W - 40);
    state.aliens.push({
      ...def,
      x,
      y: -30,
      vx: rand(-40, 40),
      phase: Math.random() * Math.PI * 2,
      hitFlash: 0,
    });
    state.aliensSpawned++;
  }

  function fire() {
    const tank = state.tank;
    if (!tank || tank.cooldown > 0) return;
    tank.cooldown = 0.22;
    tank.recoil = 1;
    const ang = tank.barrelAngle;
    const muzzle = 42;
    const bx = tank.x + Math.cos(ang) * muzzle;
    const by = tank.y - 8 + Math.sin(ang) * muzzle;
    state.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(ang) * 620,
      vy: Math.sin(ang) * 620,
      life: 1.4,
      r: 4,
    });
    burst(bx, by, "#ffd27a", 6, 80, 180);
  }

  function burst(x, y, color, n, minSp, maxSp) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(minSp, maxSp);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.25, 0.7),
        max: 0.7,
        r: rand(1.5, 4),
        color,
      });
    }
  }

  function explode(x, y, color) {
    state.blasts.push({ x, y, r: 4, max: 48, life: 1, color });
    burst(x, y, color, 18, 60, 260);
    burst(x, y, "#e8dfc8", 8, 40, 140);
    state.shake = Math.max(state.shake, 0.35);
  }

  function damageTank() {
    if (state.invuln > 0) return;
    state.hull--;
    state.invuln = 1.4;
    state.flash = 0.35;
    state.shake = 0.55;
    updateHud();
    burst(state.tank.x, state.tank.y, "#e85a3c", 16, 80, 220);
    if (state.hull <= 0) gameOver();
  }

  function maybeDrop(x, y) {
    if (Math.random() > 0.12 || state.hull >= MAX_HULL) return;
    state.pickups.push({ x, y, vy: 50, kind: "repair", life: 8 });
  }

  function update(dt) {
    state.t += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);

    state.dust.forEach((d) => {
      d.x += d.vx * dt * 0.15;
      if (d.x < -40) d.x = W + 40;
      if (d.x > W + 40) d.x = -40;
    });

    if (state.mode !== "playing" || !state.tank) return;

    const tank = state.tank;
    let move = 0;
    if (state.keys.a || state.keys.arrowleft) move -= 1;
    if (state.keys.d || state.keys.arrowright) move += 1;
    tank.x = clamp(tank.x + move * tank.speed * dt, 40, W - 40);
    tank.tread += Math.abs(move) * dt * 10;
    if (tank.cooldown > 0) tank.cooldown -= dt;
    if (tank.recoil > 0) tank.recoil = Math.max(0, tank.recoil - dt * 4);

    const aimDx = state.aimX - tank.x;
    const aimDy = Math.min(0, H * 0.35 - tank.y);
    tank.barrelAngle = Math.atan2(aimDy - 40, aimDx);
    tank.barrelAngle = clamp(tank.barrelAngle, -Math.PI * 0.92, -Math.PI * 0.08);

    if (state.keys[" "] || state.pointerDown || state.keys.fire) fire();

    // spawn
    if (state.aliensSpawned < state.waveQuota) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnAlien();
        const pace = Math.max(0.28, 1.05 - state.wave * 0.06);
        state.spawnTimer = pace;
      }
    }

    // bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.y < -20 || b.x < -20 || b.x > W + 20) {
        state.bullets.splice(i, 1);
      }
    }

    // aliens
    for (let i = state.aliens.length - 1; i >= 0; i--) {
      const a = state.aliens[i];
      a.phase += dt * (a.kind === "razor" ? 6 : 2.5);
      a.x += a.vx * dt + Math.sin(a.phase) * (a.kind === "orb" ? 70 : 25) * dt;
      a.y += a.speed * dt;
      if (a.hitFlash > 0) a.hitFlash -= dt;
      if (a.x < a.r) {
        a.x = a.r;
        a.vx = Math.abs(a.vx);
      }
      if (a.x > W - a.r) {
        a.x = W - a.r;
        a.vx = -Math.abs(a.vx);
      }

      // bullet hits
      for (let j = state.bullets.length - 1; j >= 0; j--) {
        const b = state.bullets[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx * dx + dy * dy < (a.r + b.r) * (a.r + b.r)) {
          state.bullets.splice(j, 1);
          a.hp -= 1;
          a.hitFlash = 0.12;
          burst(b.x, b.y, a.color, 5, 40, 120);
          if (a.hp <= 0) {
            explode(a.x, a.y, a.color);
            state.score += a.score;
            state.aliensLeftInWave--;
            maybeDrop(a.x, a.y);
            state.aliens.splice(i, 1);
            updateHud();
            break;
          }
        }
      }

      if (!state.aliens[i]) continue;

      // reach trench / hit tank
      const tankHit =
        Math.abs(a.x - tank.x) < tank.w * 0.45 + a.r &&
        Math.abs(a.y - tank.y) < tank.h * 0.55 + a.r;
      if (tankHit) {
        explode(a.x, a.y, a.color);
        state.aliensLeftInWave--;
        state.aliens.splice(i, 1);
        damageTank();
        continue;
      }
      if (a.y > H - 28) {
        explode(a.x, a.y, "#e85a3c");
        state.aliensLeftInWave--;
        state.aliens.splice(i, 1);
        damageTank();
      }
    }

    // pickups
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const p = state.pickups[i];
      p.y += p.vy * dt;
      p.life -= dt;
      const near =
        Math.abs(p.x - tank.x) < 36 && Math.abs(p.y - tank.y) < 36;
      if (near) {
        if (p.kind === "repair" && state.hull < MAX_HULL) {
          state.hull++;
          updateHud();
          burst(tank.x, tank.y, "#7dff9a", 12, 40, 160);
        }
        state.pickups.splice(i, 1);
      } else if (p.life <= 0 || p.y > H + 20) {
        state.pickups.splice(i, 1);
      }
    }

    // particles / blasts
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.blasts.length - 1; i >= 0; i--) {
      const b = state.blasts[i];
      b.life -= dt * 2.2;
      b.r = b.max * (1 - b.life);
      if (b.life <= 0) state.blasts.splice(i, 1);
    }

    // wave clear
    if (
      state.aliensSpawned >= state.waveQuota &&
      state.aliens.length === 0 &&
      state.aliensLeftInWave <= 0
    ) {
      state.waveClearTimer += dt;
      if (state.waveClearTimer > 0.85) {
        state.mode = "wave";
        if (state.score > state.hi) {
          state.hi = state.score;
          localStorage.setItem(STORAGE_KEY, String(state.hi));
        }
        showOverlay("wave");
      }
    }
  }

  function drawGround() {
    const g = ctx.createLinearGradient(0, H * 0.52, 0, H);
    g.addColorStop(0, "#1a2a1c");
    g.addColorStop(0.35, "#2a3420");
    g.addColorStop(1, "#3a2e1c");
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.52, W, H * 0.48);

    ctx.strokeStyle = "rgba(196,165,116,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    for (let x = 0; x <= W; x += 40) {
      ctx.lineTo(x, H - 40 + Math.sin(x * 0.02 + state.t) * 2);
    }
    ctx.stroke();

    // trench
    ctx.fillStyle = "#0a100c";
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = "rgba(212,168,75,0.25)";
    ctx.fillRect(0, H - 26, W, 3);
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0a1612");
    sky.addColorStop(0.45, "#14241a");
    sky.addColorStop(1, "#1c2014");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // distant ridge
    ctx.fillStyle = "#152218";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.55);
    for (let x = 0; x <= W; x += 30) {
      const y = H * 0.48 + Math.sin(x * 0.012) * 22 + Math.cos(x * 0.03) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    state.stars.forEach((s) => {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(state.t * s.tw + s.ph));
      ctx.fillStyle = `rgba(232,223,200,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // breach glow (motion)
    const gx = W * 0.5 + Math.sin(state.t * 0.35) * 80;
    const glow = ctx.createRadialGradient(gx, 40, 10, gx, 60, 180);
    glow.addColorStop(0, "rgba(125,255,154,0.18)");
    glow.addColorStop(0.5, "rgba(125,255,154,0.05)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H * 0.45);

    state.dust.forEach((d) => {
      ctx.fillStyle = `rgba(196,165,116,${d.a})`;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.s, d.s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawTank(tank) {
    const blink = state.invuln > 0 && Math.floor(state.t * 16) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 38, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // treads
    ctx.fillStyle = "#2a3024";
    ctx.fillRect(-36, 4, 72, 16);
    ctx.fillStyle = "#4a5638";
    for (let i = -3; i <= 3; i++) {
      const ox = ((tank.tread + i) % 1) * 10;
      ctx.fillRect(-32 + i * 10 + ox, 6, 6, 12);
    }

    // hull body
    const body = ctx.createLinearGradient(0, -18, 0, 14);
    body.addColorStop(0, "#8a9a6a");
    body.addColorStop(1, "#4a5638");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-30, 2);
    ctx.lineTo(-24, -14);
    ctx.lineTo(24, -14);
    ctx.lineTo(30, 2);
    ctx.lineTo(28, 10);
    ctx.lineTo(-28, 10);
    ctx.closePath();
    ctx.fill();

    // turret
    ctx.fillStyle = "#5a6a42";
    ctx.beginPath();
    ctx.arc(0, -8, 14, 0, Math.PI * 2);
    ctx.fill();

    // barrel
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(tank.barrelAngle);
    const recoil = tank.recoil * 8;
    ctx.fillStyle = "#3a4430";
    ctx.fillRect(8 - recoil, -4, 40, 8);
    ctx.fillStyle = "#d4a84b";
    ctx.fillRect(44 - recoil, -5, 8, 10);
    ctx.restore();

    // hatch mark
    ctx.strokeStyle = "rgba(232,223,200,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -8, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawAlien(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    const pulse = 1 + Math.sin(a.phase) * 0.08;
    ctx.scale(pulse, pulse);
    if (a.hitFlash > 0) ctx.globalAlpha = 0.55;

    if (a.kind === "scout") {
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.moveTo(0, -a.r);
      ctx.bezierCurveTo(a.r, -a.r * 0.4, a.r * 0.9, a.r * 0.6, 0, a.r);
      ctx.bezierCurveTo(-a.r * 0.9, a.r * 0.6, -a.r, -a.r * 0.4, 0, -a.r);
      ctx.fill();
      ctx.fillStyle = "#0c1410";
      ctx.beginPath();
      ctx.arc(-5, -2, 3, 0, Math.PI * 2);
      ctx.arc(5, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = a.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(-8, a.r * 0.4);
      ctx.quadraticCurveTo(-14, a.r + 8, -6, a.r + 12);
      ctx.moveTo(8, a.r * 0.4);
      ctx.quadraticCurveTo(14, a.r + 8, 6, a.r + 12);
      ctx.stroke();
    } else if (a.kind === "brute") {
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(0, 0, a.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a3a18";
      ctx.fillRect(-10, -6, 20, 8);
      ctx.fillStyle = "#0c1410";
      ctx.beginPath();
      ctx.arc(-7, -2, 4, 0, Math.PI * 2);
      ctx.arc(7, -2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.kind === "razor") {
      ctx.rotate(state.t * 4 + a.phase);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const r = i % 2 === 0 ? a.r : a.r * 0.45;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, a.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(0, 0, a.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#0c1410";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.save();
    if (state.shake > 0) {
      const m = state.shake * 10;
      ctx.translate(rand(-m, m), rand(-m, m));
    }

    drawSky();
    drawGround();

    state.pickups.forEach((p) => {
      const bob = Math.sin(state.t * 6 + p.x) * 3;
      ctx.fillStyle = "#7dff9a";
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0c1410";
      ctx.font = "700 12px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", p.x, p.y + bob + 1);
    });

    state.bullets.forEach((b) => {
      ctx.fillStyle = "#ffd27a";
      ctx.shadowColor = "#ffaa33";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,210,122,0.4)";
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.stroke();
    });

    state.aliens.forEach(drawAlien);

    if (state.tank) drawTank(state.tank);

    state.blasts.forEach((b) => {
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = Math.max(0, b.life);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    state.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(232,90,60,${state.flash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }

    // playing vignette edge
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    vig.addColorStop(0, "transparent");
    vig.addColorStop(1, "rgba(8,12,10,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function fitCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H);
    const cssW = Math.floor(W * scale);
    const cssH = Math.floor(H * scale);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
  }

  function canvasPos(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * W,
      y: ((clientY - r.top) / r.height) * H,
    };
  }

  // input
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    state.keys[k] = true;
    if (k === " " || k === "arrowleft" || k === "arrowright") e.preventDefault();
    if (k === "enter") {
      if (state.mode === "title" || state.mode === "gameover") startGame();
      else if (state.mode === "wave") continueWave();
    }
  });
  window.addEventListener("keyup", (e) => {
    state.keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (state.mode !== "playing") return;
    const p = canvasPos(e.clientX, e.clientY);
    state.aimX = p.x;
    state.pointerDown = true;
    canvas.setPointerCapture(e.pointerId);
    fire();
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = canvasPos(e.clientX, e.clientY);
    state.aimX = p.x;
    if (state.mode === "playing" && !state.pointerDown) {
      // mild aim follow without firing
    }
  });
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

  document.querySelectorAll(".pad-btn[data-dir]").forEach((btn) => {
    const dir = btn.dataset.dir;
    const key = dir === "left" ? "arrowleft" : "arrowright";
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

  window.addEventListener("resize", fitCanvas);
  window.addEventListener("blur", () => {
    state.keys = Object.create(null);
    state.pointerDown = false;
  });

  initBackdrop();
  state.tank = makeTank();
  fitCanvas();
  showOverlay("title");
  updateHud();
  requestAnimationFrame(frame);
})();
