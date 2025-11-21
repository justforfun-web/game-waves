// GD Wave — Final updated script (cleaned & syntax-checked)
// Uses your assets in /assets/ (player_normal.png, player_hit.png, player_win.png, player_hit.m4a, player_win.m4a)

// ---------- Canvas setup (high-DPI aware) ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

if (!canvas || !ctx) {
  console.warn('Canvas or context not found. Make sure index.html contains <canvas id="gameCanvas">');
}

function setCanvasSize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  if (canvas) {
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // draw in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}
window.addEventListener('resize', setCanvasSize);
setCanvasSize();

// ---------- Assets ----------
const ASSET_PREFIX = 'assets/';

const playerImg = new Image();
playerImg.src = ASSET_PREFIX + 'player_normal.png';

const playerHitImg = new Image();
playerHitImg.src = ASSET_PREFIX + 'player_hit.png';

const playerWinImg = new Image();
playerWinImg.src = ASSET_PREFIX + 'player_win.png';

const hitSound = new Audio(ASSET_PREFIX + 'player_hit.m4a');
const winSound = new Audio(ASSET_PREFIX + 'player_win.m4a');

playerImg.onerror = () => console.warn('Could not load', playerImg.src);
playerHitImg.onerror = () => console.warn('Could not load', playerHitImg.src);
playerWinImg.onerror = () => console.warn('Could not load', playerWinImg.src);
hitSound.onerror = () => console.warn('Could not load', hitSound.src);
winSound.onerror = () => console.warn('Could not load', winSound.src);

// ---------- DOM HUD ----------
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const restartBtn = document.getElementById('restart');

if (!scoreEl || !timeEl || !restartBtn) {
  console.warn('HUD elements missing: scoreEl/timeEl/restartBtn should exist in DOM.');
}

// ---------- Game state ----------
let running = true;
let holding = false;
let score = 0;
let startTimestamp = null; // set when game actually starts or is reset

let difficultySpeed = 3.0; // base obstacle speed
const GRAVITY = 0.32;
const JUMP = -4.0; // Jump A: very small jump

const player = {
  x: window.innerWidth * 0.22,
  y: window.innerHeight * 0.5,
  vy: 0,
  radius: 28,
  state: 'normal', // normal | hit | win
  trail: [] // array of {x,y}
};

const obstacles = [];
let spawnCounter = 0;

// ---------- Input (pointer + touch + keyboard) ----------
function pointerDown(e) { e && e.preventDefault(); holding = true; }
function pointerUp(e) { e && e.preventDefault(); holding = false; }

window.addEventListener('pointerdown', pointerDown, {passive:false});
window.addEventListener('pointerup', pointerUp, {passive:false});
window.addEventListener('pointercancel', pointerUp, {passive:false});

window.addEventListener('touchend', pointerUp, {passive:false});
window.addEventListener('keydown', e => { if (e.code === 'Space') holding = true; });
window.addEventListener('keyup', e => { if (e.code === 'Space') holding = false; });

// ---------- Utility: collision (circle vs rect) ----------
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX, dy = cy - nearestY;
  return (dx*dx + dy*dy) < (r*r);
}

// ---------- Spawn obstacles ----------
function spawnObstacle() {
  // width and gap scale with screen size a bit
  const baseGap = Math.max(160, Math.round(canvas.height * 0.18)); // comfortable default
  const gap = Math.max(140, baseGap - Math.round(difficultySpeed * 8)); // larger gap, reduces as speed grows
  const width = 70 + Math.random() * 90;
  const centerY = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
  obstacles.push({
    x: canvas.width + width,
    width,
    gap,
    centerY,
    passed: false,
    osc: Math.random() * 0.9 + 0.3 // small vertical oscillation factor
  });
}

// ---------- Reset / Restart ----------
function resetGame() {
  console.log('Game reset');
  running = true;
  holding = false;
  score = 0;
  obstacles.length = 0;
  player.trail.length = 0;
  player.vy = 0;
  player.state = 'normal';
  difficultySpeed = 3.0;
  spawnCounter = 0;
  startTimestamp = performance.now();
  player.x = window.innerWidth * 0.22;
  player.y = window.innerHeight * 0.5;
  if (scoreEl) scoreEl.textContent = 'Score: 0';
  if (timeEl) timeEl.textContent = 'Time: 0s';
  if (restartBtn) {
    restartBtn.style.display = 'none';
    restartBtn.setAttribute('aria-hidden', 'true');
  }
  // ensure loop runs
  requestAnimationFrame(loop);
}

// Bind restart (works for click & touch)
function restartHandler(e) {
  e && e.preventDefault();
  resetGame();
}
if (restartBtn) {
  restartBtn.addEventListener('click', restartHandler);
  restartBtn.addEventListener('touchstart', function(e){ e && e.preventDefault(); restartHandler(); }, {passive:false});
}

// ---------- End states ----------
function showEndOverlay(text) {
  // draw a subtle overlay; leave restart button clickable
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = 'rgba(5,3,8,0.56)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width/2, canvas.height/2 - 12);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 18);
  ctx.restore();
}

function onHit() {
  if (!running) return;
  console.log('Hit!');
  running = false;
  player.state = 'hit';
  try { hitSound.currentTime = 0; hitSound.play(); } catch(e){ console.warn('hit sound playback failed', e); }
  if (restartBtn) {
    restartBtn.style.display = 'inline-block';
    restartBtn.setAttribute('aria-hidden', 'false');
  }
  showEndOverlay('Game Over');
}

function onWin() {
  if (!running) return;
  console.log('Win!');
  running = false;
  player.state = 'win';
  try { winSound.currentTime = 0; winSound.play(); } catch(e){ console.warn('win sound playback failed', e); }
  if (restartBtn) {
    restartBtn.style.display = 'inline-block';
    restartBtn.setAttribute('aria-hidden', 'false');
  }
  showEndOverlay('YOU WIN!');
}

// ---------- Render helpers ----------
function neonBackground() {
  if (!ctx) return;
  // Option C radial neon: draw to canvas for consistent look across devices
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = Math.max(canvas.width, canvas.height) * 0.8;
  const g = ctx.createRadialGradient(cx, cy*0.9, 60, cx, cy, r);
  g.addColorStop(0, '#4b0082');
  g.addColorStop(0.55, '#26002a');
  g.addColorStop(1, '#120024');
  ctx.fillStyle = g;
  // cover in CSS pixels (ctx already scaled)
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

function drawTrail() {
  if (!ctx) return;
  // Trail A: long smooth fading trail
  if (player.trail.length < 2) return;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let i = 0; i < player.trail.length - 1; i++) {
    const a = player.trail[i];
    const b = player.trail[i+1];
    const t = i / player.trail.length;
    const alpha = 0.02 + 0.7 * t; // long fade
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 4 + 2 * t;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawPlayer() {
  if (!ctx) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  // glow behind
  const glowR = player.radius * 1.6;
  const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, glowR);
  grad.addColorStop(0, 'rgba(220,180,255,0.18)');
  grad.addColorStop(1, 'rgba(120,30,100,0.00)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0,0,glowR,0,Math.PI*2); ctx.fill();

  // draw image (use correct image based on state if loaded)
  const img = (player.state === 'hit') ? playerHitImg : (player.state === 'win' ? playerWinImg : playerImg);
  if (img && img.complete && img.naturalWidth) {
    ctx.drawImage(img, -player.radius, -player.radius, player.radius*2, player.radius*2);
  } else {
    // fallback circle if image missing
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0,0,player.radius,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawObstacles() {
  if (!ctx) return;
  obstacles.forEach(ob => {
    const osc = Math.sin((performance.now()/1000) * ob.osc * 2 * Math.PI);
    const centerY = ob.centerY + osc * 18 * ob.osc; // small vertical oscillation
    const topH = centerY - ob.gap/2;
    const botY = centerY + ob.gap/2;

    // neon triangle outlines (top)
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(ob.x, topH);
    ctx.lineTo(ob.x + ob.width/2, topH - Math.min(120, ob.width));
    ctx.lineTo(ob.x + ob.width, topH);
    ctx.closePath();
    ctx.stroke();

    // bottom triangle
    ctx.beginPath();
    ctx.moveTo(ob.x, botY);
    ctx.lineTo(ob.x + ob.width/2, botY + Math.min(120, ob.width));
    ctx.lineTo(ob.x + ob.width, botY);
    ctx.closePath();
    ctx.stroke();

    // filled side blocks (for clarity & collision)
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(ob.x, 0, ob.width, topH);
    ctx.fillRect(ob.x, botY, ob.width, canvas.height - botY);

    // subtle outline rects
    ctx.strokeStyle = 'rgba(200,160,255,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ob.x, 0, ob.width, topH);
    ctx.strokeRect(ob.x, botY, ob.width, canvas.height - botY);
  });
}

// ---------- Main loop ----------
function loop(now) {
  if (!startTimestamp) startTimestamp = now;
  if (!running) return; // stop updating if not running

  const elapsedMs = now - startTimestamp;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  if (timeEl) timeEl.textContent = `Time: ${elapsedSec}s`;

  // win at 120s (2 minutes)
  if (elapsedSec >= 120) {
    onWin();
    return;
  }

  // update spawn
  spawnCounter++;
  const spawnInterval = Math.max(40, 90 - Math.round(difficultySpeed * 6)); // spawn faster with difficulty
  if (spawnCounter >= spawnInterval) {
    spawnCounter = 0;
    spawnObstacle();
  }

  // difficulty increases slowly over time
  difficultySpeed = 3 + (elapsedMs / 60000) * 2.5; // +2.5 over one minute as an example

  // player physics
  if (holding) {
    player.vy = JUMP;
  } else {
    player.vy += GRAVITY;
  }

  // clamp vertical velocity for stability
  if (player.vy < -12) player.vy = -12;
  if (player.vy > 22) player.vy = 22;

  player.y += player.vy;

  // clamp player inside screen
  if (player.y < player.radius) {
    player.y = player.radius;
    player.vy = 0;
  }
  if (player.y > canvas.height - player.radius) {
    player.y = canvas.height - player.radius;
    player.vy = 0;
  }

  // trail handling (Trail A long)
  player.trail.push({x: player.x, y: player.y});
  if (player.trail.length > 60) player.trail.shift();

  // update obstacles & collisions
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= difficultySpeed;

    const osc = Math.sin((performance.now()/1000) * ob.osc * 2 * Math.PI);
    const centerY = ob.centerY + osc * 18 * ob.osc;
    const topH = centerY - ob.gap/2;
    const botY = centerY + ob.gap/2;

    // collision checks (rects)
    if (circleRectCollision(player.x, player.y, player.radius, ob.x, 0, ob.width, topH) ||
        circleRectCollision(player.x, player.y, player.radius, ob.x, botY, ob.width, canvas.height - botY)) {
      onHit();
      return;
    }

    // score increment once player passes obstacle
    if (!ob.passed && (ob.x + ob.width) < player.x) {
      ob.passed = true;
      score++;
      if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    }

    // remove off-screen obstacles
    if (ob.x + ob.width < -50) obstacles.splice(i, 1);
  }

  // render
  neonBackground();
  drawTrail();
  drawObstacles();
  drawPlayer();

  // loop
  requestAnimationFrame(loop);
}

// ---------- Start the game ----------
resetGame(); // initializes startTimestamp and begins loop
