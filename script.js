const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Load Images (USE CORRECT PATHS)
const imgNormal = new Image();
imgNormal.src = "ASSETS/player_normal.png";   // change to your actual file

const imgHit = new Image();
imgHit.src = "ASSETS/player_hit.png";         // change to your actual file

const imgWin = new Image();
imgWin.src = "ASSETS/player_win.png";         // change to your actual file

// Sounds
const hitSound = new Audio("ASSETS/player_hit.m4a");
const winSound = new Audio("ASSETS/player_win.m4a");

// Player State
let playerState = "normal"; // normal | hit | win

// Player object
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 120,
    width: 70,
    height: 70,
    speed: 8,
    hitTimer: 0
};

// Bullets & Enemies
let bullets = [];
let enemies = [];
let enemyTimer = 0;
let score = 0;
const WIN_SCORE = 20;

// MOBILE CONTROLS
document.getElementById("leftBtn").onmousedown = () => moveLeft = true;
document.getElementById("rightBtn").onmousedown = () => moveRight = true;
document.getElementById("shootBtn").onmousedown = shoot;
document.onmouseup = () => { moveLeft = false; moveRight = false; };

let moveLeft = false;
let moveRight = false;

// SHOOT FUNCTION
function shoot() {
    bullets.push({ x: player.x + 25, y: player.y, width: 10, height: 20 });
}

// Spawn enemies
function createEnemy() {
    enemies.push({
        x: Math.random() * (canvas.width - 40),
        y: -50,
        width: 40,
        height: 40
    });
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStars();

    // Win screen
    if (playerState === "win") {
        ctx.drawImage(imgWin, player.x, player.y, player.width, player.height);
        return;
    }

    // Player movement
    if (moveLeft && player.x > 0) player.x -= player.speed;
    if (moveRight && player.x < canvas.width - player.width) player.x += player.speed;

    // Player image based on state
    if (playerState === "normal") ctx.drawImage(imgNormal, player.x, player.y, player.width, player.height);
    if (playerState === "hit") {
        ctx.drawImage(imgHit, player.x, player.y, player.width, player.height);
        player.hitTimer--;
        if (player.hitTimer <= 0) playerState = "normal";
    }

    // Bullets
    bullets.forEach((b, i) => {
        b.y -= 10;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.width, b.height);
        if (b.y < 0) bullets.splice(i, 1);
    });

    // Spawn enemies
    enemyTimer++;
    if (enemyTimer % 50 === 0) createEnemy();

    // Enemy logic
    enemies.forEach((e, ei) => {
        e.y += 3;
        ctx.fillStyle = "red";
        ctx.fillRect(e.x, e.y, e.width, e.height);

        if (e.y > canvas.height) enemies.splice(ei, 1);

        // Player collision
        if (
            player.x < e.x + e.width &&
            player.x + player.width > e.x &&
            player.y < e.y + e.height &&
            player.y + player.height > e.y
        ) {
            playerState = "hit";
            player.hitTimer = 30;
            hitSound.play();
            enemies.splice(ei, 1);
        }

        // Bullet collision
        bullets.forEach((b, bi) => {
            if (
                b.x < e.x + e.width &&
                b.x + b.width > e.x &&
                b.y < e.y + e.height &&
                b.y + b.height > e.y
            ) {
                enemies.splice(ei, 1);
                bullets.splice(bi, 1);
                score++;

                if (score >= WIN_SCORE) {
                    playerState = "win";
                    winSound.play();
                }
            }
        });
    });

    requestAnimationFrame(update);
}

// Stars (background)
let stars = [];
for (let i = 0; i < 100; i++)
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height });

function drawStars() {
    ctx.fillStyle = "white";
    stars.forEach(s => {
        ctx.fillRect(s.x, s.y, 2, 2);
        s.y += 1;
        if (s.y > canvas.height) s.y = 0;
    });
}

update();
