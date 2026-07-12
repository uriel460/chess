// main.js — Wires Engine, History and UI together

let state = Engine.initBoard();
History.reset(state);

function renderAll() {
  UI.render(state, History.nav());
}

function goTo(entry) {
  if (!entry) return; // undo/redo/jump no limite: no-op
  state = entry.state;
  UI.setLastMove(entry.move ? entry.move.from : null, entry.move ? entry.move.to : null);
  UI.resetSelection();
  renderAll();
}

UI.init();
renderAll();
Editor.init();

UI.onMove((from, to, promotion) => {
  state = Engine.applyMove(state, from, to, promotion);
  History.push(state, { from, to });
  UI.setLastMove(from, to);
  UI.resetSelection();
  renderAll();
});

UI.onUndo(() => goTo(History.undo()));
UI.onRedo(() => goTo(History.redo()));
UI.onJumpToMove((sanIndex) => goTo(History.goTo(sanIndex + 1)));

UI.onNewGame(() => {
  state = Engine.initBoard();
  History.reset(state);
  UI.setLastMove(null, null);
  UI.resetSelection();
  renderAll();
});

Editor.onStartFromPosition((board, turn) => {
  state = Engine.createCustomState(board, turn);
  History.reset(state);
  UI.setLastMove(null, null);
  UI.resetSelection();
  renderAll();
});
