# 🍔 DOMI 2: PANCHO (domiii)

> **Arcade Survivors-Like de Alta Gama** construido en **Vanilla JavaScript** y **HTML5 Canvas 2D**.  
> Optimizado para soportar hordas masivas de hasta **260 enemigos simultáneos a 60 FPS estables**, con arquitectura modular de **Árboles de Comportamiento (AI)**, **Sistema de Skills** y capa de **Modding desacoplada**.

[![Tests Passing](https://img.shields.io/badge/tests-29%2F29%20passing-brightgreen)](#suite-de-pruebas)
[![Vanilla JS](https://img.shields.io/badge/vanilla-JavaScript-F7DF1E?logo=javascript&logoColor=black)](#arquitectura-del-motor)
[![HTML5 Canvas](https://img.shields.io/badge/graphics-Canvas%202D-E34F26?logo=html5&logoColor=white)](#pipeline-gráfico)
[![GitHub Pages](https://img.shields.io/badge/live-GitHub%20Pages-22c55e)](https://pawtechh.github.io/domiii/)

---

## 🎮 Jugar en Vivo

- **Versión Web (GitHub Pages):** [https://pawtechh.github.io/domiii/](https://pawtechh.github.io/domiii/)
- **Servidor Local de Desarrollo:** `http://127.0.0.1:4177/` (ejecutando `npm start`)

---

## 🕹️ Mecánicas Principales y Jugabilidad

### 1. Combate contra Hordas Masivas
- Enfrentate a oleadas dinámicas de comida rápida mutante: hamburguesas, papas mutantas, cebollas asesinas, gaseosas explosivas, mayonesas médicas y chefs invocadores.
- Densidad escalable según la dificultad elegida (*Suave* 180, *Extra Picante* 220, *Modo Quemado* 260 entidades simultáneas).

### 2. DASH / Embestida (Barra Espaciadora)
- Movimiento evasivo que otorga **inmunidad temporal** y atraviesa la horda aplicando daño de choque cinético y empuje a todos los enemigos impactados.

### 3. Puntería Dual
- **Modo Automático:** Rastreo espacial $O(1)$ que apunta automáticamente al enemigo más cercano.
- **Modo Manual:** Apuntado direccional exacto guiado por el cursor del ratón (alternable con el botón de retícula o teclado).

### 4. Habilidades Activas ("Primes")
Desbloqueadas al progresar de nivel, con tiempos de recarga independientes e interfaz táctica:
- **[Q] Salva Radial:** Ráfaga circular de 20 proyectiles que barren la pantalla (Nivel 5).
- **[E] Clon Distractor:** Despliega un señuelo holográfico que atrae la atención de los enemigos durante 5 s (Nivel 10).
- **[R] Escudo de Fuerza:** Burbuja de inmunidad absoluta de 3.5 s con repulsión física hacia los bordes (Nivel 15).

### 5. Evolución de Armas (Nivel 15)
Cada una de las 6 armas base del juego evoluciona al alcanzar el nivel 15 en una variante legendaria con comportamientos únicos:
- **Tenedor Gourmet ➔ Tridente Celestial:** Disparos en cono amplio con rebote perimetral.
- **Pinchito Callejero ➔ Espetón del Vacío:** Proyectiles con boomerang que atraviesan enemigos de regreso.
- **Lluvia de Papas ➔ Lluvia Termonuclear:** Lluvia constante de papas con explosiones en racimo (*cluster*).
- **Pan Explosivo ➔ Masa Madre Atómica:** Granadas expansivas con fragmentación en 6 bombas secundarias.
- **Francotirador Mostaza ➔ Láser Dijon:** Disparo penetrante hiperrápido de crítico garantizado.
- **Salsa Picante ➔ Furia Habanera:** Torbellino ígneo que deja senderos de fuego persistente.

### 6. Sistema de Combo y Fiebre de Cocina
- Acumula bajas consecutivas antes de que se agote el temporizador de combo para multiplicar tu puntaje.
- **Hitos de Racha:**
  - *Combo 10:* **DASH** amplificado con bonus de velocidad.
  - *Combo 20:* **Cadencia extrema** (disparos al doble de velocidad).
  - *Combo 30:* **Fiebre de Cocina** (+65% daño, proyectiles dobles e invulnerabilidad parcial).

### 7. Compañeros Tácticos (Mascotas)
- **Domi Dron:** Orbita al jugador disparando láseres y recolectando gemas de experiencia.
- **Ketchup Bot:** Deja charcos pegajosos que ralentizan y dañan enemigos.
- **Taco Runner:** Corre por el mapa recolectando consumibles y acercándolos al jugador.
- **Soda Dispenser:** Genera escudos de burbujas periódicos.
- **Mini Parrilla:** Quema a los enemigos que se acerquen al radio defensivo.

### 8. Modos de Juego
1. **Supervivencia Libre:** Resistí oleadas infinitas con jefes periódicos y dificultad creciente.
2. **Oleadas (Waves):** 8 rondas con presupuesto cerrado de enemigos, descansos tácticos y jefes de ronda.
3. **Boss Rush:** Combate directo y continuo contra los 5 grandes jefes del juego en secuencia rápida.

### 9. Mapas Dinámicos
- **01 / Local Domi:** Escenario clásico 24/7 con mesas y barras.
- **02 / Cocina Industrial:** Mapa con poca visibilidad y linterna focal.
- **03 / Estacionamiento:** Zonas abiertas para hordas de alta velocidad.
- **04 / Bajo Cero (Nieve):** Suelo helado y ventiscas periódicas que congelan enemigos y ralentizan.
- **05 / Desierto:** Tormentas de arena y ráfagas térmicas.
- **06 / Estadio:** Cancha deportiva interactiva donde podés patear pelotas a los enemigos con el DASH.

---

## ⚡ Arquitectura del Motor y Optimizaciones Extremas

El motor fue rediseñado bajo una arquitectura modular de alto rendimiento para garantizar **60 FPS rocosos** en cualquier navegador moderno:

```
┌─────────────────────────────────────────────────────────────┐
│                          MAIN LOOP                          │
├───────────────┬──────────────────────────────┬──────────────┤
│  Entidades    │     Grilla Espacial O(1)     │  EventBus    │
│  y Boids      │   (SpatialHashGrid.js)       │  (Hooks)     │
├───────────────┼──────────────────────────────┼──────────────┤
│  AI & Skills  │   Frustum / Viewport Culling │  ObjectPool  │
│  (Behavior)   │   (Solo lo visible en Canvas)│  (Zero-GC)   │
└───────────────┴──────────────────────────────┴──────────────┘
```

### 1. Object Pooling (Zero Garbage Collection)
- Implementado en `js/core/ObjectPool.js`.
- Pools pre-asignados y reciclables para proyectiles, proyectiles enemigos, partículas, anillos de choque y textos flotantes.
- Los arrays de entidades se compactan *in-place* sin crear nuevos arrays (`length = count`), eliminando picos de recolección de basura (*GC stalls*).

### 2. Grilla de Partición Espacial (`SpatialHashGrid.js`)
- Divide el mundo de 1920×1080 en celdas de 120×120 px.
- Permite consultas de radio (`queryRadius`) y cajas de colisión (`queryBox`) en tiempo $O(1)$ amortizado.
- **Active Bucket Tracking:** El método `clear()` solo resetea las celdas que realmente contienen entidades, evitando iterar celdas vacías.

### 3. Frustum / Viewport Culling
- El área visible del juego es de 960×540 px en un mundo de 1920×1080 px (solo el 25% del mapa está en pantalla).
- El motor descarta automáticamente proyectiles, partículas, coleccionables y enemigos fuera del encuadre de la cámara:
  - Solo los enemigos visibles entran al buffer de ordenamiento por profundidad $Y$.
  - Se ahorra más del 70% de llamadas de renderizado Canvas en momentos de saturación.

### 4. Camino Vectorial Rápido para Enemigos Fuera de Pantalla
- Los enemigos que están fuera del campo de visión del jugador se actualizan en un camino simplificado de 4 líneas (avance directo sin separación boid ni trigonometría costosa).
- Al entrar en la cámara, retoman su comportamiento completo (flanqueo circular, repulsión anti-aglomeración y habilidades).

### 5. Blitting de Texturas y Eliminación de Sombras Vectoriales
- Las sombras de los personajes se pre-renderizan una sola vez en un canvas fuera de pantalla (`getShadowSprite()`), permitiendo al navegador usar aceleración por GPU directa con `drawImage` en lugar de compilar curvas `ellipse()` por cada entidad.
- Las barras de vida de enemigos comunes a salud completa se omiten para evitar llamadas `fillRect` redundantes.

### 6. Tipografía Arcade Zero-Blur
- Eliminación total de `ctx.shadowBlur` en los textos flotantes (`floatingText.js`) y auras.
- Reemplazado por un sistema de doble extrusión pixel-art 3D con outline nítido y degradados verticales, erradicando los micro-tirones producidos por filtros gaussianos síncronos en Canvas.

---

## 🧠 Inteligencia Artificial y Sistema de Skills

### Árboles de Comportamiento (`js/ai/BehaviorTree.js`)
- Implementación de nodos compuestos: `Sequence`, `Selector`, `Parallel`.
- Nodos hoja: `ActionNode` y `ConditionNode`.
- Utilizado en jefes para gestionar de forma robusta sus estados: acecho, preparación de embestida telegrafiada, carga violenta, recuperación y transiciones de Fase 2 (enloquecimiento al 50% de vida).

### Sistema de Habilidades Modular (`js/skills/SkillSystem.js`)
- Arquitectura desacoplada basada en componentes: `Skill` y `SkillController`.
- Gestiona tiempos de reutilización (*cooldowns*), duraciones, coste de energía, modificadores acumulables y eventos independientes sin bloquear el hilo principal.
- Puede adjuntarse tanto al jugador como a cualquier enemigo o jefe.

---

## 🧩 Arquitectura de Modding (UGC)

El juego cuenta con un bus de eventos y un cargador de mods en caliente:

- **Bus de Eventos Priorizado (`js/core/EventBus.js`):** Permite a los mods suscribirse a eventos del ciclo de vida del juego con soporte para cancelación (`event.cancel()`) y modificación de parámetros:
  - `beforeEnemyDamage`
  - `onEnemyDamage`
  - `onEnemyKilled`
  - `onPlayerDamage`
- **Registro y Cargador Dinámico (`js/mods/`):**
  - `ModRegistry.js`: Repositorio de armas, skins, habilidades y mutadores.
  - `ModLoader.js`: Inicialización y control de dependencias.
  - `sampleFrostMod.js`: Mod de ejemplo incluido ("Chimi Pack" / "Frostbite") que introduce daño por congelación y efectos de escarcha mediante eventos desacoplados.

---

## ⌨️ Controles

| Tecla / Control | Acción |
| :--- | :--- |
| **W, A, S, D** o **Flechas** | Moverse por el escenario |
| **Espacio** | **DASH** / Embestida con invulnerabilidad |
| **Q** | Habilidad Activa #1 (Salva Radial - Nivel 5) |
| **E** | Habilidad Activa #2 (Clon Distractor - Nivel 10) |
| **R** | Habilidad Activa #3 (Escudo de Fuerza - Nivel 15) |
| **1, 2, 3** | Elegir carta de mejora al subir de nivel |
| **Botón de Retícula** | Alternar entre Puntería Automática y Manual |
| **Cursor del Ratón** | Apuntar hacia la dirección del puntero (Modo Manual) |
| **Esc** | Pausar partida / Abrir menú de árbol de habilidades activas y pasivas |

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).

### Pasos
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Pawtechh/domiii.git
   cd domiii
   ```
2. Iniciar el servidor local:
   ```bash
   npm start
   ```
   *(O alternativamente: `node server.cjs`)*
3. Abrir el navegador en:
   ```
   http://127.0.0.1:4177/
   ```

---

## 🧪 Suite de Pruebas Automatizadas

El proyecto cuenta con una batería de pruebas de integración y arquitectura utilizando el ejecutor nativo de Node.js:

```bash
node --test tests/architecture.test.js tests/combat.test.js tests/abilities.test.js tests/interaction.test.js
```

### Áreas cubiertas:
- ✅ **Arquitectura y Rendimiento:** Object Pools sin fugas, Grilla Espacial con búsquedas de caja/radio, EventBus con prioridades y cancelación.
- ✅ **Combate y Colisiones:** Detección swept-overlap continua, evoluciones de armas en nivel 15, invulnerabilidad de DASH, resolución de cadenas de muerte en un solo frame.
- ✅ **Habilidades e IA:** Árboles de comportamiento de jefes, habilidades pasivas, progresión por niveles, enemigos de soporte (healers, summoners, escudos).
- ✅ **Interacción:** Mapeo de coordenadas del ratón con letterboxing, advertencias de peligros en mapas y controles de puntería.

---

## 🔒 Privacidad y Almacenamiento Local

- Todas las cuentas, logros, cosméticos desbloqueados y puntuaciones se guardan exclusivamente en el `localStorage` del navegador local.
- Las contraseñas de las cuentas se derivan de forma segura mediante **PBKDF2**.
- No requiere backend externo ni envía datos privados a servidores de terceros.

---

## 📄 Licencia

Desarrollado bajo licencia abierta para fines educativos y de entretenimiento. ¡Que disfrutes la partida en el local de Pancho!
