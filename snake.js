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

// Player-specific variables for speed control
let playerMoveCounter = 0;
let playerMoveThreshold = 1; // Normal movement rate
let isSpeedBoosted = false; // Separate flag to track speed boost status

// Power-up related variables
let powerUpActive = false;
let activePowerUpType = null;
let powerUpTimeLeft = 0;
const POWER_UP_DURATION = 5000; // 5 seconds
let powerUpOpacity = 1;
let powerUpFadeDirection = -0.05;
let screenFlashOpacity = 0;
let magnetPullStrength = 10; // Increased from 5 to 10 for much more noticeable effect
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
    
    // Reset speed boost
    isSpeedBoosted = false;
    
    // Reset player move counter and threshold
    playerMoveCounter = 0;
    playerMoveThreshold = 1;
    
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
    
    setTimeout(function() {
        clearCanvas();
        
        // Update power-up effects and timers
        updatePowerUps();
        
        // Update AI direction if not frozen
        if (!aiIsFrozen) {
            updateAiDirection();
        } else {
            // Update freeze timer
            aiFreezeTimeLeft -= 1000 / speed;
            if (aiFreezeTimeLeft <= 0) {
                aiIsFrozen = false;
            }
        }
        
        // Handle player movement with speed boost
        playerMoveCounter++;
        
        // Fixed implementation of speed boost
        const moveThreshold = isSpeedBoosted ? 0.5 : 1;
        
        // Move player when counter exceeds threshold
        if (playerMoveCounter >= moveThreshold) {
            moveSnake(playerSnake, playerDx, playerDy);
            playerMoveCounter = 0; // Reset counter
        }
        
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
            
            // Draw magnet effect if active
            if (powerUpActive && activePowerUpType === 'magnet') {
                drawMagnetEffect();
            }
            
            // Call main again
            requestAnimationFrame(main);
        }
    }, 1000 / speed);
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
    if (powerUpActive && activePowerUpType) {
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
            default:
                powerUpName = 'Unknown';
                break;
        }
        
        powerUpIndicatorElement.textContent = `Active: ${powerUpName} (${secondsLeft}s)`;
        powerUpIndicatorElement.style.display = 'block';
        
        if (powerUpTimeLeft <= 0) {
            // Store the type before nullifying it
            const expiredType = activePowerUpType;
            
            // Power-up has expired
            powerUpActive = false;
            activePowerUpType = null;
            
            // Reset speed boost flag when expired
            if (expiredType === 'speed') {
                isSpeedBoosted = false;
            }
            
            powerUpIndicatorElement.style.display = 'none';
        }
    } else {
        powerUpIndicatorElement.style.display = 'none';
    }
}

// Apply magnet effect to pull food toward player
function applyMagnetEffect() {
    if (!food || playerSnake.length === 0) return;
    
    const head = playerSnake[0];
    const headX = head.x + gridSize/2;
    const headY = head.y + gridSize/2;
    const foodX = food.x + gridSize/2;
    const foodY = food.y + gridSize/2;
    
    // Calculate direct vector from food to head
    const dx = headX - foodX;
    const dy = headY - foodY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Pull food toward player if within range
    if (distance < 200) {
        // Calculate normalized direction vector
        const length = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / length;
        const dirY = dy / length;
        
        // Move food toward player snake using the direction vector
        const newX = food.x + dirX * magnetPullStrength;
        const newY = food.y + dirY * magnetPullStrength;
        
        // Snap to grid
        food.x = Math.round(newX / gridSize) * gridSize;
        food.y = Math.round(newY / gridSize) * gridSize;
        
        // Keep food within boundaries
        if (food.x < 0) food.x = 0;
        if (food.x >= canvas.width) food.x = canvas.width - gridSize;
        if (food.y < 0) food.y = 0;
        if (food.y >= canvas.height) food.y = canvas.height - gridSize;
    }
}

// Draw visual indication of magnet pull
function drawMagnetEffect() {
    if (!food || playerSnake.length === 0) return;
    
    const head = playerSnake[0];
    const foodX = food.x + gridSize/2;
    const foodY = food.y + gridSize/2;
    const headX = head.x + gridSize/2;
    const headY = head.y + gridSize/2;
    
    // Calculate distance
    const dx = headX - foodX;
    const dy = headY - foodY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only draw effect if food is within magnet range
    if (distance < 200) {
        // Draw line from food to snake head
        ctx.beginPath();
        ctx.moveTo(foodX, foodY);
        ctx.lineTo(headX, headY);
        ctx.strokeStyle = 'rgba(255, 105, 180, 0.5)'; // Semi-transparent pink
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw pulsing circle around food
        const pulseSize = 5 + Math.sin(Date.now() / 100) * 3;
        ctx.beginPath();
        ctx.arc(foodX, foodY, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 105, 180, 0.7)';
        ctx.fill();
    }
}

// Check if player has collected a power-up
function checkPowerUpCollision() {
    if (!powerUp) return;
    
    // Check if player collected power-up
    if (playerSnake.length > 0) {
        const playerHead = playerSnake[0];
        if (playerHead.x === powerUp.x && playerHead.y === powerUp.y) {
            // Get the power-up type from the powerUp object correctly
            const powerUpType = powerUp.type.type;
            console.log("Player collected power-up of type:", powerUpType);
            
            // Save the power-up type first, then clear the power-up object
            const collectedPowerUp = powerUp;
            powerUp = null;
            
            // Player collected the power-up - activate with the saved type
            activatePowerUp(collectedPowerUp.type.type);
            
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
            // AI collects power-up
            console.log("AI collected power-up");
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
    
    // Set active power-up state
    powerUpActive = true;
    activePowerUpType = type;
    powerUpTimeLeft = POWER_UP_DURATION;
    
    // Update the indicator
    powerUpIndicatorElement.style.display = 'block';
    
    switch (type) {
        case 'speed':
            // Set the flag for speed boost
            isSpeedBoosted = true;
            console.log("Speed boost activated - player will move twice as fast");
            break;
        case 'freeze':
            // Freeze AI snake
            aiIsFrozen = true;
            aiFreezeTimeLeft = POWER_UP_DURATION;
            console.log("AI freeze activated - AI snake frozen for 5 seconds");
            break;
        case 'magnet':
            // Magnet effect is applied in applyMagnetEffect
            console.log("Magnet activated - food will be pulled toward player");
            break;
        case 'shrink':
            // Shrink player snake
            if (playerSnake.length > 3) {
                playerSnake = playerSnake.slice(0, Math.max(3, Math.floor(playerSnake.length / 2)));
            }
            console.log("Shrink activated - player snake length reduced");
            break;
        default:
            console.warn("Unknown power-up type:", type);
            break;
    }
}

// AI snake logic - Completely revised to properly chase power-ups
function updateAiDirection() {
    if (aiSnake.length === 0 || aiIsFrozen) return; // Skip if AI is dead or frozen
    
    const head = aiSnake[0];
    
    // Determine AI targets and their priorities
    let targets = [];
    
    // Always add food as a potential target
    targets.push({
        x: food.x,
        y: food.y,
        priority: 1, // Standard priority
        type: 'food'
    });
    
    // Add power-up if it exists (with higher priority to ensure AI goes for it)
    if (powerUp) {
        targets.push({
            x: powerUp.x,
            y: powerUp.y,
            priority: 2, // Higher priority than food
            type: 'powerup'
        });
    }
    
    // Sort targets by priority (higher first)
    targets.sort((a, b) => b.priority - a.priority);
    
    // Find possible moves
    const possibleMoves = [];
    
    // Check all four directions
    const directions = [
        { dx: -gridSize, dy: 0, name: 'LEFT' },
        { dx: gridSize, dy: 0, name: 'RIGHT' },
        { dx: 0, dy: -gridSize, name: 'UP' },
        { dx: 0, dy: gridSize, name: 'DOWN' }
    ];
    
    // Filter out invalid moves
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
            else if (newX >= canvas.width) newX = 0;
            
            if (newY < 0) newY = canvas.height - gridSize;
            else if (newY >= canvas.height) newY = 0;
            
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
            if (!willCollide) {
                for (let i = 0; i < playerSnake.length; i++) {
                    if (newX === playerSnake[i].x && newY === playerSnake[i].y) {
                        willCollide = true;
                        break;
                    }
                }
            }
            
            if (!willCollide) {
                // For each valid move, calculate scores for each target
                targets.forEach(target => {
                    // Manhattan distance to target
                    const distX = Math.abs(newX - target.x);
                    const distY = Math.abs(newY - target.y);
                    
                    // Account for wrap-around distance
                    const wrapDistX = Math.min(distX, canvas.width - distX);
                    const wrapDistY = Math.min(distY, canvas.height - distY);
                    
                    const distance = wrapDistX + wrapDistY;
                    
                    possibleMoves.push({
                        dx: dir.dx,
                        dy: dir.dy,
                        direction: dir.name,
                        distance: distance,
                        targetType: target.type,
                        targetPriority: target.priority,
                        // Combined score (lower is better) factoring distance and priority
                        score: distance / target.priority
                    });
                });
            }
        }
    });
    
    // If there are possible moves, choose the best one
    if (possibleMoves.length > 0) {
        // Sort by score (lowest first)
        possibleMoves.sort((a, b) => a.score - b.score);
        
        // Always pick the move toward the highest priority target
        // For example, always go for power-up if possible
        const bestMoveType = possibleMoves[0].targetType;
        const bestMovesForTarget = possibleMoves.filter(move => move.targetType === bestMoveType);
        
        // Pick the best move for that target
        const chosenMove = bestMovesForTarget[0];
        
        aiDx = chosenMove.dx;
        aiDy = chosenMove.dy;
        aiLastDirection = chosenMove.direction;
        
        console.log(`AI targeting: ${chosenMove.targetType}`);
    }
    // If no valid moves, continue in current direction
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