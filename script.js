/* GD Wave — Smooth rotation + mountain spikes
   - Hold pointer (mouse/touch/space) to move UP
   - Release to fall
   - Player image rotates smoothly
   - Mountain/triangle obstacles (visual triangles) oscillate vertically while moving left
   - Easy at start; difficulty ramps over time
*/

// Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// ASSETS
const playerImg = new Image();
// PREVIEW (for testing in this environment) — keeps your uploaded image visible immediately:
playerImg.src = '/mnt/data/8d18a9f7-fd73-4bb0-929a-ab573213d1e1.png';
// PRODUCTION (uncomment when you upload player_normal.png to /assets):
// playerImg.src = 'assets/player_normal.png';

const playerHitImg = new Image(); playerHitImg.src = 'assets/player_hit.png';
const playerWinImg = new Image();  playerWinImg.src = 'assets/player_win.png';

const hitSound = new Audio('assets/player_hit.m4a');
const winSound = new Audio('assets/player_win.m4a');

playerImg.onerror = () => console.log('player_normal.png failed to load (check assets path)');
playerHitImg.onerror = () => console.log('player_hit.png failed to load (check assets path)');
hitSound.onerror = () => console.log('player_hit.m4a failed to load');

// GAME STATE
let holding = false, running = true, score = 0;
let speedMultiplier = 0.9; // start slightly below 1 for easier first moments
const MAX_SPEED = 3.6;

// PLAYER (wave)
const player = {
  x: 0.22 * innerWidth,
  y: innerHeight * 0.5,
  radius: 28,
  vy: 0,
  gravity: 0.42,
  thrust: -8.2,
  rotation: 0,
  rotationTarget: 0,
  rotationSpeed: 0.14,
  trail: [],
  maxTrail: 26,
  state: 'normal' // normal | hit | win
};

// OBSTACLES: mountain waves (triangles connected visually)
// We'll spawn "mountain groups" composed of peaks so they look like a terrain
const obstacles = [];
const BASE_SPAWN = 140;
let frame = 0, spawnCounter = 0;

// HUD
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const restartBtn = document.getElementById('restart');

// prevent right-click menu
window.addEventListener('contextmenu', e => e.preventDefault());

// controls (pointer + touch + keyboard)
function down(e){ e.preventDefault(); holding = true; }
function up(e){ e.preventDefault(); holding = false; }
window.addEventListener('pointerdown', down);
window.addEventListener('pointerup', up);
window.addEventListener('pointercancel', up);
window.addEventListener('touchend', up);
window.addEventListener('keydown', e => { if (e.code === 'Space') holding = true; });
window.addEventListener('keyup', e => { if (e.code === 'Space') holding = false; });

// spawn a "mountain" group which visually looks like several peaks (but collision still top&bottom gap)
function spawnMountain() {
  const totalWidth = 220 + Math.random() * 320; // width of this mountain block
  const gap = Math.max(110, 180 - Math.floor(speedMultiplier*20)); // gap size
  const centerY = Math.random() * (canvas.height*0.6) + canvas.height*0.2;
  const amplitude = Math.random() * (canvas.height*0.16) + 20;
  const freq = 0.004 + Math.random()*0.008;

  obstacles.push({
    x: canvas.width + totalWidth,
    width: totalWidth,
    gap,
    centerY,
    amp: amplitude,
    freq,
    life: 0,
    passed: false,
    peaks: Math.max(2, Math.round(2 + Math.random()*4))  // visual peaks count
  });
}

// collision helper (circle vs rect)
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX, dy = cy - nearestY;
  return (dx*dx + dy*dy) < (r*r);
}

// MAIN UPDATE
function update() {
  if (!running) return;
  frame++; spawnCounter++;

  // gradually ramp difficulty
  if (frame % 200 === 0 && speedMultiplier < MAX_SPEED) {
    speedMultiplier = +(speedMultiplier + 0.03).toFixed(3);
  }

  // physics
  if (holding) {
    player.vy = player.thrust * (1 + (speedMultiplier - 0.9)*0.06);
    player.rotationTarget = -0.95;
  } else {
    player.vy += player.gravity * (1 + (speedMultiplier - 0.9)*0.06);
    player.rotationTarget = 1.05;
  }
  player.y += player.vy;

  // clamp
  if (player.y < player.radius) { player.y = player.radius; player.vy = 0; }
  if (player.y > canvas.height - player.radius) { player.y = canvas.height - player.radius; player.vy = 0; }

  // smooth rotation
  player.rotation += (player.rotationTarget - player.rotation) * player.rotationSpeed;

  // trail
  player.trail.push({x: player.x, y: player.y});
  if (player.trail.length > player.maxTrail) player.trail.shift();

  // spawn interval depends on speed (easier early)
  const spawnNow = Math.max(36, Math.round(BASE_SPAWN / (speedMultiplier + 0.2)));
  if (spawnCounter >= spawnNow) { spawnCounter = 0; spawnMountain(); }

  // update obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= (3 + speedMultiplier * 1.6);
    ob.life++;

    // compute oscillating center for this mountain
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier*0.12));
    const topRect = { x: ob.x, y: 0, w: ob.width, h: cy - ob.gap/2 };
    const botRect = { x: ob.x, y: cy + ob.gap/2, w: ob.width, h: canvas.height - (cy + ob.gap/2) };

    // collision
    if (circleRectCollision(player.x, player.y, player.radius, topRect.x, topRect.y, topRect.w, topRect.h) ||
        circleRectCollision(player.x, player.y, player.radius, botRect.x, botRect.y, botRect.w, botRect.h)) {
      onHit();
      return;
    }

    // score
    if (!ob.passed && (ob.x + ob.width) < player.x) {
      ob.passed = true;
      score++;
      scoreEl.innerText = `Score: ${score}`;
    }

    // remove offscreen
    if (ob.x + ob.width < -200) obstacles.splice(i,1);
  }

  speedEl.innerText = `Speed: ${speedMultiplier.toFixed(2)}x`;

  // render
  render();

  requestAnimationFrame(update);
}

// RENDER
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // subtle stars
  for (let s=0; s<60; s++){
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect((s*89 + frame*0.45) % canvas.width, (s*47) % canvas.height, 2, 2);
  }

  // trail (straight line)
  ctx.lineWidth = 2;
  for (let i = 0; i < player.trail.length - 1; i++) {
    const a = player.trail[i], b = player.trail[i+1];
    const t = i / player.trail.length;
    ctx.strokeStyle = `rgba(255,255,255,${0.06 + 0.7 * t})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // player glow
  const glowR = player.radius * 1.6;
  const grad = ctx.createRadialGradient(player.x, player.y, 1, player.x, player.y, glowR);
  grad.addColorStop(0, 'rgba(255,255,255,0.14)');
  grad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(player.x, player.y, glowR, 0, Math.PI*2); ctx.fill();

  // draw rotated player image (switches depending on state)
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

  // draw mountains (triangle peaks and side fills)
  obstacles.forEach(ob => {
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier*0.12));
    // draw several peaks across ob.width to create a mountain silhouette
    const peaks = ob.peaks;
    const peakW = ob.width / peaks;
    for (let p = 0; p < peaks; p++) {
      const cx = ob.x + p * peakW + peakW/2;
      // top peak (point down)
      drawTriangle(cx, cy - ob.gap/2, peakW*0.9, 'down');
      // bottom peak (point up)
      drawTriangle(cx, cy + ob.gap/2, peakW*0.9, 'up');
    }

    // side fills for collision (rects)
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.fillRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));
    // outlines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.strokeRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));
  });
}

// draw triangle helper
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
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
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
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();
}

// HIT handler
function onHit(){
  running = false;
  player.state = 'hit';
  try { hitSound.currentTime = 0; hitSound.play(); } catch(e){/*ignore*/}

  restartBtn.style.display = 'inline-block';
  restartBtn.onclick = () => location.reload();

  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'white'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 18);
  ctx.font = '18px sans-serif'; ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 12);
}

// WIN (optional)
function onWin(){
  running = false;
  player.state = 'win';
  try { winSound.currentTime = 0; winSound.play(); } catch(e){}
  restartBtn.style.display = 'inline-block';
  restartBtn.onclick = () => location.reload();
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'white'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('You Win!', canvas.width/2, canvas.height/2 - 18);
  ctx.font = '18px sans-serif'; ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 12);
}

// start
update();
