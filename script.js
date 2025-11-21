// GD Wave — Fixed obstacles + neon trail (updated)
// Overwrites previous script.js. Uses your assets in /assets/

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
let startTimestamp = null; // ms from requestAnimationFrame

// camera / world (player stays visually near left, camera moves)
let cameraX = 0;
let cameraSpeed = 3.0; // base camera speed (pixels per frame approx)
let difficultySpeed = 3.0; // used for spawn logic
const GRAVITY = 0.32;
const JUMP = -4.0; // small jump chosen

const player = {
  // player.screenX is constant on screen (where the player is drawn)
  screenX: Math.round(window.innerWidth * 0.22),
  worldOffsetY: 0,
  worldY: window.innerHeight * 0.5, // vertical world coordinate (not affected by cameraX)
  vy: 0,
  radius: 28,
  state: 'normal',
  trail: [] // stores screen positions for trail drawing
};

const obstacles = []; // each obstacle has world x, width, gap, centerY, passed, osc
let spawnCounter = 0;

// ---------- Input ----------
function pointerDown(e) { e && e.preventDefault(); holding = true; }
function pointerUp(e) { e && e.preventDefault(); holding = false; }

window.addEventListener('pointerdown', pointerDown, {passive:false});
window.addEventListener('pointerup', pointerUp, {passive:false});
window.addEventListener('pointercancel', pointerUp, {passive:false});
window.addEventListener('touchend', pointerUp, {passive:false});
window.addEventListener('keydown', e => { if (e.code === 'Space') holding = true; });
window.addEventListener('keyup', e => { if (e.code === 'Space') holding = false; });

// ---------- Util: collision (circle vs rect) - using screen coords ----------
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX, dy = cy - nearestY;
  return (dx*dx + dy*dy) < (r*r);
}

// ---------- Spawn obstacles (world coordinates fixed) ----------
function spawnObstacle() {
  // place obstacle at a fixed world x ahead of camera
  const ahead = canvas.width * (0.8 + Math.random() * 0.4); // spawn between 0.8w and 1.2w ahead
  const baseGap = Math.max(180, Math.round(canvas.height * 0.18));
  const gap = Math.max(160, baseGap - Math.round((cameraSpeed - 3) * 6)); // slightly shrink as speed grows
  const width = 70 + Math.random() * 90;
  const centerY = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;

  const worldX = cameraX + ahead + Math.random() * 240; // additional random spacing
  obstacles.push({
    x: worldX,
    width,
    gap,
    centerY,
    passed: false,
    osc: Math.random() * 0.9 + 0.3
  });
}

// ---------- Restart / Reset ----------
function resetGame() {
  running = true;
  holding = false;
  score = 0;
  obstacles.length = 0;
  player.trail.length = 0;
  player.vy = 0;
  player.state = 'normal';
  cameraX = 0;
  cameraSpeed = 3.0;
  difficultySpeed = 3.0;
  spawnCounter = 0;
  startTimestamp = null;
  if (scoreEl) scoreEl.textContent = 'Score: 0';
  if (timeEl) timeEl.textContent = 'Time: 0s';
  if (restartBtn) {
    restartBtn.style.display = 'none';
    restartBtn.setAttribute('aria-hidden', 'true');
  }
  requestAnimationFrame(loop);
}

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
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = 'rgba(5,3,8,0.6)';
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
  running = false;
  player.state = 'hit';
  try { hitSound.currentTime = 0; hitSound.play(); } catch(e){ /* ignore */ }
  if (restartBtn) {
    restartBtn.style.display = 'inline-block';
    restartBtn.setAttribute('aria-hidden', 'false');
  }
  showEndOverlay('Game Over');
}

function onWin() {
  if (!running) return;
  running = false;
  player.state = 'win';
  try { winSound.currentTime = 0; winSound.play(); } catch(e){ /* ignore */ }
  if (restartBtn) {
    restartBtn.style.display = 'inline-block';
    restartBtn.setAttribute('aria-hidden', 'false');
  }
  showEndOverlay('YOU WIN!');
}

// ---------- Drawing: neon trail & players & obstacles ----------
function neonBackground() {
  if (!ctx) return;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = Math.max(canvas.width, canvas.height) * 0.8;
  const g = ctx.createRadialGradient(cx, cy * 0.9, 60, cx, cy, r);
  g.addColorStop(0, '#4b0082');
  g.addColorStop(0.55, '#26002a');
  g.addColorStop(1, '#120024');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTrail() {
  if (!ctx) return;
  const trail = player.trail;
  if (trail.length < 2) return;

  // Use additive blending and shadow for glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Draw multiple layered strokes for soft neon glow
  // Outer soft glow
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(200,160,255,0.9)';
  ctx.shadowBlur = 28;
  ctx.strokeStyle = 'rgba(170,130,255,0.18)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke();

  // Mid glow
  ctx.shadowBlur = 16;
  ctx.strokeStyle = 'rgba(220,190,255,0.32)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke();

  // Core white line
  ctx.shadowBlur = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke();

  ctx.restore();
}

function drawPlayer() {
  if (!ctx) return;
  const screenX = player.screenX;
  const screenY = player.worldY;

  ctx.save();
  // glow circle
  const glowR = player.radius * 1.6;
  const grad = ctx.createRadialGradient(screenX, screenY, 1, screenX, screenY, glowR);
  grad.addColorStop(0, 'rgba(220,180,255,0.22)');
  grad.addColorStop(1, 'rgba(120,30,100,0.00)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(screenX, screenY, glowR, 0, Math.PI*2); ctx.fill();

  // draw player image
  const img = (player.state === 'hit') ? playerHitImg : (player.state === 'win' ? playerWinImg : playerImg);
  if (img && img.complete && img.naturalWidth) {
    ctx.drawImage(img, screenX - player.radius, screenY - player.radius, player.radius*2, player.radius*2);
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(screenX, screenY, player.radius, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawObstacles() {
  if (!ctx) return;
  obstacles.forEach(ob => {
    const screenX = ob.x - cameraX;
    // don't draw if far off-screen left
    if (screenX < -ob.width - 60 || screenX > canvas.width + 120) return;

    const osc = Math.sin((performance.now()/1000) * ob.osc * 2 * Math.PI);
    const centerY = ob.centerY + osc * 18 * ob.osc;
    const topH = centerY - ob.gap/2;
    const botY = centerY + ob.gap/2;

    // neon stroke triangles
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(screenX, topH);
    ctx.lineTo(screenX + ob.width/2, topH - Math.min(120, ob.width));
    ctx.lineTo(screenX + ob.width, topH);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(screenX, botY);
    ctx.lineTo(screenX + ob.width/2, botY + Math.min(120, ob.width));
    ctx.lineTo(screenX + ob.width, botY);
    ctx.closePath();
    ctx.stroke();

    // side fills for collision
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(screenX, 0, ob.width, topH);
    ctx.fillRect(screenX, botY, ob.width, canvas.height - botY);

    // subtle outline
    ctx.strokeStyle = 'rgba(200,160,255,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, 0, ob.width, topH);
    ctx.strokeRect(screenX, botY, ob.width, canvas.height - botY);
    ctx.restore();
  });
}

// ---------- Main loop ----------
let lastNow = null;
function loop(now) {
  if (!startTimestamp) startTimestamp = now;
  if (!running) return;
  if (!lastNow) lastNow = now;
  const dt = Math.min(60, now - lastNow) / 1000; // seconds (clamped)
  lastNow = now;

  const elapsedMs = now - startTimestamp;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  if (timeEl) timeEl.textContent = `Time: ${elapsedSec}s`;
  if (elapsedSec >= 120) {
    onWin();
    return;
  }

  // Difficulty: camera speed increases gradually
  cameraSpeed = 3 + (elapsedMs / 40000); // +1 every 40s approx
  difficultySpeed = cameraSpeed;

  // camera moves forward (player appears to move forward)
  cameraX += cameraSpeed * (60 * dt) * 0.6; // scale to feel right across framerate

  // Spawn ahead (fixed world obstacles)
  spawnCounter++;
  const spawnInterval = Math.max(60, 120 - Math.round(difficultySpeed * 6));
  if (spawnCounter >= spawnInterval) {
    spawnCounter = 0;
    spawnObstacle();
  }

  // Player physics (vertical only)
  if (holding) {
    player.vy = JUMP;
  } else {
    player.vy += GRAVITY;
  }
  // clamp
  if (player.vy < -12) player.vy = -12;
  if (player.vy > 22) player.vy = 22;

  player.worldY += player.vy;
  // clamp vertical
  if (player.worldY < player.radius) { player.worldY = player.radius; player.vy = 0; }
  if (player.worldY > canvas.height - player.radius) { player.worldY = canvas.height - player.radius; player.vy = 0; }

  // trail: push current screen pos (player.screenX, player.worldY)
  player.trail.push({ x: player.screenX, y: player.worldY });
  if (player.trail.length > 80) player.trail.shift();

  // update obstacles: check collisions using screen coords
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    const screenX = ob.x - cameraX;
    const osc = Math.sin((performance.now()/1000) * ob.osc * 2 * Math.PI);
    const centerY = ob.centerY + osc * 18 * ob.osc;
    const topH = centerY - ob.gap/2;
    const botY = centerY + ob.gap/2;

    // collision: circle vs top rect and bottom rect
    if (circleRectCollision(player.screenX, player.worldY, player.radius, screenX, 0, ob.width, topH) ||
        circleRectCollision(player.screenX, player.worldY, player.radius, screenX, botY, ob.width, canvas.height - botY)) {
      return onHit();
    }

    // scoring: when camera has passed obstacle's right edge
    if (!ob.passed && (ob.x + ob.width) < cameraX + 30) {
      ob.passed = true;
      score++;
      if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    }

    // remove old obstacles far behind
    if ((ob.x - cameraX) < -300) obstacles.splice(i, 1);
  }

  // render
  neonBackground();
  // trail (must draw before obstacles/player for correct overlap)
  drawTrail();
  drawObstacles();
  drawPlayer();

  // continue
  requestAnimationFrame(loop);
}

// ---------- Start ----------
resetGame();

// Local uploaded video path (for your reference)
// /mnt/data/0c052b8b-4246-4859-88f2-20addf460aa9.mp4
