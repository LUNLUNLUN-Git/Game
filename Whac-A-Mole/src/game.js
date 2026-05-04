const DURATION_SECONDS = 60;
const GOLD_CHANCE = 0.12;
const BEST_KEY = "cuteWhackAMoleBestScore";
const LEADERBOARD_KEY = "cuteWhackAMoleLeaderboard";
const SOUND_VOLUME_KEY = "cuteWhackAMoleSoundVolume";
const MUSIC_VOLUME_KEY = "cuteWhackAMoleMusicVolume";
const INTRO_PLAYED_KEY = "cuteWhackAMoleIntroPlayed";
const SOUND_GAIN_MULTIPLIER = 8;
const SOUND_GAIN_LIMIT = 0.45;
const DEFAULT_PLAYER_NAME = "User";

const frames = {
  molePop: [
    "assets/sprites/mole-pop/frames/mole-pop-01.png",
    "assets/sprites/mole-pop/frames/mole-pop-02.png",
    "assets/sprites/mole-pop/frames/mole-pop-03.png",
    "assets/sprites/mole-pop/frames/mole-pop-04.png",
    "assets/sprites/mole-pop/frames/mole-pop-05.png",
    "assets/sprites/mole-pop/frames/mole-pop-06.png",
  ],
  moleHit: [
    "assets/sprites/mole-hit/frames/mole-hit-01.png",
    "assets/sprites/mole-hit/frames/mole-hit-02.png",
    "assets/sprites/mole-hit/frames/mole-hit-03.png",
    "assets/sprites/mole-hit/frames/mole-hit-04.png",
  ],
  goldHit: [
    "assets/sprites/gold-mole-hit/frames/gold-hit-01.png",
    "assets/sprites/gold-mole-hit/frames/gold-hit-02.png",
    "assets/sprites/gold-mole-hit/frames/gold-hit-03.png",
    "assets/sprites/gold-mole-hit/frames/gold-hit-04.png",
  ],
  goldPop: [
    "assets/sprites/gold-mole-pop/frames/gold-pop-01.png",
    "assets/sprites/gold-mole-pop/frames/gold-pop-02.png",
    "assets/sprites/gold-mole-pop/frames/gold-pop-03.png",
    "assets/sprites/gold-mole-pop/frames/gold-pop-04.png",
    "assets/sprites/gold-mole-pop/frames/gold-pop-05.png",
    "assets/sprites/gold-mole-pop/frames/gold-pop-06.png",
  ],
  poof: [
    "assets/sprites/poof-fx/frames/poof-01.png",
    "assets/sprites/poof-fx/frames/poof-02.png",
    "assets/sprites/poof-fx/frames/poof-03.png",
    "assets/sprites/poof-fx/frames/poof-04.png",
  ],
  hammer: [
    "assets/sprites/hammer-swing/frames/hammer-01.png",
    "assets/sprites/hammer-swing/frames/hammer-02.png",
    "assets/sprites/hammer-swing/frames/hammer-03.png",
    "assets/sprites/hammer-swing/frames/hammer-04.png",
  ],
};

const els = {
  app: document.querySelector("#app"),
  playfield: document.querySelector(".playfield"),
  board: document.querySelector("#board"),
  holes: [...document.querySelectorAll(".hole")],
  score: document.querySelector("#score"),
  timeLeft: document.querySelector("#timeLeft"),
  combo: document.querySelector("#combo"),
  bestScore: document.querySelector("#bestScore"),
  roundStatus: document.querySelector("#roundStatus"),
  toast: document.querySelector("#toast"),
  hammerCursor: document.querySelector("#hammerCursor"),
  startOverlay: document.querySelector("#startOverlay"),
  closeStartButton: document.querySelector("#closeStartButton"),
  startButton: document.querySelector("#startButton"),
  startLeaderboardButton: document.querySelector("#startLeaderboardButton"),
  resumeButton: document.querySelector("#resumeButton"),
  settingsRestartButton: document.querySelector("#settingsRestartButton"),
  pauseEndButton: document.querySelector("#pauseEndButton"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsOverlay: document.querySelector("#settingsOverlay"),
  closeSettingsButton: document.querySelector("#closeSettingsButton"),
  settingsGameActions: document.querySelector("#settingsGameActions"),
  soundToggleButton: document.querySelector("#soundToggleButton"),
  musicToggleButton: document.querySelector("#musicToggleButton"),
  soundSwitchButton: document.querySelector("#soundSwitchButton"),
  soundVolumeValue: document.querySelector("#soundVolumeValue"),
  musicSwitchButton: document.querySelector("#musicSwitchButton"),
  musicVolumeValue: document.querySelector("#musicVolumeValue"),
  bgmAudio: document.querySelector("#bgmAudio"),
  leaderboardOverlay: document.querySelector("#leaderboardOverlay"),
  closeLeaderboardButton: document.querySelector("#closeLeaderboardButton"),
  clearLeaderboardButton: document.querySelector("#clearLeaderboardButton"),
  clearLeaderboardLabel: document.querySelector("#clearLeaderboardLabel"),
  leaderboardList: document.querySelector("#leaderboardList"),
  emptyLeaderboard: document.querySelector("#emptyLeaderboard"),
  resultOverlay: document.querySelector("#resultOverlay"),
  finalScore: document.querySelector("#finalScore"),
  finalMeta: document.querySelector("#finalMeta"),
  rankLine: document.querySelector("#rankLine"),
  resultLeaderboard: document.querySelector("#resultLeaderboard"),
  retryButton: document.querySelector("#retryButton"),
  backToStartButton: document.querySelector("#backToStartButton"),
};

const state = {
  phase: "idle",
  score: 0,
  combo: 0,
  comboMax: 0,
  best: Number(localStorage.getItem(BEST_KEY) || 0),
  remaining: DURATION_SECONDS,
  playerName: DEFAULT_PLAYER_NAME,
  startedAt: 0,
  endAt: 0,
  timerId: 0,
  spawnTimer: 0,
  staggerTimers: [],
  active: new Map(),
  soundVolume: clampVolume(Number(localStorage.getItem(SOUND_VOLUME_KEY) || 80)),
  musicVolume: clampVolume(Number(localStorage.getItem(MUSIC_VOLUME_KEY) || 50)),
  previousSoundVolume: 80,
  previousMusicVolume: 50,
  audio: null,
  musicAvailable: true,
  musicOn: true,
  musicFadeTimer: 0,
  lastPointer: { x: -999, y: -999 },
  pointerInPlayfield: false,
  settingsResumeOnClose: false,
};

function preload() {
  const urls = new Set(Object.values(frames).flat());
  [
    "assets/images/garden-bg.png",
    "assets/images/start-bg.png",
    "assets/ui/hole.png",
    "assets/ui/clock.png",
    "assets/ui/mascot.png",
    "assets/ui/mallet-icon.png",
    "assets/ui/title-logo.png",
    "assets/ui/start-button.png",
    "assets/ui/rule-card-square-normal.png",
    "assets/ui/rule-card-square-gold.png",
    "assets/ui/rule-card-square-combo.png",
    "assets/ui/rule-card-square-time.png",
    "assets/ui/cursor-finger.png",
    "assets/ui/cursor-finger-pc.png",
    "assets/ui/cursor-finger-press.png",
    "assets/ui/cursor-hammer.png",
    "assets/ui/cursor-hammer-down.png",
    "assets/ui/top-stats-frame.png",
    "assets/ui/start-frame.png",
    "assets/ui/rules-frame.png",
    "assets/ui/leaderboard-frame.png",
    "assets/ui/button-unified.png",
    "assets/ui/icon-settings.png",
    "assets/ui/icon-close.png",
  ].forEach((url) => urls.add(url));
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

function sanitizeName(value) {
  const trimmed = String(value || "").trim().replace(/\s+/g, " ");
  return trimmed.slice(0, 12) || "玩家";
}

function clampVolume(value) {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function loadLeaderboard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => Number.isFinite(item.score)) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 10)));
}

function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime();
  });
}

function syncBestFromLeaderboard() {
  const leaderboard = sortLeaderboard(loadLeaderboard());
  const best = Math.max(Number(localStorage.getItem(BEST_KEY) || 0), leaderboard[0]?.score || 0);
  state.best = best;
  localStorage.setItem(BEST_KEY, String(best));
}

function renderStats() {
  els.score.textContent = state.score;
  els.timeLeft.textContent = state.remaining;
  els.combo.textContent = state.combo;
  els.bestScore.textContent = state.best;
}

function setStatus(text) {
  els.roundStatus.textContent = text;
  els.toast.textContent = text;
}

function setControls() {
  const running = state.phase === "running";
  const paused = state.phase === "paused";
  els.settingsGameActions.hidden = !(running || paused);
  els.resumeButton.disabled = !(running || paused);
  els.pauseEndButton.disabled = !(running || paused);
  document.body.classList.toggle("playing-with-hammer", running);
  document.body.classList.toggle("game-active", running || paused);
  syncHammerVisibility();
}

function syncHammerVisibility() {
  const shouldShow =
    state.phase === "running" && state.pointerInPlayfield && !window.matchMedia("(pointer: coarse)").matches;
  document.body.classList.toggle("hammer-visible", shouldShow);
  if (!shouldShow) {
    document.body.classList.remove("hammer-swinging");
  }
}

function difficulty() {
  const elapsed = DURATION_SECONDS - state.remaining;
  let maxActive = 1;
  if (elapsed >= 45) {
    maxActive = 4;
  } else if (elapsed >= 25) {
    maxActive = 3;
  } else if (elapsed >= 10) {
    maxActive = 2;
  }
  const level = Math.min(6, Math.floor(elapsed / 10));
  return {
    level,
    maxActive,
    spawnInterval: Math.max(430, 940 - level * 78),
    exposure: Math.max(430, 940 - level * 82),
  };
}

function randomFreeHole() {
  const free = els.holes
    .map((hole, index) => ({ hole, index }))
    .filter(({ index }) => !state.active.has(index));
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

function startGame() {
  clearRoundTimers();
  clearAllTargets();
  hideAllModals();
  document.body.classList.remove("home-screen");

  state.playerName = DEFAULT_PLAYER_NAME;
  state.phase = "running";
  state.score = 0;
  state.combo = 0;
  state.comboMax = 0;
  state.remaining = DURATION_SECONDS;
  state.startedAt = Date.now();
  state.endAt = state.startedAt + DURATION_SECONDS * 1000;
  state.settingsResumeOnClose = false;

  setStatus("開始");
  renderStats();
  setControls();
  playSound("start");
  restartMusic();

  state.timerId = window.setInterval(tick, 200);
  scheduleSpawn(220);
}

function tick() {
  if (state.phase !== "running") {
    return;
  }
  state.remaining = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
  expireOverdueTargets();
  renderStats();
  if (state.remaining <= 0) {
    endGame("time");
  }
}

function expireOverdueTargets() {
  const now = Date.now();
  for (const [index, target] of [...state.active]) {
    if (!target.hit && now >= target.escapeAt) {
      state.combo = 0;
      clearTarget(index);
      setStatus("溜走了");
    }
  }
}

function scheduleSpawn(delay) {
  window.clearTimeout(state.spawnTimer);
  if (state.phase !== "running") {
    return;
  }
  state.spawnTimer = window.setTimeout(() => {
    spawnWave();
    if (state.phase === "running") {
      const { spawnInterval } = difficulty();
      scheduleSpawn(spawnInterval + Math.random() * 140);
    }
  }, delay);
}

function spawnWave() {
  if (state.phase !== "running") {
    return;
  }
  const { maxActive, exposure, level } = difficulty();
  const deficit = Math.max(0, maxActive - state.active.size);
  if (!deficit) {
    return;
  }
  const waveBoost = level >= 4 ? 2 : level >= 2 ? 1 : 0;
  const desired = Math.min(maxActive, state.active.size + 1 + Math.floor(Math.random() * (waveBoost + 1)));
  const toSpawn = Math.max(1, Math.min(deficit, desired - state.active.size));
  let delay = 0;
  for (let i = 0; i < toSpawn; i += 1) {
    if (i > 0) {
      delay += 90 + Math.random() * 90;
    }
    const timer = window.setTimeout(() => {
      state.staggerTimers = state.staggerTimers.filter((id) => id !== timer);
      if (state.phase === "running") {
        spawnTarget(exposure);
      }
    }, delay);
    state.staggerTimers.push(timer);
  }
}

function spawnTarget(exposure) {
  const free = randomFreeHole();
  if (!free) {
    return;
  }
  const type = Math.random() < GOLD_CHANCE ? "gold" : "normal";
  const sourceFrames = type === "gold" ? frames.goldPop : frames.molePop;
  const target = {
    type,
    hole: free.hole,
    index: free.index,
    hit: false,
    frameIndex: 0,
    frameTimer: 0,
    escapeTimer: 0,
    escapeAt: Date.now() + exposure + Math.random() * 180,
    remainingEscape: 0,
  };

  const img = free.hole.querySelector(".mole-img");
  img.src = sourceFrames[0];
  free.hole.classList.add("is-active");
  free.hole.classList.toggle("is-gold", type === "gold");

  startTargetFrameTimer(target);
  startEscapeTimer(target);
  state.active.set(free.index, target);
  if (type === "gold") {
    playSound("goldAppear");
  }
}

function startTargetFrameTimer(target) {
  const sourceFrames = target.type === "gold" ? frames.goldPop : frames.molePop;
  const img = target.hole.querySelector(".mole-img");
  window.clearInterval(target.frameTimer);
  target.frameTimer = window.setInterval(() => {
    target.frameIndex = (target.frameIndex + 1) % sourceFrames.length;
    img.src = sourceFrames[target.frameIndex];
  }, 115);
}

function startEscapeTimer(target) {
  window.clearTimeout(target.escapeTimer);
  target.escapeTimer = window.setTimeout(() => {
    if (state.phase !== "running" || target.hit) {
      return;
    }
    state.combo = 0;
    clearTarget(target.index);
    setStatus("溜走了");
    renderStats();
  }, Math.max(0, target.escapeAt - Date.now()));
}

function hitHole(index) {
  if (state.phase !== "running") {
    return;
  }

  const target = state.active.get(index);
  if (target?.hit) {
    return;
  }

  if (!target) {
    state.combo = 0;
    setStatus("空揮");
    renderStats();
    playSound("miss");
    return;
  }

  target.hit = true;
  window.clearInterval(target.frameTimer);
  window.clearTimeout(target.escapeTimer);

  const base = target.type === "gold" ? 30 : 10;
  state.combo += 1;
  state.comboMax = Math.max(state.comboMax, state.combo);
  const bonus = state.combo % 3 === 0 ? 5 : 0;
  const gained = base + bonus;
  state.score += gained;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_KEY, String(state.best));
  }

  target.hole.classList.add("is-hit");
  target.hole.classList.remove("is-active");
  const hitFrames = target.type === "gold" ? frames.goldHit : frames.moleHit;
  animateImage(target.hole.querySelector(".mole-img"), hitFrames, 80, () => {
    clearTarget(index);
  });
  playEffect(target.hole);
  floatScore(target.hole, `+${gained}`);
  setStatus(target.type === "gold" ? "金色！" : bonus ? "連擊！" : "命中");
  renderStats();
  playSound(target.type === "gold" ? "gold" : "hit");
}

function animateImage(img, sourceFrames, delay, done) {
  let index = 0;
  img.src = sourceFrames[0];
  const timer = window.setInterval(() => {
    index += 1;
    if (index >= sourceFrames.length) {
      window.clearInterval(timer);
      done?.();
      return;
    }
    img.src = sourceFrames[index];
  }, delay);
  return timer;
}

function playEffect(hole) {
  const img = hole.querySelector(".fx-img");
  hole.classList.add("show-fx");
  animateImage(img, frames.poof, 70, () => {
    hole.classList.remove("show-fx");
  });
}

function floatScore(hole, text) {
  const bubble = document.createElement("span");
  bubble.className = "score-pop";
  bubble.textContent = text;
  hole.appendChild(bubble);
  window.setTimeout(() => bubble.remove(), 720);
}

function clearTarget(index) {
  const target = state.active.get(index);
  if (!target) {
    return;
  }
  window.clearInterval(target.frameTimer);
  window.clearTimeout(target.escapeTimer);
  target.hole.classList.remove("is-active", "is-hit", "is-gold", "show-fx");
  target.hole.querySelector(".mole-img").removeAttribute("src");
  target.hole.querySelector(".fx-img").removeAttribute("src");
  state.active.delete(index);
}

function clearAllTargets() {
  [...state.active.keys()].forEach(clearTarget);
}

function clearRoundTimers() {
  window.clearTimeout(state.spawnTimer);
  window.clearInterval(state.timerId);
  state.staggerTimers.forEach((timer) => window.clearTimeout(timer));
  state.staggerTimers = [];
  state.spawnTimer = 0;
  state.timerId = 0;
}

function pauseGame(options = {}) {
  if (state.phase !== "running") {
    return;
  }
  const { showOverlay = true } = options;
  state.remaining = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
  state.phase = "paused";
  window.clearTimeout(state.spawnTimer);
  window.clearInterval(state.timerId);
  state.staggerTimers.forEach((timer) => window.clearTimeout(timer));
  state.staggerTimers = [];
  for (const target of state.active.values()) {
    if (target.hit) {
      continue;
    }
    target.remainingEscape = Math.max(0, target.escapeAt - Date.now());
    window.clearTimeout(target.escapeTimer);
    window.clearInterval(target.frameTimer);
  }
  setStatus("暫停");
  setControls();
}

function resumeGame() {
  if (state.phase !== "paused") {
    return;
  }
  state.phase = "running";
  state.endAt = Date.now() + state.remaining * 1000;
  for (const target of state.active.values()) {
    if (target.hit) {
      continue;
    }
    target.escapeAt = Date.now() + Math.max(120, target.remainingEscape || 300);
    startTargetFrameTimer(target);
    startEscapeTimer(target);
  }
  setStatus("繼續");
  setControls();
  state.timerId = window.setInterval(tick, 200);
  scheduleSpawn(260);
}

function togglePause() {
  if (state.phase === "paused") {
    resumeGame();
  } else {
    pauseGame();
  }
}

function endGame(endedBy = "manual") {
  if (state.phase !== "running" && state.phase !== "paused") {
    return;
  }
  state.phase = "ended";
  clearRoundTimers();
  clearAllTargets();
  state.remaining = endedBy === "time" ? 0 : state.remaining;
  const record = saveResult(endedBy);

  els.settingsOverlay.hidden = true;
  els.resultOverlay.hidden = false;
  els.finalScore.textContent = `${state.score} 分`;
  els.finalMeta.textContent = `最高連擊 ${state.comboMax}`;
  els.rankLine.textContent = record.rank ? `本局排名第 ${record.rank}` : "本局已記錄";
  els.resultTitle.textContent = endedBy === "time" ? "時間到！" : "停止遊戲";
  setStatus(endedBy === "time" ? "時間到" : "已結束");
  renderStats();
  renderLeaderboard(els.resultLeaderboard, { compact: true });
  setControls();
  playSound("finish");
  fadeOutMusic();
}

function saveResult(endedBy) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: state.playerName,
    score: state.score,
    comboMax: state.comboMax,
    endedAt: new Date().toISOString(),
    duration: DURATION_SECONDS - state.remaining,
    endedBy,
  };
  const ranked = sortLeaderboard([...loadLeaderboard(), entry]).slice(0, 10);
  saveLeaderboard(ranked);
  const rank = ranked.findIndex((item) => item.id === entry.id) + 1;
  syncBestFromLeaderboard();
  return { entry, rank };
}

function renderLeaderboard(listEl = els.leaderboardList, options = {}) {
  const entries = sortLeaderboard(loadLeaderboard()).slice(0, options.compact ? 5 : 10);
  listEl.innerHTML = "";
  entries.forEach((entry, index) => {
    const li = document.createElement("li");
    const date = new Date(entry.endedAt);
    const dateText = Number.isNaN(date.getTime())
      ? ""
      : `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    li.innerHTML = `
      <span class="rank-badge">${index + 1}</span>
      <span class="rank-name">
        <strong></strong>
        <span>${dateText} · 最高連擊 ${entry.comboMax || 0}</span>
      </span>
      <span class="rank-score">${entry.score} 分</span>
    `;
    li.querySelector("strong").textContent = DEFAULT_PLAYER_NAME;
    listEl.appendChild(li);
  });
  if (listEl === els.leaderboardList) {
    els.emptyLeaderboard.hidden = entries.length > 0;
    els.clearLeaderboardLabel.textContent = entries.length > 0 ? "清除紀錄" : "關閉";
    els.clearLeaderboardButton.classList.toggle("danger-text", entries.length > 0);
    const clearIcon = els.clearLeaderboardButton.querySelector("img");
    if (clearIcon) {
      clearIcon.hidden = entries.length === 0;
    }
  }
}

function showStart() {
  hideAllModals();
  els.startOverlay.hidden = false;
  document.body.classList.add("home-screen", "modal-scroll-locked");
  document.body.classList.remove("game-active", "hammer-visible");
  fadeOutMusic();
  requestAnimationFrame(fitScaledDialogs);
}

function showLeaderboard() {
  renderLeaderboard();
  els.leaderboardOverlay.hidden = false;
  document.body.classList.add("modal-scroll-locked");
}

function closeLeaderboard() {
  els.leaderboardOverlay.hidden = true;
  if (!document.body.classList.contains("home-screen")) {
    document.body.classList.remove("modal-scroll-locked");
  }
}

function openSettings() {
  state.settingsResumeOnClose = state.phase === "running";
  if (state.phase === "running") {
    pauseGame({ showOverlay: false });
  }
  updateVolumeControls();
  els.settingsOverlay.hidden = false;
  requestAnimationFrame(fitScaledDialogs);
}

function closeSettings() {
  els.settingsOverlay.hidden = true;
  const shouldResume = state.settingsResumeOnClose && state.phase === "paused";
  state.settingsResumeOnClose = false;
  if (shouldResume) {
    resumeGame();
  }
}

function hideAllModals() {
  els.startOverlay.hidden = true;
  els.settingsOverlay.hidden = true;
  els.resultOverlay.hidden = true;
  els.leaderboardOverlay.hidden = true;
  document.body.classList.remove("modal-scroll-locked");
}

function fitScaledDialogs() {
  [els.startOverlay, els.settingsOverlay].forEach((overlay) => {
    if (!overlay || overlay.hidden) {
      return;
    }
    const dialog = overlay.querySelector(".modal-dialog");
    if (!dialog) {
      return;
    }
    dialog.style.setProperty("--dialog-scale", "1");
    const rect = dialog.getBoundingClientRect();
    const scale = Math.min(1, (window.innerWidth - 20) / rect.width, (window.innerHeight - 20) / rect.height);
    dialog.style.setProperty("--dialog-scale", String(Math.max(0.68, scale)));
  });
}

function clearLeaderboard() {
  if (!loadLeaderboard().length) {
    closeLeaderboard();
    return;
  }
  localStorage.removeItem(LEADERBOARD_KEY);
  localStorage.setItem(BEST_KEY, "0");
  state.best = 0;
  renderLeaderboard();
  renderStats();
}

function ensureAudio() {
  if (!state.audio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return null;
    }
    state.audio = new AudioContext();
  }
  if (state.audio.state === "suspended") {
    state.audio.resume();
  }
  return state.audio;
}

function tone(freq, duration, type = "sine", gain = 0.08, offset = 0) {
  if (state.soundVolume <= 0) {
    return;
  }
  const audio = ensureAudio();
  if (!audio) {
    return;
  }
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const scaledGain = Math.min(SOUND_GAIN_LIMIT, gain * SOUND_GAIN_MULTIPLIER * (state.soundVolume / 100));
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, audio.currentTime + offset);
  amp.gain.exponentialRampToValueAtTime(scaledGain, audio.currentTime + offset + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + offset + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(audio.currentTime + offset);
  osc.stop(audio.currentTime + offset + duration + 0.02);
}

function playSound(kind) {
  if (kind === "hit") {
    tone(520, 0.09, "triangle", 0.08);
    tone(780, 0.08, "sine", 0.06, 0.04);
  } else if (kind === "gold") {
    tone(660, 0.08, "triangle", 0.08);
    tone(920, 0.11, "sine", 0.07, 0.05);
    tone(1180, 0.12, "sine", 0.05, 0.12);
  } else if (kind === "goldAppear") {
    tone(880, 0.075, "sine", 0.06);
    tone(1320, 0.1, "triangle", 0.055, 0.045);
    tone(1760, 0.08, "sine", 0.035, 0.12);
  } else if (kind === "miss") {
    tone(180, 0.12, "sawtooth", 0.04);
  } else if (kind === "press") {
    tone(260, 0.055, "triangle", 0.035);
    tone(190, 0.045, "sine", 0.025, 0.025);
  } else if (kind === "hammer") {
    tone(150, 0.055, "square", 0.08);
    tone(82, 0.09, "triangle", 0.06, 0.02);
    tone(360, 0.045, "sine", 0.025, 0.055);
  } else if (kind === "start") {
    tone(420, 0.08, "triangle", 0.06);
    tone(640, 0.1, "triangle", 0.06, 0.08);
  } else if (kind === "finish") {
    tone(640, 0.12, "triangle", 0.06);
    tone(480, 0.14, "triangle", 0.05, 0.12);
  } else if (kind === "ui") {
    tone(760, 0.045, "triangle", 0.035);
    tone(980, 0.055, "sine", 0.025, 0.025);
  }
}

function setupMusic() {
  els.bgmAudio.volume = state.musicVolume / 100;
  els.bgmAudio.addEventListener("canplaythrough", () => {
    state.musicAvailable = true;
    updateVolumeControls();
    if (canPlayMusicNow() && els.bgmAudio.paused) {
      maybePlayMusic();
    }
  });
  els.bgmAudio.addEventListener("error", () => {
    state.musicAvailable = false;
    updateVolumeControls();
  });
  updateVolumeControls();
}

function canPlayMusicNow() {
  return state.phase === "running" || (state.phase === "paused" && state.settingsResumeOnClose);
}

function maybePlayMusic() {
  if (!state.musicAvailable || !state.musicOn || state.musicVolume <= 0 || !canPlayMusicNow()) {
    return;
  }
  window.clearInterval(state.musicFadeTimer);
  state.musicFadeTimer = 0;
  els.bgmAudio.volume = state.musicVolume / 100;
  els.bgmAudio.play().catch(() => {
    updateVolumeControls();
  });
}

function pauseMusic() {
  window.clearInterval(state.musicFadeTimer);
  state.musicFadeTimer = 0;
  els.bgmAudio.pause();
}

function fadeOutMusic(duration = 700) {
  if (els.bgmAudio.paused || state.musicVolume <= 0) {
    pauseMusic();
    return;
  }
  window.clearInterval(state.musicFadeTimer);
  const startVolume = els.bgmAudio.volume;
  const startedAt = Date.now();
  state.musicFadeTimer = window.setInterval(() => {
    const progress = Math.min(1, (Date.now() - startedAt) / duration);
    els.bgmAudio.volume = startVolume * (1 - progress);
    if (progress >= 1) {
      pauseMusic();
      els.bgmAudio.currentTime = 0;
      els.bgmAudio.volume = state.musicVolume / 100;
    }
  }, 30);
}

function restartMusic() {
  if (!state.musicAvailable || !state.musicOn || state.musicVolume <= 0 || state.phase !== "running") {
    return;
  }
  try {
    if (els.bgmAudio.readyState === 0) {
      els.bgmAudio.load();
    }
    els.bgmAudio.currentTime = 0;
  } catch {
    // Metadata may not be available yet in some browsers.
  }
  maybePlayMusic();
}

function updateVolumeControls() {
  els.soundVolumeValue.textContent = state.soundVolume > 0 ? "開" : "關";
  els.musicVolumeValue.textContent = state.musicVolume > 0 ? "開" : "關";
  els.bgmAudio.volume = state.musicVolume / 100;
  els.soundToggleButton.classList.toggle("is-muted", state.soundVolume <= 0);
  els.musicToggleButton.classList.toggle("is-muted", state.musicVolume <= 0 || !state.musicOn);
  els.soundSwitchButton.classList.toggle("is-on", state.soundVolume > 0);
  els.musicSwitchButton.classList.toggle("is-on", state.musicVolume > 0 && state.musicOn);
  els.soundToggleButton.setAttribute("aria-label", state.soundVolume <= 0 ? "恢復音效" : "音效靜音");
  els.musicToggleButton.setAttribute("aria-label", state.musicVolume <= 0 ? "恢復音樂" : "音樂靜音");
  els.soundSwitchButton.setAttribute("aria-pressed", String(state.soundVolume > 0));
  els.musicSwitchButton.setAttribute("aria-pressed", String(state.musicVolume > 0 && state.musicOn));
}

function setSoundVolume(value) {
  state.soundVolume = clampVolume(value);
  if (state.soundVolume > 0) {
    state.previousSoundVolume = state.soundVolume;
  }
  localStorage.setItem(SOUND_VOLUME_KEY, String(state.soundVolume));
  updateVolumeControls();
}

function setMusicVolume(value) {
  state.musicVolume = clampVolume(value);
  if (state.musicVolume > 0) {
    state.previousMusicVolume = state.musicVolume;
    state.musicOn = true;
  }
  localStorage.setItem(MUSIC_VOLUME_KEY, String(state.musicVolume));
  updateVolumeControls();
  if (state.musicVolume <= 0) {
    pauseMusic();
  } else if (canPlayMusicNow()) {
    maybePlayMusic();
  }
}

function toggleSoundVolume() {
  if (state.soundVolume > 0) {
    state.previousSoundVolume = state.soundVolume;
    setSoundVolume(0);
  } else {
    setSoundVolume(state.previousSoundVolume || 80);
  }
}

function toggleMusicVolume() {
  if (state.musicVolume > 0) {
    state.previousMusicVolume = state.musicVolume;
    setMusicVolume(0);
  } else {
    setMusicVolume(state.previousMusicVolume || 50);
  }
}

function updateHammerPosition(x, y) {
  state.lastPointer = { x, y };
}

function swingHammer(x, y) {
  updateHammerPosition(x, y);
  playSound("hammer");
  document.body.classList.remove("hammer-swinging");
  void document.body.offsetWidth;
  document.body.classList.add("hammer-swinging");
  window.setTimeout(() => document.body.classList.remove("hammer-swinging"), 170);
}

function bindEvents() {
  els.holes.forEach((hole) => {
    hole.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const index = Number(hole.dataset.hole);
      if (event.pointerType !== "touch") {
        swingHammer(event.clientX, event.clientY);
      }
      hitHole(index);
      if (event.pointerType !== "pen") {
        hole.blur();
      }
    });
  });

  document.querySelectorAll("button").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      if (!button.disabled && event.pointerType !== "touch" && !button.classList.contains("hole")) {
        playSound("press");
      }
    });
    button.addEventListener("click", () => {
      if (!button.disabled) {
        playSound("ui");
      }
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key >= "1" && event.key <= "9") {
      const index = Number(event.key) - 1;
      els.holes[index]?.focus({ preventScroll: true });
      hitHole(index);
    } else if (event.key === "Escape" && state.phase === "running") {
      openSettings();
    }
  });

  els.playfield.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    state.pointerInPlayfield = true;
    updateHammerPosition(event.clientX, event.clientY);
    syncHammerVisibility();
  });

  els.playfield.addEventListener("pointerleave", () => {
    state.pointerInPlayfield = false;
    syncHammerVisibility();
  });

  els.playfield.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    state.pointerInPlayfield = true;
    updateHammerPosition(event.clientX, event.clientY);
    syncHammerVisibility();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.phase === "running") {
      tick();
    }
  });

  window.addEventListener("resize", fitScaledDialogs);

  els.closeStartButton.addEventListener("click", () => {
    els.startOverlay.hidden = true;
  });
  els.startButton.addEventListener("click", startGame);
  els.retryButton.addEventListener("click", startGame);
  els.backToStartButton.addEventListener("click", showStart);
  els.resumeButton.addEventListener("click", closeSettings);
  els.settingsRestartButton.addEventListener("click", startGame);
  els.pauseEndButton.addEventListener("click", () => endGame("manual"));
  els.settingsButton.addEventListener("click", openSettings);
  els.closeSettingsButton.addEventListener("click", closeSettings);
  els.soundToggleButton.addEventListener("click", toggleSoundVolume);
  els.musicToggleButton.addEventListener("click", toggleMusicVolume);
  els.soundSwitchButton.addEventListener("click", toggleSoundVolume);
  els.musicSwitchButton.addEventListener("click", toggleMusicVolume);
  els.startLeaderboardButton.addEventListener("click", showLeaderboard);
  els.closeLeaderboardButton.addEventListener("click", closeLeaderboard);
  els.clearLeaderboardButton.addEventListener("click", clearLeaderboard);
}

function init() {
  preload();
  try {
    if (!sessionStorage.getItem(INTRO_PLAYED_KEY)) {
      document.body.classList.add("start-intro");
      sessionStorage.setItem(INTRO_PLAYED_KEY, "1");
      window.setTimeout(() => document.body.classList.remove("start-intro"), 2400);
    }
  } catch {
    document.body.classList.add("start-intro");
    window.setTimeout(() => document.body.classList.remove("start-intro"), 2400);
  }
  document.querySelectorAll("img").forEach((img) => {
    img.draggable = false;
  });
  setupMusic();
  document.body.classList.add("home-screen", "modal-scroll-locked");
  syncBestFromLeaderboard();
  renderStats();
  renderLeaderboard();
  setControls();
  bindEvents();
  requestAnimationFrame(fitScaledDialogs);
}

init();
