// engine.js — Pure chess logic, no DOM access
// Board: board[row][col], row 0 = rank 8 (black), row 7 = rank 1 (white)
// Columns: 0=a ... 7=h

const Engine = (() => {

  // ── State ─────────────────────────────────────────────────────────────────

  function initBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRank = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
    for (let col = 0; col < 8; col++) {
      board[0][col] = { type: backRank[col], color: 'black' };
      board[1][col] = { type: 'pawn',        color: 'black' };
      board[6][col] = { type: 'pawn',        color: 'white' };
      board[7][col] = { type: backRank[col], color: 'white' };
    }
    return {
      board,
      turn: 'white',
      castlingRights: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true },
      },
      enPassantTarget: null, // [row, col] of capturable square
      halfMoveClock: 0,
      fullMoveNumber: 1,
      history: [],           // SAN strings
    };
  }

  function cloneState(state) {
    return {
      board: state.board.map(row => row.map(cell => cell ? { ...cell } : null)),
      turn: state.turn,
      castlingRights: {
        white: { ...state.castlingRights.white },
        black: { ...state.castlingRights.black },
      },
      enPassantTarget: state.enPassantTarget ? [...state.enPassantTarget] : null,
      halfMoveClock:   state.halfMoveClock,
      fullMoveNumber:  state.fullMoveNumber,
      history:         [...state.history],
    };
  }

  // ── Move generation ───────────────────────────────────────────────────────

  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  // All squares a piece can reach, ignoring whether it leaves the king in check.
  function getPseudoLegalMoves(state, row, col) {
    const piece = state.board[row][col];
    if (!piece) return [];

    const { board, enPassantTarget, castlingRights } = state;
    const { type, color } = piece;
    const opp = color === 'white' ? 'black' : 'white';
    const moves = [];

    const empty    = (r, c) => inBounds(r, c) && board[r][c] === null;
    const enemy    = (r, c) => inBounds(r, c) && board[r][c] !== null && board[r][c].color === opp;
    const freeOrEn = (r, c) => empty(r, c) || enemy(r, c);

    const slide = (dirs) => {
      for (const [dr, dc] of dirs) {
        let r = row + dr, c = col + dc;
        while (inBounds(r, c)) {
          if (board[r][c] === null) { moves.push([r, c]); }
          else { if (board[r][c].color === opp) moves.push([r, c]); break; }
          r += dr; c += dc;
        }
      }
    };

    if (type === 'pawn') {
      const dir      = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ?  6 :  1;
      if (empty(row + dir, col)) {
        moves.push([row + dir, col]);
        if (row === startRow && empty(row + 2 * dir, col))
          moves.push([row + 2 * dir, col]);
      }
      for (const dc of [-1, 1]) {
        const [tr, tc] = [row + dir, col + dc];
        if (enemy(tr, tc)) moves.push([tr, tc]);
        if (enPassantTarget && enPassantTarget[0] === tr && enPassantTarget[1] === tc)
          moves.push([tr, tc]);
      }
    }

    if (type === 'knight') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        if (freeOrEn(row + dr, col + dc)) moves.push([row + dr, col + dc]);
    }

    if (type === 'bishop' || type === 'queen') slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
    if (type === 'rook'   || type === 'queen') slide([[-1,0],[1,0],[0,-1],[0,1]]);

    if (type === 'king') {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        if (freeOrEn(row + dr, col + dc)) moves.push([row + dr, col + dc]);

      // Castling candidates (legality checks in getLegalMoves)
      const cr = color === 'white' ? 7 : 0;
      const rights = castlingRights[color];
      if (row === cr && col === 4) {
        const rookAt = (c) => board[cr][c] && board[cr][c].type === 'rook' && board[cr][c].color === color;
        if (rights.kingside  && empty(cr,5) && empty(cr,6) && rookAt(7)) moves.push([cr, 6]);
        if (rights.queenside && empty(cr,1) && empty(cr,2) && empty(cr,3) && rookAt(0)) moves.push([cr, 2]);
      }
    }

    return moves;
  }

  // Apply a move to the board only (used internally for check detection).
  function applyMoveRaw(state, fromRow, fromCol, toRow, toCol, promotion) {
    const ns = cloneState(state);
    const piece = ns.board[fromRow][fromCol];

    // En passant: pawn captures diagonally to an empty square
    if (piece.type === 'pawn' && fromCol !== toCol && ns.board[toRow][toCol] === null)
      ns.board[fromRow][toCol] = null;

    // Castling: relocate rook
    if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
      if (toCol === 6) { ns.board[fromRow][5] = ns.board[fromRow][7]; ns.board[fromRow][7] = null; }
      else             { ns.board[fromRow][3] = ns.board[fromRow][0]; ns.board[fromRow][0] = null; }
    }

    ns.board[toRow][toCol]     = promotion ? { type: promotion, color: piece.color } : { ...piece };
    ns.board[fromRow][fromCol] = null;
    return ns;
  }

  // ── Check detection ───────────────────────────────────────────────────────

  function isInCheck(state, color) {
    let kr = -1, kc = -1;
    outer: for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = state.board[r][c];
        if (p && p.type === 'king' && p.color === color) { kr = r; kc = c; break outer; }
      }
    if (kr === -1) return false;

    const opp = color === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = state.board[r][c];
        if (p && p.color === opp)
          if (getPseudoLegalMoves(state, r, c).some(([ar, ac]) => ar === kr && ac === kc))
            return true;
      }
    return false;
  }

  // ── Legal moves ───────────────────────────────────────────────────────────

  // Returns legal destinations for the piece at [row, col].
  // Does NOT enforce whose turn it is (turn enforcement is the UI's responsibility).
  function getLegalMoves(state, row, col) {
    const piece = state.board[row][col];
    if (!piece) return [];

    const legal = [];
    for (const [toRow, toCol] of getPseudoLegalMoves(state, row, col)) {
      // Castling extra checks: can't castle in or through check
      if (piece.type === 'king' && Math.abs(toCol - col) === 2) {
        if (isInCheck(state, piece.color)) continue;
        const passCol  = toCol === 6 ? 5 : 3;
        const passState = applyMoveRaw(state, row, col, row, passCol, null);
        if (isInCheck(passState, piece.color)) continue;
      }
      const after = applyMoveRaw(state, row, col, toRow, toCol, null);
      if (!isInCheck(after, piece.color)) legal.push([toRow, toCol]);
    }
    return legal;
  }

  function hasAnyLegalMoves(state, color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = state.board[r][c];
        if (p && p.color === color && getLegalMoves(state, r, c).length > 0) return true;
      }
    return false;
  }

  function isCheckmate(state, color) { return  isInCheck(state, color) && !hasAnyLegalMoves(state, color); }
  function isStalemate(state, color) { return !isInCheck(state, color) && !hasAnyLegalMoves(state, color); }

  function getGameStatus(state) {
    const { turn } = state;
    if (isCheckmate(state, turn)) return 'checkmate';
    if (isStalemate(state, turn)) return 'stalemate';
    if (isInCheck(state, turn))   return 'check';
    return 'playing';
  }

  // ── Algebraic notation (SAN) ──────────────────────────────────────────────

  const FILES      = 'abcdefgh';
  const PIECE_CHAR = { pawn:'', knight:'N', bishop:'B', rook:'R', queen:'Q', king:'K' };
  const PROMO_CHAR = { knight:'N', bishop:'B', rook:'R', queen:'Q' };

  function moveToSAN(state, from, to, promotion) {
    const [fromRow, fromCol] = from;
    const [toRow,   toCol  ] = to;
    const piece = state.board[fromRow][fromCol];

    if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2)
      return toCol === 6 ? 'O-O' : 'O-O-O';

    const isCapture = state.board[toRow][toCol] !== null ||
                      (piece.type === 'pawn' && fromCol !== toCol);
    const toSquare  = FILES[toCol] + (8 - toRow);

    // Disambiguation: find other same-type pieces that can also reach toSquare
    let dis = '';
    if (piece.type !== 'pawn') {
      const ambiguous = [];
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
          if (r === fromRow && c === fromCol) continue;
          const p = state.board[r][c];
          if (p && p.type === piece.type && p.color === piece.color)
            if (getLegalMoves(state, r, c).some(([mr, mc]) => mr === toRow && mc === toCol))
              ambiguous.push([r, c]);
        }
      if (ambiguous.length > 0) {
        const sameFile = ambiguous.some(([, c]) => c === fromCol);
        const sameRank = ambiguous.some(([r])   => r === fromRow);
        if      (!sameFile) dis = FILES[fromCol];
        else if (!sameRank) dis = String(8 - fromRow);
        else                dis = FILES[fromCol] + String(8 - fromRow);
      }
    }

    let san = PIECE_CHAR[piece.type] + dis;
    if (piece.type === 'pawn' && isCapture) san += FILES[fromCol];
    if (isCapture) san += 'x';
    san += toSquare;
    if (promotion) san += '=' + PROMO_CHAR[promotion];

    // Check / checkmate suffix
    const after = applyMoveRaw(state, fromRow, fromCol, toRow, toCol, promotion);
    const opp   = piece.color === 'white' ? 'black' : 'white';
    if (isInCheck(after, opp))
      san += hasAnyLegalMoves(after, opp) ? '+' : '#';

    return san;
  }

  // ── Full move application ─────────────────────────────────────────────────

  function applyMove(state, from, to, promotion = null) {
    const [fromRow, fromCol] = from;
    const [toRow,   toCol  ] = to;
    const piece    = state.board[fromRow][fromCol];
    const captured = state.board[toRow][toCol];

    const ns = applyMoveRaw(state, fromRow, fromCol, toRow, toCol, promotion);

    // En passant target for the next move
    ns.enPassantTarget = (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2)
      ? [(fromRow + toRow) / 2, fromCol]
      : null;

    // Castling rights
    if (piece.type === 'king') {
      ns.castlingRights[piece.color].kingside  = false;
      ns.castlingRights[piece.color].queenside = false;
    }
    const rookSquares = [
      [7, 0, 'white', 'queenside'], [7, 7, 'white', 'kingside'],
      [0, 0, 'black', 'queenside'], [0, 7, 'black', 'kingside'],
    ];
    for (const [r, c, clr, side] of rookSquares) {
      if ((piece.type === 'rook' && fromRow === r && fromCol === c) ||
          (captured && captured.type === 'rook' && toRow === r && toCol === c))
        ns.castlingRights[clr][side] = false;
    }

    // Clocks
    const isCapture = captured !== null || (piece.type === 'pawn' && fromCol !== toCol);
    ns.halfMoveClock  = (piece.type === 'pawn' || isCapture) ? 0 : state.halfMoveClock + 1;
    ns.fullMoveNumber = state.turn === 'black' ? state.fullMoveNumber + 1 : state.fullMoveNumber;

    // History and turn switch
    ns.history = [...state.history, moveToSAN(state, from, to, promotion)];
    ns.turn    = state.turn === 'white' ? 'black' : 'white';

    return ns;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    initBoard,
    getLegalMoves,   // (state, row, col) → [[row,col], ...]
    applyMove,       // (state, [fromRow,fromCol], [toRow,toCol], promotion?) → newState
    isInCheck,       // (state, color) → bool
    isCheckmate,     // (state, color) → bool
    isStalemate,     // (state, color) → bool
    getGameStatus,   // (state) → 'playing'|'check'|'checkmate'|'stalemate'
  };

})();
