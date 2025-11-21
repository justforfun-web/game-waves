// Canvas Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Load Assets
const playerImg = new Image();
playerImg.src = "assets/player.png";

const enemyImg = new Image();
enemyImg.src = "assets/enemy.png";

const bgMusic = new Audio("assets/bg-music.mp3");
bgMusic.loop = true;

const shootSound = new Audio("assets/shoot.mp3");
const hitSound   = new Audio("assets/hit.mp3");

// Game Variables
let player = { x: canvas.width/2, y: canvas.height - 120, size: 60, dx: 0 };
let bullets = [];
let enemies = [];
let stars = [];
let score = 0;

// Star Background
function createStars() {
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 2 + 1
        });
    }
}
createStars();

function drawStars() {
    ctx.fillStyle = "white";
    stars.forEach(s => {
        ctx.fillRect(s.x, s.y, s.size, s.size);
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = 0; }
    });
}

// Draw Player
function drawPlayer() {
    ctx.drawImage(playerImg, player.x - 30, player.y - 30, 60, 60);
}

// Draw Bullets
function drawBullets() {
    ctx.fillStyle = "cyan";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 15));
}

// Draw Enemies
function drawEnemies() {
    enemies.forEach(e => {
        ctx.drawImage(enemyImg, e.x, e.y, e.size, e.size);
    });
}

// Movement
function movePlayer() {
    player.x += player.dx;
}

function moveBullets() {
    bullets.forEach((b,i)=>{
        b.y -= 10;
        if (b.y < 0) bullets.splice(i, 1);
    });
}

function moveEnemies() {
    enemies.forEach((e,i)=>{
        e.y += 4;
        if (e.y > canvas.height) enemies.splice(i,1);
    });
}

// Collision
function detectCollisions() {
    bullets.forEach((b, bi) => {
        enemies.forEach((e, ei) => {
            if (b.x > e.x && b.x < e.x + e.size && b.y < e.y + e.size) {
                enemies.splice(ei, 1);
                bullets.splice(bi, 1);
                hitSound.currentTime = 0;
                hitSound.play();
                score++;
            }
        });
    });
}

// Spawn Enemies
function spawnEnemies() {
    if (Math.random() < 0.03) {
        enemies.push({
            x: Math.random() * (canvas.width - 50),
            y: -50,
            size: 50
        });
    }
}

// Shoot
function shoot() {
    bullets.push({ x: player.x, y: player.y });
    shootSound.currentTime = 0;
    shootSound.play();
}

// Game Loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStars();
    drawPlayer();
    drawBullets();
    drawEnemies();

    movePlayer();
    moveBullets();
    moveEnemies();
    detectCollisions();
    spawnEnemies();

    requestAnimationFrame(gameLoop);
}
gameLoop();

// Keyboard Controls
document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") player.dx = -7;
    if (e.key === "ArrowRight") player.dx = 7;
    if (e.key === " ") shoot();
});

document.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") player.dx = 0;
});

// MOBILE BUTTONS
document.getElementById("leftBtn").addEventListener("touchstart", () => player.dx = -7);
document.getElementById("rightBtn").addEventListener("touchstart", () => player.dx = 7);
document.getElementById("shootBtn").addEventListener("touchstart", shoot);

document.getElementById("leftBtn").addEventListener("touchend", () => player.dx = 0);
document.getElementById("rightBtn").addEventListener("touchend", () => player.dx = 0);

// MUSIC TOGGLE
document.getElementById("musicToggle").addEventListener("click", () => {
    if (bgMusic.paused) { bgMusic.play(); }
    else { bgMusic.pause(); }
});
