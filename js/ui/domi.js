import {currentAccount, grantItem} from '../systems/accountSystem.js';
import {shopItems, isOwned} from '../data/shop.js';
import {drawItemPreview} from '../core/presentation.js';
import {icon, refreshIcons} from './icons.js';

const tabs = [
  ['missions', 'Misiones', 'Scroll'],
  ['advice', 'Consejos', 'MessageSquare'],
  ['collectibles', 'Colección', 'Star']
];

export const adviceList = [
  {
    id: 'adv_movement',
    title: 'La receta del turno',
    badge: 'CONSEJO #1',
    description: 'No te quedes quieto, pibe. Rodea al grupo y deja una salida libre. La cocina se llena rápido.',
    detail: 'El secreto del mostrador es el juego de pies. Mantenete en círculos amplios para juntar a los clientes en racimos. Si te encerrás contra un mostrador o pared, vas a recibir daño innecesario. ¡Buscá siempre el espacio abierto!'
  },
  {
    id: 'adv_dash',
    title: 'El DASH gourmet',
    badge: 'CONSEJO #2',
    description: 'El DASH (Espacio) te otorga inmunidad completa durante la embestida y daña a todos los enemigos que atravieses.',
    detail: 'La tecla Espacio no es solo para correr: te vuelve invulnerable por una fracción de segundo y atraviesa cualquier masa de clientes pesados haciéndoles daño. Fijate en el indicador en pantalla para saber cuándo vuelve a estar cargado.'
  },
  {
    id: 'adv_skills',
    title: 'Poderes de la casa',
    badge: 'CONSEJO #3',
    description: 'Las habilidades activas se desbloquean por nivel: Q al Nivel 5, E al Nivel 10 y R al Nivel 15.',
    detail: 'Al subir de nivel durante la partida desbloqueás tus poderes: con la Q lanzás una ráfaga radial de 20 disparos, con la E desplegás un clon señuelo que distrae a la clientela, y con la R generás una burbuja de inmunidad que repele todo.'
  },
  {
    id: 'adv_godmode',
    title: 'Aura Modo Dios',
    badge: 'CONSEJO #4',
    description: 'Al alcanzar el Nivel 3, entrás en Modo Dios con un aura dorada resplandeciente que fulmina a todo lo que toque.',
    detail: 'Cuando subas a Nivel 3, el fuego de la cocina te bendice: tu personaje desata un aura radiante invencible. Aprovechá ese momento para arrollar directamente a las hordas más difíciles sin miedo.'
  },
  {
    id: 'adv_evo',
    title: 'Evolución de armas',
    badge: 'CONSEJO #5',
    description: 'Maximizá tu ingrediente principal para forjar su evolución definitiva dorada.',
    detail: 'Cada arma (tenedor, cuchillo, rodillo, espátula) tiene una forma evolucionada que dispara proyectiles dorados gigantes y activa efectos secundarios como charcos de salsa y ondas de choque.'
  },
  {
    id: 'adv_pets',
    title: 'Mascotas al rescate',
    badge: 'CONSEJO #6',
    description: 'Equipá un compañero en el mostrador para sumar fuego de cobertura y curación.',
    detail: 'Compañeros como la Mini Parrilla, el Ketchup o el Taco Guardián atacan automáticamente a los enemigos cercanos, crean zonas seguras o aumentan tu probabilidad de supervivencia.'
  },
  {
    id: 'adv_lighting',
    title: 'Luces y derrapes',
    badge: 'CONSEJO #7',
    description: 'En el estacionamiento se cortó la luz: tu linterna te guía y el piso aceitoso modifica la tracción.',
    detail: 'En el turno de noche del estacionamiento la visibilidad es reducida. Mantené la calma, usá el haz de tu linterna y cuidá tus giros en las manchas de aceite para no derrapar hacia los grupos enemigos.'
  },
  {
    id: 'adv_combos',
    title: 'Racha de combos',
    badge: 'CONSEJO #8',
    description: 'Encadená bajas sin interrupción para multiplicar tus puntos de cocina hasta x3.00.',
    detail: 'Cada cliente eliminado alimenta tu medidor de combo. A las 10, 20 y 30 bajas seguidas alcanzás hitos que otorgan multiplicadores masivos y activan el modo Fiebre con velocidad extra.'
  }
];

function node(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export class DomiScreen {
  constructor(game) {
    this.game = game;
    this.type = 'missions';
    this.selected = null;
    this.previewCanvas = null;

    document.querySelector('#domiBackButton')?.addEventListener('click', () => {
      this.game.showScreen('lobbyScreen');
    });
  }

  show(tab = 'missions') {
    this.type = tab;
    this.selected = null;
    const profile = currentAccount();
    if (!profile) {
      this.game.showScreen('authScreen');
      return;
    }
    const feedback = document.querySelector('#domiFeedback');
    if (feedback) feedback.textContent = '';
    this.render();
    this.game.showScreen('domiScreen');
    const screen = document.querySelector('#domiScreen');
    if (screen) screen.scrollTop = 0;
  }

  selectCategory(type) {
    this.type = type;
    this.selected = null;
    this.render();
    this.game.audio.play('navigate');
    document.querySelector(`#domiTabs [data-type="${type}"]`)?.focus({preventScroll: true});
  }

  getMissions(profile) {
    const runs = profile.runs || [];
    const maxLevel = runs.reduce((m, r) => Math.max(m, r.level || 0), 0);
    const maxKills = runs.reduce((m, r) => Math.max(m, r.kills || 0), 0);
    const maxCombo = runs.reduce((m, r) => Math.max(m, r.combo || 0), 0);
    const maxTime = runs.reduce((m, r) => Math.max(m, r.time || 0), 0);
    const purchases = profile.purchases || [];

    return [
      {
        id: 'm_level5',
        type: 'mission',
        rewardType: 'accessory',
        rewardId: 'chef_hat',
        rewardName: 'Gorro de Chef',
        name: 'Prueba de Fuego',
        badge: 'RECOMPENSA EXCLUSIVA',
        description: 'Sobrevive y alcanza el Nivel 5 en cualquier turno.',
        detail: 'Demostrá que aguantás la presión en los fuegos de la cocina. Si sobrevivís hasta el Nivel 5, Don Domi te concede su Gorro de Chef artesanal para tu personaje.',
        current: Math.min(5, maxLevel),
        target: 5,
        unit: 'Nivel',
        isDone: maxLevel >= 5,
        isClaimed: isOwned(profile, 'accessory', 'chef_hat'),
        claim: () => {
          grantItem('accessory', 'chef_hat');
        }
      },
      {
        id: 'm_kills50',
        type: 'mission',
        rewardType: 'pet',
        rewardId: 'parrilla',
        rewardName: 'Mini Parrilla',
        name: 'Maestro Asador',
        badge: 'MASCOTA EXCLUSIVA',
        description: 'Elimina al menos 50 clientes en una sola partida.',
        detail: 'Despachá a medio centenar de clientes molestos en un único turno. Don Domi te entregará a la Mini Parrilla, un compañero leal que escupe brasas ardientes.',
        current: Math.min(50, maxKills),
        target: 50,
        unit: 'KOs',
        isDone: maxKills >= 50,
        isClaimed: isOwned(profile, 'pet', 'parrilla'),
        claim: () => {
          grantItem('pet', 'parrilla');
        }
      },
      {
        id: 'm_godmode',
        type: 'mission',
        rewardType: 'points',
        rewardId: 'godmode',
        rewardName: '+400 PT Arcade',
        name: 'Receta Celestial',
        badge: '+400 PUNTOS',
        description: 'Desbloquea el Modo Dios alcanzando el Nivel 3.',
        detail: 'Alcanzá el Nivel 3 para encender el aura divina de Don Domi. ¡Te recompensa con una bolsa de 400 puntos arcade para gastar en la tienda!',
        current: maxLevel >= 3 ? 3 : Math.min(3, maxLevel),
        target: 3,
        unit: 'Nivel',
        isDone: maxLevel >= 3,
        isClaimed: purchases.includes('mission:godmode'),
        claim: () => {
          grantItem('mission', 'godmode');
          profile.bank += 400;
          profile.totalEarned = (profile.totalEarned || 0) + 400;
        }
      },
      {
        id: 'm_combo15',
        type: 'mission',
        rewardType: 'points',
        rewardId: 'combo15',
        rewardName: '+250 PT Arcade',
        name: 'Combo Imparable',
        badge: '+250 PUNTOS',
        description: 'Encadena al menos 15 bajas consecutivas en un turno.',
        detail: 'Mantené el ritmo sin que el combo se enfríe. Superá las 15 bajas seguidas y Don Domi te sumará 250 puntos arcade a tu saldo.',
        current: Math.min(15, maxCombo),
        target: 15,
        unit: 'Combo',
        isDone: maxCombo >= 15,
        isClaimed: purchases.includes('mission:combo15'),
        claim: () => {
          grantItem('mission', 'combo15');
          profile.bank += 250;
          profile.totalEarned = (profile.totalEarned || 0) + 250;
        }
      },
      {
        id: 'm_time3min',
        type: 'mission',
        rewardType: 'accessory',
        rewardId: 'headband',
        rewardName: 'Vincha Turbo',
        name: 'Resistencia Nocturna',
        badge: 'ACCESORIO',
        description: 'Sobrevive más de 3 minutos (180 s) en combate.',
        detail: 'Aguantá más de 3 minutos completos bajo el asedio continuo del turno. Recibirás la Vincha Turbo para correr con estilo en la cocina.',
        current: Math.min(180, Math.floor(maxTime)),
        target: 180,
        unit: 'segundos',
        isDone: maxTime >= 180,
        isClaimed: isOwned(profile, 'accessory', 'headband'),
        claim: () => {
          grantItem('accessory', 'headband');
        }
      }
    ];
  }

  getCollectibles(profile) {
    const skinsOwned = shopItems.filter(i => i.type === 'skin' && isOwned(profile, 'skin', i.id)).length + 1;
    const petsOwned = shopItems.filter(i => i.type === 'pet' && isOwned(profile, 'pet', i.id)).length;
    const accessoriesOwned = shopItems.filter(i => i.type === 'accessory' && isOwned(profile, 'accessory', i.id)).length;
    const mapsOwned = shopItems.filter(i => i.type === 'map' && isOwned(profile, 'map', i.id)).length + 3;

    return [
      {
        id: 'collec_skins',
        type: 'collectible',
        name: 'Personajes y Skins',
        badge: `${skinsOwned} / 6 DESBLOQUEADOS`,
        description: 'Colección de chefs del mostrador: Pancho, Lomito, Empanada, Hamburguesa y Don Domi.',
        detail: 'Cada personaje cuenta con estadísticas únicas de vida máxima, velocidad de desplazamiento, defensa y multiplicador de daño.',
        owned: skinsOwned,
        total: 6,
        targetScreen: 'wardrobe',
        btnText: 'ABRIR ARMARIO'
      },
      {
        id: 'collec_pets',
        type: 'collectible',
        name: 'Mascotas del Local',
        badge: `${petsOwned} / 5 DESBLOQUEADAS`,
        description: 'Compañeros leales: Mini Ketchup, Dron Delivery, Taco Guardián, Botella Soda y Mini Parrilla.',
        detail: 'Las mascotas atacan, patrullan, crean zonas seguras o curan a tu personaje automáticamente mientras cocinás.',
        owned: petsOwned,
        total: 5,
        targetScreen: 'pets',
        btnText: 'VER MASCOTAS'
      },
      {
        id: 'collec_accessories',
        type: 'collectible',
        name: 'Accesorios Cosméticos',
        badge: `${accessoriesOwned} / 4 DESBLOQUEADOS`,
        description: 'Gorros de chef, vinchas turbo, anteojos oscuros y coronas doradas.',
        detail: 'Personalizá a tu chef con accesorios exclusivos que podés desbloquear completando las misiones de Don Domi o en la Tienda Arcade.',
        owned: accessoriesOwned,
        total: 4,
        targetScreen: 'shop_accessory',
        btnText: 'VER EN TIENDA'
      },
      {
        id: 'collec_maps',
        type: 'collectible',
        name: 'Mapas y Escenarios',
        badge: `${mapsOwned} / 6 DESBLOQUEADOS`,
        description: 'Local DOMI, Cocina Industrial, Estacionamiento Nocturno y más turnos por descubrir.',
        detail: 'Cada escenario tiene desafíos de iluminación, trampas de aceite o trampas eléctricas, obstáculos y jefes finales exclusivos.',
        owned: mapsOwned,
        total: 6,
        targetScreen: 'portal',
        btnText: 'JUGAR MAPAS'
      }
    ];
  }

  render() {
    this.profile = currentAccount();
    if (!this.profile) return;
    const profile = this.profile;

    document.querySelector('#domiBank').textContent = profile.bank.toLocaleString('es-AR');

    // Render Tabs
    const tabsRoot = document.querySelector('#domiTabs');
    tabsRoot.replaceChildren();

    for (const [id, label, symbol] of tabs) {
      const button = node('button', id === this.type ? 'active' : '');
      button.type = 'button';
      button.dataset.type = id;
      button.innerHTML = icon(symbol);
      button.append(node('span', '', label));
      button.setAttribute('aria-pressed', String(id === this.type));
      button.onclick = () => this.selectCategory(id);
      tabsRoot.append(button);
    }

    this.renderCatalog();
    refreshIcons();
  }

  renderCatalog() {
    this.profile = currentAccount();
    if (!this.profile) return;
    const profile = this.profile;

    let items = [];
    let categoryTitle = 'Misiones';

    if (this.type === 'missions') {
      items = this.getMissions(profile);
      categoryTitle = 'Misiones y Desafíos';
      const doneCount = items.filter(m => m.isClaimed).length;
      document.querySelector('#domiCount').textContent = `${doneCount} de ${items.length} completadas`;
    } else if (this.type === 'advice') {
      items = adviceList;
      categoryTitle = 'Consejos de Don Domi';
      document.querySelector('#domiCount').textContent = `${items.length} recetas secretas`;
    } else if (this.type === 'collectibles') {
      items = this.getCollectibles(profile);
      categoryTitle = 'Tu Colección';
      document.querySelector('#domiCount').textContent = 'Progreso global del club';
    }

    document.querySelector('#domiCategory').textContent = categoryTitle;

    if (!this.selected || !items.some(i => i.id === this.selected.id)) {
      this.selected = items[0] || null;
    }

    const grid = document.querySelector('#domiGrid');
    grid.replaceChildren();

    for (const item of items) {
      const card = node('button', 'catalog-item');
      card.type = 'button';
      card.dataset.item = item.id;
      card.setAttribute('aria-pressed', String(this.selected?.id === item.id));

      const art = node('div', 'catalog-art');
      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 180;
      canvas.setAttribute('aria-hidden', 'true');
      this.drawCardPreview(canvas, item, profile);

      const badgeText = item.badge || (item.isClaimed ? '✓ COMPLETADA' : item.isDone ? '★ RECLAMAR' : 'EN PROGRESO');
      art.append(canvas, node('span', 'catalog-badge', badgeText));

      const copy = node('div', 'catalog-copy');
      copy.append(node('strong', 'catalog-name', item.name || item.title), node('span', 'catalog-description', item.description));

      const footer = node('span', 'catalog-status');
      if (this.type === 'missions') {
        footer.innerHTML = icon(item.isClaimed ? 'CircleCheck' : item.isDone ? 'Sparkles' : 'Clock');
        footer.append(node('span', '', item.isClaimed ? 'Reclamada' : item.isDone ? '¡Lista para reclamar!' : `${item.current}/${item.target} ${item.unit}`));
      } else if (this.type === 'advice') {
        footer.innerHTML = icon('ChefHat');
        footer.append(node('span', '', 'Consejo del chef'));
      } else if (this.type === 'collectibles') {
        footer.innerHTML = icon('Trophy');
        footer.append(node('span', '', `${item.owned} / ${item.total} Desbloqueados`));
      }
      footer.append(node('span', 'catalog-arrow', '↗'));
      copy.append(footer);
      card.append(art, copy);

      card.onclick = () => {
        this.selected = item;
        grid.querySelectorAll('.catalog-item').forEach(c => c.setAttribute('aria-pressed', String(c === card)));
        this.renderDetail();
        this.game.audio.play('navigate');
      };

      grid.append(card);
    }

    this.renderDetail();
  }

  renderDetail() {
    const root = document.querySelector('#domiDetail');
    root.replaceChildren();
    this.previewCanvas = null;

    const item = this.selected;
    if (!item) {
      root.append(node('p', 'detail-placeholder', 'Elegí un elemento para ver el detalle.'));
      return;
    }

    const profile = currentAccount();
    if (!profile) return;

    const top = node('div', 'detail-top');
    top.append(
      node('span', '', this.type === 'missions' ? 'DESAFÍO EXCLUSIVO' : this.type === 'advice' ? 'SECRETOS DEL MOSTRADOR' : 'PROGRESO DE COLECCIÓN'),
      node('span', 'detail-state', item.badge || (item.isClaimed ? 'COMPLETADO' : 'DISPONIBLE'))
    );

    const stage = node('div', 'detail-stage');
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 300;
    canvas.id = 'domiPreview';
    canvas.setAttribute('aria-label', `Vista previa de ${item.name || item.title}`);
    this.previewCanvas = canvas;

    const captionText = this.type === 'missions' ? `Recompensa: ${item.rewardName}` : this.type === 'advice' ? 'Don Domi · Maestro de la Cocina' : 'Desbloquea contenido jugando partidas';
    stage.append(canvas, node('span', 'preview-caption', captionText));

    const body = node('div', 'detail-body');
    const heading = node('h3', '', item.name || item.title);
    body.append(heading, node('p', 'shop-description', item.detail || item.description));

    // Stats o Progreso
    if (this.type === 'missions') {
      const stats = node('div', 'preview-stats');
      const s1 = node('span', '');
      s1.append(node('small', '', 'ACTUAL'), node('b', '', String(item.current)));
      const s2 = node('span', '');
      s2.append(node('small', '', 'META'), node('b', '', String(item.target)));
      const pct = Math.min(100, Math.round((item.current / item.target) * 100));
      const s3 = node('span', '');
      s3.append(node('small', '', 'PROGRESO'), node('b', '', `${pct}%`));
      stats.append(s1, s2, s3);
      body.append(stats);
    } else if (this.type === 'collectibles') {
      const stats = node('div', 'preview-stats');
      const s1 = node('span', '');
      s1.append(node('small', '', 'OBTENIDOS'), node('b', '', String(item.owned)));
      const s2 = node('span', '');
      s2.append(node('small', '', 'TOTAL'), node('b', '', String(item.total)));
      const pct = Math.min(100, Math.round((item.owned / item.total) * 100));
      const s3 = node('span', '');
      s3.append(node('small', '', 'COLECCIÓN'), node('b', '', `${pct}%`));
      stats.append(s1, s2, s3);
      body.append(stats);
    }

    // Action button
    const action = node('div', 'detail-action');

    if (this.type === 'missions') {
      if (item.isClaimed) {
        action.append(node('p', 'purchase-explainer', '¡Ya reclamaste esta recompensa! Se encuentra en tu colección.'));
        const btn = node('button', 'pixel-button purchase-button');
        btn.disabled = true;
        btn.innerHTML = `${icon('Check')} <span>RECOMPENSA RECLAMADA</span>`;
        action.append(btn);
      } else if (item.isDone) {
        action.append(node('p', 'purchase-explainer', '¡Misión cumplida! Hacé clic abajo para reclamar tu recompensa.'));
        const btn = node('button', 'pixel-button purchase-button');
        btn.innerHTML = `${icon('Sparkles')} <span>¡RECLAMAR ${item.rewardName.toUpperCase()}!</span>`;
        btn.onclick = () => {
          btn.disabled = true;
          item.claim();
          this.game.audio.play('levelUp');
          this.game.showToast?.(`¡DESBLOQUEADO: ${item.rewardName}!`);
          const fb = document.querySelector('#domiFeedback');
          if (fb) fb.textContent = `¡Felicitaciones! Desbloqueaste: ${item.rewardName}.`;
          this.render();
        };
        action.append(btn);
      } else {
        const missing = item.target - item.current;
        action.append(node('p', 'purchase-explainer', `Te falta ${missing} ${item.unit} para completar este objetivo durante una partida.`));
        const btn = node('button', 'pixel-button purchase-button');
        btn.disabled = true;
        btn.innerHTML = `${icon('Lock')} <span>EN PROGRESO · ${item.current} / ${item.target}</span>`;
        action.append(btn);
      }
    } else if (this.type === 'advice') {
      action.append(node('p', 'purchase-explainer', 'Don Domi siempre tiene un consejo para cada situación en el local.'));
      const btn = node('button', 'pixel-button purchase-button');
      btn.innerHTML = `${icon('MessageCircle')} <span>SIGUIENTE CONSEJO</span>`;
      btn.onclick = () => {
        const idx = adviceList.findIndex(a => a.id === item.id);
        const next = adviceList[(idx + 1) % adviceList.length];
        this.selected = next;
        this.renderCatalog();
        this.game.audio.play('navigate');
      };
      action.append(btn);
    } else if (this.type === 'collectibles') {
      action.append(node('p', 'purchase-explainer', 'Acceso directo para equipar o adquirir artículos de esta categoría.'));
      const btn = node('button', 'pixel-button purchase-button');
      btn.innerHTML = `${icon('ArrowRight')} <span>${item.btnText}</span>`;
      btn.onclick = () => {
        if (item.targetScreen === 'wardrobe') {
          this.game.shop.show('skin', true);
        } else if (item.targetScreen === 'pets') {
          this.game.shop.show('pet', true);
        } else if (item.targetScreen === 'shop_accessory') {
          this.game.shop.show('accessory', false);
        } else if (item.targetScreen === 'portal') {
          this.game.menu.prepareAccount();
          this.game.showScreen('setupScreen');
        }
      };
      action.append(btn);
    }

    root.append(top, stage, body, action);
    this.drawCardPreview(canvas, item, profile);
  }

  drawCardPreview(canvas, item, profile, time = 0) {
    const c = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);

    if (item.rewardType === 'accessory' || item.rewardType === 'pet') {
      const mockItem = {
        type: item.rewardType,
        id: item.rewardId,
        name: item.rewardName
      };
      drawItemPreview(canvas, mockItem, profile, time);
      return;
    }

    // Dibujar fondo arcade oscuro
    c.fillStyle = '#142127';
    c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 24) {
      c.fillStyle = 'rgba(255,255,255,0.02)';
      c.fillRect(x, 0, 1, h);
    }

    // Sombra del podio
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.beginPath();
    c.ellipse(w / 2, h * 0.78, w * 0.28, h * 0.1, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#5ce1e6';
    c.lineWidth = 2;
    c.stroke();

    // Dibujar a Don Domi animado
    this.drawDomiCharacter(c, w / 2, h * 0.54, Math.min(w / 140, h / 100), time);
  }

  drawDomiCharacter(c, cx, cy, scale = 2, time = 0) {
    c.save();
    c.translate(cx, cy + Math.sin(time * 3) * 3);
    c.scale(scale, scale);

    // Sombra bajo la empanada
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(0, 10, 18, 5, 0, 0, Math.PI * 2);
    c.fill();

    // Empanada dorada (Don Domi)
    c.fillStyle = '#f59e0b';
    c.beginPath();
    c.arc(0, 4, 18, Math.PI, 0, false);
    c.closePath();
    c.fill();
    c.strokeStyle = '#92400e';
    c.lineWidth = 2;
    c.stroke();

    // Repulgue artesanal
    c.fillStyle = '#fde68a';
    for (let a = Math.PI; a <= 0.05; a += Math.PI / 6.5) {
      const rx = Math.cos(a) * 18;
      const ry = 4 - Math.sin(a) * 18;
      c.fillRect(rx - 1.5, ry - 1.5, 3, 3);
    }

    // Mejillas sonrojadas
    c.fillStyle = '#f43f5e';
    c.fillRect(-11, 4, 4, 2);
    c.fillRect(7, 4, 4, 2);

    // Ojos animados
    const blink = Math.sin(time * 1.5) > 0.96;
    c.fillStyle = '#0a0f14';
    if (blink) {
      c.fillRect(-8, 1, 3, 1);
      c.fillRect(5, 1, 3, 1);
    } else {
      c.fillRect(-8, 0, 3, 4);
      c.fillRect(5, 0, 3, 4);
      c.fillStyle = '#ffffff';
      c.fillRect(-8, 0, 1, 1);
      c.fillRect(5, 0, 1, 1);
    }

    // Bigote y sonrisa de chef
    c.fillStyle = '#78350f';
    c.fillRect(-5, 6, 10, 2);
    c.fillRect(-2, 8, 4, 2);

    // Gorro de chef blanco alto con volumen
    c.fillStyle = '#ffffff';
    c.fillRect(-13, -18, 26, 7);
    c.fillRect(-17, -27, 34, 10);
    c.fillRect(-11, -33, 22, 7);
    c.strokeStyle = '#cbd5e1';
    c.lineWidth = 1;
    c.strokeRect(-17, -27, 34, 10);
    c.fillStyle = '#94a3b8';
    c.fillRect(-8, -24, 2, 7);
    c.fillRect(0, -25, 2, 8);
    c.fillRect(7, -24, 2, 7);

    // Humo / vapor aromático saliendo del gorro
    const steamY = -36 - ((time * 20) % 18);
    const steamAlpha = Math.max(0, 1 - ((time * 20) % 18) / 18);
    c.fillStyle = `rgba(255, 255, 255, ${steamAlpha * 0.7})`;
    c.beginPath();
    c.arc(-4 + Math.sin(time * 4) * 3, steamY, 3, 0, Math.PI * 2);
    c.arc(4 + Math.cos(time * 4) * 3, steamY - 4, 2.5, 0, Math.PI * 2);
    c.fill();

    c.restore();
  }

  update(time) {
    if (this.previewCanvas && this.selected) {
      this.drawCardPreview(this.previewCanvas, this.selected, this.profile, this.game.reducedMotion ? 0 : time);
    }
  }
}
