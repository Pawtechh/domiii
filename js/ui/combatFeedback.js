import {drawFood} from '../core/art.js';

export function drawCombatFeedback(ctx, state, reducedMotion = false) {
  const p = state.player; ctx.save();

  // Fantasmas de dash
  if (!reducedMotion) for (const ghost of state.dashGhosts || []) {
    ctx.globalAlpha = ghost.life / .18 * .28;
    drawFood(ctx, p.skin.id, ghost.x, ghost.y, .85, 0);
  }
  ctx.globalAlpha = 1;

  // Stable direction marks distinguish the dash from a speed pickup.
  if (p.dashTime > 0) {
    ctx.save(); ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.dashDirection.y,p.dashDirection.x));
    ctx.strokeStyle='#a4ffe1';ctx.lineWidth=3;
    for(let i=0;i<3;i++) { const x=-22-i*15;ctx.beginPath();ctx.moveTo(x-7,-12);ctx.lineTo(x,0);ctx.lineTo(x-7,12);ctx.stroke(); }
    ctx.restore();
  }
    // Modo Dios: Aura dorada omnipotente animada (Zero-blur pixel art)
    if (p.godMode) {
      const pulse = state.time * 6;
      ctx.save();
      // Corona de rayos dorados brillante sin shadowBlur
      ctx.strokeStyle = '#ffd70044'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(p.x, p.y, 85 + Math.sin(pulse) * 8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 85 + Math.sin(pulse) * 8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#fff59d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 65 + Math.cos(pulse * 1.5) * 6, 0, Math.PI * 2); ctx.stroke();
      // Rayos orbitales
      for (let i = 0; i < 6; i++) {
        const a = pulse * 0.7 + i * Math.PI / 3;
        const rx = p.x + Math.cos(a) * 88, ry = p.y + Math.sin(a) * 88;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(rx - 3, ry - 3, 6, 6);
      }
      ctx.restore();
    }

  // Linterna minúscula / luz personal del personaje en cocina a oscuras
  if (state.mapId === 'kitchen') {
    ctx.save();
    const pulse = reducedMotion ? 1 : (1 + Math.sin(state.time * 6) * 0.04);
    // Halo tenue circular alrededor del personaje
    const lantern = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 78 * pulse);
    lantern.addColorStop(0, 'rgba(255, 248, 190, 0.42)');
    lantern.addColorStop(0.35, 'rgba(255, 218, 125, 0.20)');
    lantern.addColorStop(0.7, 'rgba(255, 180, 50, 0.06)');
    lantern.addColorStop(1, 'transparent');
    ctx.fillStyle = lantern;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 78 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Haz sutil de linterna frontal hacia donde mira el personaje
    if (p.facing && (p.facing.x || p.facing.y)) {
      const angle = Math.atan2(p.facing.y, p.facing.x);
      const beam = ctx.createRadialGradient(p.x, p.y, 8, p.x + p.facing.x * 60, p.y + p.facing.y * 60, 115);
      beam.addColorStop(0, 'rgba(255, 252, 210, 0.35)');
      beam.addColorStop(0.5, 'rgba(255, 220, 120, 0.14)');
      beam.addColorStop(1, 'transparent');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, 115, angle - 0.44, angle + 0.44);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  if(p.comboFeverTime>0){
    const pulse=reducedMotion?0:state.time*2.8;ctx.strokeStyle='#ff5d9e';ctx.lineWidth=3;
    for(let i=0;i<3;i++){const a=pulse+i*Math.PI*2/3;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*34,p.y+Math.sin(a)*22,4,0,Math.PI*2);ctx.stroke();}
  }

  for(const zone of state.bossZones||[]){
    const warning=zone.delay>0,pulse=.55+Math.sin(state.time*12)*.25;ctx.save();ctx.globalAlpha=warning?pulse:.35;
    if(zone.kind==='snipe'){
      ctx.strokeStyle='#ff4f9a';ctx.lineWidth=warning?3:7;ctx.setLineDash(warning?[9,7]:[]);ctx.beginPath();ctx.moveTo(zone.x,zone.y);ctx.lineTo(zone.targetX,zone.targetY);ctx.stroke();
      ctx.beginPath();ctx.arc(zone.targetX,zone.targetY,18,0,Math.PI*2);ctx.stroke();
    }else{
      const x=zone.kind==='rain'||zone.kind==='meteor'||zone.kind==='freeze'?zone.targetX:zone.x;
      const y=zone.kind==='rain'||zone.kind==='meteor'||zone.kind==='freeze'?zone.targetY:zone.y;
      const zoneColor = zone.kind==='rain'?'#ffd34f':zone.kind==='freeze'?'#c084fc':zone.kind==='meteor'?'#ff4500':'#ff5f75';
      
      // Sombra pixel-art estilizada en el suelo
      ctx.save();
      const shadowGrad = ctx.createRadialGradient(x, y, 0, x, y, zone.radius);
      shadowGrad.addColorStop(0, zoneColor + '44');
      shadowGrad.addColorStop(0.7, zoneColor + '18');
      shadowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath(); ctx.arc(x, y, zone.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.strokeStyle=zoneColor;ctx.fillStyle=zoneColor+'22';ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc(x,y,zone.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(warning){
        ctx.save();ctx.beginPath();ctx.arc(x,y,zone.radius-3,0,Math.PI*2);ctx.clip();ctx.globalAlpha=.32;ctx.setLineDash([]);ctx.lineWidth=4;
        for(let line=-zone.radius*2;line<zone.radius*2;line+=14){ctx.beginPath();ctx.moveTo(x-zone.radius,line+y-zone.radius);ctx.lineTo(x+zone.radius,line+y+zone.radius);ctx.stroke();}
        ctx.restore();
        // Anillo de cuenta regresiva decreciente para timing perfecto de evasión
        const maxDelay = zone.maxDelay || 1.2;
        const progress = Math.max(0, Math.min(1, zone.delay / maxDelay));
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowColor = zoneColor; ctx.shadowBlur = 10;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(6, zone.radius * progress), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if(zone.kind==='rain')for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x+i*13-8,y-70);ctx.lineTo(x+i*13+5,y-45);ctx.stroke();}
      if(zone.kind==='meteor'){
        ctx.fillStyle='#ff4500';ctx.beginPath();ctx.arc(x,y-50+progress*50,14,0,Math.PI*2);ctx.fill();
      }
    }
    if(warning){
      const x=zone.kind==='rain'||zone.kind==='snipe'||zone.kind==='meteor'||zone.kind==='freeze'?zone.targetX:zone.x;
      const y=zone.kind==='rain'||zone.kind==='snipe'||zone.kind==='meteor'||zone.kind==='freeze'?zone.targetY:zone.y;
      const labelY=Math.max(132,y-zone.radius-25);
      const labelText = zone.kind==='snipe'?'TRIPLE TIRO':
                        zone.kind==='rain'?'LLUVIA DE PAPAS':
                        zone.kind==='meteor'?'METEORITO DE QUESO':
                        zone.kind==='freeze'?'VENTISCA HELADA':'ONDA DE CHOQUE';
      ctx.globalAlpha=1;ctx.setLineDash([]);ctx.fillStyle='#111923ed';ctx.fillRect(x-75,labelY,150,18);
      ctx.fillStyle=zone.kind==='rain'?'#ffe071':zone.kind==='freeze'?'#e9d5ff':zone.kind==='meteor'?'#ff7755':'#ff9ab8';
      ctx.textAlign='center';ctx.font='bold 10px monospace';ctx.fillText(labelText,x,labelY+13);
    }
    ctx.restore();
  }

  for(const boss of state.enemies) {
    if(!boss.isBoss||boss.hp<=0||boss.spawnTime>0)continue;
    const volley=boss.volleyTimer<=.85;
    if(volley) {
      const progress=1-Math.max(0,boss.volleyTimer)/.85;
      const radius=boss.radius+18;
      ctx.strokeStyle='#ff9ba9';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(boss.x,boss.y,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();
      const count=boss.type.bossStyle==='ranged'?14:10;
      // Project the actual firing phase at release, so the preview matches the volley.
      for(let i=0;i<count;i++) {
        const a=i*Math.PI*2/count+(state.time+Math.max(0,boss.volleyTimer))*.4;
        ctx.beginPath();ctx.moveTo(boss.x+Math.cos(a)*radius,boss.y+Math.sin(a)*radius);
        ctx.lineTo(boss.x+Math.cos(a)*(radius+22),boss.y+Math.sin(a)*(radius+22));ctx.stroke();
      }
    }
    if(boss.bossPhase==='telegraph'&&boss.chargeTarget) {
      const angle=Math.atan2(boss.chargeTarget.y-boss.y,boss.chargeTarget.x-boss.x);
      const length=boss.speed*3.15*.82;
      ctx.save();ctx.translate(boss.x,boss.y);ctx.rotate(angle);
      ctx.fillStyle='#ff657326';ctx.fillRect(0,-boss.radius,length,boss.radius*2);
      ctx.strokeStyle='#ff8991';ctx.lineWidth=2;ctx.strokeRect(0,-boss.radius,length,boss.radius*2);
      for(let x=45;x<length;x+=38){ctx.beginPath();ctx.moveTo(x-9,-8);ctx.lineTo(x,0);ctx.lineTo(x-9,8);ctx.stroke();}
      ctx.restore();
    }
    const label=volley?'SALVA RADIAL':boss.bossPhase==='telegraph'?'EMBESTIDA':boss.bossPhase==='recover'?'RECUPERANDO':null;
    if(label) {
      const x=Math.max(90,Math.min(870,boss.x)),y=Math.min(492,boss.y+boss.radius+27);
      ctx.fillStyle='#151b25';ctx.fillRect(x-76,y-13,152,20);ctx.textAlign='center';ctx.font='bold 11px monospace';
      ctx.fillStyle=boss.bossPhase==='recover'&&!volley?'#a4ffe1':'#ffbdc4';ctx.fillText(label,x,y+1);
    }
  }

  // Indicador de cooldown de dash
  ctx.strokeStyle = p.dashCooldown > 0 ? '#7ba998' : '#cde6a3'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 25, 22, 7, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCooldown / 2.8));
  ctx.stroke();

  // Retícula de apuntado
  const target = state.manualAim ? state.aimPoint : state.target;
  if (target && (!target.hp || target.hp > 0)) {
    const size = state.manualAim ? 10 : target.radius + 7;
    ctx.strokeStyle = state.manualAim ? '#f4e7b1' : '#f8d36d8c'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.moveTo(target.x + x * (size - 5), target.y + y * size);
      ctx.lineTo(target.x + x * size, target.y + y * size);
      ctx.lineTo(target.x + x * size, target.y + y * (size - 5));
    }
    ctx.stroke();
    if (state.manualAim) { ctx.fillStyle = '#ffe9b7'; ctx.fillRect(target.x - 1, target.y - 1, 2, 2); }
  }

  ctx.restore();
}

export function drawScreenCombatOverlays(ctx, state, reducedMotion = false) {
  const p = state.player;
  if (!p) return;

  // Borde de peligro (vida baja) — pulsación animada + vignette ajustada a toda la pantalla del viewport (960x540)
  if (p.hp / p.maxHp < 0.25) {
    const pulse = reducedMotion ? 0.7 : 0.55 + Math.sin(performance.now() / 180) * 0.45;
    ctx.save();
    // Vignette roja desde los bordes de la pantalla
    const vg = ctx.createRadialGradient(480, 270, 200, 480, 270, 520);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, `rgba(220, 30, 30, ${pulse * 0.35})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 960, 540);

    // Borde neón pulsante pixel-art en todo el marco de la pantalla
    ctx.strokeStyle = `rgba(255, 60, 60, ${pulse})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 954, 534);

    // Esquinas reforzadas pixel-art de alerta
    ctx.fillStyle = `rgba(255, 80, 80, ${pulse})`;
    ctx.fillRect(0, 0, 24, 6); ctx.fillRect(0, 0, 6, 24);
    ctx.fillRect(936, 0, 24, 6); ctx.fillRect(954, 0, 6, 24);
    ctx.fillRect(0, 534, 24, 6); ctx.fillRect(0, 516, 6, 24);
    ctx.fillRect(936, 534, 24, 6); ctx.fillRect(954, 516, 6, 24);
    ctx.restore();
  }
}
