// ui.js — DOM rendering and user interaction
// Depends on Engine (engine.js) being loaded first.

const UI = (() => {

  // ── Piece symbols ─────────────────────────────────────────────────────────

  const SYMBOLS = {
    white: { king:'♚', queen:'♛', rook:'♜', bishop:'♝', knight:'♞', pawn:'♟' },
    black: { king:'♚', queen:'♛', rook:'♜', bishop:'♝', knight:'♞', pawn:'♟' },
  };

  // ── DOM references ────────────────────────────────────────────────────────

  const boardEl       = document.getElementById('board');
  const rankLabelsEl  = document.getElementById('rank-labels');
  const fileLabelsEl  = document.getElementById('file-labels');
  const turnEl        = document.getElementById('turn-indicator');
  const statusEl      = document.getElementById('status-message');
  const historyBody   = document.getElementById('history-body');
  const newGameBtn    = document.getElementById('new-game-btn');
  const undoBtn       = document.getElementById('undo-btn');
  const redoBtn       = document.getElementById('redo-btn');
  const promoOverlay  = document.getElementById('promotion-overlay');
  const promoChoices  = document.getElementById('promotion-choices');
  const setupOverlay  = document.getElementById('setup-overlay');

  // ── Internal state ────────────────────────────────────────────────────────

  let selected   = null; // [row, col] of selected square, or null
  let legalDests = [];   // [[row,col], ...] for the selected piece
  let lastMove   = null; // { from: [r,c], to: [r,c] }
  let onMoveCb   = null; // callback(from, to, promotion)
  let onJumpCb   = null; // callback(sanIndex)

  // ── Board rendering ───────────────────────────────────────────────────────

  function buildStaticLabels() {
    for (let r = 0; r < 8; r++) {
      const span = document.createElement('span');
      span.textContent = 8 - r;
      rankLabelsEl.appendChild(span);
    }
    for (let c = 0; c < 8; c++) {
      const span = document.createElement('span');
      span.textContent = 'abcdefgh'[c];
      fileLabelsEl.appendChild(span);
    }
  }

  function renderBoard(gameState) {
    boardEl.innerHTML = '';

    const inCheckColor  = Engine.isInCheck(gameState, gameState.turn) ? gameState.turn : null;
    const kingPos       = inCheckColor ? findKing(gameState, inCheckColor) : null;
    const legalSet      = new Set(legalDests.map(([r, c]) => `${r},${c}`));

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = document.createElement('div');
        sq.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = row;
        sq.dataset.col = col;

        // Highlights
        if (selected && selected[0] === row && selected[1] === col)
          sq.classList.add('selected');

        if (lastMove) {
          if (lastMove.from[0] === row && lastMove.from[1] === col) sq.classList.add('last-from');
          if (lastMove.to[0]   === row && lastMove.to[1]   === col) sq.classList.add('last-to');
        }

        if (kingPos && kingPos[0] === row && kingPos[1] === col)
          sq.classList.add('in-check');

        if (legalSet.has(`${row},${col}`)) {
          const piece = gameState.board[row][col];
          sq.classList.add(piece ? 'legal-capture' : 'legal-move');
        }

        // Piece
        const piece = gameState.board[row][col];
        if (piece) {
          const span = document.createElement('span');
          span.className = `piece piece-${piece.color}`;
          span.textContent = SYMBOLS[piece.color][piece.type];
          sq.appendChild(span);
        }

        sq.addEventListener('click', () => handleClick(row, col, gameState));
        boardEl.appendChild(sq);
      }
    }
  }

  function findKing(gameState, color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = gameState.board[r][c];
        if (p && p.type === 'king' && p.color === color) return [r, c];
      }
    return null;
  }

  // ── Click handling ────────────────────────────────────────────────────────

  function handleClick(row, col, gameState) {
    const status = Engine.getGameStatus(gameState);
    if (status === 'checkmate' || status === 'stalemate') return;

    const piece = gameState.board[row][col];

    // Case 1: no selection yet
    if (!selected) {
      if (!piece || piece.color !== gameState.turn) return;
      selected   = [row, col];
      legalDests = Engine.getLegalMoves(gameState, row, col);
      renderBoard(gameState);
      return;
    }

    // Case 2: clicked on another own piece → change selection
    if (piece && piece.color === gameState.turn) {
      selected   = [row, col];
      legalDests = Engine.getLegalMoves(gameState, row, col);
      renderBoard(gameState);
      return;
    }

    // Case 3: clicked on a legal destination → move
    const isLegal = legalDests.some(([r, c]) => r === row && c === col);
    if (isLegal) {
      const from = selected;
      const to   = [row, col];
      selected   = null;
      legalDests = [];

      const movingPiece = gameState.board[from[0]][from[1]];
      const isPromo = movingPiece.type === 'pawn' && (to[0] === 0 || to[0] === 7);

      if (isPromo) {
        showPromotionModal(movingPiece.color, (promoType) => {
          if (onMoveCb) onMoveCb(from, to, promoType);
        });
      } else {
        if (onMoveCb) onMoveCb(from, to, null);
      }
      return;
    }

    // Case 4: clicked on an invalid square → deselect
    selected   = null;
    legalDests = [];
    renderBoard(gameState);
  }

  // ── Promotion modal ───────────────────────────────────────────────────────

  function showPromotionModal(color, callback) {
    promoChoices.innerHTML = '';
    const options = ['queen', 'rook', 'bishop', 'knight'];
    for (const type of options) {
      const btn = document.createElement('button');
      btn.className   = 'promo-btn';
      btn.textContent = SYMBOLS[color][type];
      btn.title       = type;
      btn.addEventListener('click', () => {
        hidePromotionModal();
        callback(type);
      });
      promoChoices.appendChild(btn);
    }
    promoOverlay.classList.remove('hidden');
  }

  function hidePromotionModal() {
    promoOverlay.classList.add('hidden');
  }

  // ── Status panel ──────────────────────────────────────────────────────────

  function updateStatus(gameState) {
    const status = Engine.getGameStatus(gameState);
    const turn   = gameState.turn;

    const turnLabel = turn === 'white' ? '♔ Vez das Brancas' : '♚ Vez das Pretas';

    if (status === 'checkmate') {
      const winner = turn === 'white' ? 'Pretas vencem' : 'Brancas vencem';
      turnEl.textContent    = '🏁 Fim de jogo';
      statusEl.textContent  = `Xeque-Mate! ${winner}.`;
    } else if (status === 'stalemate') {
      turnEl.textContent    = '🏁 Fim de jogo';
      statusEl.textContent  = 'Afogamento — Empate!';
    } else if (status === 'check') {
      turnEl.textContent    = turnLabel;
      statusEl.textContent  = 'Xeque!';
    } else {
      turnEl.textContent    = turnLabel;
      statusEl.textContent  = '';
    }
  }

  function updateHistory(nav) {
    historyBody.innerHTML = '';
    const moves = nav.moves;

    function makeMoveCell(index) {
      const td = document.createElement('td');
      td.textContent = moves[index] || '';
      if (moves[index]) {
        td.classList.add('history-move');
        if (index === nav.activeIndex) td.classList.add('active');
        td.addEventListener('click', () => onJumpCb && onJumpCb(index));
      }
      return td;
    }

    for (let i = 0; i < moves.length; i += 2) {
      const tr  = document.createElement('tr');
      const num = document.createElement('td');
      num.textContent = Math.floor(i / 2) + 1 + '.';
      tr.appendChild(num);
      tr.appendChild(makeMoveCell(i));
      tr.appendChild(makeMoveCell(i + 1));
      historyBody.appendChild(tr);
    }
    historyBody.scrollTop = historyBody.scrollHeight;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function render(gameState, nav) {
    renderBoard(gameState);
    updateStatus(gameState);
    updateHistory(nav);
    undoBtn.disabled = !nav.canUndo;
    redoBtn.disabled = !nav.canRedo;
  }

  function setLastMove(from, to) {
    lastMove = from && to ? { from, to } : null;
  }

  function resetSelection() {
    selected   = null;
    legalDests = [];
  }

  function onMove(callback) {
    onMoveCb = callback;
  }

  function onNewGame(callback) {
    newGameBtn.addEventListener('click', callback);
  }

  function onUndo(callback) {
    undoBtn.addEventListener('click', callback);
  }

  function onRedo(callback) {
    redoBtn.addEventListener('click', callback);
  }

  function onJumpToMove(callback) {
    onJumpCb = callback;
  }

  function handleKeydown(e) {
    if (!promoOverlay.classList.contains('hidden')) return;
    if (!setupOverlay.classList.contains('hidden')) return;

    if (e.key === 'ArrowLeft')  { e.preventDefault(); undoBtn.click(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); redoBtn.click(); }
  }

  function init() {
    buildStaticLabels();
    document.addEventListener('keydown', handleKeydown);
  }

  return { init, render, setLastMove, resetSelection, onMove, onNewGame, onUndo, onRedo, onJumpToMove };

})();
