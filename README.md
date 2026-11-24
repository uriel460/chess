# ♟️ Xadrez

Jogo de xadrez para dois jogadores no mesmo computador, feito em HTML, CSS e JavaScript puro. Não precisa instalar nada, não tem build e não depende de nenhum servidor: é só abrir no navegador e jogar.

## Como jogar

### Opção 1: baixar e abrir

1. Baixe o projeto:
   ```bash
   git clone https://github.com/uriel460/chess.git
   ```
   Ou, no GitHub, clique em **Code → Download ZIP** e extraia o arquivo.
2. Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Firefox, Edge, Safari).

Pronto, o jogo já está rodando.

### Opção 2: jogar online (GitHub Pages)

Como o projeto é só HTML/CSS/JS estático, dá para publicá-lo de graça pelo GitHub Pages:

1. No repositório do GitHub, vá em **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**, selecione a branch `main` e a pasta `/ (root)`.
3. Salve. Em alguns minutos o jogo fica disponível em `https://uriel460.github.io/chess/`.

Depois é só mandar esse link para quem quiser jogar.

## Funcionalidades

- **Regras completas do xadrez**
  - Movimentos de todas as peças, com validação de jogadas legais
  - Roque pequeno e grande
  - En passant (só vale no lance imediatamente seguinte)
  - Promoção de peão, com escolha da peça
  - Detecção de xeque, xeque-mate e afogamento (stalemate)
- **Destaques visuais**: peça selecionada, casas de destino possíveis, capturas, último lance e rei em xeque
- **Histórico de lances** em notação algébrica (SAN)
- **Navegação pela partida**
  - Botões **◀ Voltar** e **Avançar ▶**, ou as setas **←** e **→** do teclado
  - Clicar num lance do histórico leva direto para aquela posição
  - Jogar um lance novo depois de voltar descarta os lances seguintes
- **Editor de posição**: monte qualquer posição no tabuleiro e comece a jogar a partir dela
- **Inverter tabuleiro**: veja o jogo do ponto de vista das pretas

## Como usar

| Ação | Como fazer |
|------|------------|
| Mover uma peça | Clique na peça e depois na casa de destino |
| Promover um peão | Ao chegar na última fileira, escolha a peça na janela que aparece |
| Voltar/avançar lances | Botões ◀ / ▶ ou setas ← / → do teclado |
| Ir para um lance específico | Clique no lance na tabela de histórico |
| Começar de novo | **Nova Partida** |
| Virar o tabuleiro | **Inverter Tabuleiro** |

### Editor de posição

1. Clique em **Editar Posição** (o editor abre com o tabuleiro vazio).
2. Clique numa peça da paleta para selecioná-la e depois clique nas casas onde quer colocá-la.
3. Para remover uma peça, desmarque a peça da paleta e clique na casa ocupada.
4. Escolha quem joga primeiro: **Brancas jogam** ou **Pretas jogam**.
5. Clique em **Iniciar Partida**.

Atalhos do editor: **Limpar Tabuleiro**, **Posição Inicial**, **Inverter Tabuleiro** e **Cancelar**.

Para a posição ser aceita, ela precisa ter exatamente um rei de cada cor, nenhum peão na primeira ou na última fileira, e o lado que **não** vai jogar não pode estar em xeque. Os direitos de roque são definidos automaticamente: só valem se o rei e a torre estiverem nas casas iniciais.

## Estrutura do projeto

```
├── index.html        # página do jogo
├── css/
│   └── style.css     # estilos
└── js/
    ├── engine.js     # regras do xadrez (lógica pura, sem DOM)
    ├── history.js    # pilha de desfazer/refazer
    ├── ui.js         # renderização do tabuleiro e interação na partida
    ├── editor.js     # editor de posição
    └── main.js       # liga os módulos e guarda o estado do jogo
```

A lógica do jogo (`engine.js`) é separada da interface: ela nunca altera o estado, sempre devolve um estado novo a cada lance. Isso deixa o desfazer/refazer simples e facilita testar as regras.

## Limitações conhecidas

- Só dá para jogar com duas pessoas no mesmo computador: não há modo contra o computador nem partida online.
- Não há importação nem exportação de posições em FEN/PGN.
- Regras de empate por repetição tripla, regra dos 50 lances e material insuficiente não são detectadas automaticamente.
