import "./style.css";

// Canvas and context setup
const canvas = document.getElementById("blocksCanvas");
const ctx = canvas.getContext("2d");

// Game configuration
let unitSize = 12; // Size of each block unit
let gridWidth, gridHeight;
let staticUnits = []; // 2D array to store fallen blocks

// Timing variables
let timeCur = 0;
let timeEvent = 0;
let tickRate = 100; // How fast blocks fall (milliseconds)
let spawnTimer = 0;
let spawnInterval = 200; // How often to spawn new pieces

// Current falling pieces
let fallingPieces = [];

// Mouse tracking variables
let mouseX = 0;
let mouseY = 0;

// Piece templates - simplified Tetris pieces
const pieceTemplates = [
  // O - Square
  {
    color: "rgba(255, 255, 255, 0.8)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
    ],
  },
  // I - Line
  {
    color: "rgba(255, 255, 255, 0.8)",
    units: [
      { x: -2, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
  },
  // S - Right zigzag
  {
    color: "rgba(255, 255, 255, 0.8)",
    units: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
    ],
  },
  // Z - Left zigzag
  {
    color: "rgba(255, 255, 255, 0.8)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  // L - Right angle
  {
    color: "rgba(255, 255, 255, 0.8)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: -1 },
    ],
  },
  // J - Left angle
  {
    color: "rgba(255, 255, 255, 0.8)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
    ],
  },
  // T - T-shape
  {
    color: "rgba(255, 255, 255, 0.8)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
    ],
  },
];

// Piece constructor
class Piece {
  constructor(template) {
    this.x = Math.floor(Math.random() * gridWidth);
    this.y = -3; // Start above viewport
    this.color = template.color;
    this.units = [...template.units];
    this.lastMoveTime = 0;
  }
}

// Mouse event handlers
function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left;
  mouseY = event.clientY - rect.top;
}

// Setup mouse event listeners
function setupMouseListeners() {
  canvas.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mousemove", handleMouseMove);
}

// Handle window resize
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Calculate grid dimensions based on unit size
  gridWidth = Math.floor(canvas.width / unitSize);
  gridHeight = Math.floor(canvas.height / unitSize);

  // Reinitialize grid if dimensions changed
  initializeGrid();
}

// Initialize the game area
function initialize() {
  resizeCanvas();
  initializeGrid();
  setupMouseListeners();
  createNewPiece();
  gameLoop();
}

// Initialize the static units grid
function initializeGrid() {
  staticUnits = [];
  for (let x = 0; x < gridWidth; x++) {
    staticUnits[x] = [];
    for (let y = 0; y < gridHeight; y++) {
      staticUnits[x][y] = 0; // 0 means empty
    }
  }
}

// Remove the bottom-most row and shift everything down
function removeBottomRow() {
  for (let x = 0; x < gridWidth; x++) {
    staticUnits[x].splice(gridHeight - 1, 1);
    staticUnits[x].unshift(0);
  }
}

// Create a new piece and add it to falling pieces
function createNewPiece() {
  const randomTemplate =
    pieceTemplates[Math.floor(Math.random() * pieceTemplates.length)];
  const newPiece = new Piece(randomTemplate);

  // Check if the new piece can spawn
  if (checkCollisions(newPiece, 0, 0)) {
    // For background, we'll just remove bottom row instead of game over
    removeBottomRow();
  }

  fallingPieces.push(newPiece);
}

// Check for collisions
function checkCollisions(piece, offsetX, offsetY) {
  for (let unit of piece.units) {
    const testX = piece.x + unit.x + offsetX;
    const testY = piece.y + unit.y + offsetY;

    // Check boundaries
    if (testX < 0 || testX >= gridWidth || testY >= gridHeight) {
      return true;
    }

    // Check collision with static blocks (only if Y > 0 to allow spawning)
    if (testY >= 0 && staticUnits[testX][testY] !== 0) {
      return true;
    }
  }
  return false;
}

// Apply gravity to all falling pieces
function applyGravity() {
  for (let i = fallingPieces.length - 1; i >= 0; i--) {
    const piece = fallingPieces[i];

    // Try to move piece down
    if (!checkCollisions(piece, 0, 1)) {
      piece.y++;
    } else {
      // Piece can't fall further, freeze it
      freezePiece(piece);
      // Remove this piece from falling pieces array
      fallingPieces.splice(i, 1);
    }
  }
}

// Freeze the specified piece into static units
function freezePiece(piece) {
  if (!piece) return;

  const affectedRows = [];

  for (let unit of piece.units) {
    const staticX = piece.x + unit.x;
    const staticY = piece.y + unit.y;

    if (
      staticX >= 0 &&
      staticX < gridWidth &&
      staticY >= 0 &&
      staticY < gridHeight
    ) {
      staticUnits[staticX][staticY] = piece.color;

      if (affectedRows.indexOf(staticY) === -1) {
        affectedRows.push(staticY);
      }
    }
  }

  // Clear complete rows
  clearCompleteRows(affectedRows);

  // Check if stack is getting too high and manage it
  manageStackHeight();
}

// Clear complete rows
function clearCompleteRows(checkRows) {
  checkRows.sort((a, b) => a - b);

  for (let row of checkRows) {
    let isComplete = true;

    // Check if row is complete
    for (let x = 0; x < gridWidth; x++) {
      if (staticUnits[x][row] === 0) {
        isComplete = false;
        break;
      }
    }

    // If complete, remove the row and add empty row at top
    if (isComplete) {
      for (let x = 0; x < gridWidth; x++) {
        staticUnits[x].splice(row, 1);
        staticUnits[x].unshift(0);
      }
    }
  }
}

// Check and manage stack height
function manageStackHeight() {
  // Find the highest point of the stack (lowest y value with blocks)
  let highestPoint = gridHeight;

  for (let y = 0; y < gridHeight; y++) {
    let hasBlocks = false;
    for (let x = 0; x < gridWidth; x++) {
      if (staticUnits[x][y] !== 0) {
        hasBlocks = true;
        break;
      }
    }
    if (hasBlocks) {
      highestPoint = y;
      break;
    }
  }

  // Calculate stack height as percentage of viewport
  const stackHeight = (gridHeight - highestPoint) / gridHeight;

  // If stack reaches 35% of viewport height, remove bottom row
  if (stackHeight >= 0.35) {
    removeBottomRow();
  }
}

// Check if mouse is near a piece
function isMouseNearPiece(piece) {
  const mouseGridX = Math.floor(mouseX / unitSize);
  const mouseGridY = Math.floor(mouseY / unitSize);

  for (let unit of piece.units) {
    const unitGridX = piece.x + unit.x;
    const unitGridY = piece.y + unit.y;

    // Check if mouse is within 2 units of this piece unit
    const distance = Math.sqrt(
      Math.pow(mouseGridX - unitGridX, 2) + Math.pow(mouseGridY - unitGridY, 2)
    );

    if (distance <= 2.5) {
      return true;
    }
  }
  return false;
}

// Get the center X position of a piece
function getPieceCenterX(piece) {
  let minX = Infinity;
  let maxX = -Infinity;

  for (let unit of piece.units) {
    const unitX = piece.x + unit.x;
    minX = Math.min(minX, unitX);
    maxX = Math.max(maxX, unitX);
  }

  return (minX + maxX) / 2;
}

// Handle mouse interaction with falling pieces
function handleMouseInteraction() {
  const currentTime = Date.now();
  const mouseGridX = Math.floor(mouseX / unitSize);

  for (let piece of fallingPieces) {
    // Throttle movement to prevent too frequent updates
    if (currentTime - piece.lastMoveTime < 150) continue;

    if (isMouseNearPiece(piece)) {
      const pieceCenterX = getPieceCenterX(piece);

      // Calculate direction to move away from mouse
      let targetDirection = 0;
      if (mouseGridX > pieceCenterX) {
        // Mouse is to the right, move piece left
        targetDirection = -1;
      } else if (mouseGridX < pieceCenterX) {
        // Mouse is to the left, move piece right
        targetDirection = 1;
      }

      // Try to move in target direction
      if (
        targetDirection !== 0 &&
        !checkCollisions(piece, targetDirection, 0)
      ) {
        piece.x += targetDirection;
        piece.lastMoveTime = currentTime;
      }
    }
  }
}

// Render everything
function render() {
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const blockSize = unitSize - 1; // Leave small gap between blocks

  // Draw static blocks
  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      if (staticUnits[x][y] !== 0) {
        ctx.fillStyle = staticUnits[x][y];
        ctx.fillRect(x * unitSize, y * unitSize, blockSize, blockSize);
      }
    }
  }

  // Draw all falling pieces
  for (let piece of fallingPieces) {
    ctx.fillStyle = piece.color;
    for (let unit of piece.units) {
      const drawX = (piece.x + unit.x) * unitSize;
      const drawY = (piece.y + unit.y) * unitSize;

      if (
        drawX >= 0 &&
        drawX < canvas.width &&
        drawY >= 0 &&
        drawY < canvas.height
      ) {
        ctx.fillRect(drawX, drawY, blockSize, blockSize);
      }
    }
  }
}

// Main game loop
function gameLoop() {
  timeCur = Date.now();

  // Check if it's time for gravity tick
  if (timeCur >= timeEvent) {
    applyGravity();
    timeEvent = timeCur + tickRate;
  }

  // Check if it's time to spawn a new piece
  if (timeCur >= spawnTimer) {
    createNewPiece();
    spawnTimer = timeCur + spawnInterval;
  }

  // Handle mouse interactions
  handleMouseInteraction();

  render();
  requestAnimationFrame(gameLoop);
}

// Handle window resize
window.addEventListener("resize", resizeCanvas);

// Start the background animation
initialize();
