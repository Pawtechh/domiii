import { drawFood } from '../core/art.js';
import { modes } from '../systems/directorSystem.js';
const maps = {diner:'01 / LOCAL DOMI',kitchen:'02 / COCINA INDUSTRIAL',parking:'03 / ESTACIONAMIENTO',snow:'04 / BAJO CERO',desert:'05 / DESIERTO',football:'06 / ESTADIO'};
export class Hud {
  constructor() {
    this.root = document.querySelector('#hud');
    this.hpFill = document.querySelector('#hpFill'); this.xpFill = document.querySelector('#xpFill');
    this.buffs = document.querySelector('#activeBuffs');
    this.runBar = document.querySelector('#runBar'); this.bossMeter = document.querySelector('#bossMeter');
    this.dashControl = document.querySelector('#dashControl');
    this.dashControl.addEventListener('animationend', () => this.dashControl.classList.remove('dash-refilled'));
    this.comboMilestones = document.querySelector('#comboMilestones');
    this.comboSteps = Array.from(this.comboMilestones.querySelectorAll('[data-combo-step]')).map(step => ({
      el: step,
      goal: Number(step.dataset.comboStep)
    })).sort((a, b) => a.goal - b.goal);
    this.previousComboStep = -1;
    this.eventBanner = document.querySelector('#eventBanner');
    const stats = document.querySelector('#hudStats');
    stats.innerHTML = '<span>TIEMPO<b id="timeValue">00:00</b></span><span>KOs<b id="killsValue">0</b></span><span>PUNTOS<b id="scoreValue">000000</b></span>';
    this.nodes = Object.fromEntries(['hpValue','levelValue','hudName','hudWeapon','weaponEvolutionStatus','scoreValue','timeValue','killsValue','dashLabel','comboCount','comboMultiplier','comboChain','runLocation','runDifficulty','dashFill','bossFill','bossName','eventName','eventTime'].map(id=>[id,document.getElementById(id)]));
    this.root.addEventListener('animationend',()=>this.root.classList.remove('hud--hit'));
    this.comboMilestones.addEventListener('animationend',()=>this.comboMilestones.classList.remove('combo-milestones--pop'));
  }
  show(isPaused = false) {
    this.root.hidden = false;
    this.runBar.hidden = isPaused;
    this.dashControl.hidden = isPaused;
    this.comboMilestones.hidden = isPaused;
    if (isPaused) {
      this.bossMeter.hidden = true;
      this.eventBanner.hidden = true;
    }
  }
  hide() { this.root.hidden = true; this.runBar.hidden = true; this.dashControl.hidden = true; this.comboMilestones.hidden = true; this.bossMeter.hidden = true; this.eventBanner.hidden = true; }
  set(id, text) { if (this.nodes[id].textContent !== text) this.nodes[id].textContent = text; }
  update(state) {
    const p = state.player;
    if (this.previousLevel !== undefined && p.level > this.previousLevel) {
      this.xpFill.classList.remove('xp-level-up');
      requestAnimationFrame(() => this.xpFill.classList.add('xp-level-up'));
    }
    this.previousLevel = p.level;

    if(this.previousHp!==undefined&&p.hp<this.previousHp){
      this.root.classList.remove('hud--hit');
      requestAnimationFrame(() => this.root.classList.add('hud--hit'));
    }
    this.previousHp=p.hp;
    this.root.dataset.danger=String(p.hp/p.maxHp<.25);
    this.hpFill.style.width = `${Math.max(0,p.hp/p.maxHp*100)}%`;
    this.xpFill.style.width = `${p.xp/p.xpToNext*100}%`;
    this.set('hpValue',`${Math.ceil(p.hp)} / ${p.maxHp}`); this.set('levelValue',`NV ${p.level}`);
    this.set('hudName',p.skin.name); this.set('hudWeapon',p.weaponEvolution?.name||p.weapon.name);
    this.set('weaponEvolutionStatus',p.weaponEvolution?'EVOLUCION ACTIVA':`EVOLUCION ${Math.min(p.level,15)} / 15`);
    this.nodes.weaponEvolutionStatus.dataset.ready=String(Boolean(p.weaponEvolution));
    const nextAbilities = [5, 10, 15].filter(lvl => lvl > p.level);
    const nextAbilityLvl = nextAbilities.length > 0 ? nextAbilities[0] : null;
    const abilityProgress = nextAbilityLvl ? `ACTIVA EN NV ${nextAbilityLvl}` : 'ACTIVAS MAX';
    this.nodes.weaponEvolutionStatus.textContent = p.weaponEvolution ? `${p.weaponEvolution.name.toUpperCase()} · ${abilityProgress}` : `${abilityProgress} (NV ${p.level})`;
    this.set('scoreValue',String(Math.floor(state.score)).padStart(6,'0'));
    this.set('timeValue',formatTime(state.time)); this.set('killsValue',String(state.kills));
    const combo = state.combo || 0;
    const prev = this.previousCombo || 0;
    if (combo > prev && (combo % 5 === 0 || prev === 0)) {
      this.comboMilestones.classList.remove('combo-milestones--pop');
      requestAnimationFrame(() => this.comboMilestones.classList.add('combo-milestones--pop'));
    }
    this.previousCombo = combo;
    const comboMultiplier=Math.min(3,1+Math.floor(combo/5)*.25);
    this.set('comboCount',combo>0?`COMBO ${combo} / x${comboMultiplier.toFixed(2)} / ${state.comboTime.toFixed(1)}s`:'COMBO / x1');
    this.set('comboMultiplier',`x${comboMultiplier.toFixed(2)}`);
    this.set('comboChain',combo?`${combo} KOs`:'INICIÁ LA RACHA');
    this.comboMilestones.dataset.active=String(combo>0);
    if (combo !== this.previousComboStep) {
      this.previousComboStep = combo;
      let nextFound = false;
      for (let i = 0; i < this.comboSteps.length; i++) {
        const item = this.comboSteps[i];
        const reached = combo >= item.goal;
        const isNext = !reached && !nextFound;
        if (isNext) nextFound = true;
        item.el.dataset.reached = String(reached);
        item.el.dataset.next = String(isNext);
      }
    }
    this.nodes.comboCount.style.setProperty('--combo-left',`${Math.max(0,Math.min(1,state.comboTime/3.5))*100}%`);
    this.nodes.comboCount.dataset.active=String(combo>0);
    this.nodes.comboCount.dataset.urgent=String(combo>0&&state.comboTime<1);
    const isDashReady = p.dashCooldown <= 0;
    if (isDashReady && this.wasDashReady === false) this.dashControl.classList.add('dash-refilled');
    this.wasDashReady = isDashReady;
    this.dashControl.setAttribute('aria-disabled', String(!isDashReady));
    this.dashControl.dataset.active = String(p.dashTime > 0);
    this.set('dashLabel',p.dashTime>0?'IMPACTO':p.dashCooldown>0?`${p.dashCooldown.toFixed(1)} s`:'LISTO');
    if (this.dashControl) {
      this.dashControl.dataset.ready = String(isDashReady);
      this.dashControl.classList.toggle('is-ready', isDashReady);
      this.dashControl.classList.toggle('is-cooldown', !isDashReady);
    }
    this.nodes.dashFill.parentElement.parentElement.dataset.ready=String(isDashReady);
    this.nodes.dashFill.style.width = `${Math.max(0, Math.min(1, 1-p.dashCooldown/2.8))*100}%`;
    this.set('runLocation',maps[state.mapId]); this.set('runDifficulty',state.difficulty.name.toUpperCase());
    const progress=state.modeId==='waves'?'OLEADA '+state.wave+'/8':state.modeId==='rush'?'JEFES '+state.bossesKilled+'/3':modes[state.modeId].name.toUpperCase();
    this.nodes.runLocation.title = progress;
    const boss = state.enemies.find(e=>e.isBoss&&e.hp>0);
    this.bossMeter.hidden = !boss;
    if (boss) { this.nodes.bossFill.style.width = `${Math.max(0,boss.hp/boss.maxHp)*100}%`;this.set('bossName',boss.type.name.toUpperCase()); }
    const event=state.activeEvent,snowAlert=state.mapId==='snow'&&(state.mapWarning||state.wasFreezing);
    this.eventBanner.hidden=!(event||snowAlert);
    this.set('eventName',event?event.name:progress);
    this.set('eventTime',event?Math.ceil(state.eventRemaining)+'s':state.modeId==='waves'&&state.waveRest>0?'EN '+Math.ceil(state.waveRest)+'s':'');
    if(snowAlert){
      this.set('eventName',state.wasFreezing?'VENTISCA / SUELO HELADO':'SE ACERCA UNA VENTISCA');
      this.set('eventTime',Math.ceil((state.wasFreezing?34:28)-state.mapClock%34)+'s');
    }
    this.eventBanner.style.setProperty('--event-color',event?.color||'#a2aaa4');
    const labels = [['damageTime','DANO'],['speedTime','VELOCIDAD'],['fireTime','CADENCIA']];
    const activeLabels=labels.filter(([key])=>p.buffs[key]>0).map(([key,label])=>`${label} ${Math.ceil(p.buffs[key])}s`);
    if(p.comboFeverTime>0)activeLabels.push(`FIEBRE ${Math.ceil(p.comboFeverTime)}s`);
    const buffText=activeLabels.join(' / ');
    if(this.buffs.textContent!==buffText)this.buffs.textContent=buffText;
    if(this.skin!==p.skin.id){
      this.skin=p.skin.id;const c=document.querySelector('#hudPortrait').getContext('2d');c.clearRect(0,0,64,64);drawFood(c,p.skin.id,32,30,.85);
    }
  }
}
export function formatTime(seconds) { return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`; }
