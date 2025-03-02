// Game canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game elements
let snake = [];
let food = {};
let score = 0;
let speed = 7;
let gameRunning = true;

// Movement direction
let dx = 0;
let dy = 0;
let lastDirection = '';

// DOM elements
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Initialize game
function initGame() {
    // Reset snake
    snake = [
        { x: Math.floor(tileCount / 2) * gridSize, y: Math.floor(tileCount / 2) * gridSize }
    ];
    
    // Initial direction (will start moving on first key press)
    dx = 0;
    dy = 0;
    lastDirection = '';
    
    // Generate food
    generateFood();
    
    // Reset score
    score = 0;
    updateScore();
    
    // Hide game over message
    gameOverElement.style.display = 'none';
    
    // Start game
    gameRunning = true;
    main();
}

// Main game loop
function main() {
    if (!gameRunning) return;
    
    setTimeout(function() {
        clearCanvas();
        moveSnake();
        checkCollision();
        drawFood();
        drawSnake();
        
        // Call main again
        requestAnimationFrame(main);
    }, 1000 / speed);
}

// Draw functions
function clearCanvas() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    snake.forEach((segment, index) => {
        // Different color for head
        if (index === 0) {
            ctx.fillStyle = '#00FF00';
        } else {
            ctx.fillStyle = '#00CC00';
        }
        
        ctx.fillRect(segment.x, segment.y, gridSize, gridSize);
        
        // Draw border around segments
        ctx.strokeStyle = '#111';
        ctx.strokeRect(segment.x, segment.y, gridSize, gridSize);
    });
}

function drawFood() {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(food.x, food.y, gridSize, gridSize);
}

// Game logic
function moveSnake() {
    // Don't move if no direction is set
    if (dx === 0 && dy === 0) return;
    
    // Create new head
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Add new head to beginning of snake array
    snake.unshift(head);
    
    // Check if snake eats food
    if (head.x === food.x && head.y === food.y) {
        // Increase score
        score += 10;
        updateScore();
        
        // Generate new food
        generateFood();
        
        // Increase speed slightly
        if (speed < 15) {
            speed += 0.1;
        }
    } else {
        // Remove tail segment if food wasn't eaten
        snake.pop();
    }
}

function generateFood() {
    // Generate random position for food
    let newFood;
    let foodOnSnake;
    
    do {
        foodOnSnake = false;
        newFood = {
            x: Math.floor(Math.random() * tileCount) * gridSize,
            y: Math.floor(Math.random() * tileCount) * gridSize
        };
        
        // Check if food is on snake
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                foodOnSnake = true;
                break;
            }
        }
    } while (foodOnSnake);
    
    food = newFood;
}

function checkCollision() {
    const head = snake[0];
    
    // Check wall collision
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        gameOver();
        return;
    }
    
    // Check self collision (start from index 1 to avoid checking head against itself)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }
}

function gameOver() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
}

function updateScore() {
    scoreElement.textContent = `Score: ${score}`;
}

// Event listeners
document.addEventListener('keydown', function(event) {
    // Prevent arrow keys from scrolling the page
    if ([37, 38, 39, 40].indexOf(event.keyCode) > -1) {
        event.preventDefault();
    }
    
    // Get new direction
    switch (event.keyCode) {
        case 37: // Left arrow
            if (lastDirection !== 'RIGHT') {
                dx = -gridSize;
                dy = 0;
                lastDirection = 'LEFT';
            }
            break;
        case 38: // Up arrow
            if (lastDirection !== 'DOWN') {
                dx = 0;
                dy = -gridSize;
                lastDirection = 'UP';
            }
            break;
        case 39: // Right arrow
            if (lastDirection !== 'LEFT') {
                dx = gridSize;
                dy = 0;
                lastDirection = 'RIGHT';
            }
            break;
        case 40: // Down arrow
            if (lastDirection !== 'UP') {
                dx = 0;
                dy = gridSize;
                lastDirection = 'DOWN';
            }
            break;
    }
});

restartBtn.addEventListener('click', initGame);

// Start the game
window.onload = initGame; 