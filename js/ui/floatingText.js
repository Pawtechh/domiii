// ============================================================================
// DOMI 2: PANCHO - FLOATING COMBAT TEXT & COMBO INDICATORS
// Renderizado procedural con degradados verticales, halo neón y extrusión 3D
// ============================================================================

export function drawFloatingText(ctx, text, reducedMotion = false) {
  text.maxLife ??= text.life;
  text.originY ??= text.y;
  text.tilt ??= (Math.random() - 0.5) * (Math.PI / 8);

  const progress = Math.max(0, Math.min(1, 1 - text.life / text.maxLife));

  // Determinar categoría del indicador
  let kind = text.kind;
  if (!kind) {
    if (/COMBO|RACHA|FIEBRE/i.test(text.text)) kind = 'combo';
    else if (/[✦★]/.test(text.text) || /EXTERMINIO|BOMBAZO/i.test(text.text)) kind = 'crit';
    else if (/HP|CURA/i.test(text.text)) kind = 'heal';
    else if (/^\+/.test(text.text)) kind = 'gain';
    else if (/CHOQUE|ESCUDO/i.test(text.text)) kind = 'dash';
    else kind = 'normal';
  }

  // Extraer valor de combo si existe
  let comboVal = text.comboVal;
  if (comboVal == null && kind === 'combo') {
    const match = text.text.match(/\b(\d+)\b/);
    if (match) comboVal = parseInt(match[1], 10);
  }

  // Escala dinámica con salto/pop explosivo al inicio
  const baseScale = kind === 'crit'
    ? 1.7
    : kind === 'combo'
      ? (comboVal >= 30 ? 1.45 : comboVal >= 20 ? 1.35 : 1.25)
      : (text.scale || 1);

  const popFactor = reducedMotion
    ? 1
    : (progress < 0.22 ? 1 + Math.sin((progress / 0.22) * Math.PI) * 0.35 : 1);
  const decayScale = reducedMotion ? 1 : (1.35 - progress * 0.55);
  const finalScale = baseScale * popFactor * decayScale;

  const fontSize = Math.max(9, Math.round(12 * finalScale));

  // Física de salto parabólico (arc jump) y temblor
  const jumpHeight = kind === 'combo' ? 24 : kind === 'crit' ? 20 : 13;
  const jumpY = reducedMotion ? 0 : Math.sin(progress * Math.PI) * jumpHeight;
  const shake = (kind === 'crit' || (kind === 'combo' && comboVal >= 20)) && !reducedMotion && progress < 0.35
    ? (Math.random() * 3 - 1.5)
    : 0;
  const driftX = Math.sin(text.tilt) * progress * (kind === 'combo' ? 14 : 28);

  ctx.save();
  ctx.translate(
    text.x + driftX + shake,
    text.y - jumpY
  );

  if (!reducedMotion) {
    ctx.rotate(text.tilt * (1 - progress) * 0.6);
  }

  // Desvanecimiento suave al final de la vida
  ctx.globalAlpha = Math.max(0, Math.min(1, (1 - progress) * 2.2));
  ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // Paletas de degradados con colores intensos y halo neón
  let stops;
  let haloColor;
  let outlineColor = '#060a0e';
  const outlineWidth = Math.max(3, Math.round(fontSize * 0.26));

  if (kind === 'crit') {
    stops = [
      [0.0, '#ffffff'], // Destello cúspide
      [0.18, '#fff644'], // Amarillo eléctrico
      [0.55, '#ff3b00'], // Naranja fuego vivo
      [1.0, '#b80028']  // Carmesí rubí profundo
    ];
    haloColor = '#ff2b00';
    outlineColor = '#120004';
  } else if (kind === 'combo') {
    if (comboVal >= 30 || /FIEBRE/i.test(text.text)) {
      stops = [
        [0.0, '#ffffff'],
        [0.2, '#ff3df1'], // Magenta neón
        [0.58, '#9400d3'], // Violeta psicodélico
        [1.0, '#ffd700']  // Oro intenso
      ];
      haloColor = '#ff00aa';
      outlineColor = '#100014';
    } else if (comboVal >= 20 || /CADENCIA/i.test(text.text)) {
      stops = [
        [0.0, '#ffffff'],
        [0.22, '#fff04d'], // Oro brillante
        [0.6, '#ff6600'],  // Naranja llama
        [1.0, '#d60036']   // Rubí
      ];
      haloColor = '#ff5500';
      outlineColor = '#140400';
    } else {
      stops = [
        [0.0, '#ffffff'],
        [0.22, '#00ffff'], // Cian eléctrico
        [0.6, '#00e676'],  // Menta neón
        [1.0, '#0066ff']   // Azul arcade
      ];
      haloColor = '#00f2ff';
      outlineColor = '#001018';
    }
  } else if (kind === 'fire') {
    stops = [
      [0.0, '#ffffcc'],
      [0.22, '#ffaa00'],
      [0.65, '#ff3300'],
      [1.0, '#800000']
    ];
    haloColor = '#ff4d00';
    outlineColor = '#190300';
  } else if (kind === 'ice') {
    stops = [
      [0.0, '#ffffff'],
      [0.22, '#a5f3fc'],
      [0.65, '#38bdf8'],
      [1.0, '#0284c7']
    ];
    haloColor = '#00e5ff';
    outlineColor = '#011524';
  } else if (kind === 'poison') {
    stops = [
      [0.0, '#ffffff'],
      [0.22, '#bbf7d0'],
      [0.65, '#22c55e'],
      [1.0, '#14532d']
    ];
    haloColor = '#22c55e';
    outlineColor = '#021808';
  } else if (kind === 'heal') {
    stops = [
      [0.0, '#ffffff'],
      [0.22, '#6ee7b7'],
      [0.65, '#10b981'],
      [1.0, '#047857']
    ];
    haloColor = '#10b981';
    outlineColor = '#011c10';
  } else if (kind === 'gain') {
    stops = [
      [0.0, '#ffffff'],
      [0.22, '#fde047'],
      [0.65, '#eab308'],
      [1.0, '#92400e']
    ];
    haloColor = '#eab308';
    outlineColor = '#1a0e00';
  } else if (kind === 'dash') {
    stops = [
      [0.0, '#ffffff'],
      [0.22, '#99f6e4'],
      [0.65, '#14b8a6'],
      [1.0, '#0f766e']
    ];
    haloColor = '#14b8a6';
    outlineColor = '#011917';
  } else {
    // Normal damage con degradado ámbar/oro intenso
    stops = [
      [0.0, '#ffffff'], // Brillo superior
      [0.22, '#ffeea6'], // Amarillo crema luminoso
      [0.62, '#f59e0b'], // Ámbar intenso vibrante
      [1.0, '#c2410c']   // Ocre cálido
    ];
    haloColor = '#f59e0b';
    outlineColor = '#140b02';
  }

  // Generar degradado vertical
  const grad = ctx.createLinearGradient(0, -fontSize * 0.55, 0, fontSize * 0.5);
  for (const [offset, col] of stops) {
    grad.addColorStop(offset, col);
  }

  // Placa / Badge retro para avisos de COMBO importantes (Zero-blur pixel art)
  if (kind === 'combo') {
    const metrics = ctx.measureText(text.text);
    const padX = 8;
    const padY = 5;
    const bw = metrics.width + padX * 2;
    const bh = fontSize + padY * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 14, 18, 0.88)';
    ctx.strokeStyle = haloColor;
    ctx.lineWidth = 2;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

    // Muescas angulares estilo arcade en esquinas
    ctx.fillStyle = haloColor;
    ctx.fillRect(-bw / 2 - 1, -bh / 2 - 1, 3, 3);
    ctx.fillRect(bw / 2 - 2, -bh / 2 - 1, 3, 3);
    ctx.fillRect(-bw / 2 - 1, bh / 2 - 2, 3, 3);
    ctx.fillRect(bw / 2 - 2, bh / 2 - 2, 3, 3);
    ctx.restore();
  }

  // 1. Sombra 3D pixel art extrusion sólida (sin shadowBlur para evitar caídas de FPS)
  const extrusionY = Math.max(2, Math.round(fontSize * 0.16));
  ctx.lineWidth = outlineWidth + 1;
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.strokeText(text.text, 1, extrusionY);
  ctx.fillText(text.text, 1, extrusionY);

  // 2. Trazo exterior oscuro nítido
  ctx.lineWidth = outlineWidth;
  ctx.strokeStyle = outlineColor;
  ctx.strokeText(text.text, 0, 0);

  // 3. Relleno con degradado vertical intenso arcade
  ctx.fillStyle = grad;
  ctx.fillText(text.text, 0, 0);

  ctx.restore();
}
