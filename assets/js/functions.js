/* =====================================================================
   PRODUCT SORT GAME — Web Port
   Original: C# WinForms (December 2025) by Arthur Baldosano
   Port    : Vanilla JS, single-file, mobile-touch-aware
   ===================================================================== */

// ── Constants ─────────────────────────────────────────────────────────
const GAME_W       = 450;
const GAME_H       = 640;
const HUD_H        = 56;
const FIELD_H      = GAME_H - HUD_H;   // 584 — actual play area height
const PRODUCT_SIZE = 48;
const BASE_FALL_PX = 100;              // px per second (original: 5px / 50ms)
const BASE_SPAWN   = 1500;             // ms between spawns
const COMBO_TARGET = 5;               // correct in a row for +1 heart
const MAX_HEARTS   = 10;
const SCORE_STEP   = 10;
const SPEED_EVERY  = 200;             // score milestone for speed increase
const SPEED_FACTOR = 0.95;            // interval multiplier (original value)
const MIN_SPAWN    = 400;

const PRODUCTS = [
  { name: 'Apple',    category: 'Fruit'      },
  { name: 'Banana',   category: 'Fruit'      },
  { name: 'Orange',   category: 'Fruit'      },
  { name: 'Grape',    category: 'Fruit'      },
  { name: 'Mango',    category: 'Fruit'      },
  { name: 'Carrot',   category: 'Vegetable'  },
  { name: 'Potato',   category: 'Vegetable'  },
  { name: 'Tomato',   category: 'Vegetable'  },
  { name: 'Broccoli', category: 'Vegetable'  },
  { name: 'Cucumber', category: 'Vegetable'  },
  { name: 'Milk',     category: 'Dairy'      },
  { name: 'Cheese',   category: 'Dairy'      },
  { name: 'Yogurt',   category: 'Dairy'      },
  { name: 'Butter',   category: 'Dairy'      },
  { name: 'Cream',    category: 'Dairy'      },
];

// ── DOM refs ──────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const gameWrapper   = $('game-wrapper');
const gameContainer = $('game-container');
const gameArea      = $('game-area');
const hud           = $('hud');
const heartsDisplay = $('hearts-display');
const scoreDisplay  = $('score-display');
const menuHighscore = $('menu-highscore');
const gameoverScore = $('gameover-score');
const gameoverBest  = $('gameover-best');

const screenMenu     = $('screen-menu');
const screenPause    = $('screen-pause');
const screenGameover = $('screen-gameover');

const baskets = [
  { el: $('basket-Fruit'),      category: 'Fruit'      },
  { el: $('basket-Vegetable'),  category: 'Vegetable'  },
  { el: $('basket-Dairy'),      category: 'Dairy'      },
];

const snd = {
  bgm:      $('snd-bgm'),
  click:    $('snd-click'),
  correct:  $('snd-correct'),
  wrong:    $('snd-wrong'),
  levelup:  $('snd-levelup'),
  gameover: $('snd-gameover'),
};

// ── State ─────────────────────────────────────────────────────────────
let fallingProducts = [];   // [{ el, category, x, y }]
let hearts          = 5;
let score           = 0;
let correctCombo    = 0;
let highScore       = parseInt(localStorage.getItem('psg_hs') || '0');
let isGameOver      = false;
let isPaused        = false;
let spawnIntervalMs = BASE_SPAWN;
let speedMult       = 1.0;
let lastMilestone   = 0;

let spawnTimerId  = null;
let animFrameId   = null;
let lastTimestamp = null;

// Drag state
let drag = null; // { fp, offX, offY }

// ── Sound helpers ─────────────────────────────────────────────────────
function play(el) {
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

function playBgm()  { snd.bgm.play().catch(() => {}); }
function stopBgm()  { snd.bgm.pause(); snd.bgm.currentTime = 0; }

// ── Responsive scaling ────────────────────────────────────────────────
function scaleGame() {
  const sw    = window.innerWidth;
  const sh    = window.innerHeight;
  const scale = Math.min(1, sw / (GAME_W + 16), sh / (GAME_H + 40));
  gameWrapper.style.transform = `scale(${scale})`;
  // Let body expand to show the scaled wrapper
  document.body.style.minHeight = (GAME_H * scale + 40) + 'px';
}
window.addEventListener('resize', scaleGame);
scaleGame();

// ── High score ────────────────────────────────────────────────────────
function saveHS() { localStorage.setItem('psg_hs', highScore); }

// ── Screen management ─────────────────────────────────────────────────
function showMenu() {
  screenMenu.classList.remove('hidden');
  screenPause.classList.add('hidden');
  screenGameover.classList.add('hidden');
  hud.classList.remove('visible');
}

function hideMenu() {
  screenMenu.classList.add('hidden');
  hud.classList.add('visible');
}

function showPause() {
  screenPause.classList.remove('hidden');
  screenGameover.classList.add('hidden');
}

function hidePause() {
  screenPause.classList.add('hidden');
}

function showGameover() {
  screenGameover.classList.remove('hidden');
  screenPause.classList.add('hidden');
}

// ── Game flow ─────────────────────────────────────────────────────────
function startGame() {
  isGameOver      = false;
  isPaused        = false;
  hearts          = 5;
  score           = 0;
  correctCombo    = 0;
  spawnIntervalMs = BASE_SPAWN;
  speedMult       = 1.0;
  lastMilestone   = 0;
  lastTimestamp   = null;
  drag            = null;

  clearProducts();
  hideMenu();
  hidePause();
  screenGameover.classList.add('hidden');

  updateHeartsUI();
  updateScoreUI();
  playBgm();
  startSpawn();
  animFrameId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (isGameOver || isPaused) return;
  isPaused = true;
  stopSpawn();
  cancelAnimationFrame(animFrameId);
  animFrameId = null;
  showPause();
}

function resumeGame() {
  if (!isPaused) return;
  isPaused      = false;
  lastTimestamp = null;
  hidePause();
  startSpawn();
  animFrameId = requestAnimationFrame(gameLoop);
}

function backToMenu() {
  stopSpawn();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  isGameOver  = false;
  isPaused    = false;
  drag        = null;
  clearProducts();
  menuHighscore.textContent = `Best: ${highScore}`;
  showMenu();
  playBgm();
}

function triggerGameOver() {
  if (isGameOver) return;
  isGameOver = true;
  stopSpawn();
  cancelAnimationFrame(animFrameId);
  animFrameId = null;
  drag = null;

  if (score > highScore) { highScore = score; saveHS(); }

  play(snd.gameover);
  stopBgm();

  gameoverScore.textContent = `Score: ${score}`;
  gameoverBest.textContent  = `Best: ${highScore}`;
  showGameover();
}

// ── Spawn timer ───────────────────────────────────────────────────────
function startSpawn() {
  stopSpawn();
  spawnTimerId = setInterval(spawnProduct, spawnIntervalMs);
}

function stopSpawn() {
  if (spawnTimerId) { clearInterval(spawnTimerId); spawnTimerId = null; }
}

function resetSpawn() {
  stopSpawn();
  if (!isGameOver && !isPaused) startSpawn();
}

// ── Game loop (rAF + delta time) ──────────────────────────────────────
function gameLoop(ts) {
  if (isPaused || isGameOver) return;

  if (lastTimestamp === null) lastTimestamp = ts;
  const delta = Math.min((ts - lastTimestamp) / 1000, 0.05); // cap at 50ms
  lastTimestamp = ts;

  const move = BASE_FALL_PX * speedMult * delta;

  for (let i = fallingProducts.length - 1; i >= 0; i--) {
    const fp = fallingProducts[i];
    if (drag && drag.fp === fp) continue; // don't move dragged item

    fp.y += move;
    fp.el.style.top = fp.y.toFixed(1) + 'px';

    if (fp.y > FIELD_H) {          // fell off the bottom
      removeProductAt(i);
      loseHeart();
      if (isGameOver) return;
    }
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

// ── Spawn product ─────────────────────────────────────────────────────
function spawnProduct() {
  if (isGameOver || isPaused) return;

  const p  = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  const x  = Math.floor(Math.random() * (GAME_W - PRODUCT_SIZE - 20)) + 10;
  const y  = -PRODUCT_SIZE;

  const img       = document.createElement('img');
  img.src         = `images/${p.name}.png`;
  img.alt         = p.name;
  img.className   = 'product';
  img.draggable   = false;
  img.style.left  = x + 'px';
  img.style.top   = y + 'px';
  img.style.zIndex = (fallingProducts.length + 10).toString();

  const fp = { el: img, category: p.category, x, y };

  img.addEventListener('mousedown',  e => onDragStart(e, fp));
  img.addEventListener('touchstart', e => onDragStart(e, fp), { passive: false });

  gameArea.appendChild(img);
  fallingProducts.push(fp);
}

// ── Drag & drop ───────────────────────────────────────────────────────

/** Get pointer position in LOGICAL game-area coordinates */
function toGameCoords(clientX, clientY) {
  const rect   = gameArea.getBoundingClientRect();
  const scaleX = GAME_W  / rect.width;
  const scaleY = FIELD_H / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top)  * scaleY,
  };
}

function getClient(e) {
  return e.touches
    ? { cx: e.touches[0].clientX, cy: e.touches[0].clientY }
    : { cx: e.clientX,            cy: e.clientY };
}

function onDragStart(e, fp) {
  e.preventDefault();
  e.stopPropagation();
  if (drag || isGameOver || isPaused) return;

  const { cx, cy } = getClient(e);
  const pos = toGameCoords(cx, cy);

  drag = { fp, offX: pos.x - fp.x, offY: pos.y - fp.y };
  fp.el.classList.add('is-dragging');
}

function onDragMove(e) {
  if (!drag) return;
  e.preventDefault();

  const { cx, cy } = getClient(e);
  const pos = toGameCoords(cx, cy);

  drag.fp.x = pos.x - drag.offX;
  drag.fp.y = pos.y - drag.offY;
  drag.fp.el.style.left = drag.fp.x.toFixed(1) + 'px';
  drag.fp.el.style.top  = drag.fp.y.toFixed(1) + 'px';
}

function onDragEnd(e) {
  if (!drag) return;
  e.preventDefault();

  const fp = drag.fp;
  fp.el.classList.remove('is-dragging');

  const productCX = fp.x + PRODUCT_SIZE / 2;
  const productCY = fp.y + PRODUCT_SIZE / 2;

  const gaRect = gameArea.getBoundingClientRect();
  const scaleX = GAME_W  / gaRect.width;
  const scaleY = FIELD_H / gaRect.height;

  let hit = false;
  for (const basket of baskets) {
    const br = basket.el.getBoundingClientRect();
    const bx = (br.left - gaRect.left) * scaleX;
    const by = (br.top  - gaRect.top)  * scaleY;
    const bw = br.width  * scaleX;
    const bh = br.height * scaleY;
    const pad = 16;

    if (
      productCX >= bx - pad && productCX <= bx + bw + pad &&
      productCY >= by - pad && productCY <= by + bh + pad
    ) {
      hit = true;
      const idx = fallingProducts.indexOf(fp);

      if (fp.category === basket.category) {
        // ✓ Correct sort
        if (idx !== -1) fallingProducts.splice(idx, 1);
        gameArea.removeChild(fp.el);
        score += SCORE_STEP;
        correctCombo++;
        if (correctCombo >= COMBO_TARGET) {
          hearts = Math.min(hearts + 1, MAX_HEARTS);
          correctCombo = 0;
        }
        updateScoreUI();
        updateHeartsUI();
        play(snd.correct);
        showFeedback('+10', productCX, productCY, '#2e7d32');
        flashBasket(basket.el, 'basket-correct');
        checkSpeed();
      } else {
        // ✗ Wrong sort — product resumes falling
        play(snd.wrong);
        correctCombo = 0;
        flashBasket(basket.el, 'basket-wrong');
        showFeedback('✗', productCX, productCY, '#c62828');
        loseHeart();
      }
      break;
    }
  }

  // Miss — product just keeps falling (already in fallingProducts)
  drag = null;
  if (isGameOver) return;
}

// ── UI helpers ────────────────────────────────────────────────────────
const HEART_SVG = `<svg class="heart-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="%COLOR%" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
</svg>`;

function updateHeartsUI() {
  let html = '';
  for (let i = 0; i < Math.min(hearts, MAX_HEARTS); i++) {
    html += HEART_SVG.replace('%COLOR%', '#e53935');
  }
  heartsDisplay.innerHTML = html;
  heartsDisplay.setAttribute('aria-label', `${hearts} hearts remaining`);
}

function updateScoreUI() {
  scoreDisplay.textContent = `Score: ${score}`;
}

function loseHeart() {
  hearts--;
  correctCombo = 0;
  updateHeartsUI();
  if (hearts <= 0) triggerGameOver();
}

function showFeedback(text, x, y, color) {
  const el       = document.createElement('div');
  el.className   = 'feedback-label';
  el.textContent = text;
  el.style.color = color;
  el.style.left  = (x - 16) + 'px';
  el.style.top   = (y - 16) + 'px';
  gameArea.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

function flashBasket(el, cls) {
  el.classList.remove('basket-correct', 'basket-wrong');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

// ── Speed increase ────────────────────────────────────────────────────
function checkSpeed() {
  if (score === 0) return;
  const milestone = Math.floor(score / SPEED_EVERY);
  if (milestone > lastMilestone) {
    lastMilestone   = milestone;
    spawnIntervalMs = Math.max(MIN_SPAWN, Math.round(spawnIntervalMs * SPEED_FACTOR));
    speedMult      *= (1 / SPEED_FACTOR); // ~1.053×
    resetSpawn();
    play(snd.levelup);
    gameContainer.classList.add('flash-speed');
    gameContainer.addEventListener('animationend',
      () => gameContainer.classList.remove('flash-speed'), { once: true });
  }
}

// ── Product cleanup ───────────────────────────────────────────────────
function removeProductAt(i) {
  const fp = fallingProducts[i];
  if (fp.el.parentNode) fp.el.parentNode.removeChild(fp.el);
  fallingProducts.splice(i, 1);
}

function clearProducts() {
  fallingProducts.forEach(fp => {
    if (fp.el.parentNode) fp.el.parentNode.removeChild(fp.el);
  });
  fallingProducts = [];
  drag = null;
}

// ── Global event listeners ────────────────────────────────────────────
document.addEventListener('mousemove',  onDragMove);
document.addEventListener('mouseup',    onDragEnd);
document.addEventListener('touchmove',  onDragMove, { passive: false });
document.addEventListener('touchend',   onDragEnd,  { passive: false });
document.addEventListener('touchcancel',onDragEnd,  { passive: false });

$('btn-start').addEventListener('click', () => { play(snd.click); startGame(); });
$('btn-pause').addEventListener('click', () => { play(snd.click); pauseGame(); });
$('btn-resume').addEventListener('click', () => { play(snd.click); resumeGame(); });
$('btn-menu-pause').addEventListener('click', () => { play(snd.click); backToMenu(); });
$('btn-restart').addEventListener('click', () => { play(snd.click); startGame(); });
$('btn-menu-gameover').addEventListener('click', () => { play(snd.click); backToMenu(); });

// ── Init ──────────────────────────────────────────────────────────────
menuHighscore.textContent = `Best: ${highScore}`;
showMenu();