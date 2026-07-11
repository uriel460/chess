# Plano: Jogo de Xadrez — Fase 2 (Editor de Posição)

## Contexto

A Fase 1 (tabuleiro + 2 jogadores locais, roque, en passant, promoção, xeque-mate/stalemate) está completa. Nova necessidade: permitir montar livremente uma posição no tabuleiro (colocar/remover peças, escolher de quem é a vez) e continuar uma partida normal a partir dali — sem depender de FEN, apenas edição visual via paleta de peças.

Decisões de design:
- **Interação**: paleta lateral com as 12 peças (6 tipos × 2 cores). Clicar numa peça da paleta a "seleciona"; clicar numa casa do tabuleiro coloca essa peça lá (sobrescrevendo o que houver). Clicar numa casa ocupada sem nenhuma peça selecionada na paleta remove a peça daquela casa.
- **Estado inicial do editor**: sempre abre com tabuleiro vazio.
- Sem importação/exportação de FEN — fora de escopo.
- Sem input manual de direitos de roque — são derivados automaticamente da posição de reis/torres.

---

## Estrutura de Arquivos (adição)

```
Game/
├── index.html          # + botão "Editar Posição" + painel #setup-panel
├── css/
│   └── style.css       # + estilos do painel/paleta do editor
└── js/
    ├── engine.js       # + createEmptyBoard, createCustomState, validateSetupPosition
    ├── ui.js           # inalterado
    ├── editor.js       # NOVO — renderização/interação do modo de edição de posição
    └── main.js         # + wiring do Editor
```

> **Por que um módulo `editor.js` separado?** `ui.js` já é 100% dedicado ao jogo normal (renderBoard, handleClick, promoção). Colocar a lógica do editor ali quase dobraria o arquivo e misturaria duas responsabilidades. `editor.js` é um módulo irmão de `ui.js`: chama `Engine` diretamente, nunca depende de `ui.js`. Ordem dos scripts: `engine.js` → `ui.js` → `editor.js` → `main.js`.

---

## engine.js — novas funções puras

| Função | Descrição |
|--------|-----------|
| `createEmptyBoard()` | Retorna board 8×8 todo `null` |
| `createCustomState(board, turn)` | Monta state completo a partir de board arbitrário + cor que joga |
| `validateSetupPosition(board, turn)` | `{valid: true}` ou `{valid: false, reason}` |

### Regras de `createCustomState`
- `castlingRights` derivados automaticamente: kingside/queenside de uma cor só ficam `true` se o rei e a torre correspondente ainda estão nas casas de origem (e1/h1/a1 brancas, e8/h8/a8 pretas)
- `enPassantTarget: null`, `halfMoveClock: 0`, `fullMoveNumber: 1`, `history: []`
- Segue o mesmo padrão de formato/clonagem de `initBoard`/`cloneState`

### Regras de `validateSetupPosition`
- Exatamente 1 rei branco e 1 rei preto no tabuleiro
- Nenhum peão na fileira 1 (row 7) ou fileira 8 (row 0)
- O lado que **não** vai jogar não pode estar em xeque (usa `isInCheck` já existente)

---

## editor.js — Interface do Editor

### Renderização
- `renderEditorBoard(board)` — mesma estrutura visual de `.square`/`.piece` do `ui.js` (glifos Unicode, cores claro/escuro), sem highlights de legal-move/xeque
- Paleta: 12 botões (`.palette-piece`), um por tipo+cor, com o glifo Unicode

### Interação
- Clique numa peça da paleta → seleciona (destaque visual)
- Clique numa casa do tabuleiro:
  - com peça selecionada na paleta → coloca/sobrescreve
  - sem seleção + casa ocupada → remove a peça
- Seletor "Quem joga": Brancas / Pretas
- Botões: "Limpar tabuleiro", "Posição Inicial" (via `Engine.initBoard().board`), "Iniciar Partida", "Cancelar"
- Iniciar Partida chama `Engine.validateSetupPosition`; se inválido, mostra mensagem de erro no painel e não prossegue

### API pública
- `{ init, show, hide, onStartFromPosition }`
- `show()`/`hide()` alternam a visibilidade do `#setup-panel`, tratados inteiramente dentro de `editor.js`
- `onStartFromPosition(cb)` — `cb(board, turn)` chamado só após validação bem-sucedida

---

## index.html — marcação nova

- Botão "Editar Posição" ao lado de `#new-game-btn`
- `#setup-panel` (oculto por padrão via classe, mesmo padrão do `.hidden` do overlay de promoção):
  - Paleta de peças (12 botões com `data-type`/`data-color`)
  - Seletor de turno (Brancas/Pretas)
  - Botões de ação (Limpar, Posição Inicial, Iniciar Partida, Cancelar)
  - Área de mensagem de erro

---

## main.js — Orquestrador (adição)

```js
Editor.init();

Editor.onStartFromPosition((board, turn) => {
  state = Engine.createCustomState(board, turn);
  UI.setLastMove(null, null);
  UI.resetSelection();
  UI.render(state);
});
```

---

## Verificação (como testar ao final)

1. Abrir editor → paleta aparece, tabuleiro vazio
2. Colocar os dois reis + peças aleatórias → "Iniciar Partida" funciona e a partida continua normalmente
3. Tentar iniciar sem os dois reis → bloqueado com mensagem de erro
4. Tentar iniciar com o lado que não joga em xeque → bloqueado com mensagem de erro
5. Testar "Limpar tabuleiro" e "Posição Inicial" dentro do editor
6. Testar "Cancelar" → volta pro jogo sem alterar o `state` atual
7. Roque só funciona se rei/torre estavam nas casas de origem; en passant não disponível logo após o setup

---

## Ordem de Implementação

1. `engine.js` — `createEmptyBoard`, `createCustomState`, `validateSetupPosition`
2. `index.html` + `css/style.css` — botão "Editar Posição", painel `#setup-panel`, paleta, estilos
3. `editor.js` — renderização do tabuleiro do editor, clique de colocar/remover peça, paleta
4. `editor.js` — seletor de turno, botões Limpar/Posição Inicial, validação e mensagem de erro
5. `main.js` — wiring do `Editor.onStartFromPosition`
