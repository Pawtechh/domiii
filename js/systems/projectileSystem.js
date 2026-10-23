import { Projectile } from "../entities/Projectile.js";
import { sweptOverlap, distance } from "../core/collision.js";
import { damageEnemy, explosionBurst, burst } from './effectSystem.js';
import { gameEvents } from '../core/EventBus.js';

// Pre-allocated buffers for spatial queries
const collisionCandidates = [];
const splashCandidates = [];
const hitsBuffer = [];

export function updateProjectiles(state, delta, canvas) {
  autoFire(state);

  const bounds = state.world || canvas;
  state.enemyProjectiles ||= [];

  // 1. Update Enemy Projectiles with in-place array compaction (zero GC)
  let aliveEnemyShots = 0;
  const enemyShotLen = state.enemyProjectiles.length;
  for (let i = 0; i < enemyShotLen; i++) {
    const shot = state.enemyProjectiles[i];
    shot.previousX = shot.x;
    shot.previousY = shot.y;

    // Trail buffer recycling without object allocation
    if (!shot.trail) {
      shot.trail = [];
    }
    if (shot.trail.length < 8) {
      shot.trail.push({ x: shot.x, y: shot.y });
    } else {
      // Reuse oldest entry instead of shift() + push()
      const oldest = shot.trail[0];
      oldest.x = shot.x;
      oldest.y = shot.y;
      for (let t = 0; t < shot.trail.length - 1; t++) {
        shot.trail[t] = shot.trail[t + 1];
      }
      shot.trail[shot.trail.length - 1] = oldest;
    }

    shot.x += shot.vx * delta;
    shot.y += shot.vy * delta;
    shot.life -= delta;

    if (sweptOverlap(shot, state.player)) {
      shot.life = 0;
      if (state.player.takeDamage(shot.damage)) {
        state.shake = 0.18;
        state.audio?.play('damage');
        gameEvents.emit('onPlayerDamage', { player: state.player, damage: shot.damage, source: shot, state });
      }
    }

    if (shot.life > 0 && shot.x > -60 && shot.x < bounds.width + 60 && shot.y > -60 && shot.y < bounds.height + 60) {
      state.enemyProjectiles[aliveEnemyShots++] = shot;
    }
  }
  state.enemyProjectiles.length = aliveEnemyShots;

  // 2. Update Player Projectiles (boomerang & trail)
  const projLen = state.projectiles.length;
  for (let i = 0; i < projLen; i++) {
    const projectile = state.projectiles[i];
    if (projectile.boomerang && projectile.age > 0.48) {
      projectile.returning = true;
      const dx = state.player.x - projectile.x;
      const dy = state.player.y - projectile.y;
      const length = Math.hypot(dx, dy) || 1;
      projectile.vx = (dx / length) * 690;
      projectile.vy = (dy / length) * 690;
      if (projectile.age > 1.45) projectile.dead = true;
    }
    projectile.update(delta);

    if (state.particles && !projectile.dead) {
      projectile.trailClock = (projectile.trailClock || 0) + delta * 30;
      const count = Math.min(3, Math.floor(projectile.trailClock));
      if (count > 0) {
        projectile.trailClock -= count;
        const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
        burst(state, projectile.x - (projectile.vx / speed) * projectile.radius * 2, projectile.y - (projectile.vy / speed) * projectile.radius * 2, '#ffe066', count, 20);
      }
    }
  }

  // 3. Collision Check: uses SpatialHashGrid for O(1) broadphase when available
  for (let i = 0; i < projLen; i++) {
    const projectile = state.projectiles[i];
    if (projectile.dead) continue;

    // Use Spatial Grid if initialized with entities, fallback to linear check
    let candidates;
    if (state.spatialGrid && state.spatialGrid.totalEntities > 0) {
      const minX = Math.min(projectile.previousX, projectile.x) - projectile.radius - 20;
      const maxX = Math.max(projectile.previousX, projectile.x) + projectile.radius + 20;
      const minY = Math.min(projectile.previousY, projectile.y) - projectile.radius - 20;
      const maxY = Math.max(projectile.previousY, projectile.y) + projectile.radius + 20;
      candidates = state.spatialGrid.queryBox(minX, minY, maxX, maxY, collisionCandidates);
    } else {
      candidates = state.enemies;
    }

    hitsBuffer.length = 0;
    const candLen = candidates.length;
    for (let c = 0; c < candLen; c++) {
      const enemy = candidates[c];
      if (enemy.hp > 0 && enemy.spawnTime <= 0 && !projectile.hitEnemies.has(enemy) && sweptOverlap(projectile, enemy)) {
        hitsBuffer.push(enemy);
      }
    }

    if (hitsBuffer.length > 1) {
      const px = projectile.previousX, py = projectile.previousY;
      hitsBuffer.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
    }

    const hitLen = hitsBuffer.length;
    for (let h = 0; h < hitLen; h++) {
      const enemy = hitsBuffer[h];
      if (enemy.hp <= 0) continue;
      projectile.hitEnemies.add(enemy);
      const bossBonus = enemy.isBoss ? (state.player.skin.bossDamageMultiplier || 1) : 1;
      damageEnemy(state, enemy, projectile.damage * bossBonus);

      if (projectile.splash > 0) {
        state.rings?.push({ x: enemy.x, y: enemy.y, radius: projectile.splash, life: 0.5, color: '#ffcc77' });
        explosionBurst(state, enemy.x, enemy.y, projectile.color, 28, 170);

        const splashTargets = (state.spatialGrid && state.spatialGrid.totalEntities > 0)
          ? state.spatialGrid.queryRadius(enemy.x, enemy.y, projectile.splash, splashCandidates)
          : state.enemies;

        const splashLen = splashTargets.length;
        for (let s = 0; s < splashLen; s++) {
          const other = splashTargets[s];
          if (other !== enemy && distance(enemy, other) <= projectile.splash) {
            damageEnemy(state, other, projectile.damage * 0.45);
          }
        }
      }

      if (projectile.cluster) {
        projectile.cluster = false;
        for (let k = 0; k < 6; k++) {
          const angle = (k * Math.PI) / 3;
          state.projectiles.push(
            new Projectile({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * 260,
              vy: Math.sin(angle) * 260,
              damage: projectile.damage * 0.34,
              size: Math.max(3, projectile.radius * 0.5),
              color: '#ffb347',
              pierce: 0,
              kind: 'explosiveBread'
            })
          );
        }
      }

      if (projectile.pierce > 0) {
        projectile.pierce -= 1;
      } else {
        projectile.dead = true;
        break;
      }
    }
  }

  // 4. In-place Projectile Compaction (Zero GC)
  let aliveProjectiles = 0;
  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i];
    if (!p.dead && p.x >= -60 && p.x <= bounds.width + 60 && p.y >= -60 && p.y <= bounds.height + 60) {
      state.projectiles[aliveProjectiles++] = p;
    }
  }
  state.projectiles.length = aliveProjectiles;
}

export function autoFire(state) {
  const player = state.player;
  let target = null;

  if (state.manualAim) {
    target = state.aimPoint;
  } else {
    // Fast O(N) linear search with squared distance (no Math.sqrt)
    let closestDistSq = Infinity;
    const len = state.enemies.length;
    const px = player.x, py = player.y;
    for (let i = 0; i < len; i++) {
      const enemy = state.enemies[i];
      if (enemy.hp > 0 && enemy.spawnTime <= 0) {
        const edx = enemy.x - px, edy = enemy.y - py;
        const dSq = edx * edx + edy * edy;
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          target = enemy;
        }
      }
    }
  }

  state.target = state.manualAim ? null : target;
  if (!target) return;

  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const angle = Math.atan2(dy, dx);
  player.aimAngle = angle;
  if (player.fireCooldown > 0) return;

  player.muzzleTime = 0.09;
  const weapon = player.weapon;
  const evolution = player.weaponEvolution;
  player.shotsFired = (player.shotsFired || 0) + 1;
  const empowered = evolution?.empoweredEvery && player.shotsFired % evolution.empoweredEvery === 0;
  const count = weapon.projectileCount + player.extraProjectiles + (player.comboFeverTime > 0 ? 2 : 0) + (evolution?.extraProjectiles || 0);
  const spread = count > 1 ? (evolution?.spread || 0.36) : 0;

  for (let index = 0; index < count; index += 1) {
    const offset = count === 1 ? 0 : -spread / 2 + (spread * index) / (count - 1);
    const finalAngle = angle + offset;
    state.projectiles.push(
      new Projectile({
        x: player.x,
        y: player.y,
        vx: Math.cos(finalAngle) * weapon.projectileSpeed,
        vy: Math.sin(finalAngle) * weapon.projectileSpeed,
        damage: weapon.damage * player.damageMultiplier * player.buffs.damageMultiplier * (evolution?.damageMultiplier || 1) * (empowered ? 2.1 : 1),
        size: weapon.projectileSize * player.projectileScale * (empowered ? 1.75 : 1),
        color: empowered ? '#fff27a' : weapon.color,
        pierce: weapon.pierce + player.pierceBonus + (evolution?.pierceBonus || 0) + (empowered ? 2 : 0),
        splash: Math.max((weapon.splash || 0) * (evolution?.splashMultiplier || 1), evolution?.splash || 0),
        kind: weapon.id,
        boomerang: Boolean(evolution?.boomerang),
        cluster: Boolean(evolution?.cluster),
      })
    );
  }

  player.fireCooldown = weapon.fireRate * player.fireRateMultiplier * player.buffs.fireRateMultiplier;
  if (weapon.fireRate >= 0.3) state.audio?.play('shoot');
}
