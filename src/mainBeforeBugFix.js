import "./style.css";

// Canvas and context setup
const canvas = document.getElementById("blocksCanvas");
const ctx = canvas.getContext("2d");

// Game configuration
// let unitSize = 30; // Size of each block unit
let unitSize = 10; // Size of each block unit
let gridWidth, gridHeight;
let staticUnits = []; // 2D array to store fallen blocks

// Timing variables
let timeCur = 0;
let timeEvent = 0;
// let tickRate = 500; // How fast blocks fall (milliseconds)
let tickRate = 80; // How fast blocks fall (milliseconds)

// Current falling pieces - need array to handle overlapping pieces
let fallingPieces = [];

// Mouse tracking variables
let mouseX = 0;
let mouseY = 0;

// Piece templates - simplified Tetris pieces
const pieceTemplates = [
  // O - Square
  {
    // color: "rgb(255,232,51)",
    color: "rgb(256,256,256)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
    ],
  },
  // I - Line
  {
    // color: "rgb(51,255,209)",
    color: "rgb(256,256,256)",
    units: [
      { x: -2, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
  },
  // S - Right zigzag
  {
    // color: "rgb(106,255,51)",
    color: "rgb(256,256,256)",
    units: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
    ],
  },
  // Z - Left zigzag
  {
    // color: "rgb(255,51,83)",
    color: "rgb(256,256,256)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  // L - Right angle
  {
    // color: "rgb(255,129,51)",
    color: "rgb(256,256,256)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: -1 },
    ],
  },
  // J - Left angle
  {
    // color: "rgb(64,100,255)",
    color: "rgb(256,256,256)",
    units: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
    ],
  },
  // T - T-shape
  {
    // color: "rgb(160,62,255)",
    color: "rgb(256,256,256)",
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
    // Always spawn at random x position
    this.x = Math.floor(Math.random() * gridWidth);
    this.y = -2; // Start slightly above viewport
    this.color = template.color;
    this.units = [...template.units]; // Copy the units array
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
  newPiece.hasTriggeredNext = false; // Flag to track if this piece has triggered the next one
  newPiece.lastMoveTime = 0; // Track last movement time for throttling

  // Check if the new piece can spawn
  if (checkCollisions(newPiece, 0, 0)) {
    // For background, we'll just remove bottom row instead of game over
    removeBottomRow();
  }

  fallingPieces.push(newPiece);
}

// Legacy function name for compatibility
function generateNewPiece() {
  createNewPiece();
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

    // Check if this piece should trigger the next piece spawn
    const journeyProgress = (piece.y + 2) / (gridHeight + 2);
    // if (journeyProgress >= 0.15 && !piece.hasTriggeredNext) {
    if (journeyProgress >= 0.001 && !piece.hasTriggeredNext) {
      // Create next piece immediately (no setTimeout needed)
      createNewPiece();
      piece.hasTriggeredNext = true;
    }

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

  // If no pieces are falling, create a new one
  if (fallingPieces.length === 0) {
    createNewPiece();
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

  // Check for complete rows and clear them
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

  // If stack reaches 30% of viewport height, remove bottom row
  if (stackHeight >= 0.3) {
    removeBottomRow();
  }
}

// Check if mouse is hovering over a piece
function checkMouseHover(piece) {
  // Convert mouse position to grid coordinates
  const mouseGridX = Math.floor(mouseX / unitSize);
  const mouseGridY = Math.floor(mouseY / unitSize);

  // Check if mouse is over any unit of this piece
  for (let unit of piece.units) {
    const unitGridX = piece.x + unit.x;
    const unitGridY = piece.y + unit.y;

    if (unitGridX === mouseGridX && unitGridY === mouseGridY) {
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

  for (let piece of fallingPieces) {
    // Throttle movement to prevent too frequent updates
    if (currentTime - piece.lastMoveTime < 200) continue;

    if (checkMouseHover(piece)) {
      const pieceCenterX = getPieceCenterX(piece) * unitSize + unitSize / 2;

      // Determine which side mouse is on relative to piece center
      if (mouseX > pieceCenterX) {
        // Mouse is on right side of piece, move piece left
        if (!checkCollisions(piece, -1, 0)) {
          // piece.x -= 1;
          piece.x -= 3;
          piece.lastMoveTime = currentTime;
        }
      } else {
        // Mouse is on left side of piece, move piece right
        if (!checkCollisions(piece, 1, 0)) {
          // piece.x += 1;
          piece.x += 3;
          piece.lastMoveTime = currentTime;
        }
      }
    }
  }
}

// Render everything
function render() {
  // Clear canvas
  ctx.fillStyle = "rgb(19,21,25)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const blockSize = unitSize - 2; // Leave small gap between blocks

  // Draw static blocks
  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      if (staticUnits[x][y] !== 0) {
        ctx.fillStyle = staticUnits[x][y];
        ctx.fillRect(x * unitSize + 1, y * unitSize + 1, blockSize, blockSize);
      }
    }
  }

  // Draw all falling pieces
  for (let piece of fallingPieces) {
    ctx.fillStyle = piece.color;
    for (let unit of piece.units) {
      const drawX = (piece.x + unit.x) * unitSize + 1;
      const drawY = (piece.y + unit.y) * unitSize + 1;

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

  // Handle mouse interactions
  handleMouseInteraction();

  render();
  requestAnimationFrame(gameLoop);
}

// Handle window resize
window.addEventListener("resize", resizeCanvas);

// Start the background animation
initialize();
