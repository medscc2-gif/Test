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
  const GROUND_Y = H - 56;

  const ASSET_URLS = {
    bg: "assets/bg-desert-city.jpg",
    ground: "assets/ground-sand.jpg",
    tank: "assets/tank.png",
    scout: "assets/alien-scout.png",
    brute: "assets/alien-brute.png",
    razor: "assets/alien-razor.png",
    orb: "assets/alien-orb.png",
  };

  const images = {};
  let assetsReady = false;

  const state = {
    mode: "title",
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
    aimY: H * 0.35,
    t: 0,
    heat: [],
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

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function loadAssets() {
    const entries = Object.entries(ASSET_URLS);
    await Promise.all(
      entries.map(async ([key, url]) => {
        images[key] = await loadImage(url);
      })
    );
    assetsReady = true;
  }

  function initAtmosphere() {
    state.heat = Array.from({ length: 18 }, () => ({
      x: Math.random() * W,
      y: rand(H * 0.2, H * 0.55),
      w: rand(40, 120),
      h: rand(8, 22),
      a: rand(0.03, 0.08),
      sp: rand(0.15, 0.45),
      ph: Math.random() * Math.PI * 2,
    }));
    state.dust = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: rand(H * 0.55, H - 40),
      r: rand(1, 3.5),
      vx: rand(12, 55),
      a: rand(0.15, 0.4),
    }));
  }

  function makeTank() {
    return {
      x: W / 2,
      y: GROUND_Y - 8,
      w: 92,
      h: 70,
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
    state.waveQuota = 5 + n * 2;
    state.aliensLeftInWave = state.waveQuota;
    state.aliensSpawned = 0;
    state.spawnTimer = 1.1;
    state.waveClearTimer = 0;
    waveEl.textContent = String(n);
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
        "Hold the ruined outpost. Roll the hull across the sand and blast the swarm before it reaches the trench.";
      primaryBtn.textContent = "Deploy tank";
      panelHint.textContent =
        "A / D or ← → move · Space or click fire · touch pads on mobile";
    } else if (kind === "wave") {
      panelKicker.textContent = `Outpost held · best ${state.hi}`;
      panelTitle.textContent = `Wave ${state.wave}`;
      panelCopy.textContent = "Dust settles. Reload — the next swarm is denser.";
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
    if (!assetsReady) return;
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
    const roll = Math.random();
    let kindIndex = 0;
    if (state.wave >= 2 && roll > 0.55) kindIndex = 1;
    if (state.wave >= 3 && roll > 0.78) kindIndex = 2;
    if (state.wave >= 4 && roll > 0.9) kindIndex = 3;
    const kinds = [
      {
        kind: "scout",
        img: "scout",
        r: 22,
        draw: 56,
        hp: 1,
        speed: 38 + state.wave * 4,
        score: 100,
        color: "#7dff9a",
      },
      {
        kind: "brute",
        img: "brute",
        r: 30,
        draw: 72,
        hp: 3,
        speed: 26 + state.wave * 3,
        score: 250,
        color: "#c8ff4d",
      },
      {
        kind: "razor",
        img: "razor",
        r: 18,
        draw: 48,
        hp: 2,
        speed: 58 + state.wave * 5,
        score: 180,
        color: "#ff5e4d",
      },
      {
        kind: "orb",
        img: "orb",
        r: 24,
        draw: 54,
        hp: 2,
        speed: 32 + state.wave * 3.5,
        score: 200,
        color: "#5ee7ff",
      },
    ];
    const def = kinds[kindIndex];
    state.aliens.push({
      ...def,
      x: rand(50, W - 50),
      y: -40,
      vx: rand(-30, 30),
      phase: Math.random() * Math.PI * 2,
      hitFlash: 0,
      rot: rand(0, Math.PI * 2),
    });
    state.aliensSpawned++;
  }

  function fire() {
    const tank = state.tank;
    if (!tank || tank.cooldown > 0) return;
    tank.cooldown = 0.16;
    tank.recoil = 1;
    const ang = tank.barrelAngle;
    const muzzle = 48;
    const bx = tank.x + Math.cos(ang) * muzzle;
    const by = tank.y - 18 + Math.sin(ang) * muzzle;
    state.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(ang) * 640,
      vy: Math.sin(ang) * 640,
      life: 1.4,
      r: 5,
    });
    burst(bx, by, "#ffd27a", 8, 90, 200);
    burst(bx, by, "#fff4c8", 4, 40, 100);
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
        life: rand(0.25, 0.75),
        max: 0.75,
        r: rand(1.5, 4.5),
        color,
      });
    }
  }

  function explode(x, y, color) {
    state.blasts.push({ x, y, r: 4, max: 56, life: 1, color });
    burst(x, y, color, 20, 70, 280);
    burst(x, y, "#e8dfc8", 10, 40, 150);
    burst(x, y, "#c4a574", 8, 30, 120);
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
      d.x += d.vx * dt;
      if (d.x > W + 10) {
        d.x = -10;
        d.y = rand(H * 0.55, H - 40);
      }
    });

    if (state.mode !== "playing" || !state.tank) return;

    const tank = state.tank;
    let move = 0;
    if (state.keys.a || state.keys.arrowleft) move -= 1;
    if (state.keys.d || state.keys.arrowright) move += 1;
    tank.x = clamp(tank.x + move * tank.speed * dt, 48, W - 48);
    tank.tread += Math.abs(move) * dt * 10;
    if (tank.cooldown > 0) tank.cooldown -= dt;
    if (tank.recoil > 0) tank.recoil = Math.max(0, tank.recoil - dt * 4);

    const aimDx = state.aimX - tank.x;
    const aimDy = state.aimY - (tank.y - 18);
    let ang = Math.atan2(aimDy, aimDx);
    if (ang > 0) ang = aimDx >= 0 ? -0.15 : -Math.PI + 0.15;
    tank.barrelAngle = clamp(ang, -Math.PI * 0.95, -Math.PI * 0.05);

    if (state.keys[" "] || state.pointerDown || state.keys.fire) fire();

    if (state.aliensSpawned < state.waveQuota) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnAlien();
        state.spawnTimer = Math.max(0.45, 1.35 - state.wave * 0.07);
      }
    }

    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.y < -20 || b.x < -20 || b.x > W + 20) {
        state.bullets.splice(i, 1);
      }
    }

    for (let i = state.aliens.length - 1; i >= 0; i--) {
      const a = state.aliens[i];
      a.phase += dt * (a.kind === "razor" ? 6 : 2.5);
      a.rot += dt * (a.kind === "razor" ? 3.5 : a.kind === "orb" ? 1.2 : 0.4);
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

      const tankHit =
        Math.abs(a.x - tank.x) < tank.w * 0.38 + a.r &&
        Math.abs(a.y - tank.y) < tank.h * 0.4 + a.r;
      if (tankHit) {
        explode(a.x, a.y, a.color);
        state.aliensLeftInWave--;
        state.aliens.splice(i, 1);
        damageTank();
        continue;
      }
      if (a.y > GROUND_Y - 10) {
        explode(a.x, a.y, "#e85a3c");
        state.aliensLeftInWave--;
        state.aliens.splice(i, 1);
        damageTank();
      }
    }

    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const p = state.pickups[i];
      p.y += p.vy * dt;
      p.life -= dt;
      if (Math.abs(p.x - tank.x) < 40 && Math.abs(p.y - tank.y) < 40) {
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

  function drawDesertBackground() {
    const parallax = state.tank ? (state.tank.x - W / 2) * 0.04 : 0;
    const img = images.bg;
    if (img) {
      // Cover canvas while preserving a cinematic crop toward the skyline.
      const scale = Math.max(W / img.width, (H * 0.92) / img.height) * 1.08;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (W - dw) / 2 - parallax;
      const dy = H * 0.02 - dh * 0.08;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1a1020");
      g.addColorStop(0.45, "#c4783a");
      g.addColorStop(1, "#8a6a3a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // Warm dusk wash so sprites sit in the same lighting world.
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, "rgba(40, 20, 50, 0.18)");
    wash.addColorStop(0.45, "rgba(220, 120, 50, 0.08)");
    wash.addColorStop(1, "rgba(90, 60, 30, 0.12)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    // Heat shimmer ribbons over mid dunes / buildings.
    state.heat.forEach((h) => {
      const ox = Math.sin(state.t * h.sp + h.ph) * 10;
      ctx.fillStyle = `rgba(255, 210, 150, ${h.a})`;
      ctx.beginPath();
      ctx.ellipse(h.x + ox, h.y, h.w, h.h, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawGround() {
    const img = images.ground;
    const groundH = 110;
    const gy = H - groundH;
    if (img) {
      const scroll = state.tank ? state.tank.x * 0.15 : 0;
      const scale = groundH / img.height;
      const dw = img.width * scale;
      let x = -((scroll % dw) + dw) % dw;
      while (x < W + dw) {
        ctx.drawImage(img, x, gy, dw, groundH);
        x += dw;
      }
    } else {
      ctx.fillStyle = "#8a6b3d";
      ctx.fillRect(0, gy, W, groundH);
    }

    // Soft blend into desert midground.
    const blend = ctx.createLinearGradient(0, gy - 30, 0, gy + 20);
    blend.addColorStop(0, "rgba(12, 16, 14, 0)");
    blend.addColorStop(1, "rgba(40, 28, 14, 0.35)");
    ctx.fillStyle = blend;
    ctx.fillRect(0, gy - 30, W, 50);

    // Trench lip
    ctx.fillStyle = "rgba(20, 14, 8, 0.75)";
    ctx.fillRect(0, H - 22, W, 22);
    ctx.fillStyle = "rgba(212, 168, 75, 0.35)";
    ctx.fillRect(0, H - 24, W, 3);

    // Wind dust over sand
    state.dust.forEach((d) => {
      ctx.fillStyle = `rgba(232, 210, 170, ${d.a})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawTank(tank) {
    const blink = state.invuln > 0 && Math.floor(state.t * 16) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.4;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // Contact shadow on sand
    ctx.fillStyle = "rgba(20, 12, 6, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 28, 48, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = images.tank;
    if (img) {
      const bob = Math.sin(tank.tread * 2) * 1.2;
      const recoilNudge = tank.recoil * 3;
      // Face "upfield" — sprite is front 3/4; flip lightly with movement intent.
      const facing = state.aimX >= tank.x ? 1 : -1;
      ctx.save();
      ctx.scale(facing, 1);
      ctx.translate(0, bob - recoilNudge);
      const dw = tank.w * 1.35;
      const dh = tank.h * 1.35;
      ctx.drawImage(img, -dw / 2, -dh * 0.72, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = "#6b7a55";
      ctx.fillRect(-36, -20, 72, 36);
    }

    // Muzzle flash when recoiling
    if (tank.recoil > 0.4) {
      ctx.save();
      ctx.translate(0, -18);
      ctx.rotate(tank.barrelAngle);
      const glow = ctx.createRadialGradient(50, 0, 2, 50, 0, 28);
      glow.addColorStop(0, "rgba(255, 240, 180, 0.95)");
      glow.addColorStop(0.4, "rgba(255, 160, 60, 0.55)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(50 - tank.recoil * 6, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawAlien(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    const pulse = 1 + Math.sin(a.phase) * 0.05;
    ctx.scale(pulse, pulse);
    if (a.hitFlash > 0) ctx.globalAlpha = 0.55;

    // Soft contact glow / shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, a.draw * 0.38, a.draw * 0.35, a.draw * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = images[a.img];
    if (img) {
      ctx.rotate(a.kind === "razor" ? a.rot : Math.sin(a.phase) * 0.08);
      const s = a.draw;
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
      // Subtle biolum rim for desert contrast
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(0, 0, a.r, 0, Math.PI * 2);
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

    if (!assetsReady) {
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#c4a574";
      ctx.font = "600 18px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Loading desert outpost…", W / 2, H / 2);
      ctx.restore();
      return;
    }

    drawDesertBackground();
    drawGround();

    state.pickups.forEach((p) => {
      const bob = Math.sin(state.t * 6 + p.x) * 3;
      ctx.fillStyle = "#7dff9a";
      ctx.shadowColor = "#7dff9a";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0c1410";
      ctx.font = "700 12px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", p.x, p.y + bob + 1);
    });

    state.bullets.forEach((b) => {
      const trail = ctx.createLinearGradient(
        b.x,
        b.y,
        b.x - b.vx * 0.03,
        b.y - b.vy * 0.03
      );
      trail.addColorStop(0, "rgba(255, 220, 120, 0.9)");
      trail.addColorStop(1, "transparent");
      ctx.strokeStyle = trail;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
      ctx.stroke();

      ctx.fillStyle = "#fff2bf";
      ctx.shadowColor = "#ffaa33";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
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
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, `rgba(255,180,80,${0.25 * b.life})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
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

    // Cinematic vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
    vig.addColorStop(0, "transparent");
    vig.addColorStop(1, "rgba(18, 10, 6, 0.5)");
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
    canvas.style.width = Math.floor(W * scale) + "px";
    canvas.style.height = Math.floor(H * scale) + "px";
  }

  function canvasPos(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * W,
      y: ((clientY - r.top) / r.height) * H,
    };
  }

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
    state.aimY = p.y;
    state.pointerDown = true;
    canvas.setPointerCapture(e.pointerId);
    fire();
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = canvasPos(e.clientX, e.clientY);
    state.aimX = p.x;
    state.aimY = p.y;
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

  initAtmosphere();
  state.tank = makeTank();
  fitCanvas();
  showOverlay("title");
  updateHud();
  primaryBtn.disabled = true;
  primaryBtn.textContent = "Loading…";

  loadAssets()
    .then(() => {
      primaryBtn.disabled = false;
      primaryBtn.textContent = "Deploy tank";
      requestAnimationFrame(frame);
    })
    .catch((err) => {
      console.error(err);
      panelCopy.textContent = "Could not load desert assets. Check the assets folder and reload.";
      primaryBtn.disabled = false;
      primaryBtn.textContent = "Retry";
      primaryBtn.onclick = () => location.reload();
      requestAnimationFrame(frame);
    });
})();
