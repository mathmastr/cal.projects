// Game canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game elements
let playerSnake = [];
let aiSnake = [];
let food = {};
let powerUp = null;
let playerScore = 0;
let aiScore = 0;
let highScore = 0;
let speed = 5;
let gameRunning = true;
let winner = null;

// Power-up related variables
let powerUpActive = false;
let activePowerUpType = null;
let powerUpTimeLeft = 0;
const POWER_UP_DURATION = 5000; // 5 seconds
let powerUpOpacity = 1;
let powerUpFadeDirection = -0.05;
let screenFlashOpacity = 0;
let magnetPullStrength = 5; // Increased from 3 to 5 for more noticeable effect
let powerUpSpawnInterval = null; // Store the interval ID

// Movement directions
let playerDx = 0;
let playerDy = 0;
let playerLastDirection = '';

let aiDx = 0;
let aiDy = 0;
let aiLastDirection = '';
let aiIsFrozen = false;
let aiFreezeTimeLeft = 0;

// DOM elements
const playerScoreElement = document.getElementById('player-score');
const aiScoreElement = document.getElementById('ai-score');
const highScoreElement = document.getElementById('high-score');
const powerUpIndicatorElement = document.getElementById('power-up-indicator');
const gameOverElement = document.getElementById('game-over');
const winnerTextElement = document.getElementById('winner-text');
const finalPlayerScoreElement = document.getElementById('final-player-score');
const finalAiScoreElement = document.getElementById('final-ai-score');
const finalHighScoreElement = document.getElementById('final-high-score');
const restartBtn = document.getElementById('restart-btn');

// Power-up types
const powerUpTypes = [
    { type: 'speed', color: '#8A2BE2', effect: 'Speed Boost' },
    { type: 'freeze', color: '#00BFFF', effect: 'Snake Freeze' },
    { type: 'magnet', color: '#FF69B4', effect: 'Food Magnet' },
    { type: 'shrink', color: '#32CD32', effect: 'Shrink' }
];

// Initialize game
function initGame() {
    // Reset snakes with initial positions
    playerSnake = [
        { x: Math.floor(tileCount / 4) * gridSize, y: Math.floor(tileCount / 2) * gridSize }
    ];
    
    aiSnake = [
        { x: Math.floor(3 * tileCount / 4) * gridSize, y: Math.floor(tileCount / 2) * gridSize }
    ];
    
    // Set initial directions - giving them starting directions so they move immediately
    playerDx = gridSize;  // Start moving right
    playerDy = 0;
    playerLastDirection = 'RIGHT';
    
    aiDx = -gridSize;  // Start moving left
    aiDy = 0;
    aiLastDirection = 'LEFT';
    
    // Reset power-up states
    powerUp = null;
    powerUpActive = false;
    activePowerUpType = null;
    powerUpTimeLeft = 0;
    aiIsFrozen = false;
    aiFreezeTimeLeft = 0;
    screenFlashOpacity = 0;
    powerUpIndicatorElement.style.display = 'none';
    
    // Clear any existing power-up interval
    if (powerUpSpawnInterval) {
        clearInterval(powerUpSpawnInterval);
    }
    
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
    
    // Force an initial draw to make sure elements are visible
    clearCanvas();
    drawFood();
    drawSnake(playerSnake, '#00FF00', '#00CC00');
    drawSnake(aiSnake, '#FFFF00', '#CCCC00');
    
    // Start the game loop
    main();
    
    // Generate a power-up immediately
    generatePowerUp();
    
    // Set up a regular interval for power-up generation
    powerUpSpawnInterval = setInterval(() => {
        // Only generate a new power-up if there isn't one already
        if (!powerUp && gameRunning) {
            generatePowerUp();
        }
    }, 3000); // Try to generate a power-up every 3 seconds
}

// Main game loop
function main() {
    if (!gameRunning) return;
    
    // Calculate current speed based on power-up
    let currentSpeed = speed;
    if (powerUpActive && activePowerUpType === 'speed') {
        currentSpeed = speed * 2; // Double speed instead of 1.5x for more noticeable effect
    }
    
    setTimeout(function() {
        clearCanvas();
        
        // Update power-up effects and timers
        updatePowerUps();
        
        // Update AI direction if not frozen
        if (!aiIsFrozen) {
            updateAiDirection();
        } else {
            // Update freeze timer
            aiFreezeTimeLeft -= 1000 / currentSpeed;
            if (aiFreezeTimeLeft <= 0) {
                aiIsFrozen = false;
            }
        }
        
        // Move player snake with current speed
        moveSnake(playerSnake, playerDx, playerDy);
        
        // Move AI snake if not frozen
        if (!aiIsFrozen) {
            moveSnake(aiSnake, aiDx, aiDy);
        }
        
        // Apply magnet effect if active
        if (powerUpActive && activePowerUpType === 'magnet') {
            applyMagnetEffect();
        }
        
        // Check for collisions
        checkCollisions();
        
        // Check for power-up collision
        checkPowerUpCollision();
        
        // If game is still running, continue
        if (gameRunning) {
            drawFood();
            if (powerUp) drawPowerUp();
            drawSnake(playerSnake, '#00FF00', '#00CC00');  // Green for player
            drawSnake(aiSnake, '#FFFF00', '#CCCC00');      // Yellow for AI
            
            // Draw screen flash effect if active
            if (screenFlashOpacity > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${screenFlashOpacity})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                screenFlashOpacity -= 0.05;
            }
            
            // Draw frozen effect on AI if frozen
            if (aiIsFrozen && aiSnake.length > 0) {
                drawFrozenEffect(aiSnake);
            }
            
            // Call main again
            requestAnimationFrame(main);
        }
    }, 1000 / currentSpeed); // Use currentSpeed instead of speed for speed boost effect
}

// Update power-up effects and timers
function updatePowerUps() {
    // Update power-up flashing effect
    if (powerUp) {
        powerUpOpacity += powerUpFadeDirection;
        if (powerUpOpacity <= 0.3 || powerUpOpacity >= 1) {
            powerUpFadeDirection *= -1;
        }
    }
    
    // Update active power-up timer
    if (powerUpActive) {
        powerUpTimeLeft -= 1000 / speed;
        
        // Update the power-up indicator with remaining time
        const secondsLeft = Math.max(0, Math.ceil(powerUpTimeLeft / 1000));
        let powerUpName = '';
        
        switch (activePowerUpType) {
            case 'speed':
                powerUpName = '⚡ Speed Boost';
                break;
            case 'freeze':
                powerUpName = '❄ Snake Freeze';
                break;
            case 'magnet':
                powerUpName = '🧲 Magnet';
                break;
            case 'shrink':
                powerUpName = '📏 Shrink';
                break;
        }
        
        powerUpIndicatorElement.textContent = `Active: ${powerUpName} (${secondsLeft}s)`;
        powerUpIndicatorElement.style.display = 'block';
        
        if (powerUpTimeLeft <= 0) {
            // Power-up has expired
            powerUpActive = false;
            activePowerUpType = null;
            powerUpIndicatorElement.style.display = 'none';
        }
    } else {
        powerUpIndicatorElement.style.display = 'none';
    }
}

// Generate a random power-up - simplified for reliability
function generatePowerUp() {
    if (!gameRunning || powerUp !== null) return;
    
    // Generate random position for power-up
    let newPowerUp;
    let powerUpOnSnake;
    let attempts = 0;
    
    do {
        powerUpOnSnake = false;
        newPowerUp = {
            x: Math.floor(Math.random() * tileCount) * gridSize,
            y: Math.floor(Math.random() * tileCount) * gridSize,
            type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
        };
        
        // Check if power-up is on player snake
        for (let segment of playerSnake) {
            if (segment.x === newPowerUp.x && segment.y === newPowerUp.y) {
                powerUpOnSnake = true;
                break;
            }
        }
        
        // Check if power-up is on AI snake
        if (!powerUpOnSnake) {
            for (let segment of aiSnake) {
                if (segment.x === newPowerUp.x && segment.y === newPowerUp.y) {
                    powerUpOnSnake = true;
                    break;
                }
            }
        }
        
        // Check if power-up is on food
        if (food.x === newPowerUp.x && food.y === newPowerUp.y) {
            powerUpOnSnake = true;
        }
        
        attempts++;
        // If we've tried many times and can't find a spot, give up for now
        if (attempts > 50) return;
    } while (powerUpOnSnake);
    
    powerUp = newPowerUp;
    
    // Make power-up disappear after 7 seconds if not collected
    setTimeout(() => {
        if (powerUp === newPowerUp) {
            powerUp = null;
        }
    }, 7000);
}

// Draw the power-up with flashing effect
function drawPowerUp() {
    if (!powerUp) return;
    
    // Create a gradient for the glow effect
    const gradient = ctx.createRadialGradient(
        powerUp.x + gridSize/2, powerUp.y + gridSize/2, 2,
        powerUp.x + gridSize/2, powerUp.y + gridSize/2, gridSize
    );
    
    gradient.addColorStop(0, powerUp.type.color);
    gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
    
    // Draw the glow
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(powerUp.x + gridSize/2, powerUp.y + gridSize/2, gridSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw the power-up with current opacity
    ctx.fillStyle = `rgba(138, 43, 226, ${powerUpOpacity})`;
    ctx.fillRect(powerUp.x, powerUp.y, gridSize, gridSize);
    
    // Draw a symbol based on power-up type
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let symbol = '?';
    switch (powerUp.type.type) {
        case 'speed':
            symbol = '⚡';
            break;
        case 'freeze':
            symbol = '❄';
            break;
        case 'magnet':
            symbol = '🧲';
            break;
        case 'shrink':
            symbol = '📏';
            break;
    }
    
    ctx.fillText(symbol, powerUp.x + gridSize/2, powerUp.y + gridSize/2);
}

// Check if player has collected a power-up
function checkPowerUpCollision() {
    if (!powerUp) return;
    
    // Check if player collected power-up
    if (playerSnake.length > 0) {
        const playerHead = playerSnake[0];
        if (playerHead.x === powerUp.x && playerHead.y === powerUp.y) {
            // Player collected the power-up
            activatePowerUp(powerUp.type.type);
            powerUp = null;
            
            // Create screen flash effect
            screenFlashOpacity = 0.7;
            
            // Generate a new power-up after a delay
            setTimeout(generatePowerUp, 1000);
        }
    }
    
    // Check if AI collected power-up
    if (aiSnake.length > 0 && !aiIsFrozen) {
        const aiHead = aiSnake[0];
        if (aiHead.x === powerUp.x && aiHead.y === powerUp.y) {
            // AI doesn't use power-ups, but collecting them gives 5 points
            aiScore += 5;
            updateScores();
            powerUp = null;
            
            // Generate a new power-up after a delay
            setTimeout(generatePowerUp, 1000);
        }
    }
}

// Activate power-up effect
function activatePowerUp(type) {
    console.log("Power-up activated:", type); // Debug log
    
    powerUpActive = true;
    activePowerUpType = type;
    powerUpTimeLeft = POWER_UP_DURATION;
    
    // Update the indicator
    powerUpIndicatorElement.style.display = 'block';
    
    switch (type) {
        case 'speed':
            // Speed boost is handled in the main loop
            break;
        case 'freeze':
            // Freeze AI snake
            aiIsFrozen = true;
            aiFreezeTimeLeft = POWER_UP_DURATION;
            break;
        case 'magnet':
            // Magnet effect is applied in applyMagnetEffect
            break;
        case 'shrink':
            // Shrink player snake
            if (playerSnake.length > 3) {
                playerSnake = playerSnake.slice(0, Math.max(3, Math.floor(playerSnake.length / 2)));
            }
            break;
    }
}

// Apply magnet effect to pull food toward player
function applyMagnetEffect() {
    if (!food || playerSnake.length === 0) return;
    
    const head = playerSnake[0];
    const dx = head.x - food.x;
    const dy = head.y - food.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only pull if food is within range - increased range from 100 to 150
    if (distance < 150) {
        // Calculate new food position
        let newX = food.x;
        let newY = food.y;
        
        // Simplified magnet logic for more reliable pulling
        if (dx > 0) newX += magnetPullStrength;
        else if (dx < 0) newX -= magnetPullStrength;
        
        if (dy > 0) newY += magnetPullStrength;
        else if (dy < 0) newY -= magnetPullStrength;
        
        // Ensure food stays on grid
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
        
        // Update food position if valid
        if (newX >= 0 && newX < canvas.width && newY >= 0 && newY < canvas.height) {
            food.x = newX;
            food.y = newY;
        }
    }
}

// Draw frozen effect on snake
function drawFrozenEffect(snake) {
    if (!snake.length) return;
    
    snake.forEach(segment => {
        ctx.fillStyle = 'rgba(135, 206, 250, 0.5)';
        ctx.fillRect(segment.x, segment.y, gridSize, gridSize);
        
        // Draw ice crystals
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(segment.x + gridSize/4, segment.y + gridSize/4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(segment.x + 3*gridSize/4, segment.y + gridSize/4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(segment.x + gridSize/2, segment.y + 3*gridSize/4, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// AI snake logic - Updated to consider power-ups
function updateAiDirection() {
    if (aiSnake.length === 0) return; // AI is dead
    
    const head = aiSnake[0];
    const foodX = food.x;
    const foodY = food.y;
    
    // Simple AI: try to move toward food or power-up, avoiding collisions
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
                const foodDistance = Math.abs(newX - foodX) + Math.abs(newY - foodY);
                
                // Calculate distance to power-up if it exists
                let powerUpDistance = Infinity;
                if (powerUp) {
                    powerUpDistance = Math.abs(newX - powerUp.x) + Math.abs(newY - powerUp.y);
                }
                
                // Determine the target (food or power-up) based on which is closer
                // Also randomly decide with 50% chance to go for power-up if one exists
                const goForPowerUp = powerUp && (powerUpDistance < foodDistance || Math.random() < 0.5);
                
                const targetDistance = goForPowerUp ? powerUpDistance : foodDistance;
                
                possibleMoves.push({
                    dx: dir.dx,
                    dy: dir.dy,
                    direction: dir.name,
                    distance: targetDistance,
                    isTowardPowerUp: goForPowerUp
                });
            }
        }
    });
    
    // If there are possible moves, choose the one closest to target
    if (possibleMoves.length > 0) {
        // Sort by distance (ascending)
        possibleMoves.sort((a, b) => a.distance - b.distance);
        
        // Add some randomness to make AI less predictable (20% chance to not choose optimal move)
        const moveIndex = Math.random() < 0.2 ? 
            Math.floor(Math.random() * possibleMoves.length) : 0;
        
        const chosenMove = possibleMoves[moveIndex];
        aiDx = chosenMove.dx;
        aiDy = chosenMove.dy;
        aiLastDirection = chosenMove.direction;
    }
    // If no valid moves, continue in same direction
}

// Draw functions
function clearCanvas() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake(snake, headColor, bodyColor) {
    if (!snake || snake.length === 0) return; // Skip if snake doesn't exist
    
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
    if (!food || food.x === undefined || food.y === undefined) {
        generateFood(); // If food is not properly defined, generate it
    }
    
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(food.x, food.y, gridSize, gridSize);
}

// Game logic
function moveSnake(snake, dx, dy) {
    if (!snake || snake.length === 0) return; // Snake is dead or not initialized
    
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
    // Ensure the snakes exist
    if (!playerSnake) playerSnake = [];
    if (!aiSnake) aiSnake = [];
    
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
        
        // Check if food is on power-up
        if (!foodOnSnake && powerUp && newFood.x === powerUp.x && newFood.y === powerUp.y) {
            foodOnSnake = true;
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
    
    // Clear the power-up spawn interval
    if (powerUpSpawnInterval) {
        clearInterval(powerUpSpawnInterval);
        powerUpSpawnInterval = null;
    }
    
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

// Start the game with the window load event
window.onload = function() {
    console.log("Game initializing...");
    // Force any pending DOM updates to complete
    setTimeout(initGame, 100);
}; 