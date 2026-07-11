# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

Open `index.html` directly in a browser — no build step, no server, no dependencies. All logic is vanilla JS loaded via `<script>` tags in order: `engine.js` → `ui.js` → `editor.js` → `main.js`.

## Architecture

Four modules with strict layering — `engine.js` has no DOM access, `ui.js` and `editor.js` call Engine but never mutate state directly, `main.js` owns the single mutable `state` reference and wires everything together.

```
engine.js  →  pure chess logic, returns new state objects (immutable pattern)
ui.js      →  DOM rendering + event handling for normal play, calls Engine for move validation
editor.js  →  DOM rendering + event handling for the position-setup mode (piece palette, board editing);
              sibling to ui.js — calls Engine directly, never calls into UI, and UI never calls into it
main.js    →  holds `state`, passes it to UI.render(), handles onMove/onNewGame/Editor.onStartFromPosition callbacks
```

### Board coordinate system

`board[row][col]` where `row 0 = rank 8 (black back rank)`, `row 7 = rank 1 (white back rank)`. Columns: `0=a … 7=h`. All Engine functions use `[row, col]` pairs, never algebraic notation internally.

### Engine state shape

```js
{
  board: Array(8)[Array(8)],        // null or { type, color }
  turn: 'white' | 'black',
  castlingRights: { white: { kingside, queenside }, black: { kingside, queenside } },
  enPassantTarget: [row, col] | null,
  halfMoveClock: number,
  fullMoveNumber: number,
  history: string[],                // SAN strings
}
```

State is never mutated — `applyMove` and `applyMoveRaw` always clone via `cloneState()` before modifying.

### Key Engine internals

- `getPseudoLegalMoves` — generates candidate moves without checking if they leave the king in check
- `getLegalMoves` — filters pseudo-legal moves through `isInCheck` on the resulting state; also validates castling path safety
- `applyMoveRaw` — low-level board mutation used internally for check detection (skips history/clock updates)
- `applyMove` — full move application: updates en passant target, castling rights, clocks, SAN history, switches turn

### UI highlights system

CSS classes added to square `<div>` elements: `selected` (yellow), `legal-move` (green dot), `legal-capture` (green ring), `last-from`/`last-to` (blue), `in-check` (red). The board is fully re-rendered on each `render()` call — no incremental updates.

### Testing scenarios (manual)

Scholar's Mate tests checkmate path: `1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#`. Also verify: en passant (capture only on the immediate next turn), queenside/kingside castling, pawn promotion modal, stalemate detection.

---

## Git workflow

- Ao concluir uma tarefa do PLANNING.md e eu confirmar que está OK, faça um commit com mensagem clara e específica (ex: "feat: adiciona validação de movimento do cavalo").
- NÃO faça commit automaticamente sem eu revisar e aprovar a mudança primeiro.
- Antes de cada commit, eu preciso ter testado a etapa manualmente no navegador e confirmado explicitamente que funciona (ex: "testei, funciona bem"). Não presuma que está OK só porque o código não tem erros óbvios ou "parece certo" — sempre aguarde minha confirmação de teste real antes de commitar.
- Se eu pedir uma lista de casos de teste para uma etapa, forneça-a antes de eu testar, mas ainda assim só commite depois da minha confirmação.
- NÃO dê git push a menos que eu peça explicitamente.
- Nunca faça commit de código que não roda ou está com erro conhecido.
- Cada commit deve corresponder a uma única etapa do PLANNING.md — evite juntar múltiplas tarefas num commit só.

## Regras de trabalho

- Implemente APENAS a tarefa pedida na mensagem atual. Não avance para a próxima etapa do PLANNING.md sem confirmação explícita.
- Ao terminar uma tarefa, pare e resuma o que foi feito antes de sugerir o próximo passo.
- Prefira diffs pequenos e específicos. Não refatore código não relacionado à tarefa.
- Se a tarefa parecer grande, proponha uma divisão antes de codar.
