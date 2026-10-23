import { Input } from "./core/input.js";
import { drawDiner } from "./core/art.js";
import { drawWorldProps } from "./core/worldProps.js";
import { skins } from "./data/skins.js";
import { phrases } from "./data/phrases.js";
import { getAbilityChoices, applyAbility, abilities as abilityCatalog, rarities } from "./data/abilities.js";
import { updateEnemies } from "./systems/enemySystem.js";
import { updateProjectiles } from "./systems/projectileSystem.js";
import { updatePlayer } from "./systems/playerSystem.js";
import { addSurvivalScore, resolveDeaths } from "./systems/scoreSystem.js";
import { getBestScore, getRanking, saveRun } from "./systems/rankingSystem.js";
import { Hud } from "./ui/hud.js";
import { MenuScreen } from "./ui/menuScreen.js";
import { GameOverScreen } from "./ui/gameOverScreen.js";
import { updateItems } from "./systems/itemSystem.js";
import { AudioSystem } from "./systems/audioSystem.js";
import { recordRun, unlockedAchievements } from "./systems/achievementSystem.js";
import { updateEffects } from './systems/effectSystem.js';
import { createRunState } from './core/runState.js';
import { updateDirector, modes } from './systems/directorSystem.js';
import { companions } from './entities/Companion.js';
import {currentAccount,logout,awardRun} from './systems/accountSystem.js';
import {bindAuth} from './ui/authScreen.js';
import {isOwned} from './data/shop.js';
import {Lobby} from './ui/lobby.js';
import {Shop} from './ui/shop.js';
import {DomiScreen} from './ui/domi.js';
import {updateMap,drawMapObstacles} from './systems/mapSystem.js';
import {primes,updatePrimes,activatePrime,drawPrimeEffects} from './systems/primeSystem.js';
import {icon,refreshIcons,abilityIcons} from './ui/icons.js';
import {canvasPoint} from './core/presentation.js';
import {drawCombatFeedback, drawScreenCombatOverlays} from './ui/combatFeedback.js';
import {drawFloatingText} from './ui/floatingText.js';
import { evolveWeapon } from './data/weaponEvolutions.js';
import { burst } from './systems/effectSystem.js';
import { modLoader } from './mods/ModLoader.js';
import { FrostbiteMod } from './mods/sampleFrostMod.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new Input();
    this.hud = new Hud();
    this.audio = new AudioSystem();
    this.menu = new MenuScreen(this);
    this.gameOver = new GameOverScreen(this);
    this.lobby=new Lobby(this);this.shop=new Shop(this);this.domi=new DomiScreen(this);this.choice=null;
    this.renderSortBuffer = [];
    bindAuth(this);
    modLoader.loadMod(FrostbiteMod);
    document.querySelector('#logoutButton').addEventListener('click',()=>{logout();this.showScreen('authScreen');});
    this.lastSetup = null;
    this.state = null;
    this.lastTime = 0;
    this.running = false;
    this.toast = document.querySelector("#toast");
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    refreshIcons();
    document.querySelector('#aimButton').addEventListener('click',()=>{
      if(!this.running)return;
      this.state.manualAim=!this.state.manualAim;
      this.state.aimPoint ||= {x:Math.min(900,this.state.player.x+120),y:this.state.player.y};
      this.updateAimButton();this.audio.play('navigate');
    });
    canvas.addEventListener('pointermove',event=>{
      if(this.running){
        const point=canvasPoint(canvas.getBoundingClientRect(),960,540,event.clientX,event.clientY);
        if(point){
          const cam = this.state?.camera || { x: 0, y: 0 };
          this.state.aimPoint = { x: point.x + cam.x, y: point.y + cam.y };
        }
      }
    });
    document.querySelector('#pauseButton').addEventListener('click', () => this.pause());
    document.querySelector('#dashControl').addEventListener('click', () => {
      if (this.running && this.state.player.dashCooldown <= 0) this.input.pressed.add(' ');
      document.querySelector('#dashControl').blur();
    });
    document.querySelector('#resumeButton').addEventListener('click', () => this.resume());
    document.querySelector('#abandonButton').addEventListener('click', () => this.endRun('abandoned'));
    document.querySelector('#pauseTabActives')?.addEventListener('click', () => {
      document.querySelector('#pauseTabActives').classList.add('is-active');
      document.querySelector('#pauseTabPassives')?.classList.remove('is-active');
      const av = document.querySelector('#pauseActivesView');
      const pv = document.querySelector('#pausePassivesView');
      if (av) av.hidden = false;
      if (pv) pv.hidden = true;
    });
    document.querySelector('#pauseTabPassives')?.addEventListener('click', () => {
      document.querySelector('#pauseTabPassives').classList.add('is-active');
      document.querySelector('#pauseTabActives')?.classList.remove('is-active');
      const av = document.querySelector('#pauseActivesView');
      const pv = document.querySelector('#pausePassivesView');
      if (av) av.hidden = true;
      if (pv) pv.hidden = false;
    });
    window.addEventListener('keydown', event => {
      if (event.target.closest?.('input, select, textarea')) return;
      if (event.key === 'Escape' && !event.repeat) { if (this.running) this.pause(); else if (this.screenId === 'pauseScreen') this.resume(); }
      if(this.running&&!event.repeat){
        if(this.choice&&['1','2','3'].includes(event.key))document.querySelectorAll('.ability-card')[Number(event.key)-1]?.click();
        if(['q','e','r'].includes(event.key.toLowerCase()))this.triggerPrime(event.key.toLowerCase());
      }
    });
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
    document.addEventListener('keydown', () => this.audio.unlock(), { once: true });
  }

  start() {
    this.showScreen(currentAccount()?'lobbyScreen':'authScreen');
    requestAnimationFrame((time) => this.loop(time));
  }

  showScreen(id) {
    this.screenId = id;
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.toggle("screen--active", screen.id === id);
    });
    if(!['gameScreen','pauseScreen'].includes(id))this.choice=null;
    document.querySelector('#abilityScreen').classList.toggle('screen--active',id==='gameScreen'&&Boolean(this.choice));
    const inRun = ['gameScreen','abilityScreen','pauseScreen'].includes(id);
    const isPaused = id === 'pauseScreen';
    document.querySelector('#app').dataset.playing = String(inRun);
    document.querySelector('#app').dataset.screen=id;
    document.querySelector('#app').dataset.choosing=String(Boolean(this.choice));
    document.querySelector('#combatRail').hidden=!inRun || isPaused;
    if (inRun) {
      this.hud.show(isPaused);
    } else {
      this.hud.hide();
    }
    this.running = id === "gameScreen";
    this.input.enabled = this.running||id==='lobbyScreen';
    this.input.clear();
    this.audio.setScene(id === 'gameScreen' && this.state?.enemies.some(enemy=>enemy.isBoss) ? 'boss' : id);
    if (id === 'menuScreen') document.querySelector('#menuBest').textContent = String(getBestScore()).padStart(6,'0');
    if (id !== 'gameScreen') { clearTimeout(this.toastTimer); this.toast.hidden = true; }
    if (!inRun || isPaused) this.hud.eventBanner.hidden = true;
    document.querySelector('#primeBar').hidden=!inRun || isPaused;
    if(id==='lobbyScreen')this.lobby.enter();
    if (id === 'pauseScreen') this.renderBuild();
    if(id==='domiScreen')this.domi.render();
    if (id !== 'gameScreen' && id !== 'abilityScreen') {
      document.querySelector('#'+id)?.querySelector('button:not(:disabled),input')?.focus({preventScroll:true});
    } else if (id === 'gameScreen') document.activeElement?.blur();
  }

  pause() { if (this.running) { this.showScreen('pauseScreen'); document.querySelector('#resumeButton').focus(); } }
  resume() { if (this.screenId === 'pauseScreen') this.showScreen('gameScreen'); }

  renderBuild() {
    const p = this.state?.player;
    if (!p) return;
    // Portrait del personaje
    const portraitCanvas = document.querySelector('#pauseHudPortrait');
    if (portraitCanvas) {
      const c = portraitCanvas.getContext('2d');
      c.clearRect(0, 0, 40, 40);
      drawFood(c, p.skin.id, 20, 18, 0.55);
    }

    // Datos del HUD en la pausa (idéntico al HUD del juego)
    const nameEl = document.querySelector('#pauseHudSkinName');
    if (nameEl) nameEl.textContent = p.skin.name;
    const wepEl = document.querySelector('#pauseHudWeaponName');
    if (wepEl) wepEl.textContent = p.weaponEvolution ? p.weaponEvolution.name : p.weapon.name;
    const timeEl = document.querySelector('#pauseHudTime');
    if (timeEl) timeEl.textContent = formatTime(this.state.time);

    const hpVal = document.querySelector('#pauseHpValue');
    if (hpVal) hpVal.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    const hpFill = document.querySelector('#pauseHpFill');
    if (hpFill) hpFill.style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;

    // Efectos activos con el MISMO formato del HUD del juego
    const buffsEl = document.querySelector('#pauseActiveBuffs');
    if (buffsEl) {
      const labels = [['damageTime', 'DANO'], ['speedTime', 'VELOCIDAD'], ['fireTime', 'CADENCIA']];
      const activeLabels = labels.filter(([key]) => p.buffs[key] > 0).map(([key, label]) => `${label} ${Math.ceil(p.buffs[key])}s`);
      if (p.comboFeverTime > 0) activeLabels.push(`FIEBRE ${Math.ceil(p.comboFeverTime)}s`);
      buffsEl.textContent = activeLabels.length ? activeLabels.join(' / ') : 'NINGUNO (SIN BUFFS)';
    }

    const lvlEl = document.querySelector('#pauseLevelValue');
    if (lvlEl) lvlEl.textContent = p.level;
    const killsEl = document.querySelector('#pauseKillsValue');
    if (killsEl) killsEl.textContent = this.state.kills;
    const scoreEl = document.querySelector('#pauseScoreValue');
    if (scoreEl) scoreEl.textContent = Math.floor(this.state.score).toLocaleString('es-AR');
    const combo = this.state.combo || 0;
    const comboMult = Math.min(3, 1 + Math.floor(combo / 5) * 0.25);
    const comboEl = document.querySelector('#pauseComboValue');
    if (comboEl) comboEl.textContent = combo > 0 ? `x${comboMult.toFixed(2)} (${combo})` : 'x1.00';
    const passivesRoot = document.querySelector('#buildList');
    const activesRoot = document.querySelector('#pauseActivesList');
    const goalEl = document.querySelector('#pauseGoal');
    if (goalEl && modes[this.state.modeId]) goalEl.textContent = modes[this.state.modeId].goal;

    // 1. Habilidades Pasivas Adquiridas
    if (passivesRoot) {
      passivesRoot.replaceChildren();
      const entries = Object.entries(p.abilities || {});
      const evo = p.weaponEvolution;

      if (evo) {
        const card = document.createElement('div');
        card.className = 'pause-card pause-card--evo';
        card.innerHTML = `
          <div class="pause-card-head">
            <span class="pause-badge pause-badge--evo">EVOLUCIÓN</span>
            <strong class="pause-card-title">${evo.name}</strong>
          </div>
          <p class="pause-card-desc">${evo.description}</p>
        `;
        passivesRoot.append(card);
      }

      for (const [id, count] of entries) {
        const ab = abilityCatalog.find(x => x.id === id);
        const card = document.createElement('div');
        card.className = 'pause-card';
        const isMax = count >= (ab?.maxStacks || count);
        card.innerHTML = `
          <div class="pause-card-head">
            <span class="pause-badge">${ab?.category || 'PASIVA'}</span>
            <strong class="pause-card-title">${ab?.name || id}</strong>
            <span class="pause-level ${isMax ? 'is-max' : ''}">${isMax ? '¡MAX!' : `Nivel ${count}/${ab?.maxStacks || count}`}</span>
          </div>
          <p class="pause-card-desc">${ab?.description || 'Mejora pasiva activa en el turno.'}</p>
        `;
        passivesRoot.append(card);
      }

      if (!entries.length && !evo) {
        const empty = document.createElement('div');
        empty.className = 'pause-empty-msg';
        empty.textContent = 'Aún no elegiste mejoras pasivas. ¡Subí de nivel durante la partida para desbloquear recetas!';
        passivesRoot.append(empty);
      }
    }

    // 2. Habilidades Activas Desbloqueables
    if (activesRoot) {
      activesRoot.replaceChildren();
      const currentLevel = p.level || 1;
      const actives = [
        {
          key: 'Q',
          name: primes[0].name,
          levelReq: 5,
          desc: '20 disparos en todas direcciones. Recarga: 18 s.',
          isUnlocked: currentLevel >= 5
        },
        {
          key: 'E',
          name: primes[1].name,
          levelReq: 10,
          desc: 'Un clon distrae enemigos hasta 5 s. Recarga: 28 s.',
          isUnlocked: currentLevel >= 10
        },
        {
          key: 'R',
          name: primes[2].name,
          levelReq: 15,
          desc: 'Inmunidad por 3,5 s y empuje cercano. Recarga: 40 s.',
          isUnlocked: currentLevel >= 15
        },
        {
          key: 'ESPACIO',
          name: 'ACELERÓN / EMBESTIDA',
          levelReq: 1,
          desc: 'Esquiva y golpea al atravesar enemigos. Recarga: 2,8 s.',
          isUnlocked: true
        }
      ];

      for (const act of actives) {
        const card = document.createElement('div');
        card.className = `pause-active-card ${act.isUnlocked ? 'is-unlocked' : 'is-locked'}`;
        card.innerHTML = `
          <div class="pause-active-key"><kbd>${act.key}</kbd></div>
          <div class="pause-active-info">
            <div class="pause-active-head">
              <strong class="pause-active-title">${act.name}</strong>
              <span class="pause-active-status ${act.isUnlocked ? 'status--unlocked' : 'status--locked'}">
                ${act.isUnlocked ? 'DESBLOQUEADA' : `NIVEL ${act.levelReq}`}
              </span>
            </div>
            <p class="pause-active-desc">${act.desc}</p>
          </div>
        `;
        activesRoot.append(card);
      }
    }
  }

  showRanking() {
    const ranking = currentAccount()?.runs||getRanking();
    const list = document.querySelector("#rankingList");
    list.replaceChildren();
    for (const run of ranking) {
      const row = document.createElement('li'), name = document.createElement('strong');
      name.textContent = run.name||currentAccount()?.name||'Jugador'; row.append(name, ` / ${run.score} pts / NV ${run.level||'?'} / ${run.timeText} / ${run.date}`); list.append(row);
    }
    if (!ranking.length) { const row = document.createElement('li'); row.textContent = 'El primer lugar te esta esperando.'; list.append(row); }
    this.showScreen("rankingScreen");
  }

  startRun(setup) {
    const account=currentAccount();if(!account){this.showScreen('authScreen');return;}
    setup={...setup,name:account.name,skinId:isOwned(account,'skin',setup.skinId)?setup.skinId:'pancho',mapId:isOwned(account,'map',setup.mapId)?setup.mapId:'diner',companionId:isOwned(account,'pet',setup.companionId)?setup.companionId:'none',accessoryId:isOwned(account,'accessory',setup.accessoryId)?setup.accessoryId:'none'};
    this.canvas.width = 960;
    this.canvas.height = 540;
    this.lastSetup = setup;
    this.state = createRunState(setup, this.audio);
    this.state.buildDirty = true;
    this.choice=null;this.buildSignature=null;this.updateAimButton();
    this.audio.unlock();
    this.hud.update(this.state);
    this.showScreen("gameScreen");
    this.showToast("Pedido #002. Que empiece el turno.");
  }

  restartLastRun() {
    this.startRun(this.lastSetup || { name: "Pancho", skinId: "pancho", weaponId: "fork", difficultyId: "picante" });
  }

  loop(time) {
    const delta = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    this.drawBackground();
    if(this.screenId==='lobbyScreen')this.lobby.update(delta,this.input);
    if(this.screenId==='shopScreen')this.shop.update(time/1000);
    if(this.screenId==='domiScreen')this.domi.update(time/1000);
    if (this.state && ['gameScreen','abilityScreen','pauseScreen'].includes(this.screenId)) {
      if (this.running) this.update(delta);
      this.draw();
    }
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(delta) {
    const state = this.state;
    state.time += delta;
    state.delta = delta;
    state.shake = Math.max(0, state.shake - delta);

    // Rebuild Spatial Hash Grid for O(1) broadphase queries
    if (state.spatialGrid) {
      state.spatialGrid.clear();
      const enemyLen = state.enemies.length;
      for (let i = 0; i < enemyLen; i++) {
        const e = state.enemies[i];
        if (e.hp > 0) state.spatialGrid.insert(e);
      }
    }

    // Update Player modular skills
    state.player.skills?.update(delta, state);

    updateDirector(state, delta, this.canvas);
    updatePrimes(state,delta);updateMap(state,delta);
    if (state.bossIntro) {
      state.bossIntro.timer -= delta;
      if (state.bossIntro.timer <= 0) state.bossIntro = null;
    }
    if (state.directorNotice) { this.showToast(state.directorNotice); state.directorNotice = ''; }
    const before = { x:state.player.x, y:state.player.y };
    const dashBefore=state.player.dashTime;
    const bounds = state.world || this.canvas;
    updatePlayer(state, delta, this.input, bounds);
    if(dashBefore<=0&&state.player.dashTime>0){
      this.audio.play('dash');
      const dashEl = document.querySelector('#dashControl');
      if (dashEl) {
        dashEl.classList.remove('dash-active');
        requestAnimationFrame(() => dashEl.classList.add('dash-active'));
        setTimeout(() => dashEl.classList.remove('dash-active'), 220);
      }
    }
    state.distance += Math.hypot(state.player.x - before.x, state.player.y - before.y);

    // Suave seguimiento de cámara al jugador
    if (state.camera && state.world) {
      const targetCamX = Math.max(0, Math.min(state.world.width - 960, state.player.x - 480));
      const targetCamY = Math.max(0, Math.min(state.world.height - 540, state.player.y - 270));
      state.camera.x += (targetCamX - state.camera.x) * Math.min(1, delta * 8.5);
      state.camera.y += (targetCamY - state.camera.y) * Math.min(1, delta * 8.5);
    }

    updateEffects(state, delta);
    for (const hazard of state.hazards) hazard.life -= delta;
    state.hazards = state.hazards.filter(hazard => hazard.life > 0);
    for (const hazard of state.hazards) {
      const pdx = hazard.x - state.player.x, pdy = hazard.y - state.player.y;
      const pr = hazard.radius + state.player.radius;
      if (pdx * pdx + pdy * pdy < pr * pr) {
        state.player.buffs.slowTime = Math.max(state.player.buffs.slowTime, 0.35);
      }
      if (hazard.isKetchupPuddle) {
        const puddleCandidates = (state.spatialGrid && state.spatialGrid.totalEntities > 0)
          ? state.spatialGrid.queryRadius(hazard.x, hazard.y, hazard.radius + 25)
          : state.enemies;
        const pLen = puddleCandidates.length;
        const hr = hazard.radius;
        for (let k = 0; k < pLen; k++) {
          const enemy = puddleCandidates[k];
          if (enemy.hp <= 0) continue;
          const edx = hazard.x - enemy.x, edy = hazard.y - enemy.y;
          const er = hr + enemy.radius;
          if (edx * edx + edy * edy < er * er) {
            enemy.speedMultiplier = Math.min(enemy.speedMultiplier || 1, 0.55);
            if (Math.random() < 0.15) {
              enemy.hp -= 2.5 * delta * (state.player.buffs.damageMultiplier || 1);
            }
          }
        }
      }
    }
    if (updateEnemies(state, delta, bounds)) this.announceBoss();
    state.companion.update(state, delta);
    updateProjectiles(state, delta, bounds);
    updateItems(state, delta, bounds);
    if (state.itemNotice) { this.showToast(state.itemNotice); this.audio.play('pickup'); state.itemNotice = ''; }
    resolveDeaths(state, (isAbilityLevel) => this.onLevelUp(isAbilityLevel));
    if (state.bossDefeated) {
      state.bossDefeated = false;
      this.showToast(phrases.bossDefeated[Math.floor(Math.random() * phrases.bossDefeated.length)]);
      this.audio.play('boss');
      this.audio.setScene('gameScreen');
    }
    addSurvivalScore(state, delta);
    this.hud.update(state);
    if (state.player.hp <= 0) {
      this.endRun();
    } else if (state.victory || (state.modeId === 'rush' && state.bossesKilled >= 3)) {
      this.endRun('victory');
    } else if (state.pendingLevels > 0&&!this.choice) {
      this.showAbilityChoices();
    }
    if(this.choice){this.choice.remaining-=delta;document.querySelector('#abilityTimerFill').style.width=`${Math.max(0,this.choice.remaining/this.choice.duration*100)}%`;if(this.choice.remaining<=0)this.dismissAbility();}
    this.renderPrimeBar();
    this.renderLiveBuild();
  }

  onLevelUp(isAbilityLevel = true) {
    if (isAbilityLevel) {
      this.state.pendingLevels += 1;
    }
    this.state.score = (this.state.score || 0) + 50;
    // Pequeño buff pasivo por nivel regular para recompensar el progreso
    this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 12);
    if (!isAbilityLevel) {
      this.state.floaters?.push({
        x: this.state.player.x,
        y: this.state.player.y - 36,
        text: `NV ${this.state.player.level} (+12 HP)`,
        life: 0.9,
        color: '#86e3bf',
        scale: 1.1
      });
    }
    // Modo Dios al Nivel 3: Aura dorada omnipotente
    if (this.state.player.level === 3) {
      this.state.player.godMode = true;
      this.state.player.invulnerable = Math.max(this.state.player.invulnerable, 999);
      this.state.player.buffs.damageMultiplier = Math.max(this.state.player.buffs.damageMultiplier, 10);
      this.state.directorNotice = '¡MODO DIOS ACTIVADO! / ANIQUILACIÓN TOTAL';
      this.state.shake = Math.max(this.state.shake || 0, 0.45);
      this.state.rings.push({ x: this.state.player.x, y: this.state.player.y, radius: 180, life: 1.5, maxLife: 1.5, color: '#ffd700' });
      burst(this.state, this.state.player.x, this.state.player.y, '#ffd700', 50, 300);
      this.audio?.play('level');
    }

    const evolution=evolveWeapon(this.state.player);
    if(evolution){
      const player=this.state.player;
      this.state.directorNotice=`EVOLUCION / ${evolution.name.toUpperCase()}`;
      this.state.rings.push({x:player.x,y:player.y,radius:95,life:.9,maxLife:.9,color:'#ffe569'});
      burst(this.state,player.x,player.y,'#ffe569',34,210);
      this.state.shake=Math.max(this.state.shake||0,.24);
      this.audio?.play('level');this.buildSignature=null;
    }
  }

  showAbilityChoices() {
    if(this.choice)return;
    const choices = getAbilityChoices(this.state.player);
    if (choices.length === 0) {
      this.state.pendingLevels = 0;
      return;
    }
    const options = document.querySelector("#abilityOptions");
    options.replaceChildren();
    choices.forEach((ability, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ability-card";
      const count = this.state.player.abilities[ability.id] || 0;
      button.innerHTML = `<kbd class="pixel-key choice-key">${index+1}</kbd><span class="ability-icon">${icon(abilityIcons[ability.id]||'Sparkles')}</span><span class="ability-card__top"><span>${ability.category}</span><span>${count+1}/${ability.maxStacks}</span></span><strong>${ability.name}</strong><span class="ability-card__description">${ability.description}</span>`;
      button.setAttribute('aria-keyshortcuts',String(index+1));
      button.setAttribute('aria-label',`Tecla ${index+1}: ${ability.name}. ${ability.description}. Nivel ${count+1} de ${ability.maxStacks}`);
      button.addEventListener("click", () => this.chooseAbility(ability), { once: true });
      options.append(button);
    });
    this.choice={remaining:9,duration:9};
    document.querySelector('#abilityScreen').classList.add('screen--active');
    document.querySelector('#app').dataset.choosing='true';
  }

  chooseAbility(ability) {
    if (!this.choice||!applyAbility(this.state.player, ability)) return;
    this.audio?.play('level');
    this.state.buildDirty = true;
    this.dismissAbility();
    this.hud.update(this.state);
    this.renderLiveBuild();
    this.showToast(phrases.levelUp[Math.floor(Math.random() * phrases.levelUp.length)]);
  }

  dismissAbility(){if(!this.choice)return;this.choice=null;this.state.pendingLevels=Math.max(0,this.state.pendingLevels-1);document.querySelector('#abilityScreen').classList.remove('screen--active');document.querySelector('#app').dataset.choosing='false';document.activeElement?.blur();}

  triggerPrime(key){
    if(!this.running||!activatePrime(this.state,key))return false;
    this.audio.play('level');this.showToast(primes.find(prime=>prime.key===key).name.toUpperCase());return true;
  }

  updateAimButton(){
    const manual=Boolean(this.state?.manualAim),button=document.querySelector('#aimButton');
    button.setAttribute('aria-pressed',String(manual));
    button.title=manual?'Punteria manual / mouse':'Punteria automatica / enemigo cercano';
    this.canvas.style.cursor=manual?'crosshair':'default';
  }

  renderLiveBuild(){
    if (!this.state?.buildDirty && this.buildSignature) {
      const next=primes.find(prime=>prime.level>this.state.player.level);
      const nextLabel=next?'ACTIVA EN NIVEL '+next.level:'ACTIVAS COMPLETAS';
      const labelNode=document.querySelector('#nextPrimeLabel');
      if (labelNode && labelNode.textContent !== nextLabel) labelNode.textContent = nextLabel;
      return;
    }
    if (this.state) this.state.buildDirty = false;
    const entries=Object.entries(this.state.player.abilities),evolution=this.state.player.weaponEvolution;
    const pickups=Object.entries(this.state.pickups||{});
    const signature=JSON.stringify(entries)+'/'+(evolution?.id||'base')+'/'+JSON.stringify(pickups);
    if(signature!==this.buildSignature){
      this.buildSignature=signature;const root=document.querySelector('#liveBuild');root.replaceChildren();
      const rarityWeights = { legendary: 4, epic: 3, rare: 2, common: 1 };
      const sorted = [...entries].sort((a,b)=>{
        const abA = abilityCatalog.find(x => x.id === a[0]);
        const abB = abilityCatalog.find(x => x.id === b[0]);
        const wA = rarityWeights[abA?.rarity || 'common'] || 1;
        const wB = rarityWeights[abB?.rarity || 'common'] || 1;
        if(wB !== wA) return wB - wA;
        return b[1] - a[1];
      });
      for(const [id,count] of sorted){
        const ability=abilityCatalog.find(x=>x.id===id);
        const rarity=ability?.rarity||'common';
        const isMax=count>=(ability?.maxStacks||count);
        const token=document.createElement('div');
        token.className=`build-token build-token--${rarity}`;
        token.dataset.rarity=rarity;
        token.dataset.max=String(isMax);
        token.tabIndex=0;
        const countBadge = isMax ? 'MAX' : `x${count}`;
        const rarityName = rarities[rarity]?.name || rarity;
        token.innerHTML=`
          <div class="token-frame">
            <span class="token-rarity-gem"></span>
            ${icon(abilityIcons[id]||'Sparkles','token-icon')}
            <b class="token-stack">${countBadge}</b>
          </div>
          <div class="build-tooltip">
            <div class="tooltip-header">
              <span class="tooltip-rarity">${rarityName.toUpperCase()}</span>
              <strong>${ability?.name||id}</strong>
            </div>
            <p class="tooltip-desc">${ability?.description||''}</p>
            <div class="tooltip-meta">NIVEL ${count}/${ability?.maxStacks||count}${isMax?' · ¡COMPLETO!':''}</div>
          </div>
        `;
        root.append(token);
      }
      if(evolution){
        const token=document.createElement('div');
        token.className='build-token build-token--evolution';
        token.tabIndex=0;
        token.innerHTML=`
          <div class="token-frame">
            <span class="token-rarity-gem"></span>
            ${icon('Zap','token-icon')}
            <b class="token-stack">EV</b>
          </div>
          <div class="build-tooltip">
            <div class="tooltip-header">
              <span class="tooltip-rarity">EVOLUCIÓN</span>
              <strong>${evolution.name}</strong>
            </div>
            <p class="tooltip-desc">${evolution.description}</p>
          </div>
        `;
        root.prepend(token);
      }
      // Fichas de consumibles recolectados
      const itemIcons = { ketchup: 'Flame', mayo: 'Heart', mustard: 'Zap', hotSauce: 'Sparkles', barbecue: 'Bomb' };
      for (const [pId, pCount] of pickups) {
        if (!pCount) continue;
        const token = document.createElement('div');
        token.className = 'build-token build-token--consumable';
        token.tabIndex = 0;
        token.innerHTML = `
          <div class="token-frame">
            <span class="token-rarity-gem" style="background:#00e5ff;color:#00e5ff;"></span>
            ${icon(itemIcons[pId] || 'Package', 'token-icon')}
            <b class="token-stack">x${pCount}</b>
          </div>
          <div class="build-tooltip">
            <div class="tooltip-header">
              <span class="tooltip-rarity" style="color:#00e5ff;">CONSUMIBLE</span>
              <strong>${pId.toUpperCase()}</strong>
            </div>
            <p class="tooltip-desc">Recolectado en el turno.</p>
            <div class="tooltip-meta">${pCount} veces obtenido</div>
          </div>
        `;
        root.append(token);
      }
      if(!entries.length&&!evolution&&!pickups.length)root.textContent='Receta original';
    }
    const next=primes.find(prime=>prime.level>this.state.player.level);
    document.querySelector('#nextPrimeLabel').textContent=next?'ACTIVA EN NIVEL '+next.level:'ACTIVAS COMPLETAS';
  }

  renderPrimeBar(){
    const root=document.querySelector('#primeBar');if(root.hidden||!this.state)return;
    for(const [index,prime] of primes.entries()){
      let node=root.querySelector('[data-prime="'+prime.key+'"]');
      if(!node){
        node=document.createElement('button');node.type='button';node.dataset.prime=prime.key;node.className='prime-slot';
        node.innerHTML='<kbd class="prime-key pixel-key">'+prime.key.toUpperCase()+'</kbd><span class="prime-symbol"></span><span class="prime-label"></span><span class="prime-cool"></span><i></i>';
        node.setAttribute('aria-keyshortcuts',prime.key);
        node.onclick=()=>this.triggerPrime(prime.key);root.append(node);
      }
      const locked=this.state.player.level<prime.level,cool=this.state.primeCooldowns[prime.key],status=locked?'locked':cool>0?'cooldown':'ready';
      node.disabled=locked||cool>0;node.dataset.ready=String(status==='ready');
      if(node.dataset.status!==status){
        const previousStatus=node.dataset.status;
        node.dataset.status=status;node.querySelector('.prime-symbol').innerHTML=icon(locked?'LockKeyhole':['Radio','Copy','ShieldCheck'][index]);
        node.querySelector('.prime-label').textContent=locked?'NIVEL '+prime.level:prime.name;
        if(status==='ready'&&previousStatus){
          node.classList.remove('prime-ready-flash');
          requestAnimationFrame(() => node.classList.add('prime-ready-flash'));
          node.addEventListener('animationend',()=>node.classList.remove('prime-ready-flash'),{once:true});
        }
      }
      const remaining=!locked&&cool>0?Math.ceil(cool)+'s':'';
      node.querySelector('.prime-cool').textContent=remaining;
      node.querySelector('.prime-cool').hidden=!remaining;
      node.querySelector('i').style.width=(locked?0:100*(1-cool/prime.cooldown))+'%';
      node.style.setProperty('--charge',(locked?0:100*(1-(cool||0)/prime.cooldown))+'%');
      node.title=prime.name+' / '+prime.key.toUpperCase()+(locked?' / desbloquea en nivel '+prime.level:remaining?' / '+remaining:' / lista');
      node.setAttribute('aria-label',node.title);
    }
  }

  endRun(outcome = 'defeat') {
    if (!this.state || this.screenId === 'gameOverScreen') return;
    const previousBest = getBestScore();
    const result = {
      id:crypto.randomUUID(),
      name: this.state.player.name,
      score: Math.floor(this.state.score),
      time: Math.floor(this.state.time),
      timeText: this.formatTime(this.state.time),
      kills: this.state.kills,
      level: this.state.player.level,
      skin: this.state.player.skin.name,
      weapon: this.state.player.weapon.name,
      difficulty: this.state.difficulty.name,
      map: this.state.mapId,
      bossesKilled: this.state.bossesKilled,
      distance: Math.floor(this.state.distance),
      pickups: this.state.pickups,
      mode: modes[this.state.modeId].name,
      modeId: this.state.modeId,
      companion: companions[this.state.companion.id].name,
      peakCombo: this.state.peakCombo,
      outcome,
      wave: this.state.wave,
      abilities: {...this.state.player.abilities},
    };
    const previousUnlocks = new Set(unlockedAchievements().map(item=>item.id));
    result.newAchievements = recordRun(result).filter(item=>!previousUnlocks.has(item.id)).map(item=>item.name);
    this.audio.play('death');
    saveRun(result);
    awardRun(result);
    this.running = false;
    this.hud.hide();
    this.gameOver.render(result, previousBest);
    this.showScreen("gameOverScreen");
    // Celebración visual si hay nuevos desbloqueos
    if (result.newAchievements?.length) {
      setTimeout(() => {
        const summary = document.querySelector('#gameOverScreen .result-summary');
        const unlock = document.querySelector('#gameOverScreen .result-unlock');
        if (summary) summary.classList.add('unlock-pop');
        if (unlock) unlock.classList.add('unlock-pop');
      }, 300);
    }
  }

  draw() {
    const state = this.state;
    const cam = state.camera || { x: 0, y: 0 };
    const time = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : this.lastTime / 1000;

    this.ctx.save();
    if (state.shake > 0 && !this.reducedMotion) {
      this.ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }

    // Cámara en espacio de mundo
    this.ctx.save();
    this.ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    // Dibujamos el suelo y props del mundo en coordenadas mundiales
    const worldW = state.world?.width || 1920;
    const worldH = state.world?.height || 1080;
    drawDiner(this.ctx, worldW, worldH, time, false, state.mapId);
    drawWorldProps(this.ctx, state.mapId || 'diner', time);

    for (const hazard of state.hazards) {
      this.ctx.save();
      if (hazard.isKetchupPuddle) {
        this.ctx.globalAlpha = Math.min(0.7, hazard.life * 0.18);
        this.ctx.fillStyle = '#b31818';
        this.ctx.beginPath();
        this.ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#e52c2c';
        this.ctx.beginPath();
        this.ctx.arc(hazard.x - 3, hazard.y - 3, hazard.radius * 0.55, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.globalAlpha = Math.min(.25, hazard.life * .05);
        this.ctx.fillStyle = '#c898ee';
        this.ctx.beginPath();
        this.ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
    drawMapObstacles(this.ctx,state);
    drawCombatFeedback(this.ctx,state,this.reducedMotion);

    // Frustum / Viewport Culling Bounds (screen 960x540 + margin)
    const minCamX = cam.x - 70, maxCamX = cam.x + 960 + 70;
    const minCamY = cam.y - 80, maxCamY = cam.y + 540 + 80;

    for (let i = 0; i < state.items.length; i++) {
      const it = state.items[i];
      if (it.x >= minCamX && it.x <= maxCamX && it.y >= minCamY && it.y <= maxCamY) {
        it.draw(this.ctx, state.time);
      }
    }
    if (state.player.auraLevel) {
      this.ctx.strokeStyle='#86e3bf44';this.ctx.lineWidth=2;this.ctx.beginPath();this.ctx.arc(state.player.x,state.player.y,105,0,Math.PI*2);this.ctx.stroke();
    }
    for (const ring of state.rings) {
      const remaining=Math.max(0,Math.min(1,ring.life/(ring.maxLife||ring.life||1)));
      this.ctx.save();this.ctx.globalAlpha=remaining;this.ctx.strokeStyle=ring.color;this.ctx.lineWidth=1+3*remaining;
      this.ctx.beginPath();this.ctx.arc(ring.x,ring.y,ring.radius*(.25+.75*(1-remaining)),0,Math.PI*2);this.ctx.stroke();this.ctx.restore();
    }
    this.ctx.save();this.ctx.globalCompositeOperation='lighter';
    const projLen = state.projectiles.length;
    for (let i = 0; i < projLen; i++) {
      const projectile = state.projectiles[i];
      if (projectile.x >= minCamX && projectile.x <= maxCamX && projectile.y >= minCamY && projectile.y <= maxCamY) {
        projectile.draw(this.ctx);
      }
    }
    for (const shot of state.enemyProjectiles) {
      if (shot.x < minCamX || shot.x > maxCamX || shot.y < minCamY || shot.y > maxCamY) continue;
      const speed=Math.hypot(shot.vx,shot.vy)||1;
      for(let i=0;i<(shot.trail?.length||0);i++){const point=shot.trail[i],ratio=(i+1)/shot.trail.length,s=Math.max(1,shot.radius*ratio*.8);this.ctx.globalAlpha=ratio*.35;this.ctx.fillStyle=shot.color||'#ff6573';this.ctx.fillRect(point.x-s/2,point.y-s/2,s,s);}
      this.ctx.globalAlpha=1;
      this.ctx.strokeStyle=(shot.color||'#ff6573')+'99';this.ctx.lineWidth=shot.radius;
      this.ctx.beginPath();this.ctx.moveTo(shot.x-shot.vx/speed*18,shot.y-shot.vy/speed*18);this.ctx.lineTo(shot.x,shot.y);this.ctx.stroke();
      this.ctx.fillStyle=shot.color||'#ff6874';
      this.ctx.beginPath();this.ctx.arc(shot.x,shot.y,shot.radius,0,Math.PI*2);this.ctx.fill();
      this.ctx.fillStyle='#fff0d8';this.ctx.beginPath();this.ctx.arc(shot.x,shot.y,shot.radius*.4,0,Math.PI*2);this.ctx.fill();
    }
    this.ctx.restore();

    // Reusable sort buffer with viewport culling (only visible actors sorted and drawn)
    this.renderSortBuffer.length = 0;
    const enemyLen = state.enemies.length;
    for (let i = 0; i < enemyLen; i++) {
      const e = state.enemies[i];
      if (e.isBoss || (e.x >= minCamX && e.x <= maxCamX && e.y >= minCamY && e.y <= maxCamY)) {
        this.renderSortBuffer.push(e);
      }
    }
    this.renderSortBuffer.push(state.player);
    if (state.companion) this.renderSortBuffer.push(state.companion);
    this.renderSortBuffer.sort((a,b)=>a.y-b.y);
    const actorLen = this.renderSortBuffer.length;
    for (let i = 0; i < actorLen; i++) {
      this.renderSortBuffer[i].draw(this.ctx, state.time);
    }
    drawPrimeEffects(this.ctx,state);
    this.ctx.save();this.ctx.globalCompositeOperation='lighter';
    for (const p of state.particles) {
      if (p.x < minCamX || p.x > maxCamX || p.y < minCamY || p.y > maxCamY) continue;
      const ratio=Math.max(0,Math.min(1,p.life/(p.maxLife||.6))),palette=p.palette||[p.color],index=Math.min(palette.length-1,Math.floor((1-ratio)*palette.length));
      this.ctx.globalAlpha = ratio;
      this.ctx.fillStyle = palette[index]||p.color;
      const s = (p.size || 4)*(.25+.75*ratio);
      this.ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
    }
    this.ctx.restore();
    this.ctx.globalAlpha = 1;
    this.ctx.textAlign='center';
    for (const text of state.floaters) {
      if (text.x >= minCamX && text.x <= maxCamX && text.y >= minCamY && text.y <= maxCamY) {
        drawFloatingText(this.ctx,text,this.reducedMotion);
      }
    }
    this.ctx.restore(); // Salimos del espacio de mundo (cámara)

    // Overlays en coordenadas de pantalla (960x540)
    this.ctx.globalAlpha=1;
    drawScreenCombatOverlays(this.ctx, state, this.reducedMotion);
    if(state.player.hitFlash>0&&!this.reducedMotion){this.ctx.strokeStyle=`rgba(255,80,75,${state.player.hitFlash*3})`;this.ctx.lineWidth=12;this.ctx.strokeRect(6,6,948,528);}

    // Animación de aparición cinemática del Jefe (Pixel Art Boss Intro)
    if (state.bossIntro) {
      this.drawBossIntro(state.bossIntro);
    }

    // Miniradar táctico Pixel Art en esquina superior derecha
    this.drawMinimap(state);

    this.ctx.restore();
  }

  drawMinimap(state) {
    const ctx = this.ctx;
    const worldW = state.world?.width || 1920;
    const worldH = state.world?.height || 1080;
    const cam = state.camera || { x: 0, y: 0 };
    const p = state.player;

    // Dimensiones y posición del minimapa (ubicado a la izquierda, debajo del contador de combo)
    const mapW = 124;
    const mapH = 68;
    const mapX = 26;
    const mapY = 82;

    ctx.save();
    // 1. Marco exterior con estética arcade/pixel
    ctx.fillStyle = '#0a1014cc';
    ctx.fillRect(mapX - 4, mapY - 4, mapW + 8, mapH + 8);
    ctx.strokeStyle = '#2d424b';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX - 4, mapY - 4, mapW + 8, mapH + 8);

    // Borde interno de radar
    ctx.strokeStyle = '#39535f';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX - 1, mapY - 1, mapW + 2, mapH + 2);

    // Fondo del minimapa (cuadrícula radar tenue)
    ctx.fillStyle = '#121c22ee';
    ctx.fillRect(mapX, mapY, mapW, mapH);

    // Cuadrícula sutil
    ctx.strokeStyle = '#1d2f38';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mapX + mapW / 2, mapY); ctx.lineTo(mapX + mapW / 2, mapY + mapH);
    ctx.moveTo(mapX, mapY + mapH / 2); ctx.lineTo(mapX + mapW, mapY + mapH / 2);
    ctx.stroke();

    // 2. Rectángulo de la cámara actual (Viewport activo)
    const camXRatio = cam.x / worldW;
    const camYRatio = cam.y / worldH;
    const camWRatio = 960 / worldW;
    const camHRatio = 540 / worldH;
    ctx.strokeStyle = '#486574';
    ctx.fillStyle = '#22384433';
    ctx.fillRect(mapX + camXRatio * mapW, mapY + camYRatio * mapH, camWRatio * mapW, camHRatio * mapH);
    ctx.strokeRect(mapX + camXRatio * mapW, mapY + camYRatio * mapH, camWRatio * mapW, camHRatio * mapH);

    // 3. Items coleccionables / botines (puntos celestes / dorados) - BATCHED
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    for (let i = 0; i < state.items.length; i++) {
      const it = state.items[i];
      const ix = Math.round(mapX + (it.x / worldW) * mapW) - 1;
      const iy = Math.round(mapY + (it.y / worldH) * mapH) - 1;
      ctx.rect(ix, iy, 3, 3);
    }
    ctx.fill();

    // 4. Enemigos comunes (puntos rojos) - BATCHED SINGLE DRAW CALL
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      if (enemy.hp <= 0 || enemy.isBoss) continue;
      const ex = Math.round(mapX + (enemy.x / worldW) * mapW) - 1;
      const ey = Math.round(mapY + (enemy.y / worldH) * mapH) - 1;
      ctx.rect(ex, ey, 2, 2);
    }
    ctx.fill();

    // 5. Jefes (calaveras/iconos dorados grandes y pulsantes)
    for (let i = 0; i < state.enemies.length; i++) {
      const boss = state.enemies[i];
      if (boss.hp <= 0 || !boss.isBoss) continue;
      const bx = mapX + (boss.x / worldW) * mapW;
      const by = mapY + (boss.y / worldH) * mapH;
      const pulse = Math.sin(performance.now() / 120) * 1.5;
      // Anillo de alerta jefe
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(bx) - 3 - pulse / 2, Math.round(by) - 3 - pulse / 2, 6 + pulse, 6 + pulse);
      // Punto central del jefe
      ctx.fillStyle = '#ff2a44';
      ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 2, 2);
    }

    // 6. Jugador (punto verde lima brillante con flecha/indicador)
    const px = mapX + (p.x / worldW) * mapW;
    const py = mapY + (p.y / worldH) * mapH;
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);

    // Decoración: Etiqueta "RADAR"
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#839da9';
    ctx.textAlign = 'left';
    ctx.fillText('MAPA', mapX, mapY - 6);

    ctx.restore();
  }

  drawBossIntro(intro) {
    const elapsed = intro.duration - intro.timer;
    const progress = Math.min(1, elapsed / intro.duration);
    const ctx = this.ctx;

    // 1. Barras de cine negras pixeladas superior e inferior
    const barHeight = 64;
    ctx.fillStyle = '#080c10';
    ctx.fillRect(0, 0, 960, barHeight);
    ctx.fillRect(0, 540 - barHeight, 960, barHeight);

    // Borde neón peligro
    ctx.fillStyle = '#ff2a44';
    ctx.fillRect(0, barHeight, 960, 4);
    ctx.fillRect(0, 540 - barHeight - 4, 960, 4);

    // Hazard stripes en las barras
    ctx.fillStyle = '#ffcc0033';
    for (let x = -60 + (elapsed * 80) % 60; x < 960; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 18, 0); ctx.lineTo(x, barHeight); ctx.lineTo(x - 18, barHeight); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, 540 - barHeight); ctx.lineTo(x + 18, 540 - barHeight); ctx.lineTo(x, 540); ctx.lineTo(x - 18, 540); ctx.fill();
    }

    // 2. Flash estroboscópico de alerta roja al inicio
    if (elapsed < 0.35) {
      const flash = (1 - elapsed / 0.35) * 0.38;
      ctx.fillStyle = `rgba(255, 30, 60, ${flash})`;
      ctx.fillRect(0, 0, 960, 540);
    }

    // 3. Cartel central tipo banner arcade de advertencia
    const bannerY = 240;
    const slideIn = Math.min(1, elapsed / 0.3);
    const scale = 0.8 + 0.2 * Math.sin(slideIn * Math.PI / 2);

    ctx.save();
    ctx.translate(480, bannerY);
    ctx.scale(scale, scale);

    // Fondo del banner con borde pixel-art
    ctx.fillStyle = '#0f171cee';
    ctx.fillRect(-380, -48, 760, 96);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ff3344';
    ctx.strokeRect(-380, -48, 760, 96);

    // Decoración de esquinas pixel
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(-380, -48, 12, 12);
    ctx.fillRect(368, -48, 12, 12);
    ctx.fillRect(-380, 36, 12, 12);
    ctx.fillRect(368, 36, 12, 12);

    // Texto: WARNING / ALERTA DE JEFE
    ctx.textAlign = 'center';
    ctx.font = '900 13px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('⚠ ¡ALERTA DE PEDIDO ESPECIAL! ⚠', 0, -22);

    // Nombre gigante del Boss
    ctx.font = '900 24px "Press Start 2P", monospace';
    // Sombra pixel
    ctx.fillStyle = '#660011';
    ctx.fillText(intro.bossName, 3, 17);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(intro.bossName, 0, 14);

    // Subtítulo temático
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#86e3bf';
    ctx.fillText('NIVEL DE AMENAZA: EXTREMO · ¡PREPARATE!', 0, 36);

    ctx.restore();
  }

  drawBackground() {
    const inGame = ['gameScreen','abilityScreen','pauseScreen'].includes(this.screenId);
    if (inGame) return; // Se dibuja dentro de draw() bajo la cámara
    const menu = ['menuScreen','authScreen','lobbyScreen','shopScreen'].includes(this.screenId);
    const width = menu ? this.canvas.clientWidth : 960;
    const height = menu ? this.canvas.clientHeight : 540;
    if(this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width; this.canvas.height = height;
    }
    const time = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : this.lastTime / 1000;
    drawDiner(this.ctx,width,height,time,menu,this.state?.mapId);
    if (!menu) drawWorldProps(this.ctx, this.state?.mapId || 'diner', time);
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.hidden = true;
    }, 1800);
  }

  announceBoss() {
    this.audio.setScene('boss'); this.audio.play('boss');
    const boss = this.state.enemies.find(enemy=>enemy.isBoss);
    if (!boss) return;
    const bossName = boss.type.name.toUpperCase();
    this.showToast('JEFE: ' + bossName);

    // Activamos la animación de aparición cinemática
    this.state.bossIntro = {
      bossName,
      bossType: boss.type.id,
      timer: 3.2,
      duration: 3.2
    };

    // Temblor de pantalla y ondas de impacto al aparecer el jefe
    this.state.shake = 0.55;
    this.state.rings.push({ x: boss.x, y: boss.y, radius: 240, life: 1.2, maxLife: 1.2, color: '#ff3344' });
    this.state.rings.push({ x: boss.x, y: boss.y, radius: 150, life: 0.9, maxLife: 0.9, color: '#ffcc00' });
    burst(this.state, boss.x, boss.y, '#ff3344', 40, 260);
    burst(this.state, boss.x, boss.y, '#ffcc00', 35, 200);
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${rest}`;
  }
}
