import { damageEnemy, burst, impactRing } from './effectSystem.js';
import { scoreMultiplier } from './directorSystem.js';
import { gameEvents } from '../core/EventBus.js';

const explosionCandidates = [];

export function spawnThematicEnemyDeath(state, enemy) {
  if (!state.particles) return;
  const id = enemy.type?.id || '';
  const isBoss = enemy.isBoss;

  if (isBoss) {
    state.shake = Math.max(state.shake || 0, 0.4);
    state.rings?.push({ x: enemy.x, y: enemy.y, radius: 120, life: 0.8, maxLife: 0.8, color: '#ffd700' });
    state.rings?.push({ x: enemy.x, y: enemy.y, radius: 70, life: 0.5, maxLife: 0.5, color: '#ff3366' });
    for (let i = 0; i < 45; i++) {
      const angle = (i / 45) * Math.PI * 2;
      const speed = 120 + Math.random() * 220;
      const life = 0.8 + Math.random() * 0.6;
      state.particles.push({
        x: enemy.x, y: enemy.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life, maxLife: life,
        color: '#ffd700', size: 3 + Math.random() * 5,
        palette: ['#ffffff', '#ffd700', '#ff8800', '#ff0055', '#222222'],
        drag: 0.93, gravity: 35
      });
    }
    return;
  }

  let count = 22;
  let colors = ['#fffbe8', '#ffda73', '#ff8a3d'];
  let gravity = 45;
  let size = 3;

  if (id.includes('burger')) {
    count = 26;
    colors = ['#e8a956', '#48a867', '#ffbe3b', '#6d3e2e', '#f5d696'];
    size = 4;
    gravity = 55;
  } else if (id.includes('soda') || id.includes('shake')) {
    count = 28;
    colors = ['#00e5ff', '#ff3377', '#ffffff', '#8ae8ff'];
    size = 3;
    gravity = 25;
    state.rings?.push({ x: enemy.x, y: enemy.y, radius: 36, life: 0.35, maxLife: 0.35, color: '#00e5ffaa' });
  } else if (id.includes('fries')) {
    count = 24;
    colors = ['#ffe066', '#ffae19', '#ffffff', '#ffd166'];
    size = 4;
    gravity = 50;
  } else if (id.includes('hotdog') || id.includes('sausage')) {
    count = 24;
    colors = ['#c73838', '#ffe853', '#8f2828', '#ffd166'];
    size = 3.5;
    gravity = 48;
  } else if (id.includes('pizza')) {
    count = 24;
    colors = ['#e69a47', '#ffcf40', '#d62828', '#40916c'];
    size = 4;
  } else if (id.includes('onion')) {
    count = 20;
    colors = ['#ffffff', '#e2e8f0', '#cbd5e1', '#a7f3d0'];
  }

  for (let i = 0; i < count && state.particles.length < 800; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 140;
    const life = 0.45 + Math.random() * 0.4;
    const color = colors[i % colors.length];
    state.particles.push({
      x: enemy.x, y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life, maxLife: life,
      color,
      size: size + (Math.random() - 0.5) * 2,
      palette: [color, colors[(i + 1) % colors.length], '#111827'],
      drag: 0.91,
      gravity
    });
  }
}

export function resolveDeaths(state, onLevelUp) {
  let hasDead = false;
  const enemyCount = state.enemies.length;
  for (let i = 0; i < enemyCount; i++) {
    if (state.enemies[i].hp <= 0) {
      hasDead = true;
      break;
    }
  }
  if (!hasDead) return;

  const resolved = new Set();
  const queue = [];
  for (let i = 0; i < enemyCount; i++) {
    if (state.enemies[i].hp <= 0) queue.push(state.enemies[i]);
  }
  for (let index = 0; index < queue.length; index++) {
    const enemy = queue[index];
    if (resolved.has(enemy)) continue;
    resolved.add(enemy);
    state.combo = (state.combo || 0) + 1; state.comboTime = 3.5;
    applyComboReward(state);
    const multiplier = Math.min(3, 1 + Math.floor(state.combo / 5) * .25);
    if (state.combo % 5 === 0 && state.floaters) {
      state.floaters.push({
        x: state.player.x,
        y: state.player.y - 45,
        text: `COMBO ${state.combo} / x${multiplier.toFixed(2)}`,
        life: 1.25,
        color: '#93ffe0',
        scale: 1.25,
        kind: 'combo',
        comboVal: state.combo,
      });
    }
    const gained = Math.round(enemy.score * state.difficulty.score * multiplier * scoreMultiplier(state));
    state.score += gained;
    if (state.floaters && state.floaters.length < 90) {
      state.floaters.push({
        x: enemy.x,
        y: enemy.y + 8,
        text: `+${gained}`,
        life: .8,
        color: '#91ffda',
        scale: .9,
        kind: 'gain',
      });
    }
    state.peakCombo = Math.max(state.peakCombo || 0, state.combo);
    state.kills += 1;
    if (enemy.isBoss) {
      state.bossesKilled = (state.bossesKilled || 0) + 1;
      state.bossDefeated = true;
      if (state.modeId === 'rush') state.nextBossAt = state.time + 9;
    }
    state.audio?.play(enemy.isBoss ? 'boss' : 'kill');

    // EventBus hook: onEnemyKilled for mods and achievements
    gameEvents.emit('onEnemyKilled', { enemy, state, scoreGained: gained });

    if (state.player.explosionDamage > 0) {
      state.rings?.push({ x: enemy.x, y: enemy.y, radius: 72, life: .5, color: '#ff9965' });
      const nearbyEnemies = (state.spatialGrid && state.spatialGrid.totalEntities > 0)
        ? state.spatialGrid.queryRadius(enemy.x, enemy.y, 72, explosionCandidates)
        : state.enemies;
      const nearLen = nearbyEnemies.length;
      for (let n = 0; n < nearLen; n++) {
        const other = nearbyEnemies[n];
        if (other !== enemy && other.hp > 0 && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 72) {
          damageEnemy(state, other, state.player.explosionDamage);
          if (other.hp <= 0) queue.push(other);
        }
      }
    }
    if (enemy.isBoss && state.player.hp > 0) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
    }

    // Efecto de muerte temático según tipo de enemigo
    spawnThematicEnemyDeath(state, enemy);

    const levels = state.player.gainXp(enemy.xp);
    for (let level = 0; level < levels; level += 1) {
      // Las cartas de habilidades pasivas se eligen en cada subida de nivel
      onLevelUp(true);
    }
  }

  // In-place enemy array compaction (zero GC)
  let aliveEnemies = 0;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!resolved.has(e) && e.hp > 0) {
      state.enemies[aliveEnemies++] = e;
    }
  }
  state.enemies.length = aliveEnemies;
}

export function applyComboReward(state) {
  const combo = state.combo || 0, p = state.player;
  let label = '', color = '#91ffda';
  if (combo === 10) { p.buffs.speedMultiplier = Math.max(p.buffs.speedMultiplier, 1.35); p.buffs.speedTime = Math.max(p.buffs.speedTime, 6); label = 'COMBO 10 / ACELERON'; }
  if (combo === 20) { p.buffs.fireRateMultiplier = Math.min(p.buffs.fireRateMultiplier, .55); p.buffs.fireTime = Math.max(p.buffs.fireTime, 6); label = 'COMBO 20 / CADENCIA'; color = '#ffd75f'; }
  if (combo === 30) { p.buffs.damageMultiplier = Math.max(p.buffs.damageMultiplier, 1.65); p.buffs.damageTime = Math.max(p.buffs.damageTime, 8); p.comboFeverTime = Math.max(p.comboFeverTime, 8); label = 'COMBO 30 / FIEBRE DE COCINA'; color = '#ff5d9e'; }
  if (!label) return false;
  state.directorNotice = label; state.shake = Math.max(state.shake, .2); state.audio?.play('level');
  impactRing(state, p.x, p.y, color); burst(state, p.x, p.y, color, 26, 180);
  state.floaters?.push({
    x: p.x,
    y: p.y - 48,
    text: label,
    life: 1.4,
    color,
    scale: 1.35,
    kind: 'combo',
    comboVal: combo,
  });
  return true;
}

export function addSurvivalScore(state, delta) {
  state.score += delta * 1.5 * state.difficulty.score * scoreMultiplier(state);
}
