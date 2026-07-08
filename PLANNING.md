# Plano: Jogo de Xadrez — Fase 1 (Tabuleiro + 2 Jogadores Locais)

## Contexto

Criar um jogo de xadrez para web (HTML/CSS/JS puro) jogável no navegador sem instalação, com arquitetura separada entre lógica e interface para facilitar escalonamento futuro (IA, multiplayer, análise).

---

## Estrutura de Arquivos

```
Game/
├── index.html          # Shell HTML: carrega CSS e JS, define o layout
├── css/
│   └── style.css       # Tabuleiro, peças, highlights, modal de promoção
└── js/
    ├── engine.js       # Lógica pura de xadrez (sem DOM)
    ├── ui.js           # Renderização e eventos do DOM
    └── main.js         # Ponto de entrada: conecta engine ↔ ui
```

> **Por que separar engine de ui?** Quando chegarmos na Fase 2 (IA com Stockfish), o engine.js já estará pronto para ser chamado diretamente sem tocar na UI.

---

## engine.js — Lógica Pura

Responsabilidades (sem acesso ao DOM):

### Estado do jogo
- `board[8][8]` — matriz representando o tabuleiro (null ou `{type, color}`)
- `turn` — `'white'` | `'black'`
- `castlingRights` — `{ white: {kingside, queenside}, black: {kingside, queenside} }`
- `enPassantTarget` — casa alvo (ou null)
- `halfMoveClock`, `fullMoveNumber` — para regras de empate
- `history` — lista de movimentos em notação algébrica

### Funções principais

| Função | Descrição |
|--------|-----------|
| `initBoard()` | Retorna estado inicial |
| `getLegalMoves(state, from)` | Retorna array de casas de destino válidas para a peça em `from` |
| `applyMove(state, from, to, promotion?)` | Retorna novo estado após mover |
| `isInCheck(state, color)` | Bool |
| `isCheckmate(state, color)` | Bool |
| `isStalemate(state, color)` | Bool |
| `getGameStatus(state)` | `'playing'` \| `'check'` \| `'checkmate'` \| `'stalemate'` |

### Regras completas a implementar
- Movimentos básicos de cada peça
- Roque (kingside e queenside) — valida casa de passagem sob ataque
- En passant — captura do peão que acabou de avançar 2 casas
- Promoção de peão — escolha de peça via modal
- Detecção de xeque — filtra moves que deixam o rei em xeque
- Xeque-mate e empate por afogamento (stalemate)

---

## ui.js — Interface

### Renderização
- Tabuleiro: grid 8×8 com `<div>` por casa, cores alternadas via CSS
- Peças: caracteres Unicode (♙♘♗♖♕♔ / ♟♞♝♜♛♚) inseridos como texto no `<div>` da casa — simples, sem dependências externas, escalável para SVG depois
- Coordenadas (a-h, 1-8) nas bordas do tabuleiro

### Interação
- **Clique 1**: seleciona peça da vez → destaca casa selecionada + mostra casas legais
- **Clique 2**: se destino legal → executa move; se outra peça da vez → muda seleção; caso contrário → deseleciona
- Highlight de: casa selecionada (amarelo), movimentos legais (pontos verdes), último movimento (azul claro), rei em xeque (vermelho)

### Modal de Promoção
- Aparece quando peão chega na última fileira
- Botões: ♕ Rainha · ♖ Torre · ♗ Bispo · ♘ Cavalo

### Painel lateral
- Indicador de turno ("Vez das Brancas / Pretas")
- Status do jogo (Xeque! / Xeque-Mate! / Empate)
- Histórico de jogadas em notação algébrica (SAN)
- Botão "Nova Partida"

---

## main.js — Orquestrador

```js
// Fluxo principal
state = engine.initBoard()
ui.render(state)

ui.onSquareClick((from, to) => {
  if (to === null) {
    // seleção
    moves = engine.getLegalMoves(state, from)
    ui.highlight(from, moves)
  } else {
    // movimento
    state = engine.applyMove(state, from, to, promotion)
    ui.render(state)
    ui.updateStatus(engine.getGameStatus(state))
  }
})
```

---

## Verificação (como testar ao final)

1. Abrir `index.html` diretamente no navegador (sem servidor)
2. Checar cenários:
   - Peças se movem apenas para casas legais
   - Roque: rei e torre se posicionam corretamente
   - En passant: captura funciona no turno imediato após avanço duplo
   - Promoção: modal aparece, peça correta substitui o peão
   - Xeque: rei destacado em vermelho, só moves que saem do xeque são permitidos
   - Xeque-mate: jogo encerra, mensagem exibida (testar com Scholar's Mate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#)
   - Stalemate: jogo encerra com empate
   - Nova partida: reset completo do estado

---

## Ordem de Implementação

1. `engine.js` — estado inicial + movimentos básicos (sem regras especiais)
2. `ui.js` + `index.html` + `css/style.css` — tabuleiro visual e seleção/highlight
3. `engine.js` — detecção de xeque + filtro de movimentos legais
4. `engine.js` — roque, en passant, promoção
5. `engine.js` — xeque-mate e stalemate
6. `ui.js` — modal de promoção, painel de histórico, mensagens de fim de jogo
