/* Geometry Dash - Wave (Smooth rotation)
   Controls:
    - Hold pointer (mouse/touch/right-click) to move UP
    - Release to fall (gravity)
   Features:
    - Smooth rotation of player's image (A: smooth)
    - White trail line
    - Triangle obstacles that oscillate up/down while moving left
    - Speed increases over time
    - Uses assets/player_normal.png etc in production
*/

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// ASSETS
const playerImg = new Image();
// PREVIEW (local uploaded file) — used here so you can preview instantly in this environment:
playerImg.src = 'assets/player_normal.png';
// PRODUCTION (uncomment when on GitHub Pages and upload to assets/):
// playerImg.src = 'assets/player_normal.png';

const playerHitImg = new Image();
playerHitImg.src = 'assets/player_hit.png';
const playerWinImg = new Image();
playerWinImg.src = 'assets/player_win.png';

const hitSound = new Audio('assets/player_hit.m4a');
const winSound = new Audio('assets/player_win.m4a');

// debug handlers (console message if missing)
playerImg.onerror = () => console.log('player_normal.png not found or failed to load');
playerHitImg.onerror = () => console.log('player_hit.png not found or failed to load');
playerWinImg.onerror = () => console.log('player_win.png not found or failed to load');
hitSound.onerror = () => console.log('player_hit.m4a not found or failed to load');
winSound.onerror = () => console.log('player_win.m4a not found or failed to load');

// GAME STATE
let holding = false;
let running = true;
let score = 0;
let speedMultiplier = 1.0;
const WIN_SCORE = 50; // optional threshold for win (you can change or remove)

// PLAYER (wave-like)
const player = {
  x: canvas.width * 0.22,
  y: canvas.height * 0.5,
  radius: 28,
  vy: 0,
  gravity: 0.45,
  thrust: -8.0,
  rotation: 0,           // current rotation (radians)
  rotationTarget: 0,     // target rotation
  rotationSpeed: 0.12,   // how fast rotation interpolates
  trail: [],
  maxTrail: 28,
  state: 'normal'        // normal | hit | win
};

// OBSTACLES
const obstacles = [];
const BASE_SPAWN = 110;

let frame = 0;
let spawnCounter = 0;

// HUD
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const restartBtn = document.getElementById('restart');

// prevent default context menu (so right click can be used)
window.addEventListener('contextmenu', e => e.preventDefault());

// POINTER & KEY handling (works for mouse/touch/pen)
function pointerDown(e){ e.preventDefault(); holding = true; }
function pointerUp(e){ e.preventDefault(); holding = false; }
window.addEventListener('pointerdown', pointerDown);
window.addEventListener('pointerup', pointerUp);
window.addEventListener('pointercancel', pointerUp);
window.addEventListener('touchend', pointerUp);

window.addEventListener('keydown', e => { if (e.code === 'Space') holding = true; });
window.addEventListener('keyup', e => { if (e.code === 'Space') holding = false; });

// obstacle factory (triangles)
function spawnObstacle(){
  const w = 60 + Math.random()*110; // width
  const gap = Math.max(110, 180 - Math.floor(speedMultiplier*18));
  const centerY = Math.random() * (canvas.height * 0.6) + canvas.height*0.2;
  const amp = Math.random() * (canvas.height*0.18) + 30;
  const freq = 0.004 + Math.random() * 0.008;
  obstacles.push({ x: canvas.width + w, width: w, gap, centerY, amp, freq, life: 0, passed: false });
}

// collision (circle vs rect)
function circleRectCollision(cx,cy,r,rx,ry,rw,rh){
  const nx = Math.max(rx, Math.min(cx, rx+rw));
  const ny = Math.max(ry, Math.min(cy, ry+rh));
  const dx = cx - nx, dy = cy - ny;
  return (dx*dx + dy*dy) < (r*r);
}

// MAIN UPDATE
function update(){
  if (!running) return;
  frame++; spawnCounter++;

  // ramp difficulty
  if (frame % 300 === 0) speedMultiplier = Math.min(3.5, +(speedMultiplier + 0.05).toFixed(2));

  // physics
  if (holding) {
    player.vy = player.thrust * (1 + (speedMultiplier-1)*0.06);
    player.rotationTarget = -0.9; // tilt up (radians)
  } else {
    player.vy += player.gravity * (1 + (speedMultiplier-1)*0.06);
    player.rotationTarget = 0.9; // tilt down
  }
  player.y += player.vy;

  // clamp vertical position
  if (player.y < player.radius) { player.y = player.radius; player.vy = 0; }
  if (player.y > canvas.height - player.radius) { player.y = canvas.height - player.radius; player.vy = 0; }

  // smooth rotation toward target
  player.rotation += (player.rotationTarget - player.rotation) * player.rotationSpeed;

  // trail (positions)
  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > player.maxTrail) player.trail.shift();

  // spawn obstacles faster with speed
  const spawnNow = Math.max(40, Math.round(BASE_SPAWN / speedMultiplier));
  if (spawnCounter >= spawnNow) { spawnCounter = 0; spawnObstacle(); }

  // update obstacles
  for (let i = obstacles.length-1; i>=0; i--){
    const ob = obstacles[i];
    ob.x -= (3 + speedMultiplier*1.6);
    ob.life++;

    // compute oscillating center
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier*0.12));
    const topRect = { x: ob.x, y: 0, w: ob.width, h: cy - ob.gap/2 };
    const botRect = { x: ob.x, y: cy + ob.gap/2, w: ob.width, h: canvas.height - (cy + ob.gap/2) };

    // collision check
    if (circleRectCollision(player.x, player.y, player.radius, topRect.x, topRect.y, topRect.w, topRect.h) ||
        circleRectCollision(player.x, player.y, player.radius, botRect.x, botRect.y, botRect.w, botRect.h)) {
      // hit
      onHit();
      return;
    }

    // score when passed
    if (!ob.passed && (ob.x + ob.width) < player.x) {
      ob.passed = true;
      score++; scoreEl.innerText = `Score: ${score}`;
      if (score >= WIN_SCORE) onWin();
    }

    // remove offscreen
    if (ob.x + ob.width < -150) obstacles.splice(i,1);
  }

  // HUD
  speedEl.innerText = `Speed: ${speedMultiplier.toFixed(2)}x`;

  // render
  render();

  requestAnimationFrame(update);
}

// RENDER
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // faint parallax stars
  for (let s = 0; s < 60; s++){
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect((s*83 + frame*0.45) % canvas.width, (s*41) % canvas.height, 2, 2);
  }

  // draw trail
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

  // player glow
  const glowR = player.radius * 1.5;
  const g = ctx.createRadialGradient(player.x, player.y, 1, player.x, player.y, glowR);
  g.addColorStop(0, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(player.x, player.y, glowR, 0, Math.PI*2); ctx.fill();

  // draw rotated player image
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.rotation);
  const imgW = player.radius*2, imgH = player.radius*2;
  if (player.state === 'hit') {
    if (playerHitImg.complete && playerHitImg.naturalWidth !== 0) ctx.drawImage(playerHitImg, -player.radius, -player.radius, imgW, imgH);
    else { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0,0,player.radius,0,Math.PI*2); ctx.fill(); }
  } else if (player.state === 'win') {
    if (playerWinImg.complete && playerWinImg.naturalWidth !== 0) ctx.drawImage(playerWinImg, -player.radius, -player.radius, imgW, imgH);
    else { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0,0,player.radius,0,Math.PI*2); ctx.fill(); }
  } else {
    if (playerImg.complete && playerImg.naturalWidth !== 0) ctx.drawImage(playerImg, -player.radius, -player.radius, imgW, imgH);
    else { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0,0,player.radius,0,Math.PI*2); ctx.fill(); }
  }
  ctx.restore();

  // draw obstacles (triangles + rect fill)
  obstacles.forEach(ob => {
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier*0.12));

    // top triangle (point down)
    drawTriangle(ob.x + ob.width/2, cy - ob.gap/2, ob.width, 'down');
    // bottom triangle (point up)
    drawTriangle(ob.x + ob.width/2, cy + ob.gap/2, ob.width, 'up');

    // rect fills (for collision)
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.fillRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.strokeRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));
  });
}

// draw triangle helper
function drawTriangle(cx, cy, w, dir='up'){
  const h = w * 0.68;
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
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  // inner highlight
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

// HIT handler
function onHit(){
  running = false;
  player.state = 'hit';
  try { hitSound.currentTime = 0; hitSound.play(); } catch(e) {}
  restartBtn.style.display = 'inline-block';
  restartBtn.onclick = () => location.reload();

  // overlay
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'white'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 18);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 12);
}

// WIN handler (optional)
function onWin(){
  running = false;
  player.state = 'win';
  try { winSound.currentTime = 0; winSound.play(); } catch(e) {}
  restartBtn.style.display = 'inline-block';
  restartBtn.onclick = () => location.reload();

  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'white'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('You Win!', canvas.width/2, canvas.height/2 - 18);
  ctx.font = '18px sans-serif'; ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 12);
}

// start loop
update();
