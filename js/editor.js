// editor.js — Position setup / editor mode UI
// Depends on Engine (engine.js) being loaded first. Sibling module to ui.js —
// never calls into UI, and ui.js never calls into this module.

const Editor = (() => {

  // ── Piece symbols ─────────────────────────────────────────────────────────

  const SYMBOLS = {
    white: { king:'♚', queen:'♛', rook:'♜', bishop:'♝', knight:'♞', pawn:'♟' },
    black: { king:'♚', queen:'♛', rook:'♜', bishop:'♝', knight:'♞', pawn:'♟' },
  };
  const PIECE_TYPES = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

  // ── DOM references ────────────────────────────────────────────────────────

  const overlayEl    = document.getElementById('setup-overlay');
  const boardEl      = document.getElementById('editor-board');
  const paletteEl    = document.getElementById('piece-palette');
  const setupModeBtn = document.getElementById('setup-mode-btn');
  const cancelBtn    = document.getElementById('cancel-setup-btn');
  const turnBtns     = document.querySelectorAll('.turn-btn');
  const clearBtn     = document.getElementById('clear-board-btn');
  const resetBtn     = document.getElementById('reset-board-btn');
  const startBtn     = document.getElementById('start-position-btn');
  const errorEl      = document.getElementById('setup-error');

  // ── Internal state ────────────────────────────────────────────────────────

  let editorBoard          = Engine.createEmptyBoard();
  let editorTurn           = 'white';
  let selectedPalettePiece = null; // { type, color } or null
  let onStartCb            = null; // callback(board, turn)

  // ── Board rendering ───────────────────────────────────────────────────────

  function renderEditorBoard() {
    boardEl.innerHTML = '';

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = document.createElement('div');
        sq.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');

        const piece = editorBoard[row][col];
        if (piece) {
          const span = document.createElement('span');
          span.className = `piece piece-${piece.color}`;
          span.textContent = SYMBOLS[piece.color][piece.type];
          sq.appendChild(span);
        }

        sq.addEventListener('click', () => handleEditorClick(row, col));
        boardEl.appendChild(sq);
      }
    }
  }

  function handleEditorClick(row, col) {
    if (selectedPalettePiece) {
      editorBoard[row][col] = { ...selectedPalettePiece };
    } else if (editorBoard[row][col]) {
      editorBoard[row][col] = null;
    } else {
      return;
    }
    renderEditorBoard();
  }

  // ── Palette ───────────────────────────────────────────────────────────────

  function renderPalette() {
    paletteEl.innerHTML = '';
    for (const color of ['white', 'black']) {
      for (const type of PIECE_TYPES) {
        const btn = document.createElement('button');
        btn.className   = `palette-piece piece-${color}`;
        btn.textContent = SYMBOLS[color][type];
        btn.title       = `${type} (${color})`;
        btn.addEventListener('click', () => selectPaletteItem(type, color, btn));
        paletteEl.appendChild(btn);
      }
    }
  }

  function selectPaletteItem(type, color, btn) {
    const isSame = selectedPalettePiece
      && selectedPalettePiece.type === type
      && selectedPalettePiece.color === color;

    paletteEl.querySelectorAll('.palette-piece.selected')
      .forEach(el => el.classList.remove('selected'));

    if (isSame) {
      selectedPalettePiece = null;
    } else {
      selectedPalettePiece = { type, color };
      btn.classList.add('selected');
    }
  }

  // ── Turn selector ─────────────────────────────────────────────────────────

  function renderTurnSelector() {
    turnBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.turn === editorTurn));
  }

  function selectTurn(turn) {
    editorTurn = turn;
    renderTurnSelector();
  }

  // ── Board actions ─────────────────────────────────────────────────────────

  function clearBoard() {
    editorBoard = Engine.createEmptyBoard();
    clearError();
    renderEditorBoard();
  }

  function resetToInitialPosition() {
    editorBoard = Engine.initBoard().board;
    clearError();
    renderEditorBoard();
  }

  function handleStart() {
    const validation = Engine.validateSetupPosition(editorBoard, editorTurn);
    if (!validation.valid) {
      showError(validation.reason);
      return;
    }
    hide();
    if (onStartCb) onStartCb(editorBoard, editorTurn);
  }

  // ── Error message ─────────────────────────────────────────────────────────

  function showError(message) {
    errorEl.textContent = message;
  }

  function clearError() {
    errorEl.textContent = '';
  }

  // ── Show / hide ───────────────────────────────────────────────────────────

  function show() {
    editorBoard          = Engine.createEmptyBoard();
    editorTurn           = 'white';
    selectedPalettePiece = null;
    paletteEl.querySelectorAll('.palette-piece.selected')
      .forEach(el => el.classList.remove('selected'));
    clearError();
    renderTurnSelector();
    overlayEl.classList.remove('hidden');
    renderEditorBoard();
  }

  function hide() {
    overlayEl.classList.add('hidden');
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function init() {
    renderPalette();
    renderTurnSelector();
    setupModeBtn.addEventListener('click', show);
    cancelBtn.addEventListener('click', hide);
    turnBtns.forEach(btn => btn.addEventListener('click', () => selectTurn(btn.dataset.turn)));
    clearBtn.addEventListener('click', clearBoard);
    resetBtn.addEventListener('click', resetToInitialPosition);
    startBtn.addEventListener('click', handleStart);
  }

  function onStartFromPosition(callback) {
    onStartCb = callback;
  }

  return { init, show, hide, onStartFromPosition };

})();
