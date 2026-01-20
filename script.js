const statusEl = document.getElementById('status');
const boardEl = document.getElementById('board');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const restartBtn = document.getElementById('restart');
const resetScoresBtn = document.getElementById('resetScores');

// Connect 4 constants
const COLS = 7;
const ROWS = 6;
const EMPTY = 0;
const RED = 1;
const YELLOW = 2;

// Game state
let board = Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
let currentPlayer = RED;
let gameActive = true;
let scores = { 1: 0, 2: 0 };
let columnHeights = Array(COLS).fill(0);

// Create the board UI
function initializeBoard() {
  boardEl.innerHTML = '';
  for (let col = 0; col < COLS; col++) {
    const column = document.createElement('div');
    column.className = 'column';
    column.dataset.col = col;
    for (let row = 0; row < ROWS; row++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.row = row;
      slot.dataset.col = col;
      column.appendChild(slot);
    }
    column.addEventListener('click', handleColumnClick);
    boardEl.appendChild(column);
  }
}

function handleColumnClick(e) {
  if (!gameActive) return;
  const col = parseInt(e.currentTarget.dataset.col);
  dropPiece(col);
}

function dropPiece(col) {
  if (columnHeights[col] >= ROWS) return; // Column is full
  
  const row = columnHeights[col];
  const slot = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  
  if (!slot) return;
  
  // Calculate position for falling animation
  const slotRect = slot.getBoundingClientRect();
  const boardRect = boardEl.getBoundingClientRect();
  const pieceSize = Math.min(slotRect.width, slotRect.height) * 0.85;
  
  // Create falling piece
  const piece = document.createElement('div');
  piece.className = `piece ${currentPlayer === RED ? 'red' : 'yellow'}`;
  piece.style.width = pieceSize + 'px';
  piece.style.height = pieceSize + 'px';
  piece.style.left = slotRect.left + slotRect.width / 2 - pieceSize / 2 + 'px';
  piece.style.top = boardRect.top - pieceSize - 20 + 'px';
  document.body.appendChild(piece);
  
  const targetY = slotRect.top + slotRect.height / 2 - pieceSize / 2;
  
  let y = boardRect.top - pieceSize - 20;
  let vy = 0;
  const g = 5500; // px/s^2
  const bounce = 0.45;
  let last = performance.now();
  
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    vy += g * dt;
    y += vy * dt;
    
    if (y >= targetY) {
      y = targetY;
      vy = -vy * bounce;
      if (Math.abs(vy) < 80) {
        piece.style.top = targetY + 'px';
        finalizePiece(row, col, piece);
        return;
      }
    }
    piece.style.top = y + 'px';
    requestAnimationFrame(tick);
  }
  
  requestAnimationFrame(tick);
}

function finalizePiece(row, col, piece) {
  // Update board state
  board[row][col] = currentPlayer;
  columnHeights[col]++;
  
  // Update UI
  const slot = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  slot.classList.add(currentPlayer === RED ? 'red' : 'yellow');
  
  // Remove floating piece
  setTimeout(() => {
    if (piece.parentNode) piece.parentNode.removeChild(piece);
  }, 50);
  
  // Check for win
  if (checkWin(row, col, currentPlayer)) {
    finishGame('win');
    return;
  }
  
  // Check for tie
  if (columnHeights.every(h => h === ROWS)) {
    finishGame('tie');
    return;
  }
  
  // Switch player
  currentPlayer = currentPlayer === RED ? YELLOW : RED;
  updateStatus();
  
  // AI turn if it's now player 2 (AI)
  if (currentPlayer === YELLOW && gameActive) {
    setTimeout(() => aiMove(), 1200);
  }
}

function checkWin(row, col, player) {
  // Check all four directions: horizontal, vertical, diagonal1, diagonal2
  const directions = [
    [[0, -1], [0, 1]], // horizontal
    [[-1, 0], [1, 0]], // vertical
    [[-1, -1], [1, 1]], // diagonal down-right
    [[-1, 1], [1, -1]]  // diagonal down-left
  ];
  
  for (const direction of directions) {
    let count = 1;
    
    for (const [dr, dc] of direction) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        count++;
        r += dr;
        c += dc;
      }
    }
    
    if (count >= 4) return true;
  }
  
  return false;
}

function countConnected(row, col, player) {
  // Count how many in a row this move would create (helper for AI scoring)
  let maxCount = 1;
  const directions = [
    [[0, -1], [0, 1]], // horizontal
    [[-1, 0], [1, 0]], // vertical
    [[-1, -1], [1, 1]], // diagonal down-right
    [[-1, 1], [1, -1]]  // diagonal down-left
  ];
  
  for (const direction of directions) {
    let count = 1;
    
    for (const [dr, dc] of direction) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        count++;
        r += dr;
        c += dc;
      }
    }
    
    maxCount = Math.max(maxCount, count);
  }
  
  return maxCount;
}

function evaluateMove(col) {
  // Score a potential move: higher = better
  if (columnHeights[col] >= ROWS) return -Infinity;
  
  const row = ROWS - 1 - columnHeights[col];
  let score = 0;
  
  // Prefer center columns (better for Connect 4 strategy)
  const distFromCenter = Math.abs(col - 3);
  score += (7 - distFromCenter) * 2;
  
  // Check if this move wins
  if (countConnected(row, col, YELLOW) >= 4) {
    score += 1000;
  }
  
  // Check if opponent can win next move, and block if needed
  const opponentRow = ROWS - 1 - columnHeights[col];
  if (countConnected(opponentRow, col, RED) >= 4) {
    score += 800;
  }
  
  // Score based on how many connected
  score += countConnected(row, col, YELLOW) * 50;
  
  return score;
}

function aiMove() {
  if (!gameActive) return;
  
  // Get valid moves
  const validMoves = [];
  for (let col = 0; col < COLS; col++) {
    if (columnHeights[col] < ROWS) {
      validMoves.push(col);
    }
  }
  
  if (validMoves.length === 0) return;
  
  let chosenCol;
  
  // 20% chance of making a mistake (random move)
  if (Math.random() < 0.2) {
    chosenCol = validMoves[Math.floor(Math.random() * validMoves.length)];
  } else {
    // Find the best move
    let bestScore = -Infinity;
    const bestMoves = [];
    
    for (const col of validMoves) {
      const score = evaluateMove(col);
      if (score > bestScore) {
        bestScore = score;
        bestMoves.length = 0;
        bestMoves.push(col);
      } else if (score === bestScore) {
        bestMoves.push(col);
      }
    }
    
    // Pick randomly among best moves to add some variety
    chosenCol = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
  
  dropPiece(chosenCol);
}

function updateStatus() {
  const playerName = currentPlayer === RED ? '1 (Red)' : '2 (Yellow)';
  statusEl.textContent = `Player ${playerName}'s turn`;
}

function finishGame(result) {
  gameActive = false;
  if (result === 'win') {
    const playerName = currentPlayer === RED ? '1 (Red)' : '2 (Yellow)';
    statusEl.textContent = `Player ${playerName} wins!`;
    scores[currentPlayer]++;
    scoreXEl.textContent = scores[RED];
    scoreOEl.textContent = scores[YELLOW];
  } else {
    statusEl.textContent = `It's a tie!`;
  }
}

function resetBoard() {
  board = Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
  currentPlayer = RED;
  gameActive = true;
  columnHeights = Array(COLS).fill(0);
  initializeBoard();
  updateStatus();
}

function resetScores() {
  scores = { 1: 0, 2: 0 };
  scoreXEl.textContent = '0';
  scoreOEl.textContent = '0';
}

// Event listeners
restartBtn.addEventListener('click', resetBoard);
resetScoresBtn.addEventListener('click', () => {
  resetScores();
  resetBoard();
});

// Initialize game
initializeBoard();
updateStatus();
