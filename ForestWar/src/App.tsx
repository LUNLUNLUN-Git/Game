import React, { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { CHARACTERS, GameEngine } from './game/GameEngine';
import { GameState } from './game/types';
import { audioManager } from './game/AudioManager';
import { generatedAssets, uiAssets } from './assets';

const frameStyle = {
  backgroundImage:
    'linear-gradient(180deg, rgba(255,247,218,0.97), rgba(244,214,151,0.95))',
  boxShadow:
    '0 16px 40px rgba(36, 18, 5, 0.35), inset 0 0 0 2px rgba(255,255,255,0.55)',
};

const greenPanelStyle = {
  backgroundImage:
    'linear-gradient(180deg, rgba(34,88,35,0.95), rgba(14,58,26,0.96))',
  boxShadow: 'inset 0 0 24px rgba(0,0,0,0.3), 0 12px 28px rgba(24, 11, 3, 0.35)',
};

const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const getCharacterArt = (id: string) =>
  generatedAssets.characters[id as keyof typeof generatedAssets.characters] ??
  generatedAssets.characters.knight;

const getUltimateArt = (id: string) =>
  generatedAssets.ultimates[id as keyof typeof generatedAssets.ultimates] ??
  generatedAssets.ultimates.knight;

const getSkillArt = (id: string) =>
  generatedAssets.skills[id as keyof typeof generatedAssets.skills] ??
  generatedAssets.skills.orbit;

const getEnemyGuideArt = (id: string) => {
  const enemySet =
    generatedAssets.enemies[id as keyof typeof generatedAssets.enemies] ??
    generatedAssets.enemies.sproutSlime;
  return enemySet.right.desktop;
};

const homeParticles = Array.from({ length: 26 }, (_, i) => ({
  left: 5 + ((i * 37) % 90),
  top: 7 + ((i * 53) % 82),
  size: 2 + (i % 4),
  delay: (i % 9) * 0.42,
  duration: 3.8 + (i % 7) * 0.34,
  drift: (i % 2 === 0 ? 1 : -1) * (12 + (i % 5) * 4),
}));

const enemyGuideEntries = [
  {
    id: 'sproutSlime',
    name: '芽苗史萊姆',
    desc: '受到污染的幼苗團，數量多、移動穩定，是最常見的入侵者。',
  },
  {
    id: 'acornScout',
    name: '橡果斥候',
    desc: '披著硬殼的小型斥候，行動敏捷，會快速切入守衛身邊。',
  },
  {
    id: 'mossGolem',
    name: '苔岩守衛',
    desc: '古岩被黑霧喚醒後失控，速度慢但生命值很高。',
  },
  {
    id: 'thornBrute',
    name: '荊刺猛衛',
    desc: '被荊棘覆蓋的厚重精英，抗打擊能力強，碰撞傷害也更高。',
  },
  {
    id: 'mistWisp',
    name: '迷霧幽靈',
    desc: '漂浮在林間的詛咒靈火，身形飄忽，不容易被擊退。',
  },
  {
    id: 'forestLord',
    name: '森林領主',
    desc: '戴著古老冠飾的失控林靈，會在戰鬥中召集更多入侵者。',
  },
];

type IconButtonProps = {
  label: string;
  src: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  imgClassName?: string;
};

function IconButton({ label, src, onClick, disabled, className = '', imgClassName = '' }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => {
        audioManager.playButtonClick();
        onClick();
      }}
      disabled={disabled}
      className={`grid place-items-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale ${className}`}
    >
      <img src={src} alt="" className={`h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(30,15,3,0.35)] ${imgClassName}`} />
    </button>
  );
}

function HudFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-full border-[1.5px] border-[#8a5418] bg-gradient-to-b from-[#d9972d] via-[#8d4f13] to-[#4f2a0b] shadow-[0_2px_0_rgba(59,29,7,0.58),inset_0_1px_0_rgba(255,240,145,0.74)]">
      <div className="absolute inset-[3px] rounded-full border border-[#4c2608] bg-[#3f2409]/85 shadow-inner" />
    </div>
  );
}

type HudBarProps = {
  icon: string;
  label: string;
  value: number;
  max: number;
  fillClass: string;
  text?: string;
};

function HudBar({ icon, label, value, max, fillClass, text }: HudBarProps) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));

  return (
    <div className="relative h-10 w-[min(46vw,345px)] md:h-[56px]">
      <HudFrame />
      <div className="absolute left-[18.5%] right-[8.5%] top-[23%] h-[54%] overflow-hidden rounded-full bg-[#442509]/75 shadow-inner">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <img src={icon} alt="" className="absolute left-[4.5%] top-1/2 h-[58%] w-[12%] -translate-y-1/2 object-contain drop-shadow-lg" />
      <div className="absolute left-[21.5%] right-[9%] top-1/2 flex -translate-y-1/2 items-center justify-between text-[10px] font-black tracking-wide text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)] md:text-[14px]">
        <span>{label}</span>
        <span>{text ?? `${Math.ceil(value)} / ${max}`}</span>
      </div>
    </div>
  );
}

function HomePanelFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const mobileFrameStyle = {
    borderImageSource: `url(${uiAssets.homePanel})`,
    borderImageSlice: '110 fill',
    borderImageWidth: '24px',
    borderImageRepeat: 'stretch',
  } as React.CSSProperties;

  const desktopFrameStyle = {
    borderImageSource: `url(${uiAssets.homePanel})`,
    borderImageSlice: '110 fill',
    borderImageWidth: '34px',
    borderImageRepeat: 'stretch',
  } as React.CSSProperties;

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 border-[24px] border-transparent drop-shadow-[0_18px_24px_rgba(33,17,6,0.36)] md:hidden" style={mobileFrameStyle} />
      <div className="absolute inset-0 hidden border-[34px] border-transparent drop-shadow-[0_18px_24px_rgba(33,17,6,0.36)] md:block" style={desktopFrameStyle} />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

function ForestButton({
  children,
  onClick,
  variant = 'gold',
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'gold' | 'green' | 'danger';
  className?: string;
}) {
  const variants = {
    gold: 'from-[#ffe775] via-[#ffc52d] to-[#c8750d] text-[#3b2305] border-[#6b3707]',
    green: 'from-[#86d65a] via-[#3c9b35] to-[#155f28] text-white border-[#184a1d]',
    danger: 'from-[#ff9a72] via-[#df4c30] to-[#842415] text-white border-[#5c1a0f]',
  };

  return (
    <button
      onClick={() => {
        audioManager.playButtonClick();
        onClick();
      }}
      className={`relative rounded-[18px] border-4 bg-gradient-to-b px-7 py-3 text-lg font-black tracking-[0.12em] shadow-[0_8px_0_rgba(77,36,7,0.8),0_16px_26px_rgba(35,15,4,0.25)] transition-transform hover:scale-[1.02] active:translate-y-1 active:shadow-[0_4px_0_rgba(77,36,7,0.8)] md:px-10 md:py-4 md:text-2xl ${variants[variant]} ${className}`}
    >
      <span className="pointer-events-none absolute left-4 top-2 h-3 w-8 rounded-full bg-white/50 blur-[1px]" />
      {children}
    </button>
  );
}

function UpgradeCardSvg({ special }: { special?: boolean }) {
  const glow = special ? '#ffe66a' : '#e6b84f';
  const id = React.useId().replace(/:/g, '');
  const paperId = `paper-${id}`;
  const woodId = `wood-${id}`;
  const shadowId = `card-shadow-${id}`;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 320 460" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={paperId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff1c5" />
          <stop offset="0.55" stopColor="#f6d88e" />
          <stop offset="1" stopColor="#dfac4d" />
        </linearGradient>
        <linearGradient id={woodId} x1="0" x2="1">
          <stop offset="0" stopColor="#7a4312" />
          <stop offset="0.45" stopColor="#d58a23" />
          <stop offset="1" stopColor="#63320d" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#2b1605" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="22" y="24" width="276" height="412" rx="24" fill="#5c2f0d" opacity="0.9" filter={`url(#${shadowId})`} />
      <rect x="26" y="28" width="268" height="404" rx="21" fill={`url(#${woodId})`} />
      <rect x="30" y="33" width="260" height="394" rx="18" fill={`url(#${paperId})`} stroke="#fff5c9" strokeWidth="2" />
      <path d="M44 69 C83 48 123 49 157 68 C204 40 248 54 278 84" fill="none" stroke={glow} strokeWidth="3" strokeLinecap="round" opacity="0.42" />
      <path d="M44 391 C88 419 130 416 162 400 C202 422 248 411 278 383" fill="none" stroke="#c8892c" strokeWidth="3" strokeLinecap="round" opacity="0.38" />
      <path d="M39 46 H281 M39 414 H281" stroke="#ffe68a" strokeWidth="2" strokeLinecap="round" opacity="0.42" />
      <rect x="39" y="48" width="242" height="366" rx="15" fill="none" stroke="#b47a27" strokeWidth="1.4" opacity="0.4" />
    </svg>
  );
}

function HomeParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {homeParticles.map((p, i) => (
        <span
          key={i}
          className="home-particle absolute rounded-full bg-[#fff7c4]"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--particle-drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [engineInstance, setEngineInstance] = useState<GameEngine | null>(null);
  const [charIndex, setCharIndex] = useState(0);
  const [homeAssetsReady, setHomeAssetsReady] = useState(false);

  const handleStateChange = useCallback(
    (state: GameState, engine: GameEngine) => {
      setGameState(state);
      if (!engineInstance) setEngineInstance(engine);
    },
    [engineInstance],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineInstance || !engineInstance.state) return;
      const state = engineInstance.state;

      if (state.status === 'playing') {
        if (e.key === ' ') engineInstance.useUltimate();
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
          e.preventDefault();
          engineInstance.cheatAddMinute();
        }
        if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          engineInstance.cheatLevelUp();
        }
        if (e.key === 'Escape') {
          engineInstance.state.status = 'paused';
          engineInstance.onStateChange();
        }
      } else if (state.status === 'paused' && e.key === 'Escape') {
        state.status = 'playing';
        state.lastTime = performance.now();
        engineInstance.onStateChange();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && engineInstance?.state.status === 'playing') {
        engineInstance.state.status = 'paused';
        engineInstance.onStateChange();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [engineInstance]);

  useEffect(() => {
    let isCancelled = false;
    const preloadTargets = [
      uiAssets.forestBg,
      uiAssets.logo,
      uiAssets.homePanel,
      uiAssets.arrowLeft,
      uiAssets.arrowRight,
      uiAssets.startButton,
      uiAssets.guideButton,
      uiAssets.fullscreenButton,
      generatedAssets.controls.volumeOn,
      generatedAssets.controls.volumeOff,
      generatedAssets.characters.knight,
      generatedAssets.characters.hunter,
      generatedAssets.characters.guard,
    ];

    Promise.all(
      preloadTargets.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (!isCancelled) {
        setHomeAssetsReady(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gameState || gameState.status !== 'menu' || !homeAssetsReady) return;
    audioManager.init();
    audioManager.setVolume(gameState.volume ?? 0.5);
    audioManager.setEnabled(!(gameState.isMuted ?? false));
    audioManager.startBgm();
  }, [gameState?.status, gameState?.isMuted, gameState?.volume, homeAssetsReady]);

  useEffect(() => {
    if (!gameState || gameState.status !== 'menu' || !homeAssetsReady) return;

    const retryBgm = () => {
      audioManager.init();
      audioManager.setVolume(gameState.volume ?? 0.5);
      audioManager.setEnabled(!(gameState.isMuted ?? false));
      audioManager.startBgm();
    };

    window.addEventListener('pointerdown', retryBgm, { passive: true });
    window.addEventListener('keydown', retryBgm);

    return () => {
      window.removeEventListener('pointerdown', retryBgm);
      window.removeEventListener('keydown', retryBgm);
    };
  }, [gameState?.status, gameState?.isMuted, gameState?.volume, homeAssetsReady]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const toggleMute = () => {
    const nextMuted = !(engineInstance?.state.isMuted ?? gameState?.isMuted ?? false);
    if (!engineInstance) return;
    const restoredVolume = !nextMuted && (engineInstance.state.volume ?? 1) <= 0 ? 0.5 : engineInstance.state.volume ?? 1;
    if (!nextMuted && engineInstance.state.volume <= 0) {
      engineInstance.state.volume = restoredVolume;
    }
    audioManager.setVolume(restoredVolume);
    audioManager.setEnabled(!nextMuted);
    engineInstance.state.isMuted = nextMuted;
    engineInstance.onStateChange();
  };

  const updateVolume = (nextVolume: number) => {
    const clamped = Math.max(0, Math.min(1, nextVolume));
    audioManager.setVolume(clamped);
    audioManager.setEnabled(clamped > 0);
    if (!engineInstance) return;
    engineInstance.state.volume = clamped;
    engineInstance.state.isMuted = clamped <= 0;
    engineInstance.onStateChange();
  };

  const toggleGuide = () => {
    if (!engineInstance) return;

    if (engineInstance.state.status === 'guide') {
      const isGameStarted = engineInstance.state.player.hp > 0 && engineInstance.state.gameTime > 0;
      engineInstance.state.status = isGameStarted ? 'playing' : 'menu';
      if (engineInstance.state.status === 'playing') {
        engineInstance.state.lastTime = performance.now();
      }
    } else {
      engineInstance.state.status = 'guide';
    }

    engineInstance.onStateChange();
  };

  const selectedCharacter = CHARACTERS[charIndex];
  const selectedCharacterArt = getCharacterArt(selectedCharacter.id);
  const currentUltimateArt = gameState ? getUltimateArt(gameState.selectedCharacterId) : generatedAssets.ultimates.knight;
  const ultimateChargeRatio = gameState ? gameState.player.ultimateCharge / gameState.player.ultimateMaxCharge : 0;
  const ultimateRemainingAngle = (1 - ultimateChargeRatio) * 360;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#16351f] font-sans text-[#4b2a0a] select-none touch-none">
      <style>{`
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .volume-slider::-webkit-slider-runnable-track {
          height: 12px;
          border-radius: 999px;
          background: var(--slider-track-bg, linear-gradient(90deg, #5ca93c 50%, #4b2a0a 50%));
        }
        .volume-slider::-moz-range-track {
          height: 12px;
          border-radius: 999px;
          background: var(--slider-track-bg, linear-gradient(90deg, #5ca93c 50%, #4b2a0a 50%));
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          margin-top: -8px;
          border-radius: 999px;
          border: 3px solid #edf7c5;
          background: linear-gradient(180deg, #7bd04f, #43962e);
          box-shadow: 0 3px 8px rgba(42, 20, 5, 0.28);
        }
        .volume-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 3px solid #edf7c5;
          background: linear-gradient(180deg, #7bd04f, #43962e);
          box-shadow: 0 3px 8px rgba(42, 20, 5, 0.28);
        }
      `}</style>
      <GameCanvas onStateChange={handleStateChange} />

      {gameState && gameState.status === 'playing' && (
        <div className="pointer-events-none absolute left-2 top-2 z-20 flex flex-col gap-2 md:left-4 md:top-4 md:gap-2.5">
          <HudBar
            icon={uiAssets.healHeart}
            label="生命"
            value={gameState.player.hp}
            max={gameState.player.maxHp}
            fillClass="bg-gradient-to-r from-[#f83025] via-[#ff5c3f] to-[#ffbf78]"
          />
          <HudBar
            icon={uiAssets.xpGem}
            label={`Lv.${gameState.player.level}`}
            value={gameState.player.xp}
            max={gameState.player.maxXp}
            text={`${Math.floor(Math.min(100, (gameState.player.xp / gameState.player.maxXp) * 100))}%`}
            fillClass="bg-gradient-to-r from-[#19b9f0] via-[#34d8ff] to-[#bbf7ff]"
          />

          <div className="mt-1 flex w-fit gap-3 rounded-[16px] border-4 border-[#8b551a] bg-[#f7df9e]/95 px-4 py-2.5 text-sm font-black text-[#4d2a08] shadow-[0_8px_18px_rgba(30,15,3,0.25)] md:gap-6 md:px-6 md:py-3 md:text-lg">
            <div>
              <div className="text-[10px] tracking-[0.18em] text-[#6d8420] md:text-xs">擊殺數</div>
              <div>{gameState.player.kills}</div>
            </div>
            <div className="border-l-2 border-[#b67b24]/50 pl-3 md:pl-6">
              <div className="text-[10px] tracking-[0.18em] text-[#6d8420] md:text-xs">生存時間</div>
              <div>{formatTime(gameState.gameTime)}</div>
            </div>
          </div>
        </div>
      )}

      {gameState && gameState.status === 'playing' && (
        <div className="pointer-events-none absolute bottom-4 left-3 z-20 flex max-w-[48vw] flex-col gap-3 md:bottom-6 md:left-6 md:max-w-sm">
          <button
            onClick={() => {
              if (!engineInstance) return;
              const newAutoPlay = !engineInstance.state.autoPlay;
              engineInstance.state.autoPlay = newAutoPlay;
              engineInstance.state.autoUpgrade = newAutoPlay;
              engineInstance.onStateChange();
            }}
            className={`pointer-events-auto w-fit rounded-[14px] border-4 px-3 py-2 text-xs font-black shadow-lg transition-transform hover:scale-105 active:scale-95 md:text-sm ${
              gameState.autoPlay
                ? 'border-[#2f6d1f] bg-[#9be35d] text-[#17360f]'
                : 'border-[#8a561d] bg-[#f0c768] text-[#65410f]'
            }`}
          >
            自動 {gameState.autoPlay ? 'ON' : 'OFF'}
          </button>

          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {gameState.activeWeapons.map((wid) => {
              const w = gameState.weapons[wid];
              return (
                <div key={wid} className="relative h-11 w-11 md:h-14 md:w-14">
                  <img src={getSkillArt(wid)} alt="" className="h-full w-full rounded-[10px] object-contain drop-shadow-[0_5px_7px_rgba(20,10,3,0.32)]" />
                  <span className="absolute bottom-0 right-0 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#6b390b] bg-[#ffd84c] px-1 text-[10px] font-black text-[#3b2207]">
                    {w.level}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameState && gameState.status !== 'menu' && (
        <div className="pointer-events-auto absolute right-3 top-3 z-30 flex gap-1.5 md:right-6 md:top-5 md:gap-3">
          <IconButton label="教學百科" src={generatedAssets.controls.guide} onClick={toggleGuide} className="h-12 w-12 shrink-0 md:h-16 md:w-16" />
          <IconButton
            label={gameState.status === 'paused' ? '繼續' : '暫停'}
            src={generatedAssets.controls.pause}
            onClick={() => {
              if (!engineInstance) return;
              const isPaused = engineInstance.state.status === 'paused';
              engineInstance.state.status = isPaused ? 'playing' : 'paused';
              if (engineInstance.state.status === 'playing') engineInstance.state.lastTime = performance.now();
              engineInstance.onStateChange();
            }}
            className="h-12 w-12 shrink-0 md:h-16 md:w-16"
          />
          <IconButton label="切換全螢幕" src={uiAssets.fullscreenButton} onClick={toggleFullscreen} className="h-12 w-12 shrink-0 md:h-16 md:w-16" />
        </div>
      )}

      {gameState &&
        gameState.status === 'playing' &&
        gameState.enemies
          .filter((e) => e.isBoss)
          .map((boss) => (
            <div key={boss.id} className="pointer-events-none absolute bottom-20 left-1/2 z-20 w-[min(42vw,320px)] -translate-x-1/2 md:bottom-24">
              <div className="mb-1 text-center text-xs font-black tracking-[0.18em] text-[#ffd84d] drop-shadow-[0_2px_4px_rgba(64,20,0,0.9)] md:text-base">
                森林領主現身
              </div>
                <div className="relative h-[22px] md:h-[26px]">
                  <HudFrame />
                  <div className="absolute left-[6.6%] right-[6.6%] top-1/2 h-[34%] -translate-y-1/2 overflow-hidden rounded-full bg-[#442509]/78">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ff6a1b] via-[#ffd84c] to-[#fff4a9]"
                    style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

      {gameState && gameState.status === 'playing' && (
        <div className="pointer-events-auto absolute bottom-4 right-4 z-30 md:bottom-8 md:right-8">
          {gameState.player.ultimateCharge >= gameState.player.ultimateMaxCharge && (
            <div className="absolute inset-0 animate-ping rounded-full bg-[#ffdf38] opacity-40" />
          )}
          <button
            aria-label="施放角色絕招"
            onClick={() => engineInstance?.useUltimate()}
            disabled={gameState.player.ultimateCharge < gameState.player.ultimateMaxCharge}
            className="relative h-20 w-20 rounded-full transition-transform hover:scale-105 active:scale-95 disabled:grayscale md:h-28 md:w-28"
          >
            <div className="absolute inset-0 z-0">
              <img
                src={currentUltimateArt}
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(30,15,3,0.35)]"
              />
              {gameState.player.ultimateCharge < gameState.player.ultimateMaxCharge && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `conic-gradient(from -90deg, rgba(28,16,5,0.74) 0deg ${ultimateRemainingAngle}deg, transparent ${ultimateRemainingAngle}deg 360deg)`,
                    WebkitMaskImage: `url(${currentUltimateArt})`,
                    maskImage: `url(${currentUltimateArt})`,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    transform: 'scaleX(-1) rotate(90deg)',
                    transformOrigin: 'center',
                  }}
                />
              )}
            </div>
          </button>
        </div>
      )}

      {gameState?.status === 'levelup' && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/68 p-3 backdrop-blur-[1px] md:p-8">
          <div className="relative flex h-full w-full max-w-5xl flex-col items-center justify-center gap-3 md:gap-5">
            <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-2 rounded-[22px] border-4 border-[#9b641c] bg-[#f9e7b2]/95 px-4 py-3 text-center shadow-xl md:px-7">
              <div className="text-center">
                <h2 className="text-3xl font-black tracking-[0.12em] text-[#5b320a] md:text-5xl">等級提升</h2>
                <p className="text-xs font-bold tracking-[0.2em] text-[#668821] md:text-sm">選擇一項森林祝福</p>
              </div>
            </div>

            <div className="grid w-full max-w-5xl grid-cols-3 gap-1 overflow-visible px-0.5 py-1 md:gap-0.5">
              {gameState.availableUpgrades.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    audioManager.playButtonClick();
                    engineInstance?.selectUpgrade(i);
                  }}
                    className="group relative flex min-h-[230px] min-w-0 flex-col items-center justify-between overflow-hidden rounded-[18px] p-1.5 text-center transition-transform hover:-translate-y-1 hover:scale-[1.01] active:scale-95 md:min-h-[470px] md:rounded-[24px] md:p-3"
                >
                  <UpgradeCardSvg special={opt.isSpecial} />
                  {opt.isSpecial && (
                    <div className="absolute right-0.5 top-0 z-20 rounded-full border-2 border-[#6b390b] bg-[#ffd84c] px-2 py-0.5 text-[10px] font-black text-[#4d2a08] shadow-[0_4px_10px_rgba(68,31,5,0.2)] md:right-3 md:top-2 md:px-3 md:py-1 md:text-xs">
                      專屬
                    </div>
                  )}
                  <div className="relative z-10 mt-3 rounded-full border-[3px] border-[#8a561d] bg-[#ffdb55] px-2 py-0.5 text-[11px] font-black text-[#4d2a08] md:mt-6 md:border-4 md:px-4 md:py-1 md:text-lg">
                    Lv.{opt.level}
                  </div>
                  <img src={getSkillArt(opt.weaponId)} alt="" className="relative z-10 h-12 w-12 object-contain drop-shadow-[0_8px_12px_rgba(48,24,6,0.32)] sm:h-16 sm:w-16 md:h-32 md:w-32" />
                  <div className="relative z-10 flex min-h-[92px] w-full flex-col justify-center px-4 sm:px-3 md:min-h-[132px] md:px-5">
                    <h3 className="text-[11px] font-black leading-tight text-[#4d2a08] sm:text-sm md:text-2xl">{opt.name}</h3>
                    <p className="mt-1 text-[9px] font-bold leading-snug text-[#735016] sm:text-[10px] md:mt-2 md:text-sm">{opt.description}</p>
                  </div>
                  <div className="relative z-10 mb-1 rounded-full border-[2px] border-[#6b390b] bg-[#255f2c] px-3 py-1 text-[10px] font-black tracking-[0.08em] text-white shadow-lg transition-colors group-hover:bg-[#49a93d] md:mb-3 md:border-[3px] md:px-6 md:py-2 md:text-sm md:tracking-[0.15em]">
                    選擇
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState?.status === 'menu' && homeAssetsReady && (
        <div
          className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden px-3 py-4 md:px-8"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(4,30,28,0.15), rgba(4,22,14,0.2)), url(${uiAssets.forestBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <HomeParticles />

          <div className="absolute right-4 top-4 z-30 flex gap-1.5 md:right-8 md:top-8 md:gap-2">
            <IconButton
              label={gameState.isMuted ? '開啟音量' : '關閉音量'}
              src={gameState.isMuted ? generatedAssets.controls.volumeOff : generatedAssets.controls.volumeOn}
              onClick={toggleMute}
              className="h-10 w-10 md:h-14 md:w-14"
            />
            <IconButton
              label="切換全螢幕"
              src={uiAssets.fullscreenButton}
              onClick={toggleFullscreen}
              className="h-10 w-10 md:h-14 md:w-14"
              imgClassName="scale-[1.18] md:scale-[1.12]"
            />
          </div>

          <div className="relative z-10 flex h-full w-full max-w-6xl flex-col items-center justify-between gap-2 pb-2 pt-1 md:pb-5 md:pt-3">
            <img src={uiAssets.logo} alt="森林保衛戰 Roguelike 倖存者" className="h-auto max-h-[28vh] w-[min(74vw,640px)] shrink-0 object-contain drop-shadow-[0_16px_18px_rgba(18,9,3,0.45)]" />

            <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-1 md:gap-5">
              <IconButton
                label="上一位守衛"
                src={uiAssets.arrowLeft}
                onClick={() => setCharIndex((charIndex - 1 + CHARACTERS.length) % CHARACTERS.length)}
                className="h-16 w-16 shrink-0 md:h-24 md:w-24"
              />

              <HomePanelFrame className="flex h-full max-h-[48vh] min-h-[250px] w-[min(78vw,720px)] flex-col items-center justify-center px-5 py-4 text-center md:min-h-[340px] md:px-10 md:py-6">
                <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
                  <div className="relative mb-2 h-32 w-32 md:h-44 md:w-44">
                    <div className="absolute inset-5 rounded-full bg-[#d8a947]/30 blur-xl" />
                    <img src={selectedCharacterArt} alt="" className="relative h-full w-full object-contain drop-shadow-[0_8px_8px_rgba(70,36,9,0.3)]" />
                    <div className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full border-[3px] border-[#75410e] bg-[#65b83b] text-xl font-black text-white shadow-lg">
                      1
                    </div>
                  </div>
                  <h1 className="text-4xl font-black tracking-[0.08em] text-[#4c2b08] md:text-5xl">{selectedCharacter.name}</h1>
                  <p className="mt-3 max-w-[90%] text-base font-bold leading-relaxed text-[#6f4b16] md:max-w-xl md:text-xl">{selectedCharacter.description}</p>
                </div>
              </HomePanelFrame>

              <IconButton
                label="下一位守衛"
                src={uiAssets.arrowRight}
                onClick={() => setCharIndex((charIndex + 1) % CHARACTERS.length)}
                className="h-16 w-16 shrink-0 md:h-24 md:w-24"
              />
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2 md:gap-3">
              <button
                onClick={() => {
                  audioManager.init();
                  audioManager.setVolume(gameState.volume ?? 1);
                  audioManager.setEnabled(!(gameState.isMuted ?? false));
                  audioManager.playButtonClick();
                  audioManager.startBgm();
                  engineInstance?.reset(CHARACTERS[charIndex].id);
                }}
                aria-label="開始遊戲"
                className="relative grid w-[min(56vw,345px)] place-items-center transition-transform hover:scale-[1.03] active:scale-95"
                style={{ aspectRatio: '1856 / 542' }}
              >
                <img src={uiAssets.startButton} alt="" className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(37,18,5,0.3)]" />
              </button>

              <button
                onClick={() => {
                  audioManager.playButtonClick();
                  toggleGuide();
                }}
                aria-label="查看教學與百科"
                className="relative grid w-[min(48vw,260px)] place-items-center transition-transform hover:scale-[1.03] active:scale-95"
                style={{ aspectRatio: '1484 / 227' }}
              >
                <img src={uiAssets.guideButton} alt="" className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(37,18,5,0.3)]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState?.status === 'menu' && !homeAssetsReady && (
        <div className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle_at_center,_#bfd96b_0%,_#b4d062_28%,_#95be4d_60%,_#78a83c_100%)]" />
      )}

      {gameState?.status === 'guide' && (
        <div
          className="pointer-events-auto absolute inset-0 z-[60] flex flex-col overflow-hidden p-3 md:p-8"
          style={{ backgroundImage: `url(${uiAssets.forestBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border-4 border-[#8c571b] bg-[#f8e3ae]/95 shadow-[0_18px_40px_rgba(25,12,3,0.45)]">
            <header className="flex items-center justify-between border-b-4 border-[#b47a27] bg-[#285d2d] px-4 py-3 text-white md:px-7 md:py-5">
              <div>
                <h2 className="text-3xl font-black tracking-[0.08em] md:text-5xl">教學百科</h2>
                <p className="text-xs font-bold tracking-[0.2em] text-[#e8f5a2] md:text-sm">森林守衛戰鬥手冊</p>
              </div>
              <ForestButton onClick={toggleGuide} variant="gold" className="px-4 py-2 text-xl tracking-normal md:px-5 md:py-2">
                關閉
              </ForestButton>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
              <div className="grid gap-6 pb-10">
                <section className="rounded-[20px] border-4 border-[#9b641c] bg-white/35 p-4 md:p-6">
                  <h3 className="mb-4 text-2xl font-black text-[#4d2a08]">操作說明</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ['移動 [電腦]', 'WASD / 方向鍵', generatedAssets.input.mouse],
                      ['移動 [手機]', '拖曳手指移動', generatedAssets.input.drag],
                      ['絕招施放', '點擊右下圖示', generatedAssets.input.tap],
                    ].map(([label, value, icon]) => (
                      <div key={label} className="flex items-center gap-3 rounded-[16px] border-[3px] border-[#b7832d] bg-[#fff3c8]/85 p-4">
                        <img src={icon} alt="" className="h-14 w-14 shrink-0 object-contain" />
                        <div>
                          <div className="text-xs font-black tracking-[0.2em] text-[#6c8622]">{label}</div>
                          <div className="mt-2 text-xl font-black text-[#4d2a08]">{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[20px] border-4 border-[#9b641c] bg-white/35 p-4 md:p-6">
                  <h3 className="mb-4 text-2xl font-black text-[#4d2a08]">守衛介紹</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {CHARACTERS.map((c) => (
                      <div key={c.id} className="rounded-[20px] border-4 border-[#b7832d] bg-[#fff3c8]/85 p-4 text-center">
                        <img src={getCharacterArt(c.id)} alt="" className="mx-auto h-24 w-24 object-contain md:h-32 md:w-32" />
                        <div className="mt-2 text-xl font-black text-[#4d2a08]">{c.name}</div>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-[#735016]">{c.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[20px] border-4 border-[#9b641c] bg-white/35 p-4 md:p-6">
                  <h3 className="mb-4 text-2xl font-black text-[#4d2a08]">技能百科</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { id: 'whip', name: '藤刃斬擊', desc: '朝最近敵人揮出藤刃弧光，等級提升後能擴大斬擊壓制範圍。' },
                      { id: 'arrow', name: '靈魂彈', desc: '穿透性的藍綠箭矢，適合遠距離清線。' },
                      { id: 'wave', name: '震波斬', desc: '從腳下迸發大地震波，範圍壓制敵群。' },
                      { id: 'fireball', name: '螢焰火球', desc: '射出爆裂火球，擊中後帶有持續燃燒。' },
                      { id: 'garlic', name: '荊棘毒圈', desc: '在身周形成毒葉力場，抵禦近身敵人。' },
                      { id: 'orbit', name: '守護靈', desc: '環繞飛行的森林靈球，推開沿途敵人。' },
                      { id: 'pickup_range', name: '磁石引力', desc: '用磁石祝福吸引經驗晶石與補給。' },
                    ].map((w) => (
                      <div key={w.id} className="flex gap-3 rounded-[18px] border-4 border-[#b7832d] bg-[#fff3c8]/85 p-3">
                        <img src={getSkillArt(w.id)} alt="" className="h-16 w-16 shrink-0 object-contain md:h-20 md:w-20" />
                        <div className="min-w-0">
                          <div className="text-lg font-black text-[#4d2a08]">{w.name}</div>
                          <p className="mt-1 text-sm font-bold leading-relaxed text-[#735016]">{w.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[20px] border-4 border-[#9b641c] bg-white/35 p-4 md:p-6">
                  <h3 className="mb-4 text-2xl font-black text-[#4d2a08]">敵人圖鑑</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {enemyGuideEntries.map((enemy) => (
                      <div key={enemy.id} className="flex items-center gap-3 rounded-[18px] border-4 border-[#b7832d] bg-[#fff3c8]/85 p-3">
                        <img
                          src={getEnemyGuideArt(enemy.id)}
                          alt=""
                          className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_6px_8px_rgba(52,24,6,0.25)]"
                        />
                        <div className="min-w-0">
                          <div className="text-lg font-black text-[#4d2a08]">{enemy.name}</div>
                          <p className="mt-1 text-sm font-bold leading-relaxed text-[#735016]">{enemy.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState?.status === 'paused' && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-[#102312]/75 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-[28px] border-4 border-[#8c571b] bg-[#f8e3ae]/95 text-center shadow-[0_18px_40px_rgba(25,12,3,0.45)]">
            <header className="flex items-center justify-between border-b-4 border-[#b47a27] bg-[#285d2d] px-5 py-4 text-white">
              <div className="text-left">
                <h2 className="text-3xl font-black tracking-[0.08em] md:text-4xl">遊戲暫停</h2>
                <p className="text-xs font-bold tracking-[0.2em] text-[#e8f5a2]">森林守衛整備中</p>
              </div>
            </header>
            <div className="flex flex-col items-center gap-5 p-7">
              <div className="flex w-full items-center gap-3 rounded-[18px] border-4 border-[#b7832d] bg-[#fff3c8]/85 px-4 py-3">
                <IconButton
                  label={gameState.isMuted ? '開啟音量' : '關閉音量'}
                  src={gameState.isMuted ? generatedAssets.controls.volumeOff : generatedAssets.controls.volumeOn}
                  onClick={toggleMute}
                  className="h-11 w-11 shrink-0"
                />
                <div className="min-w-0 flex-1 text-left">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((gameState.volume ?? 1) * 100)}
                    onChange={(e) => updateVolume(Number(e.target.value) / 100)}
                    className="volume-slider w-full cursor-pointer"
                    aria-label="音量大小"
                    style={{
                      '--slider-track-bg': `linear-gradient(90deg, #5ca93c 0%, #6bc247 ${
                        Math.round((gameState.volume ?? 1) * 100)
                      }%, #4b2a0a ${Math.round((gameState.volume ?? 1) * 100)}%, #4b2a0a 100%)`,
                    } as React.CSSProperties}
                  />
                </div>
                <div className="w-10 text-right text-sm font-black text-[#4d2a08]">{Math.round((gameState.volume ?? 1) * 100)}%</div>
              </div>
              <ForestButton
                onClick={() => {
                  if (!engineInstance) return;
                  engineInstance.state.status = 'playing';
                  engineInstance.state.lastTime = performance.now();
                  engineInstance.onStateChange();
                }}
                className="w-full"
              >
                繼續遊戲
              </ForestButton>
              <ForestButton onClick={toggleGuide} variant="green" className="w-full">
                查看教學百科
              </ForestButton>
              <ForestButton
                onClick={() => {
                  if (!engineInstance) return;
                  engineInstance.state.status = 'menu';
                  engineInstance.onStateChange();
                }}
                variant="danger"
                className="w-full"
              >
                返回首頁
              </ForestButton>
            </div>
          </div>
        </div>
      )}

      {gameState?.status === 'gameover' && (
        <div
          className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-4"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(16,35,18,0.72), rgba(16,35,18,0.88)), url(${uiAssets.forestBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="w-full max-w-2xl rounded-[28px] border-4 border-[#8c571b] bg-[#f8e3ae]/95 p-7 text-center shadow-[0_18px_40px_rgba(25,12,3,0.45)] md:p-10">
            <h1 className="text-5xl font-black tracking-[0.08em] text-[#8a2d15] md:text-7xl">遊戲結束</h1>
            <p className="mt-3 text-sm font-bold tracking-[0.2em] text-[#668821] md:text-base">勇敢的守衛，下次再奪回林地</p>
            <div className="my-8 grid grid-cols-2 gap-4">
              <div className="rounded-[18px] border-4 border-[#b7832d] bg-[#fff3c8]/85 p-4">
                <div className="text-xs font-black tracking-[0.2em] text-[#6c8622]">生存時間</div>
                <div className="mt-2 text-3xl font-black text-[#4d2a08]">{formatTime(gameState.gameTime)}</div>
              </div>
              <div className="rounded-[18px] border-4 border-[#b7832d] bg-[#fff3c8]/85 p-4">
                <div className="text-xs font-black tracking-[0.2em] text-[#6c8622]">擊殺總數</div>
                <div className="mt-2 text-3xl font-black text-[#4d2a08]">{gameState.player.kills}</div>
              </div>
            </div>
            <ForestButton onClick={() => engineInstance?.reset(gameState.selectedCharacterId)}>重新挑戰</ForestButton>
          </div>
        </div>
      )}
    </div>
  );
}
