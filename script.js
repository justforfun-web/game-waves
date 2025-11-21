/* Geometry Dash — Wave style (triangles obstacles)
   Controls:
    - Hold anywhere (pointer/mouse/touch) to move UP
    - Release to fall (gravity)
   Features:
    - White trail behind player (line)
    - Triangle obstacles coming from the right
    - Obstacles oscillate vertically (up/down) while moving left
    - Game speed increases over time
*/

// --- Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Assets (preview uses your uploaded file; change to 'assets/player_wave.png' after upload)
const playerImg = new Image();
// PREVIEW local path (development environment). Keep only for preview here.
playerImg.src = '/mnt/data/8d18a9f7-fd73-4bb0-929a-ab573213d1e1.png';
// PRODUCTION: after uploading to GitHub, comment out the preview above and use:
// playerImg.src = 'assets/player_wave.png';

// --- Player (GD-wave style movement)
const player = {
  x: canvas.width * 0.2,
  y: canvas.height * 0.5,
  radius: 26,
  vy: 0,           // vertical velocity
  gravity: 0.45,
  thrust: -7.6,    // upward velocity while holding
  trail: [],
  maxTrail: 26
};

// controls
let holding = false;
let running = true;
let score = 0;
let speedMultiplier = 1.0;

// obstacles array
const obstacles = [];
const BASE_SPAWN = 110; // base frames between spawns

let frame = 0;
let spawnCounter = 0;

// hud elements
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const restartBtn = document.getElementById('restart');

window.addEventListener('contextmenu', e => e.preventDefault());

// Pointer (mouse/touch/right click) handlers
function down(e){ e.preventDefault(); holding = true; }
function up(e){ e.preventDefault(); holding = false; }
window.addEventListener('pointerdown', down);
window.addEventListener('pointerup', up);
window.addEventListener('pointercancel', up);
window.addEventListener('touchend', up);

// keyboard space for convenience
window.addEventListener('keydown', e => { if (e.code === 'Space') holding = true; });
window.addEventListener('keyup', e => { if (e.code === 'Space') holding = false; });

// --- obstacle factory (triangles)
function spawnObstacle() {
  const w = Math.max(50, Math.random() * 150);         // obstacle width (visual)
  const gap = Math.max(110, 180 - Math.floor(speedMultiplier * 18)); // gap size
  const centerY = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
  const amp = Math.random() * (canvas.height * 0.18) + 30; // vertical oscillation amplitude
  const freq = 0.004 + Math.random() * 0.009;

  obstacles.push({
    x: canvas.width + w,
    width: w,
    gap: gap,
    centerY: centerY,
    amp: amp,
    freq: freq,
    life: 0,
    passed: false
  });
}

// collision helper (circle vs rect)
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX, dy = cy - nearestY;
  return (dx*dx + dy*dy) < (r*r);
}

// --- main loop
function update(){
  if (!running) return;
  frame++; spawnCounter++;

  // gradually increase difficulty
  if (frame % 300 === 0) {
    speedMultiplier = Math.min(3.2, +(speedMultiplier + 0.05).toFixed(2));
  }

  // physics: while holding, player gets thrust; otherwise gravity
  if (holding) {
    player.vy = player.thrust * (1 + (speedMultiplier - 1) * 0.06);
  } else {
    player.vy += player.gravity * (1 + (speedMultiplier - 1) * 0.06);
  }
  player.y += player.vy;

  // clamp
  if (player.y < player.radius) { player.y = player.radius; player.vy = 0; }
  if (player.y > canvas.height - player.radius) { player.y = canvas.height - player.radius; player.vy = 0; }

  // trail
  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > player.maxTrail) player.trail.shift();

  // spawn obstacles faster when speed increases
  const spawnIntervalNow = Math.max(40, Math.round(BASE_SPAWN / speedMultiplier));
  if (spawnCounter >= spawnIntervalNow) {
    spawnCounter = 0; spawnObstacle();
  }

  // update obstacles
  for (let i = obstacles.length - 1; i >= 0; i--){
    const ob = obstacles[i];
    ob.x -= (3 + speedMultiplier * 1.6); // left speed
    ob.life++;

    // vertical oscillation center
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier * 0.12));

    // top rect (from y=0 to gap top)
    const topRect = { x: ob.x, y: 0, w: ob.width, h: cy - ob.gap/2 };
    const botRect = { x: ob.x, y: cy + ob.gap/2, w: ob.width, h: canvas.height - (cy + ob.gap/2) };

    // triangle visuals will be drawn for top and bottom (see render)
    // collision check using rects
    if (circleRectCollision(player.x, player.y, player.radius, topRect.x, topRect.y, topRect.w, topRect.h) ||
        circleRectCollision(player.x, player.y, player.radius, botRect.x, botRect.y, botRect.w, botRect.h)) {
      // crash
      endGame();
      return;
    }

    // scoring when passed
    if (!ob.passed && (ob.x + ob.width) < player.x) {
      ob.passed = true;
      score++;
      scoreEl.innerText = `Score: ${score}`;
    }

    // remove offscreen
    if (ob.x + ob.width < -100) obstacles.splice(i,1);
  }

  speedEl.innerText = `Speed: ${speedMultiplier.toFixed(2)}x`;

  render();
  requestAnimationFrame(update);
}

// --- rendering
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // subtle star background
  for (let s = 0; s < 60; s++){
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect((s*83 + frame*0.5) % canvas.width, (s*41) % canvas.height, 2, 2);
  }

  // draw white trail (straight line)
  ctx.lineWidth = 2;
  for (let i = 0; i < player.trail.length - 1; i++){
    const a = player.trail[i], b = player.trail[i+1];
    const t = i / player.trail.length;
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + 0.7 * t})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // draw player glow + image
  const glowR = player.radius * 1.5;
  const g = ctx.createRadialGradient(player.x, player.y, 1, player.x, player.y, glowR);
  g.addColorStop(0, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(player.x, player.y, glowR, 0, Math.PI*2); ctx.fill();

  // player image or fallback circle
  const imgW = player.radius * 2, imgH = player.radius * 2;
  if (playerImg.complete && playerImg.naturalWidth !== 0) {
    ctx.drawImage(playerImg, player.x - player.radius, player.y - player.radius, imgW, imgH);
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2); ctx.fill();
  }

  // draw triangle obstacles (top and bottom)
  obstacles.forEach(ob => {
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier * 0.12));
    // top triangle (pointing down)
    drawTriangle(ob.x + ob.width/2, cy - ob.gap/2, ob.width, 'down');
    // bottom triangle (pointing up)
    drawTriangle(ob.x + ob.width/2, cy + ob.gap/2, ob.width, 'up');

    // faint fill for sides (rectangles) to match collision rects
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.fillRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));

    // neon outline
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.strokeRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));
  });
}

// helper: draw triangle at cx,cy width w, direction up/down
function drawTriangle(cx, cy, w, dir='up') {
  const h = w * 0.7;
  ctx.beginPath();
  if (dir === 'up') {
    ctx.moveTo(cx - w/2, cy + h/2);
    ctx.lineTo(cx + w/2, cy + h/2);
    ctx.lineTo(cx, cy - h/2);
  } else {
    // pointing down
    ctx.moveTo(cx - w/2, cy - h/2);
    ctx.lineTo(cx + w/2, cy - h/2);
    ctx.lineTo(cx, cy + h/2);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  // inner sharp white
  ctx.beginPath();
  if (dir === 'up') {
    ctx.moveTo(cx - w*0.22, cy + h*0.22);
    ctx.lineTo(cx + w*0.22, cy + h*0.22);
    ctx.lineTo(cx, cy - h*0.22);
  } else {
    ctx.moveTo(cx - w*0.22, cy - h*0.22);
    ctx.lineTo(cx + w*0.22, cy - h*0.22);
    ctx.lineTo(cx, cy + h*0.22);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();
}

// --- end game
function endGame() {
  running = false;
  restartBtn.style.display = 'inline-block';
  restartBtn.onclick = () => location.reload();

  // overlay
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 18);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 12);
}

// start loop
update();
