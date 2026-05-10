import { Enemy, ExpGem, GameState, Player, Projectile, DamageText, Vector2, WeaponDef, UpgradeOption, Character } from './types';
import { audioManager } from './AudioManager';

const WORLD_SIZE = 4000;
const TILE_SIZE = 100;

const WEAPONS_DB: Record<string, Omit<WeaponDef, 'level' | 'lastFired'> & { exclusiveTo?: string }> = {
  fireball: {
    id: 'fireball', name: '螢焰火球', description: '射出後擊中敵人會爆成螢焰，高階帶有持續燃燒效果。',
    maxLevel: 8, damage: 30, cooldown: 1200, projectileSpeed: 700, pierce: 1, count: 1, area: 20
  },
  whip: {
    id: 'whip', name: '藤刃斬擊', description: '朝最近敵人的方向揮出藤刃扇形斬擊。等級2後增加後方攻擊。',
    maxLevel: 8, damage: 15, cooldown: 1047, projectileSpeed: 0, pierce: 999, count: 1, area: 163,
    exclusiveTo: 'knight'
  },
  garlic: {
    id: 'garlic', name: '荊棘毒圈', description: '身周形成荊棘毒葉力場，對靠近敵人造成持續傷害。',
    maxLevel: 8, damage: 3, cooldown: 100, projectileSpeed: 0, pierce: 999, count: 1, area: 63
  },
  orbit: {
    id: 'orbit', name: '守護靈', description: '在身邊環繞飛行的森林靈球，擊退路徑上的敵人。',
    maxLevel: 8, damage: 5, cooldown: 0, projectileSpeed: 2.4, pierce: 999, count: 2, area: 15
  },
  arrow: {
    id: 'arrow', name: '靈魂彈', description: '射出藍綠色穿透箭，對近處敵人造成更高傷害。',
    maxLevel: 8, damage: 16, cooldown: 600, projectileSpeed: 2250, pierce: 2, count: 1, area: 30,
    exclusiveTo: 'hunter'
  },
  wave: {
    id: 'wave', name: '震波斬', description: '以自身為中心喚起大地震波，越靠近中心傷害越高。',
    maxLevel: 8, damage: 12, cooldown: 1500, projectileSpeed: 0, pierce: 999, count: 1, area: 108,
    exclusiveTo: 'guard'
  },
  pickup_range: {
    id: 'pickup_range', name: '磁石引力', description: '召喚磁石祝福，增加晶石與補給的拾取距離。',
    maxLevel: 5, damage: 0, cooldown: 0, projectileSpeed: 0, pierce: 0, count: 0, area: 0
  }
};

export const CHARACTERS: Character[] = [
  { id: 'knight', name: '樹甲騎士', description: '藤蔓穿刺：舉劍喚醒地脈，讓數道藤蔓從地面刺出。', icon: '⚔️', startWeaponId: 'whip' },
  { id: 'hunter', name: '葉影獵手', description: '靈魂風暴：釋放葉影箭雨，全螢幕持續傷害。', icon: '🏹', startWeaponId: 'arrow' },
  { id: 'guard', name: '花冠守衛', description: '花冠震鳴：喚醒大地震波，阻擋敵人入侵。', icon: '🛡️', startWeaponId: 'wave' }
];

export class GameEngine {
  state: GameState;
  onStateChange: () => void;
  private facingRight = true;

  constructor(onStateChange: () => void) {
    this.onStateChange = onStateChange;
    this.state = this.getInitialState();
  }

  getInitialState(): GameState {
    const weapons: Record<string, WeaponDef> = {};
    for (const [key, value] of Object.entries(WEAPONS_DB)) {
      weapons[key] = { ...value, level: 0, lastFired: 0 };
    }

    return {
      status: 'menu',
      selectedUpgradeIndex: 0,
      player: { x: 0, y: 0, hp: 100, maxHp: 100, speed: 338, radius: 15, level: 1, xp: 0, maxXp: 42, pickupRadius: 80, pickupMultiplier: 1, areaMultiplier: 1, kills: 0, coins: 0, damageMultiplier: 1, screenShake: 0, damageFlash: 0, invulnTime: 0, ultimateCharge: 50, ultimateMaxCharge: 100 },
      selectedCharacterId: 'knight',
      enemies: [],
      projectiles: [],
      gems: [],
      healthItems: [],
      damageTexts: [],
      explosions: [],
      vfx: [],
      weapons,
      activeWeapons: [],
      gameTime: 0,
      lastTime: performance.now(),
      camera: { x: 0, y: 0 },
      viewport: { width: 1280, height: 720 },
      input: { x: 0, y: 0 },
      joystick: { active: false, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } },
      entityIdCounter: 1,
      availableUpgrades: [],
      autoPlay: false,
      autoUpgrade: false,
      isMuted: false,
      volume: 0.5
    };
  }

  reset(characterId: string = 'knight') {
    const preservedMuted = this.state.isMuted;
    const preservedVolume = this.state.volume;
    const newState = this.getInitialState();
    newState.status = 'playing';
    newState.selectedCharacterId = characterId;
    newState.isMuted = preservedMuted;
    newState.volume = preservedVolume;

    if (characterId === 'guard') {
        newState.player.pickupRadius *= 2;
    }
    
    // Set initial weapon based on character
    const char = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
    const baseWeapon = newState.weapons[char.startWeaponId];
    if (baseWeapon) {
      baseWeapon.level = 1;
      newState.activeWeapons = [char.startWeaponId];
    }

    this.state = newState;
    this.spawnInitialEnemies();
    this.onStateChange();
  }

  setInput(x: number, y: number) {
    this.state.input.x = x;
    this.state.input.y = y;
    if (x > 0) this.facingRight = true;
    if (x < 0) this.facingRight = false;
  }

  setViewport(width: number, height: number) {
    this.state.viewport.width = Math.max(1, width);
    this.state.viewport.height = Math.max(1, height);
  }

  update(currentTime: number) {
    if (this.state.status === 'levelup' && this.state.autoUpgrade) {
       this.autoSelectUpgrade();
       this.state.lastTime = currentTime;
       return;
    }

    if (this.state.status !== 'playing') {
      this.state.lastTime = currentTime;
      return;
    }

    const dt = (currentTime - this.state.lastTime) / 1000; // seconds
    this.state.lastTime = currentTime;
    this.state.gameTime += dt * 1000;

    this.updatePlayer(dt);
    this.updateAuras(dt);
    this.updateWeapons();
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateGems(dt);
    this.updateHealthItems(dt);
    this.updateDamageTexts(dt);
    this.updateExplosions(dt);
    this.updateVFX(dt);
    this.spawnEnemies();

    this.state.camera.x = this.state.player.x;
    this.state.camera.y = this.state.player.y;

    this.onStateChange();
  }

  private updatePlayer(dt: number) {
    const { player, input, autoPlay } = this.state;
    
    let speedMult = 1.0;

    if (autoPlay) {
      // Hyper-AI Logic (Top-tier AI performance)
      let targetX = 0;
      let targetY = 0;
      let hasTarget = false;

      // 1. Calculate Enemy Pressure
      let avoidX = 0;
      let avoidY = 0;
      let dangerCount = 0;
      let nearestEnemy = null;
      let minEnemyDist = Infinity;

      for (const e of this.state.enemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        const dangerRadius = e.isBoss ? 250 : 160;
        
        if (d < dangerRadius) {
          const weight = Math.pow((dangerRadius - d) / dangerRadius, 2); // Quadratic danger weight
          avoidX += (player.x - e.x) * weight;
          avoidY += (player.y - e.y) * weight;
          dangerCount++;
        }
        if (d < minEnemyDist) {
          minEnemyDist = d;
          nearestEnemy = e;
        }
      }

      // 2. Risk/Reward Assessment
      const hpPercent = player.hp / player.maxHp;
      const isHealthy = hpPercent > 0.75;
      const isWeak = hpPercent < 0.35;
      const riskTolerance = isHealthy ? 1.5 : (isWeak ? 0.4 : 1.0);

      // 3. Gem & Item Prioritization
      let bestItem = null;
      let maxScore = -Infinity;

      // Health items priority
      for (const h of this.state.healthItems) {
        const d = Math.hypot(h.x - player.x, h.y - player.y);
        const score = (1000 / (d + 20)) * (1 - hpPercent) * 50; 
        if (score > maxScore) {
          maxScore = score;
          bestItem = h;
        }
      }

      // Gems priority
      for (const g of this.state.gems) {
        const d = Math.hypot(g.x - player.x, g.y - player.y);
        const valueMult = g.amount > 500 ? 50 : (g.amount > 10 ? 5 : 1);
        const score = (500 / (d + 50)) * valueMult * riskTolerance;
        if (score > maxScore) {
          maxScore = score;
          bestItem = g;
        }
      }

      // 4. Combat Aggression
      if (nearestEnemy && !bestItem && dangerCount < 3) {
          const dx = nearestEnemy.x - player.x;
          const dy = nearestEnemy.y - player.y;
          if (minEnemyDist > 120) {
              targetX += dx * 0.4;
              targetY += dy * 0.4;
              hasTarget = true;
          }
      }

      // 5. Action Synthesis
      if (bestItem) {
          const dx = bestItem.x - player.x;
          const dy = bestItem.y - player.y;
          const attractionLevel = (maxScore > 500) ? 2.5 : 1.2;
          targetX += dx * attractionLevel;
          targetY += dy * attractionLevel;
          hasTarget = true;
          
          // SPEED BOOST: If we are very focused on a high-value item, move faster
          if (maxScore > 1000) speedMult = 1.35;
      }

      // Apply avoidance with risk factor
      if (dangerCount > 0) {
          const avoidFactor = riskTolerance < 1.0 ? 3.0 : 1.5;
          targetX += avoidX * avoidFactor;
          targetY += avoidY * avoidFactor;
          hasTarget = true;
          
          // Evasive maneuvers speed boost
          if (dangerCount > 5) speedMult = 1.2;
      }

      if (hasTarget) {
        const len = Math.hypot(targetX, targetY);
        if (len > 0) {
          const desiredX = targetX / len;
          const desiredY = targetY / len;
          
          // Adaptive Smoothing
          const lerpFactor = speedMult > 1.2 ? 0.3 : 0.18;
          input.x += (desiredX - input.x) * lerpFactor;
          input.y += (desiredY - input.y) * lerpFactor;
        }
      } else {
        input.x *= 0.85;
        input.y *= 0.85;
      }
    }

    const len = Math.hypot(input.x, input.y);
    let vx = input.x;
    let vy = input.y;
    if (len > 1) { vx /= len; vy /= len; }
    
    player.x += vx * player.speed * speedMult * dt;
    player.y += vy * player.speed * speedMult * dt;

    // Charge ultimate over time (5 units per second = 20s cooldown)
    player.ultimateCharge = Math.min(player.ultimateMaxCharge, player.ultimateCharge + dt * 5);
    // Ensure accurate 20s: 100/5 = 20. Current code is correct but making it explicit:
    // if (player.ultimateMaxCharge === 100) then dt * 5 is exactly 1/20 of 100 per sec.

    if (player.hp <= 0) {
      this.state.status = 'gameover';
    }

    if (player.screenShake > 0) player.screenShake -= dt;
    if (player.damageFlash > 0) player.damageFlash -= dt;
    if (player.invulnTime > 0) player.invulnTime -= dt;
  }

  private updateAuras(dt: number) {
    const p = this.state.player;
    const garlic = this.state.weapons['garlic'];
    if (garlic && garlic.level > 0) {
      const radius = garlic.area * p.areaMultiplier;
      // Damage every 0.2s
      if (!this.state.gameTime || Math.floor(this.state.gameTime / 200) !== Math.floor((this.state.gameTime - dt*1000) / 200)) {
        for (const e of this.state.enemies) {
          const dist = Math.hypot(e.x - p.x, e.y - p.y);
          if (dist <= radius) {
            this.damageEnemy(e, garlic.damage * p.damageMultiplier);
          }
        }
      }
      
      // Ensure visual aura exists
      let aura = this.state.projectiles.find(pr => pr.weaponId === 'garlic' && pr.isAura);
      if (!aura) {
        this.state.projectiles.push({
          id: this.state.entityIdCounter++, x: p.x, y: p.y, radius: radius,
          vx: 0, vy: 0, color: 'rgba(34, 197, 94, 0.2)', damage: 0, life: 999999, pierce: 0,
          hitEnemies: new Set(), weaponId: 'garlic', isAura: true
        });
      } else {
        aura.radius = radius;
        aura.x = p.x;
        aura.y = p.y;
      }
    } else {
      const idx = this.state.projectiles.findIndex(pr => pr.weaponId === 'garlic' && pr.isAura);
      if (idx !== -1) this.state.projectiles.splice(idx, 1);
    }
  }

  useUltimate() {
    const p = this.state.player;
    if (p.ultimateCharge < p.ultimateMaxCharge) return;
    if (this.state.status !== 'playing') return;

    p.ultimateCharge = 0;
    const cid = this.state.selectedCharacterId;
    
    // Play a screen shake and flash
    p.screenShake = 1.0;
    p.damageFlash = 0.2;

    if (cid === 'knight') {
      // Vine impale: keep the same clear-screen damage, replace the presentation with ground vines.
      audioManager.playKnightUltimate();
      this.state.vfx.push({ id: this.state.entityIdCounter++, type: 'ultimate_knight', x: p.x, y: p.y, life: 0.82, maxLife: 0.82 });
      for (const e of this.state.enemies) {
        this.damageEnemy(e, 200 * p.damageMultiplier);
      }
    } else if (cid === 'hunter') {
      // Soul Storm: Massive DoT for 2.1 seconds (0.7x duration)
      const stormDuration = 2.1;
      this.state.vfx.push({ id: this.state.entityIdCounter++, type: 'ultimate_hunter', x: p.x, y: p.y, life: stormDuration, maxLife: stormDuration });
      const intervalId = setInterval(() => {
        if (this.state.status !== 'playing') {
          clearInterval(intervalId);
          return;
        }
        for (const e of this.state.enemies) {
          this.damageEnemy(e, 15 * p.damageMultiplier);
        }
      }, 200);
      setTimeout(() => clearInterval(intervalId), stormDuration * 1000);
    } else if (cid === 'guard') {
      // Fortress Burst: Expanding shockwave
      const ultimateLife = 1.5;
      this.state.vfx.push({ id: this.state.entityIdCounter++, type: 'ultimate_guard', x: p.x, y: p.y, life: ultimateLife, maxLife: ultimateLife });
      
      const interval = setInterval(() => {
          if (this.state.status !== 'playing' || !this.state.vfx.some(v => v.type === 'ultimate_guard')) {
              clearInterval(interval);
              return;
          }
          const vfx = this.state.vfx.find(v => v.type === 'ultimate_guard');
          if (!vfx) return;
          
          const ratio = 1 - (vfx.life / vfx.maxLife);
          const currentRadius = 1200 * ratio; // Expands to 1200 radius
          
          for (const e of this.state.enemies) {
              const dx = e.x - p.x;
              const dy = e.y - p.y;
              const dist = Math.hypot(dx, dy) || 1;
              // Only hit enemies near the edge of the expanding wave
              if (dist < currentRadius && dist > currentRadius - 150) {
                  this.damageEnemy(e, 150 * p.damageMultiplier);
                  e.knockback.x = (dx / dist) * 1000;
                  e.knockback.y = (dy / dist) * 1000;
              }
          }
      }, 100);
      setTimeout(() => clearInterval(interval), ultimateLife * 1000);
    }
    
    this.onStateChange();
  }

  cheatAddMinute() {
    if (this.state.status !== 'playing') return;
    this.state.gameTime += 60000;
    this.onStateChange();
  }

  cheatLevelUp() {
    if (this.state.status !== 'playing') return;
    this.state.player.xp = this.state.player.maxXp;
    this.levelUp();
    this.onStateChange();
  }

  private updateWeapons() {
    for (const weaponId of this.state.activeWeapons) {
      const weapon = this.state.weapons[weaponId];
      if (weapon.lastFired === undefined) weapon.lastFired = 0;
      
      let cooldown = weapon.cooldown;
      
      // Guardian speed logic: 1.5x base speed
      if (weaponId === 'wave') {
          cooldown /= 1.5;
      }

      // Knight speed logic: cooldown reduces by 5% per level
      if (this.state.selectedCharacterId === 'knight' && weaponId === 'whip') {
          cooldown = cooldown * Math.pow(0.95, weapon.level - 1);
      }

      // Hunter proximity speed logic
      if (this.state.selectedCharacterId === 'hunter' && weaponId === 'arrow') {
          const nearest = this.getNearestEnemy();
          if (nearest) {
              const dist = Math.hypot(nearest.x - this.state.player.x, nearest.y - this.state.player.y);
              // Max boost at distance 50 (4x), Base speed (0.25x) at 350+
              const factor = Math.max(0.25, Math.min(4, 4.5 - (dist / 100))); 
              cooldown = cooldown / factor;
          } else {
              cooldown = cooldown / 0.25;
          }
      }

      if (this.state.gameTime - weapon.lastFired >= cooldown) {
        this.fireWeapon(weapon);
        weapon.lastFired = this.state.gameTime;
      }
    }
  }

  private getNearestEnemy(): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of this.state.enemies) {
      const dist = Math.hypot(e.x - this.state.player.x, e.y - this.state.player.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }

  private getWeaponAngleToNearestEnemy(p: Player): number {
    const target = this.getNearestEnemy();
    if (target) {
       return Math.atan2(target.y - p.y, target.x - p.x);
    }
    return this.facingRight ? 0 : Math.PI;
  }

  private fireWeapon(w: WeaponDef) {
    const p = this.state.player;
    const areaScale = p.areaMultiplier;

    if (w.id === 'fireball') {
      audioManager.playShootFireball();
      const target = this.getNearestEnemy();
      if (!target) return;
      
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      
      for (let i = 0; i < w.count; i++) {
        const offsetAngle = (Math.random() - 0.5) * 0.2;
        const angle = Math.atan2(dy, dx) + offsetAngle;
        this.state.projectiles.push({
          id: this.state.entityIdCounter++, x: p.x, y: p.y, radius: w.area * areaScale * 0.8,
          vx: Math.cos(angle) * w.projectileSpeed, vy: Math.sin(angle) * w.projectileSpeed,
          color: '#fb923c', damage: w.damage * p.damageMultiplier, life: 3, pierce: w.pierce,
          hitEnemies: new Set(), weaponId: w.id
        });
      }
    } else if (w.id === 'whip') {
      audioManager.playShootWhip();
      const angle = this.getWeaponAngleToNearestEnemy(p);
      const spawnDist = 60 * areaScale;
      
      this.state.projectiles.push({
        id: this.state.entityIdCounter++, 
        x: p.x + Math.cos(angle) * spawnDist, 
        y: p.y + Math.sin(angle) * spawnDist, 
        radius: (w.area + 15) * areaScale,
        vx: 0, vy: 0, color: '#b8f646', damage: w.damage * p.damageMultiplier, life: 0.25, pierce: w.pierce,
        hitEnemies: new Set(), weaponId: w.id, angle: angle
      });
      
      if (w.level >= 2) {
        const backAngle = angle + Math.PI;
        this.state.projectiles.push({
          id: this.state.entityIdCounter++, 
          x: p.x + Math.cos(backAngle) * spawnDist, 
          y: p.y + Math.sin(backAngle) * spawnDist, 
          radius: (w.area + 15) * areaScale,
          vx: 0, vy: 0, color: '#b8f646', damage: w.damage * p.damageMultiplier, life: 0.25, pierce: w.pierce,
          hitEnemies: new Set(), weaponId: w.id, angle: backAngle
        });
      }
    } else if (w.id === 'garlic') {
       // Continuous aura logic is in updateAuras now
    } else if (w.id === 'fireball') {
      audioManager.playShootFireball();
      const target = this.getNearestEnemy();
      if (!target) return;
      
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      
      for (let i = 0; i < w.count; i++) {
        const offsetAngle = (Math.random() - 0.5) * 0.2;
        const angle = Math.atan2(dy, dx) + offsetAngle;
        this.state.projectiles.push({
          id: this.state.entityIdCounter++, x: p.x, y: p.y, radius: w.area * areaScale * 0.8,
          vx: Math.cos(angle) * w.projectileSpeed, vy: Math.sin(angle) * w.projectileSpeed,
          color: '#fb923c', damage: w.damage * p.damageMultiplier, life: 3, pierce: w.pierce,
          hitEnemies: new Set(), weaponId: w.id
        });
      }
    } else if (w.id === 'orbit') {
      const count = Math.min(5, w.count + Math.floor((w.level - 1) / 2));
      const orbitRadius = 100 * areaScale;
      // Change color based on level
      const colors = ['#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490'];
      const orbitColor = colors[Math.min(w.level - 1, colors.length - 1)];
      
      // Ensure we have exactly 'count' orbit projectiles
      let currentOrbits = this.state.projectiles.filter(p => p.weaponId === 'orbit');
      
      if (currentOrbits.length !== count) {
          // Clear and recreate if count changed
          this.state.projectiles = this.state.projectiles.filter(p => p.weaponId !== 'orbit');
          for (let i = 0; i < count; i++) {
              this.state.projectiles.push({
                  id: this.state.entityIdCounter++, x: p.x, y: p.y, radius: w.area * areaScale,
                  vx: 0, vy: 0, color: orbitColor, damage: w.damage * p.damageMultiplier, life: 99999, pierce: w.pierce,
                  hitEnemies: new Set(), weaponId: w.id, isOrbit: true, orbitAngle: (i * Math.PI * 2 / count)
              });
          }
      } else {
          // Update colors and damage of existing ones
          for(const o of currentOrbits) {
              o.color = orbitColor;
              o.damage = w.damage * p.damageMultiplier;
              o.radius = w.area * areaScale;
          }
      }
    } else if (w.id === 'arrow') {
      audioManager.playShootArrow();
      const count = w.level; // Fires 1 bullet per level
      const enemies = [...this.state.enemies]
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
          .slice(0, count + 5);

      for (let i = 0; i < count; i++) {
        const target = enemies[i % enemies.length];
        if (!target) break;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        this.state.projectiles.push({
          id: this.state.entityIdCounter++, x: p.x, y: p.y, radius: w.area * areaScale,
          vx: (dx / dist) * w.projectileSpeed, vy: (dy / dist) * w.projectileSpeed,
          color: '#2dd4bf', damage: w.damage * p.damageMultiplier, life: 1, pierce: w.pierce,
          hitEnemies: new Set(), weaponId: w.id
        });
      }
    } else if (w.id === 'wave') {
      audioManager.playShootWhip();
      this.state.projectiles.push({
        id: this.state.entityIdCounter++, x: p.x, y: p.y, radius: w.area * 1.5 * areaScale,
        vx: 0, vy: 0, color: 'rgba(56, 189, 248, 0.7)', damage: w.damage * p.damageMultiplier, life: 0.4, pierce: 999,
        hitEnemies: new Set(), weaponId: w.id, isAura: true, angle: 0
      });
      // Shockwave instant hit
      for (const e of this.state.enemies) {
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const dist = Math.hypot(dx, dy);
          const radius = w.area * 1.5 * areaScale;
          if (dist <= radius + e.radius) {
              const falloff = 1 - (dist / radius) * 0.5; // Max 50% reduction at max range
              this.damageEnemy(e, w.damage * p.damageMultiplier * falloff);
          }
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const p = this.state.projectiles[i];
      if (p.isAura) {
        p.x = this.state.player.x;
        p.y = this.state.player.y;
      } else if (p.isOrbit) {
          const w = this.state.weapons[p.weaponId];
          const radiusBase = p.weaponId === 'orbit' ? 72 : 100;
          const radiusIncr = p.weaponId === 'orbit' ? 10 : 8;
          const radiusMult = radiusBase + (w.level - 1) * radiusIncr;
          const orbitRadius = radiusMult * this.state.player.areaMultiplier;
          const time = this.state.gameTime / 1000;
          const speedFactor = p.weaponId === 'garlic' ? 1.5 : 2.4;
          const angle = time * speedFactor + (p.orbitAngle || 0);
          
          p.x = this.state.player.x + Math.cos(angle) * orbitRadius;
          p.y = this.state.player.y + Math.sin(angle) * orbitRadius;

          // Clear hit enemies list periodically to allow multi-hits
          const tick = p.weaponId === 'garlic' ? 150 : 500;
          if (Math.floor(this.state.gameTime / tick) !== Math.floor((this.state.gameTime - dt*1000) / tick)) {
              p.hitEnemies.clear();
          }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      p.life -= dt;

      // Collisions
      if (p.damage > 0) {
        for (const e of this.state.enemies) {
          if (p.hitEnemies.has(e.id)) continue;

          let isHit = false;
          if (p.weaponId === 'wave') {
            const rotation = ((0.4 - p.life) / 0.4) * Math.PI * 2;
            const length = p.radius;
            const dist = Math.hypot(e.x - p.x, e.y - p.y);
            if (dist <= length + e.radius) {
              const targetAngle = Math.atan2(e.y - p.y, e.x - p.x);
              const normRot = ((rotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
              const normTarget = ((targetAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
              let diff = Math.abs(normRot - normTarget);
              if (diff > Math.PI) diff = Math.PI * 2 - diff;
              if (diff <= 0.4) isHit = true; 
            }
          } else {
            if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius + e.radius) {
              isHit = true;
            }
          }

          if (isHit) {
            if (p.weaponId === 'fireball') {
              this.createExplosion(p.x, p.y, 60 * this.state.player.areaMultiplier, p.damage * 0.5, p.weaponId);
            }
            if (p.weaponId === 'arrow') {
              // Arrow Splash: Small area hit
              for (const other of this.state.enemies) {
                if (other.id === e.id) continue;
                if (Math.hypot(other.x - e.x, other.y - e.y) < 30) {
                  this.damageEnemy(other, p.damage * 0.4);
                }
              }
            }
            p.hitEnemies.add(e.id);
            this.damageEnemy(e, p.damage);
            audioManager.playEnemyHit();
            p.pierce--;
            if (p.pierce <= 0) {
              p.life = 0;
              break;
            }
          }
        }
      }

      if (p.life <= 0) {
        this.state.projectiles.splice(i, 1);
      }
    }
  }

  private createExplosion(x: number, y: number, radius: number, damage: number, weaponId: string) {
    const finalRadius = radius * 0.7;
    const finalDamage = damage * 1.5;

    this.state.explosions.push({
      id: this.state.entityIdCounter++,
      x, y, radius: finalRadius, life: 0.3, maxLife: 0.3, color: '#fb923c'
    });

    const p = this.state.player;
    const fireball = this.state.weapons['fireball'];
    const isBurning = fireball && fireball.level >= 4;

    for (const e of this.state.enemies) {
      if (Math.hypot(e.x - x, e.y - y) <= finalRadius + e.radius) {
        this.damageEnemy(e, finalDamage);
        if (isBurning) {
          e.burningTime = 3;
          e.burningDamage = finalDamage * 0.2;
        }
      }
    }
  }

  private damageEnemy(e: Enemy, amount: number) {
    let finalDamage = amount;
    
    // Proximity Damage for Arrows (closer = more damage, up to 2x)
    const arrowProj = this.state.projectiles.find(pr => pr.weaponId === 'arrow' && pr.hitEnemies.has(e.id));
    if (arrowProj) {
        const distToPlayer = Math.hypot(e.x - this.state.player.x, e.y - this.state.player.y);
        const bonusFraction = Math.max(0, 1 - (distToPlayer / 350)); // 1.0 at 0 dist, 0.0 at 350 dist
        finalDamage *= (1 + bonusFraction); // multiplier 1.0 to 2.0
    }

    e.hp -= finalDamage;
    
    // Knockback
    const dx = e.x - this.state.player.x;
    const dy = e.y - this.state.player.y;
    const dist = Math.hypot(dx, dy) || 1;
    
    // Slightly less knockback for red enemies
    let kbForce = e.color === '#991b1b' ? 100 : 150;

    // Guard knockback reduction and proximity scaling
    if (this.state.selectedCharacterId === 'guard') {
        const bonus = Math.max(0, 1 - (dist / 200)) * 3; // Up to 4x total at very close range
        kbForce = (kbForce / 4) * (1 + bonus);
    }

    // Knight Whip (whip) half knockback
    if (this.state.projectiles.find(pr => pr.weaponId === 'whip' && pr.hitEnemies.has(e.id))) {
        kbForce *= 0.5;
    }
    
    // Half knockback for Golem and Red Oni
    if (e.type === '石魔' || e.type === '苔岩守衛' || e.type === '肉盾精英' || e.type === '荊刺猛衛') {
        kbForce *= 0.5;
    }
    
    // Low knockback for hunters
    if (this.state.projectiles.find(p => p.hitEnemies.has(e.id))?.weaponId === 'arrow') {
        kbForce = 40; 
    }
    
    e.knockback.x = (dx / dist) * kbForce;
    e.knockback.y = (dy / dist) * kbForce;

    this.state.damageTexts.push({
      id: this.state.entityIdCounter++,
      x: e.x + (Math.random()-0.5)*10, y: e.y - 10,
      text: Math.ceil(finalDamage).toString(),
      life: 0.5, maxLife: 0.5,
      color: '#fff',
      vx: (Math.random()-0.5)*50,
      vy: -50
    });

      if (e.hp <= 0) {
      audioManager.playEnemyDeath();
      this.state.explosions.push({
        id: this.state.entityIdCounter++,
        x: e.x, y: e.y, radius: e.radius * 1.5,
        life: 0.3, maxLife: 0.3, color: e.color
      });

      // Drop health item with low chance
      if (Math.random() < 0.05) {
        this.state.healthItems.push({
          id: this.state.entityIdCounter++,
          x: e.x, y: e.y, radius: 8, healAmount: this.state.player.maxHp * 0.2,
          isAttracted: false
        });
      }

      if (e.isBoss) {
          // Boss drops a legendary mega gem instead of instant level up
          this.state.gems.push({
            id: this.state.entityIdCounter++, x: e.x, y: e.y, radius: 12, amount: 9999, isAttracted: false, color: '#facc15'
          });
      } else if (Math.random() < 0.8) { // 80% chance to drop gem
        let amount = e.xpValue;
        let color = '#34d399';
        if (amount > 5) color = '#60a5fa';
        if (amount > 20) color = '#f87171';
        this.state.gems.push({
          id: this.state.entityIdCounter++, x: e.x, y: e.y, radius: 5, amount, isAttracted: false, color
        });
      }
      this.state.player.kills++;
    }
  }

  private spawnBoss(mins: number) {
    const { x: px, y: py } = this.getOffscreenSpawnPoint(260);

    const hp = 500 + mins * 1000;
    this.state.enemies.push({
      id: this.state.entityIdCounter++,
      type: '森林領主',
      x: px, y: py,
      hp: hp * 0.82, maxHp: hp * 0.82, speed: 40, damage: 22, radius: 45, color: '#facc15', xpValue: 400,
      knockback: { x: 0, y: 0 },
      isBoss: true,
      bossPhase: 1,
      ignoreKnockback: true
    });
  }

  private spawnInitialEnemies() {
    const isMobileViewport = this.state.viewport.width <= 640;
    const initialCount = isMobileViewport ? 20 : 16;
    const angleOffset = Math.random() * Math.PI * 2;
    const halfDiagonal = Math.hypot(this.state.viewport.width, this.state.viewport.height) / 2;

    for (let i = 0; i < initialCount; i++) {
      const angle = angleOffset + (i / initialCount) * Math.PI * 2;
      const edgeWeighted = i >= Math.floor(initialCount * 0.4);
      const dist = edgeWeighted
        ? Math.max(280, halfDiagonal * 0.62) + Math.random() * Math.max(140, halfDiagonal * 0.16)
        : 190 + Math.random() * 190;
      const x = this.state.player.x + Math.cos(angle) * dist;
      const y = this.state.player.y + Math.sin(angle) * dist;

      this.state.enemies.push({
        id: this.state.entityIdCounter++,
        type: '芽苗史萊姆',
        x,
        y,
        hp: 10,
        maxHp: 10,
        speed: 46,
        damage: 4,
        radius: 12,
        color: '#16a34a',
        xpValue: 1,
        knockback: { x: 0, y: 0 },
        ignoreKnockback: false,
        facing: x >= this.state.player.x ? -1 : 1,
      });
    }
  }

  private getOffscreenSpawnPoint(extraPadding = 180) {
    const angle = Math.random() * Math.PI * 2;
    const halfDiagonal = Math.hypot(this.state.viewport.width, this.state.viewport.height) / 2;
    const dist = halfDiagonal + extraPadding + Math.random() * 160;
    return {
      x: this.state.player.x + Math.cos(angle) * dist,
      y: this.state.player.y + Math.sin(angle) * dist,
    };
  }

  private updateEnemies(dt: number) {
    const { player, enemies } = this.state;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hp <= 0) {
        enemies.splice(i, 1);
        continue;
      }

      // Optimize: Remove enemies that are too far (e.g., > 1000px)
      const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
      if (distToPlayer > 1000 && !e.isBoss) {
        enemies.splice(i, 1);
        continue;
      }

      // Handle burning
      if (e.burningTime && e.burningTime > 0) {
        e.burningTime -= dt;
        if (Math.floor(this.state.gameTime / 500) !== Math.floor((this.state.gameTime - dt*1000) / 500)) {
           this.damageEnemy(e, e.burningDamage || 1);
        }
      }

      // Boss behavior
      if (e.isBoss) {
        if (!e.bossPhase) e.bossPhase = 0;
        e.bossPhase += dt; // Reuse as timer
        if (e.bossPhase >= 4) {
            e.bossPhase = 0;
            // Boss shots
            for (let j = 0; j < 12; j++) {
                const angle = (j / 12) * Math.PI * 2;
                this.state.projectiles.push({
                    id: this.state.entityIdCounter++, x: e.x, y: e.y, radius: 10,
                    vx: Math.cos(angle) * 150, vy: Math.sin(angle) * 150,
                    color: '#f59e0b', damage: e.damage, life: 5, pierce: 1,
                    hitEnemies: new Set(), weaponId: 'boss_shot'
                });
            }
        }
      }

      // Knockback integration
      if (!e.ignoreKnockback && (Math.abs(e.knockback.x) > 1 || Math.abs(e.knockback.y) > 1)) {
        e.x += e.knockback.x * dt;
        e.y += e.knockback.y * dt;
        // Smooth knockback decay: decrease force linearly or more naturally
        const decay = 2.0; // Total stop roughly in 0.5s if force is 1
        e.knockback.x -= (e.knockback.x * decay) * dt;
        e.knockback.y -= (e.knockback.y * decay) * dt;
      } else {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        // Update facing
        if (dx !== 0) e.facing = dx > 0 ? 1 : -1;
        
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      }

      // Separate overlapping enemies slightly
      for (const other of enemies) {
        if (other.id === e.id) continue;
        const distSq = (e.x - other.x)**2 + (e.y - other.y)**2;
        const minSpace = e.radius + other.radius;
        if (distSq < minSpace*minSpace && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (minSpace - dist) / dist * 0.5;
            e.x += (e.x - other.x) * force;
            e.y += (e.y - other.y) * force;
        }
      }

      // Damage player
      if (player.invulnTime <= 0) {
        const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
        if (distToPlayer < e.radius + player.radius) {
           player.hp -= Math.max(1, e.damage); // take burst damage
           player.invulnTime = 0.5; // half second invuln
           player.screenShake = 0.3;
           player.damageFlash = 0.15;
           audioManager.playPlayerDamage();
        }
      }
    }
  }

  private updateGems(dt: number) {
    const p = this.state.player;
    for (let i = this.state.gems.length - 1; i >= 0; i--) {
      const gem = this.state.gems[i];
      const dx = p.x - gem.x;
      const dy = p.y - gem.y;
      const dist = Math.hypot(dx, dy);

      if (dist < p.pickupRadius) {
        gem.isAttracted = true;
      }

      if (gem.isAttracted) {
        // Aggressive acceleration: the closer it is, the faster it flies
        const speed = Math.max(400, 1000 - dist);
        gem.x += (dx / Math.max(dist, 1)) * speed * dt;
        gem.y += (dy / Math.max(dist, 1)) * speed * dt;
      }

      if (dist < p.radius + gem.radius) {
        audioManager.playXpPickup();
        this.addXp(gem.amount);
        this.state.gems.splice(i, 1);
      }
    }
  }

  private updateHealthItems(dt: number) {
    const p = this.state.player;
    for (let i = this.state.healthItems.length - 1; i >= 0; i--) {
      const item = this.state.healthItems[i];
      const dx = p.x - item.x;
      const dy = p.y - item.y;
      const dist = Math.hypot(dx, dy);

      if (dist < p.pickupRadius * p.pickupMultiplier) {
        item.isAttracted = true;
      }

      if (item.isAttracted) {
        const speed = Math.max(400, 1000 - dist);
        item.x += (dx / Math.max(dist, 1)) * speed * dt;
        item.y += (dy / Math.max(dist, 1)) * speed * dt;
      }

      if (dist < p.radius + item.radius) {
        p.hp = Math.min(p.maxHp, p.hp + item.healAmount);
        this.state.healthItems.splice(i, 1);
        // Reuse XP sound or add a heal sound later (using XP for now context)
        audioManager.playXpPickup();
      }
    }
  }

  private addXp(amount: number) {
    // Large gem from boss logic: cap at maxXp to force exactly one level up per mega gem
    if (amount > 1000) {
        this.state.player.xp = this.state.player.maxXp;
    } else {
        this.state.player.xp += amount;
    }
    
    // Use while to handle rapid level ups or multi-level gems correctly
    while (this.state.player.xp >= this.state.player.maxXp && this.state.status === 'playing') {
      this.levelUp();
    }
  }

  private levelUp() {
    this.state.player.level++;
    this.state.player.xp -= this.state.player.maxXp;
    
    // Slow down XP scaling at higher levels
    if (this.state.player.level < 20) {
        this.state.player.maxXp = Math.floor(this.state.player.maxXp * 1.42);
    } else {
        this.state.player.maxXp += 500 + this.state.player.level * 50;
    }
    
    this.state.status = 'levelup';
    
    // Choose 3 random upgrades
    const options: UpgradeOption[] = [];
    const pool = Object.values(this.state.weapons).filter(w => {
        if (w.level >= w.maxLevel) return false;
        // Check character exclusivity
        const weaponDef = w as any;
        if (weaponDef.exclusiveTo && weaponDef.exclusiveTo !== this.state.selectedCharacterId) return false;
        return true;
    });
    
    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const icons: Record<string, string> = {
      'whip': '⚔️',
      'wand': '🪄',
      'garlic': '☣️',
      'fireball': '🔥',
      'orbit': '🔮',
      'arrow': '🏹',
      'wave': '🔵',
      'pickup_range': '🧲',
      'area_up': '廣'
    };

    for (let i = 0; i < Math.min(3, pool.length); i++) {
        const w = pool[i];
        options.push({
            weaponId: w.id,
            name: w.name,
            description: w.level === 0 ? w.description : `提升等級至 ${w.level + 1}`,
            isNew: w.level === 0,
            level: w.level + 1,
            icon: icons[w.id] || '裝',
            isSpecial: !!(w as any).exclusiveTo
        });
    }

    if (options.length > 0) {
        audioManager.playLevelUp();
        this.state.availableUpgrades = options;
        this.state.selectedUpgradeIndex = 0;
        this.state.status = 'levelup';
    } else {
        // No upgrades available, just close level up
        this.state.status = 'playing';
        this.state.lastTime = performance.now();
    }
  }

  selectUpgrade(index: number) {
    if (this.state.status !== 'levelup') return;
    const opt = this.state.availableUpgrades[index];
    if (opt) {
        const p = this.state.player;
        const w = this.state.weapons[opt.weaponId];
        w.level++;
        if (opt.isNew) {
            this.state.activeWeapons.push(opt.weaponId);
        }

        // Apply scale up
        if (opt.weaponId === 'pickup_range') {
          p.pickupRadius += 30; // Direct increase
          p.pickupMultiplier += 0.15;
        } else if (opt.weaponId === 'area_up') {
          p.areaMultiplier += 0.1;
        } else {
            // Lower damage multiplier for arrow
            const damageScale = opt.weaponId === 'arrow' ? 1.15 : 1.25;
            w.damage *= damageScale;
            
            if (w.id === 'whip' || w.id === 'fireball' || w.id === 'wand' || w.id === 'arrow') {
              if (w.level % 2 === 0) w.count++;
            }
            if (w.id === 'garlic' || w.id === 'wave') w.area *= 1.15;
            if (w.id === 'orbit') w.area *= 1.08;
            w.cooldown *= 0.95;
        }
    }
    this.state.status = 'playing';
    this.state.lastTime = performance.now(); // avoid dt jump
    this.onStateChange();
  }

  autoSelectUpgrade() {
    if (this.state.status !== 'levelup' || this.state.availableUpgrades.length === 0) return;
    
    let bestIndex = 0;
    let maxScore = -1;
    
    this.state.availableUpgrades.forEach((opt, idx) => {
        let score = 0;
        const weapon = this.state.weapons[opt.weaponId];
        
        // Heuristic for "best"
        if (opt.isSpecial) score += 200; // Character-specific weapon is high priority
        if (!opt.isNew) score += 100 + weapon.level * 10; // High level weapons preferred
        if (opt.weaponId === 'area_up') score += 50; 
        
        // Base weight based on weapon "power" feel
        const weights: Record<string, number> = {
            'fireball': 40,
            'whip': 60,
            'arrow': 55,
            'wave': 50,
            'orbit': 45,
            'garlic': 35,
            'pickup_range': 20
        };
        score += weights[opt.weaponId] || 0;

        if (score > maxScore) {
            maxScore = score;
            bestIndex = idx;
        }
    });

    this.selectUpgrade(bestIndex);
  }

  private updateDamageTexts(dt: number) {
    for (let i = this.state.damageTexts.length - 1; i >= 0; i--) {
      const dtText = this.state.damageTexts[i];
      dtText.x += dtText.vx * dt;
      dtText.y += dtText.vy * dt;
      dtText.life -= dt;
      if (dtText.life <= 0) {
        this.state.damageTexts.splice(i, 1);
      }
    }
  }

  private updateVFX(dt: number) {
    for (let i = this.state.vfx.length - 1; i >= 0; i--) {
      const v = this.state.vfx[i];
      v.life -= dt;
      if (v.life <= 0) this.state.vfx.splice(i, 1);
    }
  }

  private updateExplosions(dt: number) {
    for (let i = this.state.explosions.length - 1; i >= 0; i--) {
        const exp = this.state.explosions[i];
        exp.life -= dt;
        if (exp.life <= 0) {
            this.state.explosions.splice(i, 1);
        }
    }
  }

  private spawnEnemies() {
    const mins = this.state.gameTime / 60000;
    // Check for Boss spawn at 3 mins
    const hasBoss = this.state.enemies.some(e => e.isBoss);
    if (!hasBoss && mins >= 3) {
        this.spawnBoss(mins);
    }

    let spawnChanceMultiplier = 1.0;
    const isMobileViewport = this.state.viewport.width <= 640;
    const spawnBatch = isMobileViewport ? 1 : 3;
    const visibleEnemyLimit = 999;
    const halfWidth = this.state.viewport.width / 2;
    const halfHeight = this.state.viewport.height / 2;
    const visibleEnemies = this.state.enemies.filter((enemy) => {
      const dx = Math.abs(enemy.x - this.state.camera.x);
      const dy = Math.abs(enemy.y - this.state.camera.y);
      return dx <= halfWidth && dy <= halfHeight;
    }).length;
    
    // Late game green monster density increase
    if (mins > 3) {
        spawnChanceMultiplier = 1.5;
    }

    if (visibleEnemies > visibleEnemyLimit) return;

    // Spawn chance increases with time
    if (Math.random() > (0.15 + mins * 0.05) * spawnChanceMultiplier * spawnBatch) return;

    for (let batchIndex = 0; batchIndex < spawnBatch; batchIndex++) {
      const { x: px, y: py } = this.getOffscreenSpawnPoint(180 + batchIndex * 24);

      let typeStr = '芽苗史萊姆';
      const levelScale = 1 + (this.state.player.level - 1) * 0.1;
      const timeScale = 1 + (mins > 3 ? (mins - 3) * 0.2 : 0);
      
      let hp = (10 + mins * 20) * levelScale * timeScale * 0.8;
      let speed = (40 + Math.random() * 20) * 0.88;
      let color = '#16a34a';
      let radius = 12;
      let xp = 1;
      let damage = (5 + mins * 2) * levelScale * timeScale * 0.72;
      let ignoreKnockback = false;

      const rand = Math.random();
      if (mins > 0.5 && rand < 0.25) { 
         typeStr = '橡果斥候'; speed = 105 + Math.random() * 35; hp = 12; color = '#9a5b22'; radius = 8; xp = 10;
      } else if (mins > 2 && rand >= 0.35 && rand < 0.39) { 
         typeStr = '荊刺猛衛'; speed = 18; hp = hp * 4.8; color = '#5b8f22'; radius = 15 * 1.3; xp = 200; damage = 24; ignoreKnockback = false;
      } else if (mins > 2 && rand >= 0.2 && rand < 0.3) { 
         typeStr = '苔岩守衛'; speed = 14; hp = hp * 6.2; color = '#737373'; radius = 25; xp = 50; damage = 18;
      } else if (mins > 4 && rand >= 0.55 && rand < 0.65) {
         typeStr = '迷霧幽靈'; speed = 34; hp = hp * 2.3; color = '#a5b4fc'; radius = 14; xp = 3; ignoreKnockback = true;
      }

      this.state.enemies.push({
        id: this.state.entityIdCounter++,
        type: typeStr,
        x: px, y: py,
        hp, maxHp: hp, speed, damage, radius, color, xpValue: xp,
        knockback: { x: 0, y: 0 },
        ignoreKnockback
      });
    }
  }
}
