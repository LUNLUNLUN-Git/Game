export interface Vector2 { x: number; y: number; }

export interface Entity {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export interface Explosion {
  id: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

export interface VisualEffect {
  id: number;
  type: 'ultimate_knight' | 'ultimate_hunter' | 'ultimate_guard';
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  color: string;
  xpValue: number;
  knockback: Vector2;
  type: string;
  ignoreKnockback?: boolean;
  isBoss?: boolean;
  bossPhase?: number;
  burningTime?: number;
  burningDamage?: number;
  facing?: number; // 1 for right, -1 for left
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  level: number;
  xp: number;
  maxXp: number;
  pickupRadius: number;
  pickupMultiplier: number;
  areaMultiplier: number;
  kills: number;
  coins: number;
  damageMultiplier: number;
  screenShake: number;
  damageFlash: number;
  invulnTime: number;
  ultimateCharge: number;
  ultimateMaxCharge: number;
}

export interface Projectile extends Entity {
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  life: number;
  color: string;
  hitEnemies: Set<number>;
  weaponId: string;
  isAura?: boolean;
  isOrbit?: boolean;
  orbitAngle?: number;
  angle?: number;
}

export interface ExpGem extends Entity {
  amount: number;
  isAttracted: boolean;
  color: string;
}

export interface HealthItem extends Entity {
  healAmount: number;
  isAttracted: boolean;
}

export interface DamageText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  vx: number;
  vy: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  damage: number;
  cooldown: number; // ms
  lastFired: number;
  projectileSpeed: number;
  pierce: number;
  count: number;
  area: number;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  icon: string;
  startWeaponId: string;
}

export interface GameState {
  status: 'menu' | 'playing' | 'gameover' | 'levelup' | 'paused' | 'settings' | 'guide';
  selectedUpgradeIndex: number;
  player: Player;
  selectedCharacterId: string;
  enemies: Enemy[];
  projectiles: Projectile[];
  gems: ExpGem[];
  healthItems: HealthItem[];
  damageTexts: DamageText[];
  explosions: Explosion[];
  vfx: VisualEffect[];
  weapons: Record<string, WeaponDef>;
  activeWeapons: string[];
  gameTime: number; // ms
  lastTime: number; // ms
  camera: Vector2;
  viewport: { width: number; height: number };
  input: Vector2; // -1 to 1
  joystick: { active: boolean, origin: Vector2, current: Vector2 };
  entityIdCounter: number;
  availableUpgrades: UpgradeOption[];
  autoPlay: boolean;
  autoUpgrade: boolean;
  isMuted: boolean;
  volume: number;
}

export interface UpgradeOption {
  weaponId: string;
  name: string;
  description: string;
  isNew: boolean;
  level: number;
  icon: string;
  isSpecial?: boolean;
}
