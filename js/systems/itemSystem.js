import { Item } from '../entities/Item.js';
import { items } from '../data/items.js';
import { distance } from '../core/collision.js';
import { damageEnemy } from './effectSystem.js';

export function updateItems(state, delta, bounds) {
  if (state.player.hp <= 0) return;
  state.itemTimer -= delta;
  if(state.itemTimer<=0 && state.items.length<5){
    state.items.push(spawnItem(bounds));
    state.itemTimer=10+Math.random()*7;
  }
  let activeItems = 0;
  const itemCount = state.items.length;
  const px = state.player.x, py = state.player.y, pr = state.player.radius;
  for (let i = 0; i < itemCount; i++) {
    const item = state.items[i];
    item.update(delta);
    if (item.life <= 0) continue;
    const dx = item.x - px, dy = item.y - py;
    const totalR = item.radius + pr;
    if (dx * dx + dy * dy <= totalR * totalR) {
      applyItem(state, item);
      continue;
    }
    state.items[activeItems++] = item;
  }
  state.items.length = activeItems;
}

export function spawnItem(bounds){
  const pool=Object.values(items);
  const total=pool.reduce((sum,item)=>sum+item.weight,0);
  let roll=Math.random()*total;
  const type=pool.find(item=>(roll-=item.weight)<=0)||pool[0];
  return new Item({type,x:70+Math.random()*(bounds.width-140),y:130+Math.random()*(bounds.height-180)});
}

function applyItem(state,item){
  const {player}=state, type=item.type, power=item.rarity.multiplier;
  const duration=type.duration*power*player.itemDuration;
  if(player.skin.itemHealBonus)player.hp=Math.min(player.maxHp,player.hp+8);
  if(type.kind==='heal'){
    const bonus=player.skin.itemHealBonus?12:0;
    const hpBefore=player.hp;
    player.hp=Math.min(player.maxHp,player.hp+Math.round(type.value*power)+bonus);
    if(player.hp>hpBefore)state.floaters?.push({x:player.x,y:player.y-28,text:`+${Math.round(player.hp-hpBefore)}`,kind:'heal',life:.9,color:'#00ffcc'});
  } else if(type.kind==='damage'){
    player.buffs.damageMultiplier=Math.max(player.buffs.damageMultiplier,1+type.value*power);
    player.buffs.damageTime=Math.max(player.buffs.damageTime,duration);
  } else if(type.kind==='speed'){
    player.buffs.speedMultiplier=Math.max(player.buffs.speedMultiplier,1+type.value*power);
    player.buffs.speedTime=Math.max(player.buffs.speedTime,duration);
  } else if(type.kind==='fire'){
    player.buffs.fireRateMultiplier=Math.min(player.buffs.fireRateMultiplier,1/(1+type.value*power));
    player.buffs.fireTime=Math.max(player.buffs.fireTime,duration);
  } else if(type.kind==='blast'){
    const blastRadius = 155 * power;
    const candidates = (state.spatialGrid && state.spatialGrid.totalEntities > 0)
      ? state.spatialGrid.queryRadius(item.x, item.y, blastRadius)
      : state.enemies;
    const cLen = candidates.length;
    for (let i = 0; i < cLen; i++) {
      const enemy = candidates[i];
      if (distance(item, enemy) < blastRadius) damageEnemy(state, enemy, type.value * power);
    }
    state.rings?.push({x:item.x,y:item.y,radius:blastRadius,life:.6,color:'#ff8860'});
  }
  state.score+=Math.round(15*power);
  state.pickups[type.id]=(state.pickups[type.id]||0)+1;
  state.buildDirty = true;
  state.itemNotice=`${item.rarity.id}: ${type.name}`;
  state.particles.push({x:item.x,y:item.y,vx:0,vy:-70,life:.55,color:item.rarity.color});
}
