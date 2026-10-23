import { Enemy, enemyTypes } from "../entities/Enemy.js";
import { circlesOverlap } from "../core/collision.js";
import { damageEnemy, explosionBurst, burst, impactRing } from './effectSystem.js';

export const difficulties = {
  suave: { id: "suave", name: "Suave", hp: 0.85, speed: 0.85, damage: 0.7, spawn: 1.25, score: 0.9 },
  picante: { id: "picante", name: "Picante", hp: 1, speed: 1, damage: 1, spawn: 1, score: 1 },
  extra: { id: "extra", name: "Extra picante", hp: 1.25, speed: 1.12, damage: 1.2, spawn: 0.82, score: 1.25 },
  quemado: { id: "quemado", name: "Modo quemado", hp: 1.55, speed: 1.3, damage: 1.45, spawn: 0.62, score: 1.6 },
};

export function updateEnemies(state, delta, canvas) {
  state.spawnTimer -= delta;
  const pressure = Math.max(0, 1 - state.time / 240);
  const spawnEvery = state.difficulty.spawn * Math.max(0.32, 1.15 * pressure) * (state.activeEvent?.id === 'promo' ? .55 : 1);
  let bossSpawned = false;

  const waveBoss = state.modeId === 'waves' && state.waveRest <= 0 && state.waveBossPending;
  if ((state.time >= state.nextBossAt || waveBoss) && !state.enemies.some(enemy => enemy.isBoss)) {
    spawnEnemy(state, canvas, true);
    state.waveBossPending = false;
    state.nextBossAt = state.modeId === 'survival' || !state.modeId ? state.time + 85 : Infinity;
    bossSpawned = true;
  }

  const canSpawn = state.modeId === 'waves' ? state.waveRest <= 0 && state.waveRemaining > 0 :
    state.modeId === 'rush' ? state.enemies.some(e=>e.isBoss) && state.enemies.length < 7 : true;
  const maxCap = state.modeId === 'rush' ? 7 :
    state.difficulty.id === 'quemado' ? 260 :
    state.difficulty.id === 'extra' ? 220 : 180;
  if (canSpawn && state.spawnTimer <= 0 && state.enemies.length < maxCap) {
    const burstCount = (state.time > 40 && state.enemies.length < maxCap - 15) ? (state.time > 100 ? 3 : 2) : 1;
    for (let s = 0; s < burstCount && state.enemies.length < maxCap; s++) {
      spawnEnemy(state, canvas);
      if (state.modeId === 'waves') state.waveRemaining -= 1;
    }
    state.spawnTimer = state.modeId === 'rush' ? 3.2 : spawnEvery;
  }

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const edx = enemy.x - state.player.x, edy = enemy.y - state.player.y;
    const distSq = edx * edx + edy * edy;
    enemy.slowFactor = state.player.auraLevel > 0 && distSq < 105 * 105 ? Math.pow(.75,state.player.auraLevel) : 1;
    enemy.update(delta, state.decoy||state.player, state);
    if (enemy.spawnTime > 0) continue;
    if (enemy.shotReady) {
      enemy.shotReady = false;
      const target=state.decoy||state.player;const dx = target.x - enemy.x, dy = target.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      state.enemyProjectiles.push({ x: enemy.x, y: enemy.y, vx: dx / length * 245, vy: dy / length * 245, radius: 7, damage: enemy.damage * 0.65, life: 3 });
    }
    if (enemy.fuse !== undefined && enemy.fuse <= 0 && !enemy.exploded) {
      enemy.exploded = true;
      state.rings?.push({x:enemy.x,y:enemy.y,radius:enemy.radius+42,life:.6,color:'#ff6c70'});
      explosionBurst(state,enemy.x,enemy.y,'#ff654f',30,190);
      const fuseR = enemy.radius + state.player.radius + 24;
      if (distSq < fuseR * fuseR && state.player.takeDamage(enemy.damage)) {
        state.shake = 0.28;state.audio?.play('damage');
      }
      enemy.hp = 0;
    }
    // Modo Dios: Aniquilación automática al contacto
    if (state.player.godMode && distSq < 130 * 130) {
      damageEnemy(state, enemy, 9999, 'god');
      burst(state, enemy.x, enemy.y, '#ffd700', 8, 140);
      impactRing(state, enemy.x, enemy.y, '#ffd700');
      if (!state.lastExterminioTime || state.time - state.lastExterminioTime > 0.18) {
        state.lastExterminioTime = state.time;
        state.floaters?.push({ x: enemy.x, y: enemy.y - 30, text: '¡EXTERMINIO!', life: 0.85, color: '#ffd700', scale: 1.35, kind: 'crit' });
      }
    }

    const collR = enemy.radius + state.player.radius;
    if (enemy.hp > 0 && distSq <= collR * collR) {
      const player=state.player;
      if(player.dashTime>0&&enemy.lastDashSequence!==player.dashSequence){
        enemy.lastDashSequence=player.dashSequence;
        const dx=enemy.x-player.x,dy=enemy.y-player.y,length=Math.hypot(dx,dy)||1;
        enemy.x+=dx/length*42;enemy.y+=dy/length*42;
        damageEnemy(state,enemy,(18+player.level*1.35)*player.damageMultiplier,'dash');
        state.score+=15;state.shake=Math.max(state.shake,.12);
        state.floaters?.push({x:enemy.x,y:enemy.y-34,text:'CHOQUE +15',life:.8,color:'#9fffe0',scale:1.1,kind:'dash'});
        impactRing(state,enemy.x,enemy.y,'#9fffe0');burst(state,enemy.x,enemy.y,'#9fffe0',14,145);state.audio?.play('kill');
      }else if(player.takeDamage(enemy.damage)){
        state.shake = 0.18;state.audio?.play('damage');
      }
    }
  }
  updateBossZones(state,delta);
  return bossSpawned;
}

function updateBossZones(state,delta){
  state.bossZones ||= [];
  for(const zone of state.bossZones){
    zone.delay-=delta;zone.life-=delta;
    if(zone.delay>0||zone.triggered)continue;
    zone.triggered=true;state.shake=Math.max(state.shake,.2);
    if(zone.kind==='snipe'){
      const dx=zone.targetX-zone.x,dy=zone.targetY-zone.y,length=Math.hypot(dx,dy)||1;
      for(const offset of [-.1,0,.1]){const angle=Math.atan2(dy,dx)+offset;state.enemyProjectiles.push({x:zone.x,y:zone.y,vx:Math.cos(angle)*365,vy:Math.sin(angle)*365,radius:6,damage:zone.damage,life:3,color:'#ff4f9a'});}
    }else{
      const x=zone.kind==='rain'?zone.targetX:zone.x,y=zone.kind==='rain'?zone.targetY:zone.y;
      if(Math.hypot(state.player.x-x,state.player.y-y)<zone.radius+state.player.radius&&state.player.takeDamage(zone.damage)){state.audio?.play('damage');}
      state.rings?.push({x,y,radius:zone.radius,life:.5,maxLife:.5,color:zone.kind==='rain'?'#ffd34f':'#ff5f75'});
      explosionBurst(state,x,y,zone.kind==='rain'?'#ffd34f':'#ff5f75',zone.kind==='rain'?24:32,180);
    }
  }
  state.bossZones=state.bossZones.filter(zone=>zone.life>0);
}

function spawnEnemy(state, canvas, boss = false) {
  const worldW = state.world?.width || 1920;
  const worldH = state.world?.height || 1080;
  const cam = state.camera || { x: (worldW - 960) / 2, y: (worldH - 540) / 2 };
  const p = state.player;

  let px, py;
  if (boss) {
    // Los jefes aparecen a una distancia épica frente a la cámara
    px = Math.max(80, Math.min(worldW - 80, cam.x + 480 + (Math.random() - 0.5) * 160));
    py = Math.max(160, Math.min(worldH - 120, cam.y + 110));
  } else {
    // 70% de spawn alrededor de la pantalla actual (desfasado del jugador) y 30% en sectores dispersos del mapa 1920x1080
    if (Math.random() < 0.7) {
      const side = Math.floor(Math.random() * 4);
      const margin = 40 + Math.random() * 60;
      if (side === 0) { // Arriba de la cámara
        px = cam.x + Math.random() * 960;
        py = cam.y - margin;
      } else if (side === 1) { // Derecha de la cámara
        px = cam.x + 960 + margin;
        py = cam.y + Math.random() * 540;
      } else if (side === 2) { // Abajo de la cámara
        px = cam.x + Math.random() * 960;
        py = cam.y + 540 + margin;
      } else { // Izquierda de la cámara
        px = cam.x - margin;
        py = cam.y + Math.random() * 540;
      }
    } else {
      // Spawn en abanico circular amplio alrededor del jugador (radio 500-750px) para rodearlo orgánicamente
      const angle = Math.random() * Math.PI * 2;
      const dist = 520 + Math.random() * 240;
      px = p.x + Math.cos(angle) * dist;
      py = p.y + Math.sin(angle) * dist;
    }
  }

  px = Math.max(40, Math.min(worldW - 40, px));
  py = Math.max(130, Math.min(worldH - 40, py));
  const position = { x: px, y: py };
  const normalTypes = enemyTypes.filter(type => !type.boss);
  const maxType = state.time > 65 ? normalTypes.length : state.time > 35 ? 5 : state.time > 15 ? 4 : 2;
  const bosses = enemyTypes.filter(record => record.boss);
  const type = boss ? bosses[(state.bossesKilled || 0) % bosses.length] : normalTypes[Math.floor(Math.random() * maxType)];
  if (type.id === 'onion') {
    const angle = Math.random() * Math.PI * 2;
    position.x = Math.max(62, Math.min(worldW - 62, state.player.x + Math.cos(angle) * 165));
    position.y = Math.max(130, Math.min(worldH - 40, state.player.y + Math.sin(angle) * 165));
  }
  const growth = 1 + Math.max(0, state.time - 60) / 300;
  const difficulty = { ...state.difficulty, hp: state.difficulty.hp * growth, speed: state.difficulty.speed * (state.mapId === 'kitchen' ? 1.08 : 1) };
  state.enemies.push(new Enemy({ ...position, type, difficulty }));
}
