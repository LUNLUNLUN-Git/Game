const BGM_VOLUME = 0.28 * 0.6;

function getAudioUrl(fileName: string) {
  if (window.location.protocol === 'file:') {
    return `./dist/audio/${fileName}`;
  }
  return `/audio/${fileName}`;
}

export class AudioManager {
  ctx: AudioContext | null = null;
  enabled = true;
  private volume = 1;

  private lastPlayTimes: Record<string, number> = {};
  private probedAudioFiles = false;
  private buttonAudio: HTMLAudioElement | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private buttonAudioReady = false;
  private bgmAudioReady = false;
  private wantsBgm = false;

  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported', e);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.probeExternalAudio();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!enabled) {
      this.bgmAudio?.pause();
      if (this.ctx) this.ctx.suspend();
      return;
    }

    if (this.ctx) this.ctx.resume();
    if (this.wantsBgm) this.startBgm();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.bgmAudio) {
      this.bgmAudio.volume = BGM_VOLUME * this.volume;
    }
  }

  getVolume() {
    return this.volume;
  }

  startBgm() {
    this.wantsBgm = true;
    this.init();
    if (!this.enabled) return;

    if (this.bgmAudio) {
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = BGM_VOLUME * this.volume;
      void this.bgmAudio.play().then(() => {
        this.bgmAudioReady = true;
      }).catch((err) => {
        console.warn('Unable to autoplay external BGM yet.', err);
      });
    }
  }

  stopBgm() {
    this.wantsBgm = false;
    this.bgmAudio?.pause();
  }

  playButtonClick() {
    this.init();
    if (!this.enabled) return;

    if (this.buttonAudioReady && this.buttonAudio) {
      const click = this.buttonAudio.cloneNode(true) as HTMLAudioElement;
      click.volume = 0.55 * this.volume;
      void click.play().catch(() => this.playButtonFallback());
      return;
    }

    this.playButtonFallback();
  }

  private probeExternalAudio() {
    if (this.probedAudioFiles) return;
    this.probedAudioFiles = true;

    const buttonUrl = getAudioUrl('button-click.mp3');
    const bgmUrl = getAudioUrl('forest-bgm.mp3');

    this.buttonAudio = new Audio(buttonUrl);
    this.buttonAudio.preload = 'auto';
    this.buttonAudio.addEventListener('canplaythrough', () => {
      this.buttonAudioReady = true;
    }, { once: true });
    this.buttonAudio.addEventListener('loadedmetadata', () => {
      this.buttonAudioReady = true;
    }, { once: true });
    this.buttonAudio.addEventListener('error', () => {
      this.buttonAudioReady = false;
      console.warn(`Unable to load button audio: ${buttonUrl}`);
    }, { once: true });

    this.bgmAudio = new Audio(bgmUrl);
    this.bgmAudio.preload = 'auto';
    this.bgmAudio.loop = true;
    this.bgmAudio.addEventListener('canplaythrough', () => {
      this.bgmAudioReady = true;
      if (this.wantsBgm) this.startBgm();
    }, { once: true });
    this.bgmAudio.addEventListener('loadedmetadata', () => {
      this.bgmAudioReady = true;
      if (this.wantsBgm) this.startBgm();
    }, { once: true });
    this.bgmAudio.addEventListener('error', () => {
      this.bgmAudioReady = false;
      console.warn(`Unable to load BGM audio: ${bgmUrl}`);
    }, { once: true });
  }

  private throttle(key: string, limitMs: number): boolean {
    const now = Date.now();
    if (!this.lastPlayTimes[key] || now - this.lastPlayTimes[key] > limitMs) {
      this.lastPlayTimes[key] = now;
      return true;
    }
    return false;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, slideFreq?: number) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(vol * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playButtonFallback() {
    if (!this.throttle('button', 45)) return;
    this.playTone(640, 'triangle', 0.08, 0.055, 920);
    window.setTimeout(() => this.playTone(980, 'sine', 0.07, 0.035, 1220), 42);
  }

  playXpPickup() {
    if (this.throttle('xp', 50)) {
      this.playTone(800, 'sine', 0.1, 0.05, 1200);
    }
  }

  playEnemyHit() {
    if (this.throttle('hit', 30)) {
      this.playTone(150, 'square', 0.1, 0.05, 50);
    }
  }

  playEnemyDeath() {
    if (this.throttle('death', 40)) {
      this.playTone(100, 'sawtooth', 0.2, 0.08, 20);
    }
  }

  playPlayerDamage() {
    this.playTone(200, 'sawtooth', 0.4, 0.2, 50);
  }

  playShootWand() {
    this.playTone(600, 'sine', 0.1, 0.03, 1000);
  }

  playShootWhip() {
    this.playTone(300, 'triangle', 0.15, 0.03, 100);
  }

  playShootFireball() {
    this.playTone(200, 'square', 0.2, 0.05, 100);
  }

  playShootArrow() {
    this.playTone(400, 'sine', 0.1, 0.03, 1200);
  }

  playLevelUp() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    [400, 500, 600, 800].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  playKnightUltimate() {
    this.init();
    if (!this.enabled || !this.ctx || !this.throttle('knight-ultimate', 450)) return;

    const now = this.ctx.currentTime;
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(96, now);
    rumble.frequency.exponentialRampToValueAtTime(42, now + 0.85);
    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.16, now + 0.05);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.ctx.destination);
    rumble.start(now);
    rumble.stop(now + 0.92);

    [0.05, 0.16, 0.28, 0.42].forEach((offset, i) => {
      const crack = this.ctx!.createOscillator();
      const crackGain = this.ctx!.createGain();
      crack.type = i % 2 ? 'triangle' : 'square';
      crack.frequency.setValueAtTime(180 + i * 65, now + offset);
      crack.frequency.exponentialRampToValueAtTime(520 + i * 80, now + offset + 0.13);
      crackGain.gain.setValueAtTime(0.09, now + offset);
      crackGain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15);
      crack.connect(crackGain);
      crackGain.connect(this.ctx!.destination);
      crack.start(now + offset);
      crack.stop(now + offset + 0.16);
    });
  }
}

export const audioManager = new AudioManager();
