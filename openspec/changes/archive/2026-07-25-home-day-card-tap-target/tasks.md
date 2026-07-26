# Implementation Tasks: O cabeçalho inteiro do card de dia abre e fecha o treino, com o chevron junto do nome

**Change ID:** `home-day-card-tap-target`

---

## Phase 1: Estrutura (markup)

- [x] 1.1 Em `HomePage.tsx`, trocar o `<button className="chev-btn">` por um
      elemento não interativo, mantendo o glifo, a classe `day-chev` e o giro no
      estado aberto. Remover o `aria-label` junto com o botão — o estado já é
      anunciado pelo `aria-expanded` do cabeçalho, e um rótulo órfão passaria a
      descrever um elemento que não é mais um controle ✓ 2026-07-25
- [x] 1.2 Mover o chevron de `.day-actions` para dentro do `.day-head-main`,
      depois do `.day-title`, de modo que a primeira linha passe a ser nome à
      esquerda e indicador à direita ✓ 2026-07-25
- [x] 1.3 Conferir que o glifo segue `aria-hidden`, para que o nome acessível do
      botão continue sendo apenas o nome do dia mesmo com o chevron dentro dele
      ✓ 2026-07-25
- [x] 1.4 Conferir que `.day-head-main` continua sendo o **único** botão de
      expandir, com `aria-expanded` e o nome do dia ✓ 2026-07-25 — **com um
      desvio**: o `onClick` foi para o container `.day-head`, e o botão ficou
      sem manipulador próprio. Ver "Decisões" abaixo
- [x] 1.5 Verificar que nenhum outro ponto do código depende do chevron ser um
      botão ou de sua posição (busca por `chev-btn` e `day-chev` em código, CSS e
      testes; `.day-start` mora em `session.css`, não em `home.css`) ✓ 2026-07-25
- [x] 1.6 (extra) `stopPropagation` no botão Iniciar/Continuar, consequência
      direta de 1.4 ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Nenhum `<button>` aninhado dentro de outro no cabeçalho
- [x] O nome acessível do botão do cabeçalho é só o nome do dia (fixado em teste)

---

## Phase 2: Layout da primeira linha (CSS)

- [x] 2.1 `.day-head-main` deixa de ser `display: block` e passa a distribuir
      nome e indicador em lados opostos da primeira linha, sem alterar a altura
      do cabeçalho ✓ 2026-07-25
- [x] 2.2 Alinhar o chevron de propósito: `align-items: baseline` no lugar de
      `center`, para que num nome de duas linhas ele acompanhe a **primeira**
      em vez de flutuar no meio do bloco ✓ 2026-07-25
- [x] 2.3 Impedir que o chevron encolha quando o nome é longo — `.png-ic` já traz
      `flex-shrink: 0`, e o `flex: 1; min-width: 0` foi para o `.day-title`, que é
      quem deve ceder ✓ 2026-07-25
- [x] 2.4 Remover a regra `.chev-btn` e pinar o tamanho do glifo em
      `calc(var(--fs-2xs) * 0.85)` ✓ 2026-07-25 — o `0.85em` anterior resolvia
      contra o `font-size` do `.chev-btn`; sem esse pai, o em passaria a resolver
      contra o corpo do texto e o glifo dispararia de tamanho
- [x] 2.5 Conferir a segunda linha agora que ela perdeu um item: `.day-actions`
      com um filho só, o `margin-left: auto` ainda alinhando o Iniciar à direita,
      e o pill mantendo a aparência definida em `session.css:129-169`
      ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] Nenhum valor de cor ou tamanho fora dos tokens existentes
- [x] Tamanho do glifo preservado por construção (mesmo valor computado de antes)
- [x] Altura do cabeçalho e alinhamento do chevron com nome de duas linhas
      ✓ 2026-07-25 (conferido em navegador)

---

## Phase 3: Alcance do toque (CSS)

- [x] 3.1 `onClick` no `.day-head`, que é **irmão** da lista de exercícios e não
      seu ancestral — é isso que faz o alcance parar no cabeçalho ✓ 2026-07-25
- [x] 3.2 ~~Estender o alcance por um pseudo-elemento~~ → **descartado**, porque
      não seria testável. Ver "Decisões" ✓ 2026-07-25
- [x] 3.3 ~~Elevar `.day-actions` acima da camada~~ → não se aplica; o Iniciar
      usa `stopPropagation` (1.6) ✓ 2026-07-25
- [x] 3.4 ~~Empilhamento com a faixa vermelha~~ → não se aplica; sem camada
      sobreposta, `z-index` e `overflow` ficam intocados ✓ 2026-07-25
- [x] 3.5 Estado de foco desenhado sobre o cabeçalho inteiro, com
      `:has(.day-head-main:focus-visible)` — `:focus-within` acenderia o card
      também quando o foco caísse no Iniciar. `outline` em vez de `border`, para
      não deslocar o layout ✓ 2026-07-25
- [x] 3.6 `cursor: pointer` no cabeçalho, herdado pelo botão ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] O alcance para no cabeçalho — fixado por teste (tocar num exercício de um
      dia aberto não o recolhe)
- [x] Nenhum valor de cor ou tamanho fora dos tokens existentes
- [x] Faixa vermelha visível em card fechado, aberto e destacado ✓ 2026-07-25
      (conferido em navegador; nada no empilhamento havia mudado)

---

## Phase 4: Testes

Todos em `src/features/home/day-tap-target.integration.test.tsx` (7).

- [x] 4.1 Toque nas categorias (`.day-sub`) expande o dia — a região que hoje é
      morta e onde o olho pousa ✓ 2026-07-25
- [x] 4.2 Toque no avatar (`.day-ic`) expande o dia ✓ 2026-07-25
- [x] 4.3 Toque no chevron continua expandindo e recolhendo, e o teste também
      fixa que ele saiu de `.day-actions` e está dentro do botão do cabeçalho
      ✓ 2026-07-25
- [x] 4.4 Toque em Iniciar inicia o treino e **não** expande o dia — a regressão
      mais cara desta mudança ✓ 2026-07-25
- [x] 4.5 Com um dia aberto, tocar num exercício abre o exercício e não recolhe o
      dia ✓ 2026-07-25
- [x] 4.6 Cada dia expõe exatamente dois botões, e o do cabeçalho carrega o nome
      do dia e o `aria-expanded` correto ✓ 2026-07-25
- [x] 4.7 (extra) Toque no próprio `.day-head`, fora de qualquer filho — a única
      região que nenhum elemento interno cobre (o padding) ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] `npx vitest run` passa: 322/322 em 45 arquivos (eram 315 em 44)
- [x] `day-url` (7) e `home.integration` (1) passam **sem edição** — eles clicam
      no nome do dia, que continua dentro do alvo

---

## Phase 5: Integration & Polish

- [x] 5.1 Verificar em navegador com `--font-scale` a 100% e a 200%: com as
      categorias em duas linhas, o cabeçalho inteiro segue clicável e o Iniciar
      segue independente ✓ 2026-07-25
- [x] 5.2 Verificar o caso em que o Iniciar quebra para a própria linha (viewport
      estreito), previsto no requisito "Training Day Card" — agora ele quebra
      sozinho, sem o chevron a reboque ✓ 2026-07-25
- [x] 5.3 Conferir com o nome de dia mais longo dos dados reais, a 200%: o
      chevron não empurra o nome a quebrar antes do necessário ✓ 2026-07-25
- [x] 5.4 Percorrer a Home por teclado: duas paradas por dia, foco visível no
      cabeçalho, Enter e Espaço expandem ✓ 2026-07-25
- [x] 5.5 `npx vitest run` e `npm run build` completos ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] Todos os testes passam (322/322, 45 arquivos)
- [x] Análise estática limpa (`npx tsc -b --noEmit`)
- [x] `npm run build` OK
- [x] Conferência visual em navegador ✓ 2026-07-25

---

## Decisões tomadas durante a implementação

### 1.4 / 3.2 · O alcance é um `onClick` no container, não um pseudo-elemento

A proposta escolheu estender o botão por um `::after` posicionado (*stretched
link*) e rejeitou explicitamente pôr o manipulador no container. **A
implementação fez o contrário**, e o motivo apareceu ao escrever a Phase 4.

O alcance por pseudo-elemento existe **só em CSS**. O jsdom não faz layout nem
*hit testing*: um clique em `.day-sub` não encontraria o botão por baixo, porque
não há caminho no DOM entre os dois. Os testes que esta mudança mais precisa ter
— tocar nas categorias, no avatar, no padding — seriam impossíveis de escrever, e
o entregável central ficaria sem nenhuma cobertura automatizada.

Com o manipulador no `.day-head`, o clique **sobe pelo DOM** e é verificável.
Foi o que permitiu os 7 testes da Phase 4, incluindo o que fixa a regressão mais
cara (tocar em Iniciar não expande o dia).

O que **não** mudou em relação à proposta:

- a árvore de acessibilidade — a `<div>` não recebeu `role` nem `tabindex`, então
  não é exposta; o `.day-head-main` segue sendo o único controle de expandir, com
  nome e `aria-expanded`;
- o alcance para no cabeçalho, porque o `.day-head` é irmão da lista de
  exercícios, não seu ancestral.

O que mudou: o botão do cabeçalho ficou **sem `onClick` próprio** — ponteiro e
teclado produzem um clique que sobe até a `<div>`, e um segundo manipulador
alternaria duas vezes e se cancelaria —, e o Iniciar ganhou `stopPropagation`.
Esse é o custo declarado da abordagem: o alvo depende de o clique não ter
escapado, e é isso que o teste 4.4 fixa.

De quebra, dois riscos da proposta deixaram de existir: não há camada para
conflitar com a faixa vermelha, e a seleção de texto do nome do dia continua
possível.

### 2.4 · O tamanho do chevron precisou ser escrito por extenso

`.day-chev` usava `font-size: 0.85em`, e esse `em` resolvia contra o
`var(--fs-2xs)` do `.chev-btn`. Removido o botão, o `em` passaria a resolver
contra o corpo do texto e o glifo dispararia de tamanho. Virou
`calc(var(--fs-2xs) * 0.85)` — mesmo valor computado de antes, agora sem depender
de um pai que não existe mais.

---

## Pendências

Nenhuma. A conferência visual e por teclado (5.1–5.4, mais os dois itens de gate
que dependiam dela) foi feita em navegador em 2026-07-25.

Durante a implementação ela não foi possível: o Chromium do cache do Playwright
existe na máquina mas não sobe (`libnspr4.so` ausente), então nem uma captura de
tela saiu. O que dava para verificar sem navegador foi verificado na época —
comportamento do alvo em 7 testes de integração, tamanho do glifo preservado por
construção, e nenhum valor fora dos tokens.

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced (proposal reconciliada com a abordagem implementada)
- [x] QA visual (5.1–5.4) conferido em navegador antes de `/openspec-archive`
