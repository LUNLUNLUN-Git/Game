import { GameState } from './types';
import { generatedAssets, uiAssets } from '../assets';

type SpritePose = 'front' | 'left' | 'right';
type SpriteSide = 'left' | 'right';
type ResponsiveImage = {
  desktop: HTMLImageElement;
  mobile: HTMLImageElement;
};
type ResponsiveSource = {
  desktop: string;
  mobile: string;
};

export class RenderSystem {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private groundImage: HTMLImageElement;
  private xpGemImage: HTMLImageElement;
  private healHeartImage: HTMLImageElement;
  private playerImages: Record<string, Record<SpritePose, ResponsiveImage>>;
  private enemyImages: Record<string, Record<SpriteSide, ResponsiveImage>>;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.groundImage = this.loadImage(uiAssets.groundTexture);
    this.xpGemImage = this.loadImage(uiAssets.xpGem);
    this.healHeartImage = this.loadImage(uiAssets.healHeart);
    this.playerImages = Object.fromEntries(
      Object.entries(generatedAssets.playerSprites).map(([id, sprites]) => [
        id,
        {
          front: this.loadResponsiveImage(sprites.front),
          left: this.loadResponsiveImage(sprites.left),
          right: this.loadResponsiveImage(sprites.right),
        },
      ]),
    ) as Record<string, Record<SpritePose, ResponsiveImage>>;

    const sproutSlime = this.loadEnemyImages(generatedAssets.enemies.sproutSlime);
    const acornScout = this.loadEnemyImages(generatedAssets.enemies.acornScout);
    const mossGolem = this.loadEnemyImages(generatedAssets.enemies.mossGolem);
    const thornBrute = this.loadEnemyImages(generatedAssets.enemies.thornBrute);
    const mistWisp = this.loadEnemyImages(generatedAssets.enemies.mistWisp);
    const forestLord = this.loadEnemyImages(generatedAssets.enemies.forestLord);

    this.enemyImages = {
      '芽苗史萊姆': sproutSlime,
      zombie: sproutSlime,
      '橡果斥候': acornScout,
      '蝙蝠': acornScout,
      '苔岩守衛': mossGolem,
      '石魔': mossGolem,
      '荊刺猛衛': thornBrute,
      '肉盾精英': thornBrute,
      '迷霧幽靈': mistWisp,
      '幽靈': mistWisp,
      '森林領主': forestLord,
      '領主': forestLord,
    };
  }

  private loadImage(src: string) {
    const image = new Image();
    image.src = src;
    return image;
  }

  private loadResponsiveImage(src: ResponsiveSource): ResponsiveImage {
    return {
      desktop: this.loadImage(src.desktop),
      mobile: this.loadImage(src.mobile),
    };
  }

  private loadEnemyImages(src: Record<SpriteSide, ResponsiveSource>): Record<SpriteSide, ResponsiveImage> {
    return {
      left: this.loadResponsiveImage(src.left),
      right: this.loadResponsiveImage(src.right),
    };
  }

  private isReady(image: HTMLImageElement) {
    return image.complete && image.naturalWidth > 0;
  }

  private isMobileSpriteMode() {
    const cssWidth = this.canvas.clientWidth || this.canvas.width / Math.max(1, window.devicePixelRatio || 1);
    return cssWidth <= 640;
  }

  private pickResponsiveImage(image: ResponsiveImage) {
    return this.isMobileSpriteMode() ? image.mobile : image.desktop;
  }

  private seeded(index: number) {
    const value = Math.sin(index * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  private getPlayerImage(state: GameState) {
    const spriteSet = this.playerImages[state.selectedCharacterId] ?? this.playerImages.knight;
    if (state.input.x < -0.15) return this.pickResponsiveImage(spriteSet.left);
    if (state.input.x > 0.15) return this.pickResponsiveImage(spriteSet.right);
    return this.pickResponsiveImage(spriteSet.front);
  }

  private getEnemyImage(type: string, isBoss?: boolean, facing = 1) {
    const imageSet = isBoss ? this.enemyImages['森林領主'] : this.enemyImages[type] ?? this.enemyImages['芽苗史萊姆'];
    return this.pickResponsiveImage((facing || 1) < 0 ? imageSet.left : imageSet.right);
  }

  draw(state: GameState) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const cx = cw / 2;
    const cy = ch / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = this.isMobileSpriteMode() ? 'medium' : 'high';

    // Draw the forest floor before translating the world camera.
    if (this.isReady(this.groundImage)) {
      const tile = Math.max(64, this.groundImage.naturalWidth * 0.125);
      const offsetX = -((state.camera.x - cx) % tile) - tile;
      const offsetY = -((state.camera.y - cy) % tile) - tile;
      for (let x = offsetX; x < cw + tile; x += tile) {
        for (let y = offsetY; y < ch + tile; y += tile) {
          ctx.drawImage(this.groundImage, x, y, tile, tile);
        }
      }
    } else {
      ctx.fillStyle = '#7fbf45';
      ctx.fillRect(0, 0, cw, ch);
    }

    const vignette = ctx.createRadialGradient(cx, cy, Math.min(cw, ch) * 0.2, cx, cy, Math.max(cw, ch) * 0.72);
    vignette.addColorStop(0, 'rgba(255, 247, 190, 0.12)');
    vignette.addColorStop(1, 'rgba(19, 55, 24, 0.28)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    
    // Screen Shake
    let camX = state.camera.x;
    let camY = state.camera.y;
    if (state.player.screenShake > 0) {
        camX += (Math.random() - 0.5) * 15 * state.player.screenShake;
        camY += (Math.random() - 0.5) * 15 * state.player.screenShake;
    }

    // Translate world to screen
    ctx.translate(cx - camX, cy - camY);

    // Draw Gems
    for (const gem of state.gems) {
      if (this.isReady(this.xpGemImage)) {
        const size = Math.max(16, gem.radius * 3.4 * 0.7);
        ctx.drawImage(this.xpGemImage, gem.x - size / 2, gem.y - size / 2, size, size);
      } else {
        ctx.fillStyle = gem.color;
        ctx.beginPath();
        ctx.moveTo(gem.x, gem.y - gem.radius);
        ctx.lineTo(gem.x + gem.radius, gem.y);
        ctx.lineTo(gem.x, gem.y + gem.radius);
        ctx.lineTo(gem.x - gem.radius, gem.y);
        ctx.fill();
      }
    }

    // Draw Health Items
    for (const item of state.healthItems) {
      if (this.isReady(this.healHeartImage)) {
        const size = Math.max(20, item.radius * 3.2 * 0.7);
        ctx.drawImage(this.healHeartImage, item.x - size / 2, item.y - size / 2, size, size);
        continue;
      }

        ctx.fillStyle = '#f87171'; // red-400
        ctx.beginPath();
        // Cross shape or heart (let's do simple heart circle)
        ctx.arc(item.x - 3, item.y - 2, 5, 0, Math.PI * 2);
        ctx.arc(item.x + 3, item.y - 2, 5, 0, Math.PI * 2);
        ctx.moveTo(item.x - 8, item.y);
        ctx.lineTo(item.x, item.y + 10);
        ctx.lineTo(item.x + 8, item.y);
        ctx.fill();
    }

    // Draw enemies
    for (const enemy of state.enemies) {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      // Adjust alpha for ghosts
      if (enemy.type === '幽靈' || enemy.type === '迷霧幽靈') ctx.globalAlpha = 0.72;
      else ctx.globalAlpha = 1;

      const enemyImage = this.getEnemyImage(enemy.type, enemy.isBoss, enemy.facing);
      if (this.isReady(enemyImage)) {
        const size = enemy.radius * (enemy.isBoss ? 3.15 : 3.2) * 1.3;
        ctx.drawImage(enemyImage, enemy.x - size / 2, enemy.y - size / 2, size, size);
      } else if (enemy.isBoss) {
        // Draw boss with special frame
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.strokeRect(enemy.x - enemy.radius - 2, enemy.y - enemy.radius - 2, enemy.radius * 2 + 4, enemy.radius * 2 + 4);
        ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2);
      } else if (enemy.type === '蝙蝠' || enemy.type === '橡果斥候') {
        ctx.moveTo(enemy.x, enemy.y - enemy.radius);
        ctx.lineTo(enemy.x + enemy.radius*1.5, enemy.y);
        ctx.lineTo(enemy.x, enemy.y + enemy.radius);
        ctx.lineTo(enemy.x - enemy.radius*1.5, enemy.y);
      } else if(enemy.type === '石魔' || enemy.type === '苔岩守衛') {
        ctx.rect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2);
      } else if(enemy.type === '史萊姆' || enemy.type === '芽苗史萊姆') {
        const bounce = Math.sin(Date.now() / 150) * 2;
        ctx.arc(enemy.x, enemy.y - bounce, enemy.radius, 0, Math.PI * 2);
      } else if (enemy.type === '幽靈' || enemy.type === '迷霧幽靈') {
        ctx.arc(enemy.x, enemy.y, enemy.radius, Math.PI, 0);
        ctx.lineTo(enemy.x + enemy.radius, enemy.y + enemy.radius);
        ctx.lineTo(enemy.x, enemy.y + enemy.radius - 4);
        ctx.lineTo(enemy.x - enemy.radius, enemy.y + enemy.radius);
      } else {
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;

      if (!this.isReady(enemyImage)) {
        const facing = enemy.facing || 1;
        ctx.fillStyle = '#000';
        const eyeSize = 2;
        const eyeOffset = facing * (enemy.radius * 0.4);
        ctx.beginPath();
        ctx.arc(enemy.x + eyeOffset - 2, enemy.y - 2, eyeSize, 0, Math.PI * 2);
        ctx.arc(enemy.x + eyeOffset + 2, enemy.y - 2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // HP bar
      if (enemy.hp < enemy.maxHp) {
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 8, enemy.radius * 2, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 8, (enemy.radius * 2) * (enemy.hp / enemy.maxHp), 4);
      }
    }

    // Draw player
    const playerImage = this.getPlayerImage(state);
    if (this.isReady(playerImage)) {
      const size = state.player.radius * 3.45 * 1.3;
      ctx.drawImage(playerImage, state.player.x - size / 2, state.player.y - size / 2, size, size);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(state.player.x - 4, state.player.y - 4, 3, 0, Math.PI * 2);
      ctx.arc(state.player.x + 4, state.player.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Projectiles
    for (const p of state.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.weaponId === 'whip') {
        const angle = p.angle !== undefined ? p.angle : Math.atan2(p.y - state.player.y, p.x - state.player.x);
        const arcSpread = 2.05;
        const progress = (0.25 - p.life) / 0.25;
        const dist = (p.radius * 0.5) + (p.radius * 0.5 * progress);

        ctx.save();
        ctx.shadowColor = '#d8ff64';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(184, 246, 70, 0.88)';
        ctx.lineWidth = (18 - progress * 9) * state.player.areaMultiplier;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, dist, angle - arcSpread / 2, angle + arcSpread / 2);
        ctx.stroke();

        ctx.shadowBlur = 4;
        ctx.strokeStyle = 'rgba(255, 255, 210, 0.9)';
        ctx.lineWidth = Math.max(2, (5 - progress * 2) * state.player.areaMultiplier);
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, dist, angle - arcSpread / 2 + 0.16, angle + arcSpread / 2 - 0.16);
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
          const tailAngle = angle - arcSpread / 2 + (arcSpread * (i + 1)) / 4;
          const tailDist = dist - 12 - i * 8;
          ctx.strokeStyle = `rgba(255, 218, 96, ${0.42 - i * 0.1})`;
          ctx.lineWidth = Math.max(2, (7 - i * 1.5) * state.player.areaMultiplier);
          ctx.beginPath();
          ctx.arc(state.player.x, state.player.y, tailDist, tailAngle - 0.18, tailAngle + 0.18);
          ctx.stroke();
        }
        ctx.restore();
      } else if (p.weaponId === 'garlic' && p.isAura) {
        const pulse = (Math.sin(state.gameTime / 190) + 1) / 2;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
        grad.addColorStop(0.65, 'rgba(45, 212, 191, 0.12)');
        grad.addColorStop(0.92, 'rgba(190, 242, 100, 0.16)');
        grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.shadowColor = '#bef264';
        ctx.shadowBlur = 18 + pulse * 8;
        ctx.strokeStyle = `rgba(190, 242, 100, ${0.58 + pulse * 0.18})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (0.98 + pulse * 0.03), 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(45, 212, 191, 0.72)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -state.gameTime / 45;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.83, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        for (let i = 0; i < 10; i++) {
          const ang = state.gameTime / 520 + i * 0.78;
          const r = p.radius * (0.45 + (i % 4) * 0.12);
          const bx = p.x + Math.cos(ang) * r;
          const by = p.y + Math.sin(ang * 1.18) * r;
          ctx.fillStyle = i % 2 ? 'rgba(125, 249, 255, 0.68)' : 'rgba(180, 96, 255, 0.58)';
          ctx.beginPath();
          ctx.arc(bx, by, 2.2 + (i % 2), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.weaponId === 'fireball') {
        const angle = Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        const tail = Math.max(24, p.radius * 1.6);
        const flame = ctx.createRadialGradient(0, 0, 2, 0, 0, p.radius * 1.4);
        flame.addColorStop(0, '#fff7ad');
        flame.addColorStop(0.35, '#ffcf33');
        flame.addColorStop(0.75, '#fb7b1f');
        flame.addColorStop(1, 'rgba(185, 55, 12, 0)');
        ctx.shadowColor = '#ffb22e';
        ctx.shadowBlur = 18;
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 1.15, p.radius * 0.88, 0, 0, Math.PI * 2);
        ctx.fill();

        const tailGrad = ctx.createLinearGradient(-tail, 0, 0, 0);
        tailGrad.addColorStop(0, 'rgba(251, 146, 60, 0)');
        tailGrad.addColorStop(1, 'rgba(255, 238, 130, 0.7)');
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.moveTo(-tail, -p.radius * 0.45);
        ctx.quadraticCurveTo(-tail * 0.35, 0, 0, -p.radius * 0.7);
        ctx.lineTo(0, p.radius * 0.7);
        ctx.quadraticCurveTo(-tail * 0.35, 0, -tail, p.radius * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.weaponId === 'arrow') {
        const angle = Math.atan2(p.vy, p.vx);
        const length = p.radius * 2.8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.shadowColor = '#5eead4';
        ctx.shadowBlur = 14;
        const trail = ctx.createLinearGradient(-length * 1.8, 0, length * 0.2, 0);
        trail.addColorStop(0, 'rgba(45, 212, 191, 0)');
        trail.addColorStop(1, 'rgba(45, 212, 191, 0.8)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = Math.max(5, p.radius * 0.52);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-length * 1.8, 0);
        ctx.lineTo(length * 0.3, 0);
        ctx.stroke();

        ctx.fillStyle = '#cafffb';
        ctx.beginPath();
        ctx.moveTo(length, 0);
        ctx.lineTo(-length * 0.38, -p.radius * 0.72);
        ctx.lineTo(-length * 0.1, 0);
        ctx.lineTo(-length * 0.38, p.radius * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.weaponId === 'wave') {
        const duration = 0.4;
        const rotation = ((duration - p.life) / duration) * Math.PI * 2;
        const length = p.radius * 1.5;
        
        // Draw Afterimages / Trails
        const trailCount = 4;
        for (let t = 0; t < trailCount; t++) {
            const tRatio = 1 - (t / trailCount);
            const tRot = rotation - (t * 0.2);
            ctx.save();
            ctx.translate(state.player.x, state.player.y);
            ctx.rotate(tRot);
            ctx.globalAlpha = 0.2 * tRatio;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 15 * state.player.areaMultiplier;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(length, 0);
            ctx.stroke();
            ctx.restore();
        }
        
        ctx.save();
        ctx.translate(state.player.x, state.player.y);
        ctx.rotate(rotation);
        ctx.globalAlpha = 1;
        
        // Draw a long strip slash
        const grad = ctx.createLinearGradient(0, 0, length, 0);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        
        ctx.strokeStyle = grad;
        ctx.lineWidth = 20 * state.player.areaMultiplier;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
        
        // Inner white highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 5 * state.player.areaMultiplier;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(length * 0.8, 0);
        ctx.stroke();
        
        ctx.restore();
      } else if (p.weaponId === 'orbit') {
        ctx.save();
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 20;
        for (let step = 4; step >= 1; step--) {
          const ang = Math.atan2(p.y - state.player.y, p.x - state.player.x) - step * 0.18;
          const r = Math.hypot(p.x - state.player.x, p.y - state.player.y);
          ctx.globalAlpha = 0.16 * (5 - step);
          ctx.fillStyle = '#2dd4bf';
          ctx.beginPath();
          ctx.arc(state.player.x + Math.cos(ang) * r, state.player.y + Math.sin(ang) * r, p.radius * (1 - step * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        const spirit = ctx.createRadialGradient(p.x - p.radius * 0.25, p.y - p.radius * 0.25, 1, p.x, p.y, p.radius * 1.35);
        spirit.addColorStop(0, '#efffff');
        spirit.addColorStop(0.45, '#67e8f9');
        spirit.addColorStop(1, 'rgba(20, 184, 166, 0.2)');
        ctx.fillStyle = spirit;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
         ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
         ctx.fill();
      }
    }

    // Draw Damage Texts
    ctx.font = 'bold 16px "Arial", sans-serif';
    ctx.textAlign = 'center';
    for (const dt of state.damageTexts) {
      ctx.fillStyle = dt.color;
      ctx.globalAlpha = Math.max(0, dt.life / dt.maxLife);
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(dt.text, dt.x, dt.y);
      ctx.shadowBlur = 0;
    }
    
    // Draw Explosions
    for (const exp of state.explosions) {
        ctx.fillStyle = exp.color;
        const ratio = 1 - (exp.life / exp.maxLife);
        ctx.globalAlpha = Math.max(0, exp.life / exp.maxLife);
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius * (1 + ratio), 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Ultimate VFX
    for (const v of state.vfx) {
      const alpha = Math.max(0, v.life / v.maxLife);
      const ratio = 1 - alpha;
      ctx.globalAlpha = alpha;

      if (v.type === 'ultimate_knight') {
        const burst = Math.min(1, ratio / 0.22);
        const grow = Math.pow(burst, 0.42);
        const centerX = v.x;
        const centerY = v.y;
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha + 0.2);
        ctx.strokeStyle = `rgba(255, 224, 92, ${0.65 * alpha})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 120 + grow * 620, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 24; i++) {
          const seedA = this.seeded(i + 31);
          const seedB = this.seeded(i + 77);
          const angle = seedA * Math.PI * 2;
          const spread = 80 + seedB * 620;
          const baseX = centerX + Math.cos(angle) * spread;
          const baseY = centerY + Math.sin(angle) * spread * 0.72;
          const height = (110 + this.seeded(i + 9) * 150) * grow;
          const sway = Math.sin((1 - alpha) * Math.PI * 2 + i) * 8;

          ctx.globalAlpha = alpha;
          ctx.fillStyle = 'rgba(63, 37, 13, 0.38)';
          ctx.beginPath();
          ctx.ellipse(baseX, baseY + 7, 22 + grow * 14, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#4f7c1c';
          ctx.lineWidth = 12 + this.seeded(i + 18) * 7;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#b8f646';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(baseX, baseY + 2);
          ctx.bezierCurveTo(baseX - 18 + sway, baseY - height * 0.2, baseX + 22 - sway, baseY - height * 0.58, baseX + sway, baseY - height);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#b8f646';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(baseX - 1, baseY + 1);
          ctx.bezierCurveTo(baseX - 14 + sway, baseY - height * 0.18, baseX + 16 - sway, baseY - height * 0.56, baseX + sway, baseY - height);
          ctx.stroke();

          ctx.fillStyle = '#d9ff6a';
          ctx.beginPath();
          ctx.moveTo(baseX + sway, baseY - height - 24);
          ctx.lineTo(baseX + sway - 12, baseY - height + 6);
          ctx.lineTo(baseX + sway + 12, baseY - height + 6);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = `rgba(255, 224, 92, ${0.45 * alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(baseX - 22 + sway * 0.2, baseY - height * 0.48);
          ctx.lineTo(baseX + 18 + sway * 0.12, baseY - height * 0.58);
          ctx.moveTo(baseX + 24 + sway * 0.15, baseY - height * 0.28);
          ctx.lineTo(baseX - 14 + sway * 0.1, baseY - height * 0.36);
          ctx.stroke();
        }
        ctx.restore();
      } else if (v.type === 'ultimate_hunter') {
        const progress = 1 - ratio;
        const pulse = 0.5 + 0.5 * Math.sin(state.gameTime * 0.025);
        const stormRadius = 240 + progress * 420;
        const outerRadius = stormRadius + 120 + pulse * 26;

        ctx.save();
        ctx.translate(state.player.x, state.player.y);

        const vortex = ctx.createRadialGradient(0, 0, 40, 0, 0, outerRadius);
        vortex.addColorStop(0, 'rgba(210,255,255,0.9)');
        vortex.addColorStop(0.12, 'rgba(106,244,255,0.72)');
        vortex.addColorStop(0.42, 'rgba(36,163,212,0.28)');
        vortex.addColorStop(0.75, 'rgba(71,39,124,0.18)');
        vortex.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = vortex;
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(state.gameTime * 0.004);
        for (let ring = 0; ring < 3; ring++) {
          const ringRadius = stormRadius * (0.48 + ring * 0.22);
          ctx.strokeStyle = `rgba(${ring === 0 ? '180,255,244' : ring === 1 ? '116,227,255' : '202,120,255'}, ${0.42 - ring * 0.08})`;
          ctx.lineWidth = 14 - ring * 3;
          ctx.shadowColor = ring === 2 ? '#9e62ff' : '#8cf7ff';
          ctx.shadowBlur = 18 - ring * 4;
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, progress * Math.PI * 0.8 + ring, progress * Math.PI * 0.8 + ring + Math.PI * 1.25);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        for (let i = 0; i < 14; i++) {
          const ang = progress * 4 + (i / 14) * Math.PI * 2;
          const arrowLen = 80 + pulse * 18 + (i % 3) * 14;
          const arrowWidth = 14 + (i % 2) * 4;
          const baseR = stormRadius * (0.55 + (i % 4) * 0.11);
          const x = Math.cos(ang) * baseR;
          const y = Math.sin(ang) * baseR;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(ang + Math.PI / 2);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(172,255,248,0.88)' : 'rgba(138,226,255,0.78)';
          ctx.shadowColor = i % 2 === 0 ? '#d7fffb' : '#71d8ff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(0, -arrowLen * 0.58);
          ctx.lineTo(arrowWidth, 0);
          ctx.lineTo(0, arrowLen * 0.52);
          ctx.lineTo(-arrowWidth, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(80, 214, 255, 0.44)';
          ctx.fillRect(-4, -arrowLen * 0.42, 8, arrowLen * 0.84);
          ctx.restore();
        }

        for (let i = 0; i < 24; i++) {
          const ang = -progress * 5 + (i / 24) * Math.PI * 2;
          const drift = 60 + (i % 5) * 18 + pulse * 10;
          const x = Math.cos(ang) * (stormRadius * 0.3 + drift);
          const y = Math.sin(ang) * (stormRadius * 0.3 + drift);
          ctx.fillStyle = i % 3 === 0 ? 'rgba(218,255,206,0.85)' : 'rgba(130,245,232,0.72)';
          ctx.beginPath();
          ctx.ellipse(x, y, 8 + (i % 3) * 3, 4 + (i % 2) * 2, ang, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (v.type === 'ultimate_guard') {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 40 * ratio;
          ctx.beginPath();
          ctx.arc(state.player.x, state.player.y, 1000 * ratio, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(state.player.x, state.player.y, 1000 * ratio, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;

    ctx.restore();

    // Draw Damage Flash overlay (Screen space)
    if (state.player.damageFlash > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${state.player.damageFlash * 2})`; // red-500
        ctx.fillRect(0, 0, cw, ch);
    }

    // Draw Joystick in screen space
    if (state.joystick.active) {
       ctx.save();
       ctx.globalAlpha = 0.5;
       ctx.fillStyle = '#fff';
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 2;
       
       // Base
       ctx.beginPath();
       ctx.arc(state.joystick.origin.x, state.joystick.origin.y, 50, 0, Math.PI * 2);
       ctx.stroke();

       // Thumb
       ctx.beginPath();
       ctx.arc(state.joystick.current.x, state.joystick.current.y, 20, 0, Math.PI * 2);
       ctx.fill();
       
       ctx.restore();
    }

    // Boss direction indicator
    const boss = state.enemies.find(e => e.isBoss);
    if (boss) {
        const dx = boss.x - state.player.x;
        const dy = boss.y - state.player.y;
        const margin = 60;
        const hw = cw / 2 - margin;
        const hh = ch / 2 - margin;

        if (Math.abs(dx) > hw + 10 || Math.abs(dy) > hh + 10) {
            const angle = Math.atan2(dy, dx);
            let ax, ay;
            if (Math.abs(dx) / hw > Math.abs(dy) / hh) {
                ax = hw * Math.sign(dx);
                ay = (hw * Math.abs(dy) / Math.abs(dx)) * Math.sign(dy);
            } else {
                ay = hh * Math.sign(dy);
                ax = (hh * Math.abs(dx) / Math.abs(dy)) * Math.sign(dx);
            }

            ctx.save();
            ctx.translate(cw / 2 + ax, ch / 2 + ay);
            ctx.rotate(angle);
            ctx.fillStyle = '#facc15';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#facc15';
            ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
  }
}
