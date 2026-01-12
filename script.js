const statusEl = document.getElementById('status');
const boardEl = document.getElementById('board');
const cells = Array.from(document.querySelectorAll('.cell'));
const restartBtn = document.getElementById('restart');
const resetScoresBtn = document.getElementById('resetScores');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');

let board = Array(9).fill('');
let currentPlayer = 'X';
let gameActive = true;
let scores = { X: 0, O: 0 };

const winningCombos = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function updateStatus(text){ statusEl.textContent = text }

function handleCellClick(e){
  const idx = Number(e.currentTarget.dataset.index);
  if(!gameActive || board[idx] || e.currentTarget.dataset.locked === 'true') return;
  e.currentTarget.dataset.locked = 'true';
  spawnPiece(idx, currentPlayer, e.currentTarget);
}

// Create a falling piece that uses a simple physics sim (gravity + bounce)
function spawnPiece(idx, player, cellEl){
  const boardRect = boardEl.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();
  const pw = Math.floor(cellRect.width * 0.9);
  const ph = Math.floor(cellRect.height * 0.9);
  const startX = cellRect.left - boardRect.left + (cellRect.width - pw) / 2;
  const startY = -ph - 20;
  const targetY = cellRect.top - boardRect.top + (cellRect.height - ph) / 2;

  const piece = document.createElement('div');
  piece.className = 'piece ' + (player === 'X' ? 'x' : 'o');
  piece.style.width = pw + 'px';
  piece.style.height = ph + 'px';
  piece.style.left = startX + 'px';
  piece.style.top = startY + 'px';
  piece.style.fontSize = Math.floor(pw * 0.55) + 'px';
  piece.textContent = player;
  boardEl.appendChild(piece);

  let y = startY;
  let vy = 0;
  const g = 3000; // px/s^2
  const bounce = 0.45;
  let last = performance.now();

  function tick(now){
    const dt = Math.min(0.05, (now - last) / 1000); // cap dt
    last = now;
    vy += g * dt;
    y += vy * dt;
    if(y >= targetY){
      y = targetY;
      vy = -vy * bounce;
      if(Math.abs(vy) < 80){
        // settle
        piece.style.top = targetY + 'px';
        finalize();
        return;
      }
    }
    piece.style.top = y + 'px';
    requestAnimationFrame(tick);
  }

  function finalize(){
    // place the mark in the cell DOM and state
    board[idx] = player;
    cellEl.textContent = player;
    cellEl.classList.add(player === 'X' ? 'x' : 'o');
    cellEl.dataset.locked = '';
    // remove the floating piece after a tiny delay so it feels natural
    setTimeout(() => { if(piece.parentNode) piece.parentNode.removeChild(piece); }, 50);
    checkResult();
  }

  requestAnimationFrame(tick);
}

function checkResult(){
  for(const combo of winningCombos){
    const [a,b,c] = combo;
    if(board[a] && board[a] === board[b] && board[a] === board[c]){
      finishGame('win', combo);
      return;
    }
  }
  if(board.every(Boolean)){
    finishGame('tie');
    return;
  }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus(`Player ${currentPlayer}'s turn`);
}

function finishGame(result, combo){
  gameActive = false;
  if(result === 'win'){
    combo.forEach(i => cells[i].classList.add('win'));
    updateStatus(`Player ${currentPlayer} wins!`);
    scores[currentPlayer] += 1;
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
  } else {
    updateStatus(`It's a tie!`);
  }
}

function resetBoard(keepStarter=false){
  board.fill('');
  cells.forEach(c => { c.textContent = ''; c.classList.remove('x','o','win'); c.dataset.locked = ''; });
  // remove any floating pieces
  Array.from(boardEl.querySelectorAll('.piece')).forEach(p => p.remove());
  gameActive = true;
  if(!keepStarter) currentPlayer = 'X';
  updateStatus(`Player ${currentPlayer}'s turn`);
}

function resetScores(){
  scores = { X: 0, O: 0 };
  scoreXEl.textContent = '0';
  scoreOEl.textContent = '0';
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartBtn.addEventListener('click', () => resetBoard(true));
resetScoresBtn.addEventListener('click', () => { resetScores(); resetBoard(true); });

updateStatus(`Player ${currentPlayer}'s turn`);
