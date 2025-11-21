/* GD Wave — Updated: mobile responsiveness, purple theme, restart fixed, bigger gaps, smaller jump */

/* ---------- CANVAS SETUP (high-DPI aware) ---------- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function setCanvasSize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
}
window.addEventListener('resize', setCanvasSize);
setCanvasSize();

/* ---------- ASSETS (keep your assets folder path) ---------- */
const playerImg = new Image();
playerImg.src = 'assets/player_normal.png';
const playerHitImg = new Image(); playerHitImg.src = 'assets/player_hit.png';
const playerWinImg = new Image();  playerWinImg.src = 'assets/player_win.png';
const hitSound = new Audio('assets/player_hit.m4a');
const winSound = new Audio('assets/player_win.m4a');

playerImg.onerror = () => console.log('player_normal.png failed to load (check assets path)');

/* ---------- GAME STATE ---------- */
let holding = false;
let running = true;
let score = 0;
let speedMultiplier = 0.9;
const MAX_SPEED = 3.6;

const player = {
  x: 0.22 * innerWidth,
  y: innerHeight * 0.5,
  radius: 28,
  vy: 0,
  gravity: 0.42,
  thrust: -5.2,            // REDUCED jump strength (was -8.2)
  rotation: 0,
  rotationTarget: 0,
  rotationSpeed: 0.14,
  trail: [],
  maxTrail: 26,
  state: 'normal' // normal | hit | win
};

const obstacles = [];
const BASE_SPAWN = 140;
let frame = 0, spawnCounter = 0;

/* ---------- HUD ---------- */
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const restartBtn = document.getElementById('restart');

/* prevent right-click menu (game) */
window.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- CONTROLS ---------- */
/* unified pointer handling (works for mouse + touch) */
function onPointerDown(e) { e.preventDefault(); holding = true; }
function onPointerUp(e) { e.preventDefault(); holding = false; }

window.addEventListener('pointerdown', onPointerDown, {passive:false});
window.addEventListener('pointerup',   onPointerUp,   {passive:false});
window.addEventListener('pointercancel', onPointerUp,  {passive:false});
window.addEventListener('touchend', onPointerUp, {passive:false});
window.addEventListener('keydown', e => { if (e.code === 'Space') holding = true; });
window.addEventListener('keyup',   e => { if (e.code === 'Space') holding = false; });

/* ---------- OBSTACLE SPAWNING ---------- */
function spawnMountain() {
  const totalWidth = 220 + Math.random() * 320; // visual block width
  // Make gap larger (more forgiving) but scale with speed
  // base gap around 220, shrink slightly as speed increases but keep min value
  const gap = Math.max(180, 260 - Math.floor(speedMultiplier * 18));
  const centerY = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
  const amplitude = Math.random() * (canvas.height * 0.14) + 18;
  const freq = 0.004 + Math.random()*0.008;

  obstacles.push({
    x: canvas.width,
    width: totalWidth,
    gap,
    centerY,
    amp: amplitude,
    freq,
    life: 0,
    passed: false,
    peaks: Math.max(2, Math.round(2 + Math.random()*4))
  });
}

/* ---------- COLLISION ---------- */
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX, dy = cy - nearestY;
  return (dx*dx + dy*dy) < (r*r);
}

/* ---------- GAME RESET / RESTART ---------- */
function resetGameState() {
  // reset core values without reloading page
  running = true;
  score = 0;
  speedMultiplier = 0.9;
  obstacles.length = 0;
  frame = 0;
  spawnCounter = 0;

  player.y = canvas.height * 0.5;
  player.x = 0.22 * innerWidth;
  player.vy = 0;
  player.trail.length = 0;
  player.state = 'normal';
  scoreEl.innerText = `Score: ${score}`;
  speedEl.innerText = `Speed: ${speedMultiplier.toFixed(2)}x`;
  restartBtn.style.display = 'none';
  restartBtn.setAttribute('aria-hidden', 'true');
}

/* restart handler works for both click & touch */
function restartGame(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  resetGameState();
  // begin update loop again if needed
  requestAnimationFrame(update);
}

/* bind both click and touchstart, and prevent double fire */
restartBtn.addEventListener('click', restartGame);
restartBtn.addEventListener('touchstart', function(e){ e.preventDefault(); restartGame(); }, {passive:false});

/* ---------- HIT / WIN ---------- */
function showEndScreen(text) {
  // show overlay but don't block restart or touches to restart button
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,14,0.62)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width/2, canvas.height/2 - 18);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 12);
  ctx.restore();
}

function onHit(){
  if (!running) return;
  running = false;
  player.state = 'hit';
  try { hitSound.currentTime = 0; hitSound.play(); } catch(e){/*ignore*/}

  restartBtn.style.display = 'inline-block';
  restartBtn.setAttribute('aria-hidden', 'false');
  showEndScreen('Game Over');
}

function onWin(){
  if (!running) return;
  running = false;
  player.state = 'win';
  try { winSound.currentTime = 0; winSound.play(); } catch(e){/*ignore*/}

  restartBtn.style.display = 'inline-block';
  restartBtn.setAttribute('aria-hidden', 'false');
  showEndScreen('You Win!');
}

/* ---------- DRAW HELPERS ---------- */
function drawTriangle(cx, cy, w, dir='up') {
  const h = w * 0.72;
  ctx.beginPath();
  if (dir === 'up') {
    ctx.moveTo(cx - w/2, cy + h/2);
    ctx.lineTo(cx + w/2, cy + h/2);
    ctx.lineTo(cx, cy - h/2);
  } else {
    ctx.moveTo(cx - w/2, cy - h/2);
    ctx.lineTo(cx + w/2, cy - h/2);
    ctx.lineTo(cx, cy + h/2);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(181, 85, 255, 0.12)'; // purple tint
  ctx.fill();

  // inner highlight
  ctx.beginPath();
  if (dir === 'up') {
    ctx.moveTo(cx - w*0.18, cy + h*0.18);
    ctx.lineTo(cx + w*0.18, cy + h*0.18);
    ctx.lineTo(cx, cy - h*0.18);
  } else {
    ctx.moveTo(cx - w*0.18, cy - h*0.18);
    ctx.lineTo(cx + w*0.18, cy - h*0.18);
    ctx.lineTo(cx, cy + h*0.18);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
}

/* ---------- RENDER ---------- */
function render(){
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // subtle stars (purple tinted)
  for (let s=0; s<60; s++){
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect((s*89 + frame*0.45) % canvas.width, (s*47) % canvas.height, 2, 2);
  }

  // trail (purple-white gradient)
  ctx.lineWidth = 2;
  for (let i = 0; i < player.trail.length - 1; i++) {
    const a = player.trail[i], b = player.trail[i+1];
    const t = i / player.trail.length;
    // mix white -> purple
    const alpha = 0.06 + 0.6 * t;
    ctx.strokeStyle = `rgba(200,160,255,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // player glow (soft purple)
  const glowR = player.radius * 1.6;
  const grad = ctx.createRadialGradient(player.x, player.y, 1, player.x, player.y, glowR);
  grad.addColorStop(0, 'rgba(220,180,255,0.18)');
  grad.addColorStop(1, 'rgba(120,30,100,0.00)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(player.x, player.y, glowR, 0, Math.PI*2); ctx.fill();

  // player image (rotated)
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.rotation);
  const imgW = player.radius*2, imgH = player.radius*2;
  if (player.state === 'hit') {
    if (playerHitImg.complete && playerHitImg.naturalWidth !== 0) ctx.drawImage(playerHitImg, -player.radius, -player.radius, imgW, imgH);
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0,player.radius,0,Math.PI*2); ctx.fill(); }
  } else if (player.state === 'win') {
    if (playerWinImg.complete && playerWinImg.naturalWidth !== 0) ctx.drawImage(playerWinImg, -player.radius, -player.radius, imgW, imgH);
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0,player.radius,0,Math.PI*2); ctx.fill(); }
  } else {
    if (playerImg.complete && playerImg.naturalWidth !== 0) ctx.drawImage(playerImg, -player.radius, -player.radius, imgW, imgH);
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0,player.radius,0,Math.PI*2); ctx.fill(); }
  }
  ctx.restore();

  // draw mountains (purple tinted)
  obstacles.forEach(ob => {
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier*0.12));
    const peaks = ob.peaks;
    const peakW = ob.width / peaks;
    for (let p = 0; p < peaks; p++) {
      const cx = ob.x + p * peakW + peakW/2;
      drawTriangle(cx, cy - ob.gap/2, peakW*0.9, 'down');
      drawTriangle(cx, cy + ob.gap/2, peakW*0.9, 'up');
    }

    // side fills (collision rects)
    ctx.fillStyle = 'rgba(80,20,110,0.12)';
    ctx.fillRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.fillRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));

    // outlines
    ctx.strokeStyle = 'rgba(200,150,255,0.10)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.strokeRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));
  });
}

/* ---------- MAIN UPDATE LOOP ---------- */
function update() {
  if (!running) return;
  frame++; spawnCounter++;

  // difficulty ramp
  if (frame % 200 === 0 &
