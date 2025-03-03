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
let gorilla = null; // Add gorilla variable
let gorillaActive = false;
let gorillaTimeout = null;

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
    { type: 'shrink', color: '#32CD32', effect: 'Shrink' },
    { type: 'blackout', color: '#000000', effect: 'Black Out' },
    { type: 'banana', color: '#FFD700', effect: 'Banana Power' }
];

// Initialize game
function initGame() {
    // Reset snakes with initial positions
    playerSnake = [
        { x: Math.floor(tileCount / 4) * gridSize, y: Math.floor(tileCount / 2) * gridSize }
    ];
    aiSnake = [
        { x: Math.floor(tileCount * 3 / 4) * gridSize, y: Math.floor(tileCount / 2) * gridSize }
    ];
    
    // Reset game state
    playerScore = 0;
    aiScore = 0;
    updateScores();
    
    // Reset movement
    playerDx = 0;
    playerDy = 0;
    playerLastDirection = '';
    
    aiDx = 0;
    aiDy = 0;
    aiLastDirection = '';
    
    // Reset AI frozen state
    aiIsFrozen = false;
    aiFreezeTimeLeft = 0;
    
    // Reset power-up state
    powerUp = null;
    powerUpActive = false;
    activePowerUpType = null;
    powerUpTimeLeft = 0;
    isSpeedBoosted = false;
    
    // Reset gorilla
    gorilla = null;
    gorillaActive = false;
    if (gorillaTimeout) {
        clearTimeout(gorillaTimeout);
        gorillaTimeout = null;
    }
    
    // Reset screen flash
    screenFlashOpacity = 0;
    
    // Generate initial food and power-up
    generateFood();
    generatePowerUp();
    
    // Force a gorilla to appear soon after game start (5-10 seconds)
    setTimeout(generateGorilla, 5000 + Math.random() * 5000);
    
    // Schedule random gorilla appearances
    scheduleGorillaAppearance();
    
    // Start the game
    gameRunning = true;
    winner = null;
    gameOverElement.style.display = 'none';
    
    // Start main game loop
    main();
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
        
        // Apply magnet effect if active for player
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
            if (gorilla && gorillaActive) drawGorilla();
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
            
            // Draw blackout effect if active
            if (powerUpActive && activePowerUpType === 'blackout') {
                drawBlackoutEffect();
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
            case 'blackout':
                powerUpName = '🌑 Black Out';
                break;
            case 'banana':
                powerUpName = '🍌 Banana Power';
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
        const length = Math.max(0.1, Math.sqrt(dx * dx + dy * dy)); // Avoid division by zero
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
    
    // Store a local reference to the current power-up
    const currentPowerUp = powerUp;
    
    // Check if player collected power-up
    if (playerSnake.length > 0) {
        const playerHead = playerSnake[0];
        if (playerHead.x === currentPowerUp.x && playerHead.y === currentPowerUp.y) {
            // Get the power-up type from the powerUp object correctly
            const powerUpType = currentPowerUp.type.type;
            console.log("Player collected power-up of type:", powerUpType);
            
            // Clear the global powerUp first to prevent double collection
            powerUp = null;
            
            // Player collected the power-up - activate with the saved type
            activatePowerUp(powerUpType, 'player');
            
            // Create screen flash effect
            screenFlashOpacity = 0.7;
            
            // Generate a new power-up after a delay
            setTimeout(generatePowerUp, 1000);
            
            // Exit the function early since the power-up was collected
            return;
        }
    }
    
    // Only check AI collection if the power-up wasn't collected by the player
    if (aiSnake.length > 0 && !aiIsFrozen) {
        const aiHead = aiSnake[0];
        if (aiHead.x === currentPowerUp.x && aiHead.y === currentPowerUp.y) {
            // Get the power-up type
            const powerUpType = currentPowerUp.type.type;
            console.log("AI collected power-up of type:", powerUpType);
            
            // Clear the global powerUp
            powerUp = null;
            
            // AI collects and activates the power-up
            aiScore += 5;
            updateScores();
            
            // Activate the power-up effect for AI
            activatePowerUp(powerUpType, 'ai');
            
            // Generate a new power-up after a delay
            setTimeout(generatePowerUp, 1000);
        }
    }
}

// Activate power-up effect
function activatePowerUp(type, collector) {
    console.log(`Power-up activated: ${type} by ${collector}`); // Debug log
    
    // Check for valid collector
    if (collector !== 'player' && collector !== 'ai') {
        console.error("Invalid power-up collector:", collector);
        return;
    }
    
    // Set active power-up state - only for player
    if (collector === 'player') {
        powerUpActive = true;
        activePowerUpType = type;
        powerUpTimeLeft = POWER_UP_DURATION;
        
        // Update the indicator
        powerUpIndicatorElement.style.display = 'block';
    }
    
    try {
        switch (type) {
            case 'speed':
                if (collector === 'player') {
                    // Set the flag for speed boost
                    isSpeedBoosted = true;
                    console.log("Player speed boost activated - player will move twice as fast");
                } else {
                    // For AI, increase their speed by making them move every frame
                    console.log("AI speed boost activated");
                    // Effect handled in main loop
                }
                break;
                
            case 'freeze':
                if (collector === 'player') {
                    // Freeze AI snake
                    aiIsFrozen = true;
                    aiFreezeTimeLeft = POWER_UP_DURATION;
                    console.log("AI snake frozen for 5 seconds");
                } else {
                    // AI freezes player (reduce player speed dramatically)
                    isSpeedBoosted = false;
                    playerMoveCounter = -5; // Add a delay before player can move
                    console.log("Player slowed down by AI freeze power-up");
                    
                    // Create a screen effect to show the player is slowed
                    screenFlashOpacity = 0.3;
                    
                    // Show indicator for player
                    powerUpIndicatorElement.textContent = `Slowed by AI! (5s)`;
                    powerUpIndicatorElement.style.display = 'block';
                    
                    // Reset after duration
                    setTimeout(() => {
                        playerMoveCounter = 0;
                        powerUpIndicatorElement.style.display = 'none';
                    }, POWER_UP_DURATION);
                }
                break;
                
            case 'magnet':
                if (collector === 'player') {
                    // Magnet effect is applied in applyMagnetEffect
                    console.log("Player magnet activated - food will be pulled toward player");
                } else {
                    // For AI, move food closer to them
                    if (food && aiSnake.length > 0) {
                        const aiHead = aiSnake[0];
                        // Move food closer to AI but not directly on it
                        const newX = Math.round((food.x + aiHead.x) / (2 * gridSize)) * gridSize;
                        const newY = Math.round((food.y + aiHead.y) / (2 * gridSize)) * gridSize;
                        
                        // Don't place on top of snakes
                        let validPosition = true;
                        
                        // Check collision with any snake segments
                        for (let segment of playerSnake.concat(aiSnake)) {
                            if (segment.x === newX && segment.y === newY) {
                                validPosition = false;
                                break;
                            }
                        }
                        
                        if (validPosition) {
                            food.x = newX;
                            food.y = newY;
                            console.log("AI magnet relocated food");
                        }
                    }
                }
                break;
                
            case 'shrink':
                if (collector === 'player') {
                    // Safely shrink player snake
                    if (playerSnake.length > 3) {
                        const newLength = Math.max(3, Math.floor(playerSnake.length / 2));
                        playerSnake = playerSnake.slice(0, newLength);
                        console.log("Player snake length reduced to", playerSnake.length);
                    } else {
                        console.log("Player snake too short to shrink further");
                    }
                } else {
                    // AI using shrink power-up against player
                    if (playerSnake.length > 5) {
                        const newLength = Math.max(5, playerSnake.length - 3);
                        playerSnake = playerSnake.slice(0, newLength);
                        console.log("Player snake reduced by AI shrink to", playerSnake.length);
                        
                        // Show effect
                        screenFlashOpacity = 0.5;
                        
                        // Show indicator for player
                        powerUpIndicatorElement.textContent = `Shrunk by AI!`;
                        powerUpIndicatorElement.style.display = 'block';
                        
                        // Hide indicator after 2 seconds
                        setTimeout(() => {
                            powerUpIndicatorElement.style.display = 'none';
                        }, 2000);
                    }
                }
                break;
                
            case 'blackout':
                if (collector === 'player') {
                    // Player blacks out AI's view (mostly for effect since AI uses code logic)
                    console.log("Player activated blackout against AI");
                    screenFlashOpacity = 0.7;
                } else {
                    // AI uses blackout against player - create a dramatic effect
                    console.log("AI activated blackout against player");
                    powerUpActive = true;
                    activePowerUpType = 'blackout';
                    powerUpTimeLeft = POWER_UP_DURATION;
                    
                    // Flash effect for dramatic impact
                    screenFlashOpacity = 1.0;
                    
                    // Show indicator for player
                    powerUpIndicatorElement.textContent = `⚫ BLACKOUT! (5s)`;
                    powerUpIndicatorElement.style.display = 'block';
                    
                    // Play a sound if audio is implemented
                    // playSound('blackout');
                }
                break;
                
            case 'banana':
                if (collector === 'player') {
                    // Banana power for player: grow by 3 segments and gain extra points
                    console.log("Player got banana: growing and bonus points!");
                    
                    // Add three segments to the snake
                    const tail = playerSnake[playerSnake.length - 1];
                    for (let i = 0; i < 3; i++) {
                        playerSnake.push({...tail});
                    }
                    
                    // Add bonus points
                    playerScore += 15;
                    updateScores();
                    
                    // Show indicator for player
                    powerUpIndicatorElement.textContent = `🍌 Banana Power! +3 segments, +15 points!`;
                    powerUpIndicatorElement.style.display = 'block';
                    
                    // Create screen flash effect (yellow for banana)
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    screenFlashOpacity = 0.6;
                    
                    // Hide indicator after 2 seconds
                    setTimeout(() => {
                        if (powerUpIndicatorElement.textContent.includes('Banana Power')) {
                            powerUpIndicatorElement.style.display = 'none';
                        }
                    }, 2000);
                } else {
                    // Banana power for AI: grow by 3 segments
                    console.log("AI got banana: growing and bonus points!");
                    
                    // Add three segments to the AI snake
                    const aiTail = aiSnake[aiSnake.length - 1];
                    for (let i = 0; i < 3; i++) {
                        aiSnake.push({...aiTail});
                    }
                    
                    // Add bonus points for AI
                    aiScore += 15;
                    updateScores();
                }
                break;
                
            default:
                console.warn("Unknown power-up type:", type);
                break;
        }
    } catch (error) {
        console.error("Error in activatePowerUp:", error);
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

// Generate a random power-up - improved reliability
function generatePowerUp() {
    if (!gameRunning) return;
    
    // Don't generate if there's already a power-up
    if (powerUp !== null) return;
    
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
        if (food && food.x === newPowerUp.x && food.y === newPowerUp.y) {
            powerUpOnSnake = true;
        }
        
        attempts++;
        // If we've tried many times and can't find a spot, give up for now
        if (attempts > 50) {
            console.log("Couldn't place power-up after 50 attempts");
            return;
        }
    } while (powerUpOnSnake);
    
    console.log("Generated power-up:", newPowerUp.type.type, "at", newPowerUp.x, newPowerUp.y);
    powerUp = newPowerUp;
    
    // Make power-up disappear after 7 seconds if not collected
    setTimeout(() => {
        if (powerUp === newPowerUp) {
            console.log("Power-up expired");
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
    ctx.fillStyle = powerUp.type.color;
    ctx.globalAlpha = powerUpOpacity;
    ctx.fillRect(powerUp.x, powerUp.y, gridSize, gridSize);
    ctx.globalAlpha = 1.0;
    
    // Draw a symbol based on power-up type
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
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
        case 'blackout':
            symbol = '⚫';
            break;
        case 'banana':
            symbol = '🍌';
            break;
    }
    
    ctx.fillText(symbol, powerUp.x + gridSize/2, powerUp.y + gridSize/2);
}

// Draw frozen effect on AI snake
function drawFrozenEffect(snake) {
    if (!snake || snake.length === 0) return;
    
    // Draw a blue tint over the entire snake
    snake.forEach(segment => {
        ctx.fillStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.fillRect(segment.x, segment.y, gridSize, gridSize);
    });
}

// Draw blackout effect
function drawBlackoutEffect() {
    // Create a dramatic pulsing blackout effect
    const time = new Date().getTime();
    const pulseIntensity = 0.1 + 0.05 * Math.sin(time / 100);  // Subtle pulsing
    
    // Create a dark gradient that leaves small visibility around the player
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 10,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    // Almost completely black at the edges
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${0.9 + pulseIntensity})`);
    
    // Fill the entire canvas with the gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some visual effects - random stars that appear and disappear
    for (let i = 0; i < 20; i++) {
        if (Math.random() > 0.7) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 1.5;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.7})`;
            ctx.fill();
        }
    }
    
    // Draw visibility circle around player's snake head for minimal visibility
    if (playerSnake.length > 0) {
        const head = playerSnake[0];
        const visibilityRadius = gridSize * 3;
        
        // Create a spotlight effect
        const spotlight = ctx.createRadialGradient(
            head.x + gridSize/2, head.y + gridSize/2, 1,
            head.x + gridSize/2, head.y + gridSize/2, visibilityRadius
        );
        
        spotlight.addColorStop(0, 'rgba(0, 0, 0, 0)');
        spotlight.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
        spotlight.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        
        // Create a cutout in the darkness
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(head.x + gridSize/2, head.y + gridSize/2, visibilityRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        // Add a subtle glow around the player's head
        ctx.beginPath();
        ctx.arc(head.x + gridSize/2, head.y + gridSize/2, gridSize * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Generate random position for gorilla
function generateGorilla() {
    if (!gameRunning || gorillaActive) return;
    
    console.log("Generating gorilla!");
    
    // Generate random position for gorilla
    let newGorilla;
    let gorillaOnSnake;
    let attempts = 0;
    
    do {
        gorillaOnSnake = false;
        newGorilla = {
            x: Math.floor(Math.random() * tileCount) * gridSize,
            y: Math.floor(Math.random() * tileCount) * gridSize,
            frameCount: 0, // For animation
            direction: Math.random() > 0.5 ? 1 : -1 // Direction for movement
        };
        
        // Check if gorilla is on player snake
        for (let segment of playerSnake) {
            if (segment.x === newGorilla.x && segment.y === newGorilla.y) {
                gorillaOnSnake = true;
                break;
            }
        }
        
        // Check if gorilla is on AI snake
        if (!gorillaOnSnake) {
            for (let segment of aiSnake) {
                if (segment.x === newGorilla.x && segment.y === newGorilla.y) {
                    gorillaOnSnake = true;
                    break;
                }
            }
        }
        
        // Check if gorilla is on food
        if (food && food.x === newGorilla.x && food.y === newGorilla.y) {
            gorillaOnSnake = true;
        }
        
        // Check if gorilla is on power-up
        if (powerUp && powerUp.x === newGorilla.x && powerUp.y === newGorilla.y) {
            gorillaOnSnake = true;
        }
        
        attempts++;
        // If we've tried many times and can't find a spot, give up for now
        if (attempts > 50) {
            console.log("Couldn't place gorilla after 50 attempts");
            return;
        }
    } while (gorillaOnSnake);
    
    gorilla = newGorilla;
    gorillaActive = true;
    
    // Show message that gorilla appeared
    powerUpIndicatorElement.textContent = `🦍 Gorilla appeared! Catch it for a banana!`;
    powerUpIndicatorElement.style.display = 'block';
    
    // Hide indicator after 3 seconds
    setTimeout(() => {
        if (powerUpIndicatorElement.textContent.includes('Gorilla appeared')) {
            powerUpIndicatorElement.style.display = 'none';
        }
    }, 3000);
    
    // Gorilla will leave after 10 seconds
    gorillaTimeout = setTimeout(() => {
        console.log("Gorilla leaving");
        gorilla = null;
        gorillaActive = false;
    }, 10000);
}

// Schedule random appearances of the gorilla
function scheduleGorillaAppearance() {
    // Random time between 15-45 seconds
    const appearanceTime = 15000 + Math.random() * 30000;
    
    setTimeout(() => {
        generateGorilla();
        if (gameRunning) {
            scheduleGorillaAppearance(); // Schedule next appearance
        }
    }, appearanceTime);
}

// Draw gorilla
function drawGorilla() {
    if (!gorilla || !gorillaActive) return;
    
    // Update frame count for animation
    gorilla.frameCount++;
    
    // Move gorilla randomly every 30 frames
    if (gorilla.frameCount % 30 === 0) {
        // 30% chance to change direction
        if (Math.random() < 0.3) {
            gorilla.direction = -gorilla.direction;
        }
        
        // Move left or right
        gorilla.x += gorilla.direction * gridSize;
        
        // Keep gorilla within bounds
        if (gorilla.x < 0) gorilla.x = 0;
        if (gorilla.x >= canvas.width - gridSize) gorilla.x = canvas.width - gridSize;
    }
    
    // Draw gorilla background
    ctx.fillStyle = '#A0522D'; // Darker brown background
    ctx.fillRect(gorilla.x, gorilla.y, gridSize, gridSize);
    
    // Draw gorilla emoji
    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦍', gorilla.x + gridSize/2, gorilla.y + gridSize/2);
    
    // Check collision with snakes
    checkGorillaCollision();
}

// Check if snake collides with gorilla
function checkGorillaCollision() {
    if (!gorilla || !gorillaActive) return;
    
    // Check player collision
    if (playerSnake.length > 0) {
        const playerHead = playerSnake[0];
        if (playerHead.x === gorilla.x && playerHead.y === gorilla.y) {
            console.log("Player collided with gorilla!");
            
            // Drop a banana power-up when gorilla is hit
            powerUp = {
                x: gorilla.x,
                y: gorilla.y,
                type: powerUpTypes.find(p => p.type === 'banana')
            };
            
            // Remove gorilla
            gorilla = null;
            gorillaActive = false;
            if (gorillaTimeout) {
                clearTimeout(gorillaTimeout);
                gorillaTimeout = null;
            }
            
            // Create screen flash effect
            screenFlashOpacity = 0.5;
            
            // Show message
            powerUpIndicatorElement.textContent = `You caught the gorilla! 🦍 Banana dropped! 🍌`;
            powerUpIndicatorElement.style.display = 'block';
            
            // Hide indicator after 2 seconds
            setTimeout(() => {
                if (powerUpIndicatorElement.textContent.includes('caught the gorilla')) {
                    powerUpIndicatorElement.style.display = 'none';
                }
            }, 2000);
        }
    }
    
    // Check AI collision
    if (aiSnake.length > 0) {
        const aiHead = aiSnake[0];
        if (aiHead.x === gorilla.x && aiHead.y === gorilla.y) {
            console.log("AI collided with gorilla!");
            
            // Drop a banana power-up when gorilla is hit
            powerUp = {
                x: gorilla.x,
                y: gorilla.y,
                type: powerUpTypes.find(p => p.type === 'banana')
            };
            
            // Remove gorilla
            gorilla = null;
            gorillaActive = false;
            if (gorillaTimeout) {
                clearTimeout(gorillaTimeout);
                gorillaTimeout = null;
            }
            
            // Show message
            powerUpIndicatorElement.textContent = `AI caught the gorilla! Banana dropped!`;
            powerUpIndicatorElement.style.display = 'block';
            
            // Hide indicator after 2 seconds
            setTimeout(() => {
                if (powerUpIndicatorElement.textContent.includes('AI caught')) {
                    powerUpIndicatorElement.style.display = 'none';
                }
            }, 2000);
        }
    }
}

// Event listeners
document.addEventListener('keydown', function(event) {
    // Debug output to check if key events are being registered
    console.log("Key pressed:", event.keyCode);
    
    // Prevent arrow keys from scrolling the page
    if ([37, 38, 39, 40].indexOf(event.keyCode) > -1) {
        event.preventDefault();
    }
    
    // Only process key events if the game is running
    if (!gameRunning) return;
    
    // Get new direction for player
    switch (event.keyCode) {
        case 37: // Left arrow
            if (playerLastDirection !== 'RIGHT') {
                playerDx = -gridSize;
                playerDy = 0;
                playerLastDirection = 'LEFT';
                console.log("Moving LEFT");
            }
            break;
        case 38: // Up arrow
            if (playerLastDirection !== 'DOWN') {
                playerDx = 0;
                playerDy = -gridSize;
                playerLastDirection = 'UP';
                console.log("Moving UP");
            }
            break;
        case 39: // Right arrow
            if (playerLastDirection !== 'LEFT') {
                playerDx = gridSize;
                playerDy = 0;
                playerLastDirection = 'RIGHT';
                console.log("Moving RIGHT");
            }
            break;
        case 40: // Down arrow
            if (playerLastDirection !== 'UP') {
                playerDx = 0;
                playerDy = gridSize;
                playerLastDirection = 'DOWN';
                console.log("Moving DOWN");
            }
            break;
    }
});

restartBtn.addEventListener('click', initGame);

// Start the game with the window load event
window.onload = function() {
    console.log("Game initializing...");
    
    // Check that canvas and other important elements exist
    if (!canvas) {
        console.error("Canvas element not found!");
    }
    
    // Force any pending DOM updates to complete
    setTimeout(function() {
        initGame();
        console.log("Game started!");
    }, 100);
}; 