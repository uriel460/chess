// history.js — pilha de navegação de jogadas (voltar/avançar)
// Não depende de DOM nem de Engine; só do formato do state que recebe.

const History = (() => {

  let stack = [];  // [{ state, move: {from,to} | null }, ...]
  let index = 0;

  function reset(state) {
    stack = [{ state, move: null }];
    index = 0;
  }

  function push(state, move) {
    stack = stack.slice(0, index + 1); // descarta "futuro" antigo
    stack.push({ state, move });
    index = stack.length - 1;
  }

  function goTo(i) {
    if (i < 0 || i >= stack.length) return null;
    index = i;
    return stack[index];
  }

  function undo() { return goTo(index - 1); }
  function redo() { return goTo(index + 1); }

  function canUndo() { return index > 0; }
  function canRedo() { return index < stack.length - 1; }

  function nav() {
    const tip = stack[stack.length - 1].state;
    return {
      moves:       tip.history,   // lista SAN completa da linha atual
      activeIndex: index - 1,    // índice do lance ativo (-1 = posição inicial)
      canUndo:     canUndo(),
      canRedo:     canRedo(),
    };
  }

  return { reset, push, goTo, undo, redo, canUndo, canRedo, nav };

})();
