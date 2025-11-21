// CANVAS
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// HUD
const scoreEl = document.getElementById("score");
const restartBtn = document.getElementById("restart");

// PLAYER ASSETS
const playerImg = new Image();
playerImg.src = "assets/player_normal.png";

const hitImg = new Image();
hitImg.src = "assets/player_hit.png";

const winImg = new Image();
winImg.src = "assets/player_win.png";

// SOUND
const hitSound = new Audio("assets/player_hit.m4a");
const winSound = new Audio("assets/player_win.m4a");

// GAME STATE
let running = true;
let holding = false;
let score = 0;
let startTime = Date.now();

let difficultySpeed = 3;
let jumpStrength = -4;   // Jump A (very small jump)
let gravity = 0.32;

// PLAYER
const player = {
  x: canvas.width * 0.22,
  y: canvas.height * 0.5,
  vy: 0,
  radius: 28,
  rotation: 0,
  state: "normal",
  trail: []
};

// OBSTACLES
const obstacles = [];

// CONTROL
window.addEventListener("pointerdown", e => { holding = true; });
window.addEventListener("pointerup", e => { holding = false; });
window.addEventListener("touchend", () => { holding = false; });

window.addEventListener("keydown", e => {
  if (e.code === "Space") holding = true;
});
window.addEventListener("keyup", e => {
  if (e.code === "Space") holding = false;
});

// SPAWN OBSTACLES
function spawnObstacle() {
  const gap = Math.max(180 - difficultySpeed * 12, 120); // dynamic difficulty
  const width = 90 + Math.random() * 90;

  const centerY = Math.random() * (canvas.height * 0.55) + canvas.height * 0.2;

  obstacles.push({
    x: canvas.width + width,
    width,
    gap,
    centerY,
    passed: false
  });
}

let spawnCounter = 0;

// COLLISION CHECK
function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX, dy = cy - nearestY;
  return (dx * dx + dy * dy < r * r);
}

// GAME LOOP
function update() {
  if (!running) return;

  const elapsed = (Date.now() - startTime) / 1000;
  if (elapsed >= 120) return onWin(); // 2 minutes = win

  spawnCounter++;
  if (spawnCounter > 70 - difficultySpeed * 3) {
    spawnCounter = 0;
    spawnObstacle();
  }

  difficultySpeed += 0.0015; // smooth difficulty ramp

  // MOVEMENT
  if (holding) player.vy = jumpStrength;
  else player.vy += gravity;

  player.y += player.vy;

  // LIMIT PLAYER INSIDE SCREEN
  if (player.y < player.radius) player.y = player.radius;
  if (player.y > canvas.height - player.radius)
    player.y = canvas.height - player.radius;

  // TRAIL A (long neon)
  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > 50) player.trail.shift();

  // UPDATE OBSTACLES
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= difficultySpeed;

    const topH = ob.centerY - ob.gap / 2;
    const botY = ob.centerY + ob.gap / 2;
    const botH = canvas.height - botY;

    if (
      circleRectCollision(player.x, player.y, player.radius, ob.x, 0, ob.width, topH) ||
      circleRectCollision(player.x, player.y, player.radius, ob.x, botY, ob.width, botH)
    ) {
      return onHit();
    }

    if (!ob.passed && ob.x + ob.width < player.x) {
      score++;
      scoreEl.textContent = "Score: " + score;
      ob.passed = true;
    }

    if (ob.x + ob.width < 0) obstacles.splice(i, 1);
  }

  render();
  requestAnimationFrame(update);
}

// RENDER EVERYTHING
function render() {
  // NEON BACKGROUND (Option C)
  const grd = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    60,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width
  );
  grd.addColorStop(0, "#4b0082");
  grd.addColorStop(1, "#0b0015");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // TRAIL (white neon long)
  for (let i = 0; i < player.trail.length - 1; i++) {
    const a = player.trail[i];
    const b = player.trail[i + 1];
    const alpha = i / player.trail.length;
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // OBSTACLES (white neon triangles)
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;

  obstacles.forEach(ob => {
    const topH = ob.centerY - ob.gap / 2;
    const botY = ob.centerY + ob.gap / 2;
    const botH = canvas.height - botY;

    // top triangle
    ctx.beginPath();
    ctx.moveTo(ob.x, topH);
    ctx.lineTo(ob.x + ob.width / 2, topH - 80);
    ctx.lineTo(ob.x + ob.width, topH);
    ctx.closePath();
    ctx.stroke();

    // bottom triangle
    ctx.beginPath();
    ctx.moveTo(ob.x, botY);
    ctx.lineTo(ob.x + ob.width / 2, botY + 80);
    ctx.lineTo(ob.x + ob.width, botY);
    ctx.closePath();
    ctx.stroke();
  });

  // PLAYER
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.drawImage(
    player.state === "hit" ? hitImg :
    player.state === "win" ? winImg :
    playerImg,
    -player.radius, -player.radius,
    player.radius * 2, player.radius * 2
  );
  ctx.restore();
}

// HIT EVENT
function onHit() {
  running = false;
  player.state = "hit";
  hitSound.play();

  restartBtn.style.display = "inline-block";
  restartBtn.addEventListener("touchstart", () => location.reload());
  restartBtn.addEventListener("click", () => location.reload());
}

// WIN EVENT (2 min)
function onWin() {
  running = false;
  player.state = "win";
  winSound.play();

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2);

  restartBtn.style.display = "inline-block";
  restartBtn.addEventListener("click", () => location.reload());
}

// START GAME
update();
