/* Flap & Wave game
   - Hold pointer (mouse/touch/left or right click) to move up
   - Release to fall (gravity)
   - Player leaves a white trail
   - Obstacles come from the right and oscillate up/down
   - Game speed increases with time
*/

// --- CANVAS SETUP ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- ASSETS ---
// Default: use the local uploaded image so you can preview here.
// When publishing to GitHub, replace the src with "assets/player.png" (or a file inside your repo).
const playerImg = new Image();
// local uploaded path (for preview in this environment):
playerImg.src = '/mnt/data/8d18a9f7-fd73-4bb0-929a-ab573213d1e1.png';
// production (uncomment and use after you push /assets/player.png):
// playerImg.src = 'assets/player.png';

// player settings
const player = {
  x: canvas.width * 0.2,
  y: canvas.height / 2,
  radius: 28,
  vy: 0,          // vertical velocity
  gravity: 0.45,
  thrust: -8,
  trail: [],
  maxTrail: 20
};

// controls
let pressing = false;      // pointer held (mouse/touch)
let running = true;        // game running
let score = 0;
let speedMultiplier = 1.0; // increases over time

// obstacles
const obstacles = [];
const OB_SPAWN_INTERVAL = 120; // frames (will speed up with multiplier)

// frame counters
let frame = 0;
let spawnCounter = 0;

// HUD & restart
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const restartBtn = document.getElementById('restart');

// prevent context menu on right click
window.addEventListener('contextmenu', e => e.preventDefault());

// pointer events: works for mouse & touch
function pointerDown(e) {
  e.preventDefault();
  pressing = true;
}
function pointerUp(e) {
  e.preventDefault();
  pressing = false;
}
window.addEventListener('pointerdown', pointerDown);
window.addEventListener('pointerup', pointerUp);
window.addEventListener('pointercancel', pointerUp);
window.addEventListener('touchend', pointerUp);

// keyboard (spacebar for convenience)
window.addEventListener('keydown', e => {
  if (e.code === 'Space') pressing = true;
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') pressing = false;
});

// --- obstacle factory ---
// obstacles are vertical rectangles that oscillate vertically as they move left
function spawnObstacle() {
  // obstacle config
  const w = Math.max(60, Math.min(160, 120 * Math.random()));
  const gap = Math.max(120, 160 - Math.floor(speedMultiplier*20)); // gap smaller when speed higher
  const baseY = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2; // center of vertical oscillation
  const amplitude = Math.random() * (canvas.height * 0.18) + 30; // oscillation amplitude
  const frequency = 0.004 + Math.random() * 0.008; // oscillation speed

  obstacles.push({
    x: canvas.width + w,
    width: w,
    gap,
    centerY: baseY,
    amp: amplitude,
    freq: frequency,
    life: 0 // used for sin phase
  });
}

// check collision between player circle and a rect
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return (dx*dx + dy*dy) < (r*r);
}

// --- GAME LOOP ---
function update() {
  if (!running) return;
  frame++;
  spawnCounter++;

  // increase difficulty gradually
  if (frame % 300 === 0) {
    speedMultiplier = Math.min(3.0, +(speedMultiplier + 0.05).toFixed(2));
  }

  // physics: thrust while pressing
  if (pressing) {
    player.vy = player.thrust * (1 + (speedMultiplier-1)*0.08); // small scale with speed
  } else {
    player.vy += player.gravity * (1 + (speedMultiplier-1)*0.08);
  }
  player.y += player.vy;

  // keep player inside bounds
  if (player.y < player.radius) { player.y = player.radius; player.vy = 0; }
  if (player.y > canvas.height - player.radius) { player.y = canvas.height - player.radius; player.vy = 0; }

  // trail: push position and trim
  player.trail.push({x: player.x, y: player.y});
  if (player.trail.length > player.maxTrail) player.trail.shift();

  // spawn obstacles faster as speed increases
  const spawnIntervalNow = Math.max(40, Math.round(OB_SPAWN_INTERVAL / speedMultiplier));
  if (spawnCounter >= spawnIntervalNow) {
    spawnCounter = 0;
    spawnObstacle();
  }

  // move obstacles left and update life
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= (3 + speedMultiplier*1.5); // left speed increases with multiplier
    ob.life += 1;

    // compute current vertical offset by sine
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier*0.12));

    // top rect
    const topRect = { x: ob.x, y: 0, w: ob.width, h: cy - ob.gap/2 };
    // bottom rect
    const botRect = { x: ob.x, y: cy + ob.gap/2, w: ob.width, h: canvas.height - (cy + ob.gap/2) };

    // collision tests
    if (circleRectCollision(player.x, player.y, player.radius, topRect.x, topRect.y, topRect.w, topRect.h) ||
        circleRectCollision(player.x, player.y, player.radius, botRect.x, botRect.y, botRect.w, botRect.h)) {
      // hit -> end game
      endGame();
      return;
    }

    // award score when obstacle passes the player
    if (!ob.passed && (ob.x + ob.width) < player.x) {
      ob.passed = true;
      score++;
      scoreEl.innerText = `Score: ${score}`;
    }

    // remove off-screen obstacles
    if (ob.x + ob.width < -50) obstacles.splice(i, 1);
  }

  // update HUD
  speedEl.innerText = `Speed: ${speedMultiplier.toFixed(2)}x`;

  // draw
  render();

  requestAnimationFrame(update);
}

// --- render ---
function render() {
  // clear & background subtle gradient
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // draw faint stars (simple)
  for (let s = 0; s < 60; s++) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect((s*73 + frame*0.6) % canvas.width, (s*37) % canvas.height, 2, 2);
  }

  // draw trail: older points are more transparent
  ctx.lineWidth = 2;
  for (let i = 0; i < player.trail.length - 1; i++) {
    const a = player.trail[i], b = player.trail[i+1];
    const t = i / player.trail.length;
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.6 * t})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // draw player (glow + image)
  // glow
  const glowRadius = player.radius * 1.6;
  const grad = ctx.createRadialGradient(player.x, player.y, player.radius*0.2, player.x, player.y, glowRadius);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(player.x, player.y, glowRadius, 0, Math.PI*2);
  ctx.fill();

  // image centered
  const imgW = player.radius * 2;
  const imgH = player.radius * 2;
  if (playerImg.complete) {
    ctx.drawImage(playerImg, player.x - player.radius, player.y - player.radius, imgW, imgH);
  } else {
    // fallback: draw a circle
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fill();
  }

  // draw obstacles
  obstacles.forEach(ob => {
    const cy = ob.centerY + ob.amp * Math.sin(ob.life * ob.freq * (1 + speedMultiplier*0.12));
    // top
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(ob.x, 0, ob.width, cy - ob.gap/2);
    // bottom
    ctx.fillRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));

    // outline neon
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ob.x, 0, ob.width, cy - ob.gap/2);
    ctx.strokeRect(ob.x, cy + ob.gap/2, ob.width, canvas.height - (cy + ob.gap/2));
  });
}

// --- end game ---
function endGame() {
  running = false;
  restartBtn.style.display = 'inline-block';
  restartBtn.onclick = () => location.reload();
  // show a simple "Game Over" overlay
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 20);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 16);
}

// --- start the loop ---
update();
