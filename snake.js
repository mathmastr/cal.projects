// Game canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game elements
let playerSnake = [];
let aiSnake = [];
let food = {};
let playerScore = 0;
let aiScore = 0;
let highScore = 0;
let speed = 5;
let gameRunning = true;
let winner = null;

// Movement directions
let playerDx = 0;
let playerDy = 0;
let playerLastDirection = '';

let aiDx = 0;
let aiDy = 0;
let aiLastDirection = '';

// DOM elements
const playerScoreElement = document.getElementById('player-score');
const aiScoreElement = document.getElementById('ai-score');
const highScoreElement = document.getElementById('high-score');
const gameOverElement = document.getElementById('game-over');
const winnerTextElement = document.getElementById('winner-text');
const finalPlayerScoreElement = document.getElementById('final-player-score');
const finalAiScoreElement = document.getElementById('final-ai-score');
const finalHighScoreElement = document.getElementById('final-high-score');
const restartBtn = document.getElementById('restart-btn');

// Initialize game
function initGame() {
    // Reset snakes
    playerSnake = [
        { x: Math.floor(tileCount / 4) * gridSize, y: Math.floor(tileCount / 2) * gridSize }
    ];
    
    aiSnake = [
        { x: Math.floor(3 * tileCount / 4) * gridSize, y: Math.floor(tileCount / 2) * gridSize }
    ];
    
    // Initial directions
    playerDx = 0;
    playerDy = 0;
    playerLastDirection = '';
    
    aiDx = 0;
    aiDy = 0;
    aiLastDirection = '';
    
    // Generate food
    generateFood();
    
    // Reset scores (but keep high score)
    playerScore = 0;
    aiScore = 0;
    updateScores();
    
    // Hide game over message
    gameOverElement.style.display = 'none';
    
    // Reset winner
    winner = null;
    
    // Start game
    gameRunning = true;
    speed = 5;
    main();
}

// Main game loop
function main() {
    if (!gameRunning) return;
    
    setTimeout(function() {
        clearCanvas();
        
        // Update AI direction
        updateAiDirection();
        
        // Move both snakes
        moveSnake(playerSnake, playerDx, playerDy);
        moveSnake(aiSnake, aiDx, aiDy);
        
        // Check for collisions
        checkCollisions();
        
        // If game is still running, continue
        if (gameRunning) {
            drawFood();
            drawSnake(playerSnake, '#00FF00', '#00CC00');  // Green for player
            drawSnake(aiSnake, '#FFFF00', '#CCCC00');      // Yellow for AI
            
            // Call main again
            requestAnimationFrame(main);
        }
    }, 1000 / speed);
}

// AI snake logic
function updateAiDirection() {
    if (aiSnake.length === 0) return; // AI is dead
    
    const head = aiSnake[0];
    const foodX = food.x;
    const foodY = food.y;
    
    // Simple AI: try to move toward food, avoiding collisions
    let possibleMoves = [];
    
    // Check all four directions
    const directions = [
        { dx: -gridSize, dy: 0, name: 'LEFT' },
        { dx: gridSize, dy: 0, name: 'RIGHT' },
        { dx: 0, dy: -gridSize, name: 'UP' },
        { dx: 0, dy: gridSize, name: 'DOWN' }
    ];
    
    // Filter out invalid moves (opposite to current direction)
    directions.forEach(dir => {
        if ((dir.name === 'LEFT' && aiLastDirection !== 'RIGHT') ||
            (dir.name === 'RIGHT' && aiLastDirection !== 'LEFT') ||
            (dir.name === 'UP' && aiLastDirection !== 'DOWN') ||
            (dir.name === 'DOWN' && aiLastDirection !== 'UP')) {
            
            // Calculate new position
            let newX = head.x + dir.dx;
            let newY = head.y + dir.dy;
            
            // Wrap around edges
            if (newX < 0) newX = canvas.width - gridSize;
            if (newX >= canvas.width) newX = 0;
            if (newY < 0) newY = canvas.height - gridSize;
            if (newY >= canvas.height) newY = 0;
            
            // Check if it would collide with itself or player
            let willCollide = false;
            
            // Check collision with AI snake body
            for (let i = 0; i < aiSnake.length; i++) {
                if (newX === aiSnake[i].x && newY === aiSnake[i].y) {
                    willCollide = true;
                    break;
                }
            }
            
            // Check collision with player snake
            for (let i = 0; i < playerSnake.length; i++) {
                if (newX === playerSnake[i].x && newY === playerSnake[i].y) {
                    willCollide = true;
                    break;
                }
            }
            
            if (!willCollide) {
                // Calculate distance to food
                const distance = Math.abs(newX - foodX) + Math.abs(newY - foodY);
                possibleMoves.push({
                    dx: dir.dx,
                    dy: dir.dy,
                    direction: dir.name,
                    distance: distance
                });
            }
        }
    });
    
    // If there are possible moves, choose the one closest to food
    if (possibleMoves.length > 0) {
        // Sort by distance to food (ascending)
        possibleMoves.sort((a, b) => a.distance - b.distance);
        
        // Add some randomness to make AI less predictable (20% chance to not choose optimal move)
        const moveIndex = Math.random() < 0.2 ? 
            Math.floor(Math.random() * possibleMoves.length) : 0;
        
        const chosenMove = possibleMoves[moveIndex];
        aiDx = chosenMove.dx;
        aiDy = chosenMove.dy;
        aiLastDirection = chosenMove.direction;
    } else {
        // If no valid moves, continue in same direction (and probably die)
        // This makes the AI feel more natural, occasionally making mistakes
    }
}

// Draw functions
function clearCanvas() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake(snake, headColor, bodyColor) {
    snake.forEach((segment, index) => {
        // Different color for head
        ctx.fillStyle = (index === 0) ? headColor : bodyColor;
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
function moveSnake(snake, dx, dy) {
    if (snake.length === 0) return; // Snake is dead
    
    // Don't move if no direction is set
    if (dx === 0 && dy === 0) return;
    
    // Create new head
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Wrap around when hitting walls
    if (head.x < 0) {
        head.x = canvas.width - gridSize;
    } else if (head.x >= canvas.width) {
        head.x = 0;
    }
    
    if (head.y < 0) {
        head.y = canvas.height - gridSize;
    } else if (head.y >= canvas.height) {
        head.y = 0;
    }
    
    // Add new head to beginning of snake array
    snake.unshift(head);
    
    // Check if snake eats food
    if (head.x === food.x && head.y === food.y) {
        // Determine which snake ate the food
        if (snake === playerSnake) {
            playerScore += 10;
            if (playerScore > highScore) {
                highScore = playerScore;
            }
        } else {
            aiScore += 10;
            if (aiScore > highScore) {
                highScore = aiScore;
            }
        }
        
        updateScores();
        
        // Generate new food
        generateFood();
        
        // Increase speed slightly
        if (speed < 12 && (playerScore + aiScore) % 30 === 0) {
            speed += 0.5;
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
        
        // Check if food is on player snake
        for (let segment of playerSnake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                foodOnSnake = true;
                break;
            }
        }
        
        // Check if food is on AI snake
        if (!foodOnSnake) {
            for (let segment of aiSnake) {
                if (segment.x === newFood.x && segment.y === newFood.y) {
                    foodOnSnake = true;
                    break;
                }
            }
        }
    } while (foodOnSnake);
    
    food = newFood;
}

function checkCollisions() {
    // Skip if either snake is empty
    if (playerSnake.length === 0 || aiSnake.length === 0) return;
    
    const playerHead = playerSnake[0];
    const aiHead = aiSnake[0];
    
    // Check player self-collision
    for (let i = 1; i < playerSnake.length; i++) {
        if (playerHead.x === playerSnake[i].x && playerHead.y === playerSnake[i].y) {
            playerDies();
            return;
        }
    }
    
    // Check AI self-collision
    for (let i = 1; i < aiSnake.length; i++) {
        if (aiHead.x === aiSnake[i].x && aiHead.y === aiSnake[i].y) {
            aiDies();
            return;
        }
    }
    
    // Check if player collides with AI
    for (let i = 0; i < aiSnake.length; i++) {
        if (playerHead.x === aiSnake[i].x && playerHead.y === aiSnake[i].y) {
            // Head-on collision (both heads at same position)
            if (i === 0) {
                // Both snakes die, determine winner by score
                if (playerScore > aiScore) {
                    winner = "player";
                } else if (aiScore > playerScore) {
                    winner = "ai";
                } else {
                    winner = "tie";
                }
                gameOver();
            } else {
                // Player hits AI body
                playerDies();
            }
            return;
        }
    }
    
    // Check if AI collides with player
    for (let i = 0; i < playerSnake.length; i++) {
        if (aiHead.x === playerSnake[i].x && aiHead.y === playerSnake[i].y) {
            // Skip if we already processed head-on collision
            if (i === 0) continue;
            
            // AI hits player body
            aiDies();
            return;
        }
    }
    
    // Check if both snakes are dead
    if (playerSnake.length === 0 && aiSnake.length === 0) {
        if (playerScore > aiScore) {
            winner = "player";
        } else if (aiScore > playerScore) {
            winner = "ai";
        } else {
            winner = "tie";
        }
        gameOver();
    }
}

function playerDies() {
    playerSnake = []; // Remove player snake
    winner = "ai";
    gameOver();
}

function aiDies() {
    aiSnake = []; // Remove AI snake
    winner = "player";
    gameOver();
}

function gameOver() {
    gameRunning = false;
    
    // Update final scores display in game over screen
    finalPlayerScoreElement.textContent = playerScore;
    finalAiScoreElement.textContent = aiScore;
    finalHighScoreElement.textContent = highScore;
    
    // Update winner text
    if (winner === "player") {
        winnerTextElement.textContent = "You Win!";
        winnerTextElement.style.color = "#00FF00";
    } else if (winner === "ai") {
        winnerTextElement.textContent = "AI Wins!";
        winnerTextElement.style.color = "#FFFF00";
    } else {
        winnerTextElement.textContent = "It's a Tie!";
        winnerTextElement.style.color = "#FFFFFF";
    }
    
    // Show game over element
    gameOverElement.style.display = 'block';
}

function updateScores() {
    playerScoreElement.textContent = `You: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
    highScoreElement.textContent = `High Score: ${highScore}`;
}

// Event listeners
document.addEventListener('keydown', function(event) {
    // Prevent arrow keys from scrolling the page
    if ([37, 38, 39, 40].indexOf(event.keyCode) > -1) {
        event.preventDefault();
    }
    
    // Get new direction for player
    switch (event.keyCode) {
        case 37: // Left arrow
            if (playerLastDirection !== 'RIGHT') {
                playerDx = -gridSize;
                playerDy = 0;
                playerLastDirection = 'LEFT';
            }
            break;
        case 38: // Up arrow
            if (playerLastDirection !== 'DOWN') {
                playerDx = 0;
                playerDy = -gridSize;
                playerLastDirection = 'UP';
            }
            break;
        case 39: // Right arrow
            if (playerLastDirection !== 'LEFT') {
                playerDx = gridSize;
                playerDy = 0;
                playerLastDirection = 'RIGHT';
            }
            break;
        case 40: // Down arrow
            if (playerLastDirection !== 'UP') {
                playerDx = 0;
                playerDy = gridSize;
                playerLastDirection = 'DOWN';
            }
            break;
    }
});

restartBtn.addEventListener('click', initGame);

// Start the game
window.onload = initGame; 