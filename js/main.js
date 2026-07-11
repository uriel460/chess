// main.js — Wires Engine and UI together

let state = Engine.initBoard();

UI.init();
UI.render(state);

UI.onMove((from, to, promotion) => {
  state = Engine.applyMove(state, from, to, promotion);
  UI.setLastMove(from, to);
  UI.resetSelection();
  UI.render(state);
});

UI.onNewGame(() => {
  state = Engine.initBoard();
  UI.setLastMove(null, null);
  UI.resetSelection();
  UI.render(state);
});
