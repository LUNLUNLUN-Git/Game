(() => {
  const gameViewport = document.querySelector(".game-viewport");
  const gameShell = document.querySelector(".game-shell");
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreNode = document.getElementById("score");
  const settingsButton = document.getElementById("settingsButton");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const settingsPanel = document.getElementById("settingsPanel");
  const resumeButton = document.getElementById("resumeButton");
  const sfxVolumeInput = document.getElementById("sfxVolume");
  const musicVolumeInput = document.getElementById("musicVolume");
  const loadingScreen = document.getElementById("loadingScreen");

  const W = canvas.width;
  const H = canvas.height;
  const ASSET_ROOT = "assets/processed/";
  const AUDIO_ROOT = "assets/audio/";
  const AUDIO_VERSION = "20260430r";
  const GROUND_Y = 602;
  const HERO_X = 218;
  const BASE_SPEED = 516;
  const MAX_SPEED = 1040;
  const BASE_GAME_SPEED_MULTIPLIER = 0.65;
  const START_SCROLL_SPEED = 70.2;
  const FIXED_DT = 1 / 120;
  const MAX_FRAME_DT = 0.04;
  const MAX_UPDATE_STEPS = 6;
  const GRAVITY = 2550;
  const JUMP_VELOCITY = -820;
  const JUMP_HOLD_FORCE = 1320;
  const MAX_JUMP_HOLD_TIME = 0.18;
  const JUMP_CUT_VELOCITY = -360;
  const JUMP_BUFFER_TIME = 0.11;
  const HIT_FREEZE_TIME = 0.58;
  const SAFE_RECOVERY_BUFFER = 128;
  const SAFE_SPAWN_OFFSET = 190;
  const SPEED_SCORE_GROWTH_RATE = 0.466;
  const SPEED_RESPONSE = 3.8;
  const SCENE_SPEED_RESPONSE = 10;
  const MAX_PARTICLES = 40;

  const assets = {
    logo: loadImage("ui/logo-cropped.png"),
    background: {
      sky: loadImage("background/sky.png"),
      midground: loadImage("background/midground.png"),
      floor: loadImage("background/floor.png"),
    },
    awawa: {
      run: range(8).map((i) => loadImage(`awawa/run-${i}.png`)),
      jump: range(3).map((i) => loadImage(`awawa/jump-${i}.png`)),
      hurt: range(3).map((i) => loadImage(`awawa/hurt-${i}.png`)),
      dead: range(3).map((i) => loadImage(`awawa/dead-${i}.png`)),
    },
    obstacles: {
      cactus: loadImage("obstacles/cactus.png"),
      bush: loadImage("obstacles/bush.png"),
      rocks: loadImage("obstacles/rocks.png"),
      pillar: loadImage("obstacles/pillar.png"),
      log: loadImage("obstacles/log.png"),
      bird: loadImage("obstacles/bird.png"),
    },
    ui: {
      play: loadImage("ui/play.png"),
      restart: loadImage("ui/restart.png"),
    },
  };

  const backgroundLayers = [
    { image: assets.background.sky, y: 0, h: H, speed: 0.015 },
    { image: assets.background.midground, y: 345, h: 250, speed: 0.085 },
    { image: assets.background.floor, y: 528, h: 260, speed: 1 },
  ];

  const obstacleCatalog = [
    { name: "cactus", image: assets.obstacles.cactus, height: 86, scaleRange: [0.9, 1.02], hit: [0.17, 0.22, 0.62, 0.54], spawnWeight: 1 },
    { name: "bush", image: assets.obstacles.bush, height: 102, scaleRange: [0.84, 0.96], hit: [0.21, 0.18, 0.52, 0.6], spawnWeight: 0.9 },
    { name: "rocks", image: assets.obstacles.rocks, height: 108, scaleRange: [0.84, 0.96], hit: [0.24, 0.2, 0.48, 0.56], spawnWeight: 1 },
    { name: "pillar", image: assets.obstacles.pillar, height: 136, scaleRange: [0.88, 0.96], hit: [0.32, 0.12, 0.34, 0.68], spawnWeight: 0.75 },
    { name: "log", image: assets.obstacles.log, height: 62, scaleRange: [0.82, 0.9], hit: [0.16, 0.26, 0.62, 0.38], spawnWeight: 0.8 },
    { name: "bird", image: assets.obstacles.bird, height: 62, scaleRange: [0.92, 1.04], hit: [0.24, 0.24, 0.42, 0.38], flying: true, spawnWeight: 0.45 },
  ];

  const jumpSamples = buildJumpSamples();
  const heroGroundBox = getHeroBoxAtY(GROUND_Y);
  const audioConfig = {
    bgm: {
      kind: "music",
      loop: true,
      candidates: ["bgm.ogg", "bgm.mp3", "bgm.wav"],
      fallbackSequence: [220, 277.18, 329.63, 293.66, 246.94, 329.63, 369.99, 293.66],
    },
    jump: { kind: "sfx", candidates: ["jump.ogg", "jump.mp3", "jump.wav"], fallbackTone: { frequency: 520, duration: 0.06, type: "sine", volume: 0.08 } },
    hit: { kind: "sfx", candidates: ["hit.ogg", "hit.mp3", "hit.wav"], fallbackTone: { frequency: 90, duration: 0.18, type: "sawtooth", volume: 0.06 } },
    death: { kind: "sfx", candidates: ["death.ogg", "death.mp3", "death.wav"], fallbackTone: { frequency: 120, duration: 0.28, type: "triangle", volume: 0.07 } },
    land: { kind: "sfx", candidates: ["land.ogg", "land.mp3", "land.wav"], fallbackTone: { frequency: 180, duration: 0.035, type: "triangle", volume: 0.045 } },
    start: { kind: "sfx", candidates: ["start.ogg", "start.mp3", "start.wav"], fallbackTone: { frequency: 360, duration: 0.07, type: "triangle", volume: 0.05 } },
    uiOpen: { kind: "sfx", candidates: ["ui-open.ogg", "ui-open.mp3", "ui-open.wav"], fallbackTone: { frequency: 640, duration: 0.045, type: "triangle", volume: 0.055 } },
    uiClose: { kind: "sfx", candidates: ["ui-close.ogg", "ui-close.mp3", "ui-close.wav"], fallbackTone: { frequency: 410, duration: 0.05, type: "triangle", volume: 0.05 } },
    resume: { kind: "sfx", candidates: ["resume.ogg", "resume.mp3", "resume.wav"], fallbackTone: { frequency: 480, duration: 0.05, type: "triangle", volume: 0.05 } },
  };

  const game = {
    state: "loading",
    time: 0,
    stateTime: 0,
    score: 0,
    best: Number(localStorage.getItem("gogo-awawa-best") || 0),
    speed: BASE_SPEED,
    sceneSpeed: BASE_SPEED * BASE_GAME_SPEED_MULTIPLIER,
    jumpHeld: false,
    jumpHoldTime: 0,
    jumpBufferTime: 0,
    spawnTimer: 1,
    obstacles: [],
    particles: [],
    bg: [0, 0, 0],
    fixedStepAccumulator: 0,
    settingsOpen: false,
    pausedFromSettings: false,
    lastSafeSpawnX: W + SAFE_SPAWN_OFFSET,
    layoutScale: 1,
    layoutMode: "default",
    visibleWorldWidth: W,
    visibleWorldLeft: 0,
    visibleWorldRight: W,
    visibleWorldTop: 0,
    visibleWorldBottom: H,
    visibleWorldCenter: W / 2,
    audio: createAudioState(),
    awawa: {
      x: HERO_X,
      y: GROUND_Y,
      vy: 0,
      grounded: true,
      squash: 1,
    },
    button: { x: 0, y: 0, w: 0, h: 0 },
  };

  let lastTime = 0;
  let raf = 0;

  gameShell.style.visibility = "hidden";

  Promise.all(flattenImages(assets).map((img) => img.promise)).then(async () => {
    await detectAudioFiles();
    primeAudioFiles();
    hydrateAudioSettings();
    syncSettingsUi();
    resizeLayout();
    syncFullscreenButton();
    syncCanvasCursor();
    game.state = "start";
    gameShell.style.visibility = "visible";
    hideLoadingScreen();
    requestAnimationFrame(loop);
  });

  function loadImage(name) {
    const img = new Image();
    img.src = ASSET_ROOT + name;
    img.promise = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return img;
  }

  function flattenImages(value) {
    if (value instanceof HTMLImageElement) return [value];
    if (Array.isArray(value)) return value.flatMap(flattenImages);
    return Object.values(value).flatMap(flattenImages);
  }

  function createAudioState() {
    return {
      context: null,
      unlocked: false,
      fileAvailability: {},
      primedElements: {},
      loadedFiles: {},
      sfxVolume: 0.4,
      musicVolume: 0.25,
      bgmAudio: null,
      bgmSequenceIndex: 0,
      bgmNextNoteTime: 0,
      bgmWasPlayingBeforePause: false,
    };
  }

  async function detectAudioFiles() {
    const tasks = Object.entries(audioConfig).map(async ([slot, config]) => {
      game.audio.fileAvailability[slot] = null;
      for (const candidate of config.candidates) {
        const source = buildAudioSource(candidate);
        if (await probeAudioSource(source)) {
          game.audio.fileAvailability[slot] = source;
          break;
        }
      }
    });
    await Promise.all(tasks);
  }

  function buildAudioSource(filename) {
    const base = `${AUDIO_ROOT}${filename}`;
    return location.protocol === "file:" ? base : `${base}?v=${AUDIO_VERSION}`;
  }

  function probeAudioSource(source) {
    return new Promise((resolve) => {
      const audio = new Audio();
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        audio.removeEventListener("canplaythrough", handleCanPlay);
        audio.removeEventListener("loadeddata", handleCanPlay);
        audio.removeEventListener("error", handleError);
        resolve(result);
      };
      const handleCanPlay = () => finish(true);
      const handleError = () => finish(false);
      audio.preload = "auto";
      audio.addEventListener("canplaythrough", handleCanPlay, { once: true });
      audio.addEventListener("loadeddata", handleCanPlay, { once: true });
      audio.addEventListener("error", handleError, { once: true });
      audio.src = source;
      audio.load();
      setTimeout(() => finish(false), 1200);
    });
  }

  function primeAudioFiles() {
    for (const [slot, src] of Object.entries(game.audio.fileAvailability)) {
      if (!src) continue;
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.load();
      game.audio.primedElements[slot] = audio;
    }
  }

  function hydrateAudioSettings() {
    const storedSfxRaw = localStorage.getItem("gogo-awawa-sfx-volume");
    const storedMusicRaw = localStorage.getItem("gogo-awawa-music-volume");
    if (storedSfxRaw !== null) {
      const storedSfx = Number(storedSfxRaw);
      if (!Number.isNaN(storedSfx)) game.audio.sfxVolume = clamp(storedSfx, 0, 1);
    }
    if (storedMusicRaw !== null) {
      const storedMusic = Number(storedMusicRaw);
      if (!Number.isNaN(storedMusic)) game.audio.musicVolume = clamp(storedMusic, 0, 1);
    }
  }

  function hideLoadingScreen() {
    if (!loadingScreen) return;
    loadingScreen.classList.add("hidden");
  }

  function syncSettingsUi() {
    sfxVolumeInput.value = Math.round(game.audio.sfxVolume * 100).toString();
    musicVolumeInput.value = Math.round(game.audio.musicVolume * 100).toString();
    settingsPanel.classList.toggle("open", game.settingsOpen);
    settingsPanel.setAttribute("aria-hidden", String(!game.settingsOpen));
  }

  function loop(now) {
    const frameDt = Math.min(MAX_FRAME_DT, (now - lastTime) / 1000 || 0);
    lastTime = now;
    game.fixedStepAccumulator += frameDt;
    let steps = 0;
    while (game.fixedStepAccumulator >= FIXED_DT && steps < MAX_UPDATE_STEPS) {
      update(FIXED_DT);
      game.fixedStepAccumulator -= FIXED_DT;
      steps += 1;
    }
    if (steps === MAX_UPDATE_STEPS) game.fixedStepAccumulator = 0;
    render();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    updateAudio(dt);
    if (game.state === "paused") return;

    game.time += dt;
    game.stateTime += dt;
    game.jumpBufferTime = Math.max(0, game.jumpBufferTime - dt);

    if (game.state === "playing") {
      const targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + game.score * SPEED_SCORE_GROWTH_RATE);
      game.speed += (targetSpeed - game.speed) * Math.min(1, dt * SPEED_RESPONSE);
      const targetSceneSpeed = getSceneSpeed();
      game.sceneSpeed += (targetSceneSpeed - game.sceneSpeed) * Math.min(1, dt * SCENE_SPEED_RESPONSE);
      const sceneSpeed = game.sceneSpeed;
      game.score += dt * (10 + sceneSpeed * 0.032);
      scoreNode.textContent = Math.floor(game.score).toString();
      updateAwawa(dt);
      updateObstacles(dt, sceneSpeed);
      updateParticles(dt);
      scrollBackground(sceneSpeed, dt);
      if (collides()) hit();
    } else if (game.state === "hit") {
      updateParticles(dt);
      if (game.stateTime > HIT_FREEZE_TIME) {
        game.state = "gameOver";
        game.stateTime = 0;
        playAudio("death");
      }
    } else if (game.state === "start") {
      scrollBackground(START_SCROLL_SPEED, dt);
      idleAwawa(dt);
      updateParticles(dt);
    } else if (game.state === "gameOver") {
      updateParticles(dt);
    }
  }

  function getSceneSpeed() {
    return game.speed * BASE_GAME_SPEED_MULTIPLIER;
  }

  function scrollBackground(speed, dt) {
    for (let i = 0; i < game.bg.length; i += 1) {
      game.bg[i] += speed * backgroundLayers[i].speed * dt;
    }
  }

  function idleAwawa(dt) {
    game.awawa.squash = 1 + Math.sin(game.time * 4) * 0.025;
    game.awawa.y = GROUND_Y + Math.sin(game.time * 2.2) * 3;
    if (Math.random() < dt * 0.6) spawnDust(game.awawa.x - 30, GROUND_Y - 10, 0.55);
  }

  function updateAwawa(dt) {
    const p = game.awawa;
    if (p.grounded && game.jumpBufferTime > 0 && game.state === "playing") {
      startJump();
    }
    p.vy += GRAVITY * dt;
    if (!p.grounded && game.jumpHeld && game.jumpHoldTime < MAX_JUMP_HOLD_TIME && p.vy < 0) {
      p.vy -= JUMP_HOLD_FORCE * dt;
      game.jumpHoldTime += dt;
    }
    p.y += p.vy * dt;
    if (p.y >= GROUND_Y) {
      if (!p.grounded && Math.abs(p.vy) > 200) {
        spawnDust(p.x + 10, GROUND_Y - 6, 1.2);
        playAudio("land");
      }
      p.y = GROUND_Y;
      p.vy = 0;
      p.grounded = true;
      game.jumpHoldTime = 0;
    } else {
      p.grounded = false;
    }
    p.squash += (1 - p.squash) * Math.min(1, dt * 8);
    if (p.grounded && Math.random() < dt * 1.4) spawnDust(p.x - 50, GROUND_Y - 10, 0.7);
  }

  function updateObstacles(dt, sceneSpeed) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) spawnObstacle(sceneSpeed);
    for (const obstacle of game.obstacles) {
      obstacle.x -= sceneSpeed * dt;
      if (obstacle.flying) obstacle.float += dt * 8;
    }
    game.obstacles = game.obstacles.filter((item) => item.x > -260);
  }

  function updateParticles(dt) {
    for (const p of game.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
      p.life -= dt;
    }
    game.particles = game.particles.filter((p) => p.life > 0);
  }

  function queueJump() {
    game.jumpBufferTime = JUMP_BUFFER_TIME;
  }

  function startJump() {
    const p = game.awawa;
    if (!p.grounded) return false;
    p.vy = JUMP_VELOCITY;
    p.grounded = false;
    game.jumpHeld = true;
    game.jumpHoldTime = 0;
    game.jumpBufferTime = 0;
    p.squash = 0.88;
    spawnDust(p.x - 38, GROUND_Y - 8, 1.1);
    playAudio("jump");
    return true;
  }

  function spawnObstacle(sceneSpeed) {
    const candidate = pickFeasibleObstacle(sceneSpeed);
    const minSpawnSeconds = candidate.requiredLead / sceneSpeed;
    const randomCadence = rand(1.02, 2.1) + candidate.width / 560;
    const previousRight = getRightmostObstacleEdge();
    const desiredGap = Math.max(
      candidate.requiredLead + SAFE_RECOVERY_BUFFER + rand(32, 148),
      rand(260, 560) + candidate.width * rand(0.35, 0.8),
    );
    const spawnX = Math.max(W + rand(SAFE_SPAWN_OFFSET, SAFE_SPAWN_OFFSET + 220), previousRight + desiredGap - candidate.hitLeftOffset);
    game.obstacles.push({
      ...candidate,
      x: spawnX,
      float: Math.random() * 10,
    });
    game.lastSafeSpawnX = spawnX + candidate.hitWidth;
    game.spawnTimer = Math.max(minSpawnSeconds, desiredGap / sceneSpeed, randomCadence);
  }

  function pickFeasibleObstacle(sceneSpeed) {
    const previous = game.obstacles.length ? game.obstacles[game.obstacles.length - 1] : null;
    let fallback = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const template = weightedPick(getAvailableObstaclePool(previous));
      const scale = rand(template.scaleRange[0], template.scaleRange[1]);
      const height = template.height * scale;
      const width = height * (template.image.width / template.image.height);
      const [left, top, widthRatio, heightRatio] = template.hit;
      const hitWidth = width * widthRatio;
      const hitHeight = height * heightRatio;
      const hitLeftOffset = width * left;
      const obstacle = {
        ...template,
        scale,
        height,
        width,
        hitWidth,
        hitHeight,
        hitLeftOffset,
        topRatio: top,
        widthRatio,
        heightRatio,
      };
      const requiredLead = computeRequiredLead(obstacle, sceneSpeed);
      if (requiredLead !== Number.POSITIVE_INFINITY) {
        obstacle.requiredLead = requiredLead;
        return obstacle;
      }
      fallback = obstacle;
    }
    fallback.requiredLead = 320;
    return fallback;
  }

  function getAvailableObstaclePool(previous) {
    return obstacleCatalog.filter((item) => {
      if (item.flying) {
        if (game.score < 260) return false;
        if (previous && !previous.flying && previous.width > 125) return false;
      }
      return true;
    });
  }

  function computeRequiredLead(obstacle, sceneSpeed) {
    for (let lead = 180; lead <= 520; lead += 4) {
      let blocked = false;
      for (const sample of jumpSamples) {
        const obstacleX = heroGroundBox.x + heroGroundBox.w + lead - obstacle.hitLeftOffset - sceneSpeed * sample.t;
        const obstacleBox = getObstacleBoxAt(obstacle, obstacleX);
        if (boxesOverlap(sample.box, obstacleBox)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return lead;
    }
    return Number.POSITIVE_INFINITY;
  }

  function buildJumpSamples() {
    const samples = [];
    let y = GROUND_Y;
    let vy = JUMP_VELOCITY;
    let holdTime = 0;
    let grounded = false;
    for (let t = 0; t < 1.2; t += FIXED_DT) {
      vy += GRAVITY * FIXED_DT;
      if (!grounded && holdTime < MAX_JUMP_HOLD_TIME && vy < 0) {
        vy -= JUMP_HOLD_FORCE * FIXED_DT;
        holdTime += FIXED_DT;
      }
      y += vy * FIXED_DT;
      if (y >= GROUND_Y) {
        y = GROUND_Y;
        grounded = true;
      }
      samples.push({ t, box: getHeroBoxAtY(y) });
      if (grounded && t > 0.08) break;
    }
    return samples;
  }

  function spawnDust(x, y, power) {
    if (game.particles.length >= MAX_PARTICLES) return;
    const burstCount = Math.min(4, MAX_PARTICLES - game.particles.length);
    for (let i = 0; i < burstCount; i += 1) {
      game.particles.push({
        x: x + rand(-4, 10),
        y: y + rand(-3, 5),
        vx: rand(-120, -45) * power,
        vy: rand(-95, -20) * power,
        r: rand(3, 8) * power,
        life: rand(0.25, 0.52),
        color: Math.random() > 0.5 ? "#f0b25f" : "#fff1b5",
      });
    }
  }

  function collides() {
    const hero = getHeroBox();
    for (const obstacle of game.obstacles) {
      const box = getObstacleBox(obstacle);
      if (boxesOverlap(hero, box)) return true;
    }
    return false;
  }

  function boxesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function getHeroBox() {
    return getHeroBoxAtY(game.awawa.y);
  }

  function getHeroBoxAtY(y) {
    return { x: HERO_X - 56, y: y - 96, w: 108, h: 75 };
  }

  function getObstacleBox(obstacle) {
    return getObstacleBoxAt(obstacle, obstacle.x);
  }

  function getObstacleBoxAt(obstacle, obstacleX) {
    const draw = getObstacleDrawBoxAt(obstacle, obstacleX, obstacle.float || 0);
    const [left, top, widthRatio, heightRatio] = obstacle.hit;
    return {
      x: draw.x + draw.w * left,
      y: draw.y + draw.h * top,
      w: draw.w * widthRatio,
      h: draw.h * heightRatio,
    };
  }

  function getObstacleDrawBox(obstacle) {
    return getObstacleDrawBoxAt(obstacle, obstacle.x, obstacle.float || 0);
  }

  function getObstacleDrawBoxAt(obstacle, obstacleX, floatValue) {
    const h = obstacle.height;
    const w = obstacle.width || h * (obstacle.image.width / obstacle.image.height);
    const y = obstacle.flying ? GROUND_Y - 192 + Math.sin(floatValue) * 8 : GROUND_Y - h + 11;
    return { x: obstacleX, y, w, h };
  }

  function getRightmostObstacleEdge() {
    if (!game.obstacles.length) return W + SAFE_SPAWN_OFFSET;
    let right = W + SAFE_SPAWN_OFFSET;
    for (const obstacle of game.obstacles) {
      const box = getObstacleBox(obstacle);
      right = Math.max(right, box.x + box.w);
    }
    return right;
  }

  function weightedPick(pool) {
    const total = pool.reduce((sum, item) => sum + item.spawnWeight, 0);
    let target = Math.random() * total;
    for (const item of pool) {
      target -= item.spawnWeight;
      if (target <= 0) return item;
    }
    return pool[pool.length - 1];
  }

  function hit() {
    if (game.state !== "playing") return;
    game.state = "hit";
    game.stateTime = 0;
    game.jumpHeld = false;
    game.awawa.y = GROUND_Y;
    game.awawa.vy = 0;
    game.awawa.grounded = true;
    game.awawa.squash = 0.92;
    game.best = Math.max(game.best, Math.floor(game.score));
    localStorage.setItem("gogo-awawa-best", String(game.best));
    screenShake(12);
    for (let i = 0; i < 18; i += 1) spawnDust(game.awawa.x + rand(-20, 30), game.awawa.y - rand(25, 60), 1.5);
    playAudio("hit");
    pauseBgm();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawObstacles();
    drawParticles();
    drawAwawa();
    drawForegroundShade();

    if (game.state === "start") drawStart();
    if (game.state === "hit") drawHitFlash();
    if (game.state === "paused" && !game.settingsOpen) drawPaused();
    if (game.state === "gameOver") drawGameOver();
  }

  function drawBackground() {
    backgroundLayers.forEach((layer, index) => {
      drawTiled(layer.image, game.bg[index], layer.y, layer.h);
    });
  }

  function drawTiled(image, offset, y, h) {
    const dw = h * (image.width / image.height);
    const start = -((offset % dw) + dw);
    for (let x = start; x < W + dw; x += dw) {
      ctx.drawImage(image, x, y, dw, h);
    }
  }

  function drawObstacles() {
    for (const obstacle of game.obstacles) {
      const box = getObstacleDrawBox(obstacle);
      ctx.drawImage(obstacle.image, box.x, box.y, box.w, box.h);
    }
  }

  function drawAwawa() {
    const frame = getAwawaFrame();
    const drawW = game.state === "gameOver" ? 250 : 230;
    const drawH = drawW * (frame.height / frame.width);
    const x = game.awawa.x - drawW / 2;
    const y = game.awawa.y - drawH + 5;
    ctx.save();
    ctx.translate(game.awawa.x, game.awawa.y);
    ctx.scale(1, game.awawa.squash);
    ctx.translate(-game.awawa.x, -game.awawa.y);
    ctx.drawImage(frame, x, y, drawW, drawH);
    ctx.restore();
  }

  function getAwawaFrame() {
    if (game.state === "hit") return assets.awawa.hurt[Math.min(2, Math.floor(game.stateTime * 8))];
    if (game.state === "gameOver") return assets.awawa.dead[Math.min(2, Math.floor(game.stateTime * 3))];
    if (!game.awawa.grounded && game.state === "playing") {
      return assets.awawa.jump[game.awawa.vy < -120 ? 0 : game.awawa.vy < 360 ? 1 : 2];
    }
    const frameIndex = Math.floor(game.time * (game.state === "playing" ? 13 : 5)) % assets.awawa.run.length;
    return assets.awawa.run[frameIndex];
  }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawForegroundShade() {
    const grad = ctx.createLinearGradient(0, 540, 0, H);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(87,45,20,0.16)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 540, W, 180);
  }

  function drawStart() {
    const availableWidth = Math.max(280, game.visibleWorldWidth - 72);
    const centerX = game.visibleWorldCenter;
    const topInset = game.visibleWorldTop;
    const bottomInset = Math.max(0, H - game.visibleWorldBottom);
    const compactStart = game.visibleWorldWidth < 620;
    const desktopStart = game.layoutMode === "desktop";
    const logoScale = desktopStart ? 0.7 : 1;
    const panelScale = desktopStart ? 0.8 : 1;
    const logoWidth = compactStart
      ? Math.min(620, Math.max(320, availableWidth * 0.78))
      : Math.min(700, Math.max(430, availableWidth * 0.92)) * logoScale;
    const panelWidth = Math.min(544, Math.max(320, availableWidth * 0.82)) * panelScale;
    const panelHeight = 152 * panelScale;
    const panelX = centerX - panelWidth / 2;
    const bestFont = (panelWidth < 390 ? 24 : panelWidth < 430 ? 28 : 34) * panelScale;
    const subtitleFont = (panelWidth < 390 ? 18 : panelWidth < 430 ? 21 : 24) * panelScale;
    const playSize = panelWidth < 390 ? 88 : panelWidth < 430 ? 96 : 108;
    const topShift = clamp(topInset * 0.72, 0, 94);
    const upwardShift = clamp(bottomInset * 0.9, 0, 120);
    const logoY = (compactStart ? 205 : desktopStart ? 192 : 225) + topShift;
    const panelY = (desktopStart ? 420 : 406) + topShift * 0.82 - upwardShift * 0.55;
    drawOverlay(0.16);
    drawCenteredImage(assets.logo, centerX, logoY, logoWidth);
    drawPanel(panelX, panelY, panelWidth, panelHeight);
    centerText("最高分 " + game.best, centerX, panelY + panelHeight * 0.28, bestFont, "#5b321d");
    centerText("帶 AWAWA 跳過灰白岩石", centerX, panelY + panelHeight * 0.58, subtitleFont, "#7b4428");
    const playY = (desktopStart ? 594 : 612) + topShift * 0.82 - upwardShift;
    drawImageButton(assets.ui.play, centerX, playY, playSize);
    game.button = {
      x: centerX - playSize * 0.72,
      y: playY - playSize * 0.72,
      w: playSize * 1.44,
      h: playSize * 1.44,
    };
  }

  function drawGameOver() {
    const panel = getResponsivePanelMetrics({
      maxWidth: 600,
      minWidth: 320,
      preferredWidthRatio: 0.92,
      wideY: 126,
      narrowY: 148,
      wideHeight: 408,
      narrowHeight: 388,
    });
    const titleFont = panel.width < 390 ? 44 : panel.width < 460 ? 50 : 58;
    const scoreFont = panel.width < 390 ? 32 : 38;
    const bestFont = panel.width < 390 ? 26 : 30;
    const hintFont = panel.width < 390 ? 20 : 24;
    const restartSize = panel.width < 390 ? 96 : 108;
    drawOverlay(0.28);
    drawPanel(panel.x, panel.y, panel.width, panel.height);
    centerText("遊戲結束", panel.cx, panel.y + 64, titleFont, "#e9543d");
    centerText("分數 " + Math.floor(game.score), panel.cx, panel.y + 132, scoreFont, "#4c2c1c");
    centerText("最高分 " + game.best, panel.cx, panel.y + 184, bestFont, "#704124");
    centerText("再試一次，AWAWA 還能更快！", panel.cx, panel.y + 238, hintFont, "#7b4428");
    drawImageButton(assets.ui.restart, panel.cx, panel.y + panel.height - 74, restartSize);
    game.button = {
      x: panel.cx - restartSize * 0.72,
      y: panel.y + panel.height - 74 - restartSize * 0.72,
      w: restartSize * 1.44,
      h: restartSize * 1.44,
    };
  }

  function drawPaused() {
    const panel = getResponsivePanelMetrics({
      maxWidth: 460,
      minWidth: 300,
      preferredWidthRatio: 0.84,
      wideY: 230,
      narrowY: 250,
      wideHeight: 190,
      narrowHeight: 178,
    });
    const titleFont = panel.width < 360 ? 42 : 54;
    const subtitleFont = panel.width < 360 ? 20 : 24;
    drawOverlay(game.settingsOpen ? 0.35 : 0.25);
    drawPanel(panel.x, panel.y, panel.width, panel.height);
    centerText(game.settingsOpen ? "設定已開啟" : "已暫停", panel.cx, panel.y + 62, titleFont, "#e9543d");
    centerText(
      game.settingsOpen ? "調整完成後按按鈕繼續" : "按 ESC 或點擊畫面繼續",
      panel.cx,
      panel.y + 126,
      subtitleFont,
      "#5b321d",
    );
  }

  function getResponsivePanelMetrics({ maxWidth, minWidth, preferredWidthRatio, wideY, narrowY, wideHeight, narrowHeight }) {
    const availableWidth = Math.max(260, game.visibleWorldWidth - 72);
    const width = Math.min(maxWidth, Math.max(minWidth, availableWidth * preferredWidthRatio));
    const compact = width < maxWidth * 0.78;
    const height = compact ? narrowHeight : wideHeight;
    const y = compact ? narrowY : wideY;
    const cx = game.visibleWorldCenter;
    return { width, height, x: cx - width / 2, y, cx };
  }

  function drawHitFlash() {
    ctx.fillStyle = `rgba(255, 245, 157, ${0.35 * (1 - game.stateTime / HIT_FREEZE_TIME)})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawOverlay(alpha) {
    ctx.fillStyle = `rgba(58, 27, 15, ${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawPanel(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 246, 204, 0.94)";
    ctx.strokeStyle = "#5b321d";
    ctx.lineWidth = 5;
    roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawImageButton(image, cx, cy, size) {
    ctx.save();
    ctx.shadowColor = "rgba(74, 35, 13, 0.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    drawCenteredImage(image, cx, cy, size);
    ctx.restore();
  }

  function drawCenteredImage(image, cx, cy, w) {
    const h = w * (image.height / image.width);
    ctx.drawImage(image, cx - w / 2, cy - h / 2, w, h);
  }

  function centerText(text, x, y, size, color) {
    ctx.save();
    ctx.font = `900 ${size}px Trebuchet MS, Microsoft JhengHei, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(3, size * 0.12);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.fillStyle = color;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function jumpOrStart(event) {
    if (event) event.preventDefault();
    unlockAudio();
    if (game.settingsOpen) return;
    if (game.state === "paused") return resumeGame("resume");
    if (game.state === "start") return restart();
    if (game.state === "gameOver") return restart();
    if (game.state !== "playing") return;
    if (!startJump()) queueJump();
  }

  function restart() {
    unlockAudio();
    closeSettings(false);
    game.state = "playing";
    game.stateTime = 0;
    game.score = 0;
    game.speed = BASE_SPEED;
    game.sceneSpeed = BASE_SPEED * BASE_GAME_SPEED_MULTIPLIER;
    game.spawnTimer = 0.96;
    game.obstacles = [];
    game.particles = [];
    game.awawa.x = HERO_X;
    game.awawa.y = GROUND_Y;
    game.awawa.vy = 0;
    game.awawa.grounded = true;
    game.awawa.squash = 1;
    game.jumpHeld = false;
    game.jumpHoldTime = 0;
    game.jumpBufferTime = 0;
    game.fixedStepAccumulator = 0;
    game.lastSafeSpawnX = W + SAFE_SPAWN_OFFSET;
    scoreNode.textContent = "0";
    playAudio("start");
    playBgm();
    syncCanvasCursor();
  }

  function releaseJump() {
    game.jumpHeld = false;
    if (game.state === "playing" && !game.awawa.grounded && game.awawa.vy < JUMP_CUT_VELOCITY) {
      game.awawa.vy = JUMP_CUT_VELOCITY;
    }
  }

  function togglePause(source = "keyboard") {
    if (game.state === "playing") {
      game.state = "paused";
      game.stateTime = 0;
      game.jumpHeld = false;
      pauseBgm();
      if (source === "settings") game.pausedFromSettings = true;
    } else if (game.state === "paused" && !game.settingsOpen) {
      resumeGame(source === "pointer" ? "resume" : "resume");
    }
    syncCanvasCursor();
  }

  function resumeGame(sound = "resume") {
    if (game.settingsOpen) return;
    if (game.state !== "paused") return;
    game.state = "playing";
    game.stateTime = 0;
    game.pausedFromSettings = false;
    playAudio(sound);
    playBgm();
    syncCanvasCursor();
  }

  function openSettings() {
    unlockAudio();
    if (!game.settingsOpen && game.state === "playing") togglePause("settings");
    game.settingsOpen = true;
    syncSettingsUi();
    playAudio("uiOpen");
    syncCanvasCursor();
  }

  function closeSettings(playCloseSound = true) {
    if (!game.settingsOpen) return;
    game.settingsOpen = false;
    syncSettingsUi();
    if (playCloseSound) playAudio("uiClose");
    syncCanvasCursor();
  }

  function continueFromSettings() {
    closeSettings(false);
    if (game.state === "paused") {
      resumeGame();
    } else {
      playAudio("resume");
    }
  }

  function handlePointer(event) {
    unlockAudio();
    if (game.settingsOpen) return;
    if (game.state === "paused") {
      if (!game.settingsOpen) resumeGame();
      return;
    }
    if (game.state === "start" || game.state === "gameOver") {
      const { x, y } = getPointerPos(event);
      if (!pointInButton(x, y)) return;
      jumpOrStart(event);
      return;
    }
    jumpOrStart(event);
  }

  function handlePointerMove(event) {
    if (game.settingsOpen || game.state === "paused") {
      syncCanvasCursor();
      return;
    }
    const { x, y } = getPointerPos(event);
    const overButton = (game.state === "start" || game.state === "gameOver") && pointInButton(x, y);
    canvas.style.cursor = game.state === "playing" ? "pointer" : overButton ? "pointer" : "default";
  }

  function getPointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }

  function pointInButton(x, y) {
    const b = game.button;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  function screenShake(amount) {
    const baseTransform = `translateY(-50%) scale(${game.layoutScale})`;
    gameShell.animate(
      [
        { transform: `${baseTransform} translate(0, 0)` },
        { transform: `${baseTransform} translate(${amount}px, ${-amount * 0.4}px)` },
        { transform: `${baseTransform} translate(${-amount * 0.7}px, ${amount * 0.45}px)` },
        { transform: `${baseTransform} translate(0, 0)` },
      ],
      { duration: 220, easing: "ease-out" },
    );
  }

  function resizeLayout() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportAspect = viewportWidth / viewportHeight;
    const fillHeightScale = viewportHeight / H;
    const fitScale = Math.min(viewportWidth / W, viewportHeight / H);
    const coverScale = Math.max(viewportWidth / W, viewportHeight / H);
    const shortDesktop = viewportWidth >= 960 && viewportAspect >= 1.2 && viewportHeight < 700;
    const desktopFullBleed = viewportWidth >= 960 && viewportAspect >= 1.2 && !shortDesktop;
    const mobileOrNarrow = viewportWidth <= 900 || viewportAspect < 1.3;
    const scale = desktopFullBleed ? coverScale : viewportAspect < W / H || shortDesktop ? fillHeightScale : fitScale;
    const clampedScale = clamp(scale, 0.42, 2.4);
    const scaledWidth = W * clampedScale;
    const scaledHeight = H * clampedScale;
    const minLeft = Math.min(0, viewportWidth - scaledWidth);
    const maxLeft = Math.max(0, viewportWidth - scaledWidth);
    let left = (viewportWidth - scaledWidth) * 0.5;
    let visibleLeft = clamp(-left / clampedScale, 0, W);
    let visibleRight = clamp((viewportWidth - left) / clampedScale, 0, W);
    let visibleWorldWidth = Math.max(1, visibleRight - visibleLeft);
    const ultraNarrow = visibleWorldWidth < 540;
    if (mobileOrNarrow) {
      const heroTargetX = clamp(viewportWidth * 0.18, 72, 132);
      left = clamp(heroTargetX - HERO_X * clampedScale, minLeft, maxLeft);
      visibleLeft = clamp(-left / clampedScale, 0, W);
      visibleRight = clamp((viewportWidth - left) / clampedScale, 0, W);
      visibleWorldWidth = Math.max(1, visibleRight - visibleLeft);
    }
    const screenSafePad = ultraNarrow ? 12 : 20;
    const worldSafePad = screenSafePad / clampedScale;
    const hiddenLeft = visibleLeft;
    const hiddenRight = Math.max(0, W - visibleRight);
    const verticalAnchor = shortDesktop ? 0.485 : 0.5;
    const actualTopPx = viewportHeight * verticalAnchor - scaledHeight * 0.5;
    const actualBottomPx = actualTopPx + scaledHeight;
    const hiddenTop = Math.max(0, -actualTopPx / clampedScale);
    const hiddenBottom = Math.max(0, (actualBottomPx - viewportHeight) / clampedScale);
    const safeTop = hiddenTop + 18 / clampedScale;
    const safeBottom = hiddenBottom + 10 / clampedScale;
    const overlayCardWidth = Math.max(240, Math.min(380, visibleWorldWidth - worldSafePad * 2 - 24));
    game.layoutScale = clampedScale;
    game.layoutMode = desktopFullBleed ? "desktop" : ultraNarrow ? "ultraNarrow" : "default";
    game.visibleWorldWidth = visibleWorldWidth;
    game.visibleWorldLeft = visibleLeft;
    game.visibleWorldRight = visibleRight;
    game.visibleWorldTop = hiddenTop;
    game.visibleWorldBottom = H - hiddenBottom;
    game.visibleWorldCenter = visibleLeft + visibleWorldWidth * 0.5;
    gameShell.style.setProperty("--game-scale", clampedScale.toFixed(4));
    gameShell.style.setProperty("--overlay-card-width", `${overlayCardWidth}px`);
    gameShell.style.setProperty("--safe-left", `${hiddenLeft + worldSafePad}px`);
    gameShell.style.setProperty("--safe-right", `${hiddenRight + worldSafePad}px`);
    gameShell.style.setProperty("--safe-top", `${safeTop}px`);
    gameShell.style.setProperty("--safe-bottom", `${safeBottom}px`);
    gameShell.style.left = `${left}px`;
    gameShell.style.top = `${viewportHeight * verticalAnchor}px`;
  }

  function syncCanvasCursor() {
    canvas.style.cursor = game.settingsOpen || game.state === "paused" ? "default" : "pointer";
  }

  function syncFullscreenButton() {
    const active = Boolean(document.fullscreenElement);
    fullscreenButton.innerHTML = `<span aria-hidden="true">${active ? "🗗" : "⛶"}</span>`;
    fullscreenButton.setAttribute("aria-label", active ? "離開全螢幕" : "切換全螢幕");
    fullscreenButton.title = active ? "離開全螢幕" : "全螢幕";
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const target = gameViewport || document.documentElement;
      if (target.requestFullscreen) await target.requestFullscreen({ navigationUI: "hide" });
      if (window.screen?.orientation?.lock && window.innerHeight > window.innerWidth) {
        await window.screen.orientation.lock("landscape").catch(() => {});
      }
    } catch (_error) {
      // Ignore fullscreen failures and keep the game usable.
    } finally {
      syncFullscreenButton();
      resizeLayout();
    }
  }

  function unlockAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!game.audio.context) game.audio.context = new AudioContext();
    game.audio.unlocked = true;
    if (game.audio.context.state === "suspended") game.audio.context.resume();
    ensureBgmAudio();
    if (game.state === "playing") playBgm();
  }

  function ensureBgmAudio() {
    const bgmSrc = game.audio.fileAvailability.bgm;
    if (!bgmSrc || game.audio.bgmAudio) return;
    const audio = new Audio(bgmSrc);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = game.audio.musicVolume;
    game.audio.bgmAudio = audio;
  }

  function playAudio(slot) {
    if (!game.audio.unlocked) return;
    const config = audioConfig[slot];
    if (!config) return;
    if (config.kind === "music") {
      playBgm();
      return;
    }
    if (game.audio.sfxVolume <= 0) return;
    const fileSrc = game.audio.fileAvailability[slot];
    if (fileSrc) {
      const primed = game.audio.primedElements[slot] || new Audio(fileSrc);
      const audio = primed.cloneNode(true);
      audio.volume = game.audio.sfxVolume;
      audio.play().catch(() => playTone(config.fallbackTone.frequency, config.fallbackTone.duration, config.fallbackTone.type, config.fallbackTone.volume * game.audio.sfxVolume));
      return;
    }
    playTone(config.fallbackTone.frequency, config.fallbackTone.duration, config.fallbackTone.type, config.fallbackTone.volume * game.audio.sfxVolume);
  }

  function playTone(frequency, duration, type, volume) {
    const audio = game.audio.context;
    if (!audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  function playBgm() {
    if (!game.audio.unlocked) return;
    if (game.audio.musicVolume <= 0) return;
    ensureBgmAudio();
    if (game.audio.bgmAudio) {
      game.audio.bgmAudio.volume = game.audio.musicVolume;
      game.audio.bgmAudio.play().catch(() => {});
      return;
    }
    if (!game.audio.bgmNextNoteTime) {
      game.audio.bgmNextNoteTime = game.audio.context.currentTime;
      game.audio.bgmSequenceIndex = 0;
    }
  }

  function pauseBgm() {
    if (game.audio.bgmAudio) game.audio.bgmAudio.pause();
  }

  function updateAudio() {
    if (!game.audio.unlocked || !game.audio.context) return;
    if (game.audio.bgmAudio) {
      game.audio.bgmAudio.volume = game.audio.musicVolume;
      return;
    }
    if (game.audio.musicVolume <= 0) return;
    if (game.state !== "playing") return;
    const sequence = audioConfig.bgm.fallbackSequence;
    while (game.audio.bgmNextNoteTime < game.audio.context.currentTime + 0.18) {
      const note = sequence[game.audio.bgmSequenceIndex % sequence.length];
      scheduleBgmNote(note, game.audio.bgmNextNoteTime);
      game.audio.bgmNextNoteTime += 0.32;
      game.audio.bgmSequenceIndex += 1;
    }
  }

  function scheduleBgmNote(frequency, startTime) {
    const audio = game.audio.context;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.045 * game.audio.musicVolume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.26);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.28);
  }

  function range(count) {
    return Array.from({ length: count }, (_, i) => i);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      event.preventDefault();
      if (game.settingsOpen) {
        closeSettings();
        return;
      }
      togglePause("keyboard");
      return;
    }
    if (["Space", "ArrowUp", "KeyW"].includes(event.code) && !event.repeat) jumpOrStart(event);
  });

  window.addEventListener("keyup", (event) => {
    if (["Space", "ArrowUp", "KeyW"].includes(event.code)) releaseJump();
  });

  canvas.addEventListener("pointerdown", handlePointer);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", releaseJump);
  canvas.addEventListener("pointercancel", releaseJump);
  canvas.addEventListener("pointerleave", () => {
    syncCanvasCursor();
    releaseJump();
  });

  settingsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openSettings();
  });

  fullscreenButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    await toggleFullscreen();
  });

  resumeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    continueFromSettings();
  });

  settingsPanel.addEventListener("click", (event) => {
    if (event.target === settingsPanel && game.state !== "paused") closeSettings();
  });

  sfxVolumeInput.addEventListener("input", () => {
    game.audio.sfxVolume = clamp(Number(sfxVolumeInput.value) / 100, 0, 1);
    localStorage.setItem("gogo-awawa-sfx-volume", String(game.audio.sfxVolume));
  });

  musicVolumeInput.addEventListener("input", () => {
    game.audio.musicVolume = clamp(Number(musicVolumeInput.value) / 100, 0, 1);
    localStorage.setItem("gogo-awawa-music-volume", String(game.audio.musicVolume));
    if (game.audio.bgmAudio) game.audio.bgmAudio.volume = game.audio.musicVolume;
  });

  window.addEventListener("resize", resizeLayout);
  document.addEventListener("fullscreenchange", () => {
    syncFullscreenButton();
    resizeLayout();
  });

  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(raf);
    if (game.audio.bgmAudio) game.audio.bgmAudio.pause();
  });
})();
