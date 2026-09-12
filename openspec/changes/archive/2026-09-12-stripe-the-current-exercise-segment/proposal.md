# Proposal: O segmento atual vira uma barra de progresso listrada

**Change ID:** `stripe-the-current-exercise-segment`
**Created:** 2026-09-12
**Status:** Implementation Complete
**Completed:** 2026-09-12

---

## Problem Statement

Na barra de progresso segmentada da tela do exercício em sessão, o segmento
**atual** — o que diz em qual exercício você está — é hoje um **tom de vermelho
diluído** (`--bg-accent`, o accent a 16% de opacidade) sobre o fundo escuro do
app. Ele é difícil de ver.

E é difícil exatamente onde mais importa: essa barra tem 6 a 10 pixels de altura,
mora na barra fixa inferior, e é lida **de relance, no meio da série**, muitas
vezes com o celular no banco a dois metros. Um vermelho a 16% sobre `#1e2329` é
pouca diferença para essas condições — a distância entre "pendente" e "é aqui
que estou" fica menor do que o olho consegue separar sem parar para procurar.

O resultado é que a barra só responde bem a uma das duas perguntas que ela
existe para responder. "Quantos faltam?" ela responde — os concluídos são
sólidos e saltam. "Onde eu estou?" ela responde mal.

**Afetado:** quem está treinando, que é o único uso do app.

## Proposed Solution

Dar ao segmento atual a **mesma cor dos concluídos** — o vermelho cheio do app —
e distingui-lo deles pelo **movimento**: faixas diagonais correndo na
horizontal, como uma barra de carregamento — na cor do segmento *pendente*, de
modo que leiam como o trilho vazio aparecendo através do preenchimento.

- **cor cheia, não diluída.** Os dois estados que interessam de longe passam a
  usar a mesma tinta forte, e nenhum depende de enxergar uma diferença de
  opacidade;
- **listras em movimento dizem "aqui, e ainda não acabou".** Concluído é sólido
  e parado; atual é listrado e andando. A diferença deixa de ser de *tom* e
  passa a ser de *textura e movimento*, que é o que se enxerga de relance;
- **a altura maior continua** marcando o atual, como hoje.

A metáfora é deliberada: uma barra de carregamento quer dizer "isto está em
andamento". É exatamente o que o segmento atual significa — o exercício que
você está fazendo agora.

### Como fica cada estado

| Estado | Hoje | Proposto |
|---|---|---|
| Pendente | 6px, cinza | igual |
| **Atual, não concluído** | 10px, vermelho a 16% | **10px, vermelho cheio com listras cinza diagonais andando** |
| Concluído, não atual | 6px, vermelho cheio | igual |
| **Atual e concluído** | 10px, vermelho cheio | **10px, vermelho cheio — sólido, sem listras** |

O caso "atual e concluído" MUST continuar dizendo as duas coisas, e passa a
dizê-las melhor do que hoje: a altura diz "aqui", e o sólido *sem listras* diz
"e este já está feito". As listras ficam reservadas para o que está em
andamento, que é o que uma barra de carregamento significa.

## Scope

### In Scope
- A cor e a textura do segmento **atual** na barra de progresso segmentada da
  tela do exercício em sessão.
- A animação das listras, e o respeito a `prefers-reduced-motion`.

### Out of Scope
- **A geometria da barra** — onde ela mora, quantos segmentos tem, as alturas,
  o rótulo acessível, o fato de não ser tocável. Nada disso muda.
- **A barra de progresso do runner** e qualquer outro indicador do app.
- **Tornar o segmento tocável.** Continua sendo indicador, não controle.
- Mexer nos tokens de cor do app.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | — |
| API | Não | — |
| State | Não | — |
| UI | **Sim** | Só CSS: `.entry-seg.current` em `session.css`. O JSX não muda — as classes que ele já escreve bastam |

## Architecture Considerations

**Só CSS, e isso é uma escolha.** O JSX já escreve `entry-seg`, `done` e
`current` nas combinações certas; tudo o que falta é o que essas classes
pintam. As listras entram por um **pseudo-elemento**, sem elemento novo no DOM
— a barra é um desenho de uma frase que o rótulo acessível já diz, e os
segmentos são `aria-hidden`; acrescentar nós de marcação para um efeito visual
seria acrescentar estrutura que não significa nada.

**Animar `transform`, não `background-position`.** As duas produzem o mesmo
movimento, mas `background-position` repinta a cada quadro, enquanto `transform`
num pseudo-elemento é trabalho do compositor. Esta barra fica **na tela o treino
inteiro**, numa faixa fixa, com a tela segurada acesa pelo cronômetro de
descanso — é o pior caso possível para uma animação que repinta.

**O laço tem de fechar sem costura, e a diagonal complica a conta.** O período
de um gradiente é medido **perpendicular às faixas**, então um padrão inclinado
se repete numa distância horizontal *maior* do que a que ele se repete através de
si mesmo: o passo horizontal é o período dividido pelo seno do ângulo. Deslizar o
período cru — o que serviria para faixas verticais — deixa as listras a um terço
de período do fim e as faz pular a cada volta. É a única aritmética deste change,
e é a única forma de errar que não aparece numa captura de tela.

**`prefers-reduced-motion` não é opcional aqui.** Isto é um movimento perpétuo
no campo de visão, numa tela que o usuário encara entre séries por uma hora.
Quem pediu para reduzir movimento MUST ficar com as listras **paradas** — que
ainda distinguem atual de concluído, porque a diferença é de textura e não só de
animação. O app já tem esse precedente em `update.css`, com o mesmo raciocínio:
o efeito sai, a informação fica.

## Success Criteria

- [x] O segmento atual usa a mesma cor cheia dos concluídos
- [x] Ele carrega listras diagonais correndo na horizontal
- [x] Atual-e-concluído é sólido, sem listras, e continua mais alto
- [x] Com `prefers-reduced-motion: reduce`, as listras ficam paradas
- [x] A animação não repinta a cada quadro
- [x] Nada da geometria, do rótulo acessível ou do comportamento da barra muda

**Em que base.** Os quatro primeiros pela leitura das regras — a suíte roda com
`css: false` e não vê pintura — e depois pelo olho de quem pediu, que aprovou o
resultado na tela. O quinto por construção: a animação é `transform` num
pseudo-elemento, que é trabalho do compositor; não foi medido num profiler. O
sexto porque `entry-progress.integration.test.tsx` passou **sem uma linha de
edição**, e é ele que cobre geometria, rótulo e comportamento.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| As listras "pularem" a cada volta do laço | Média | Baixo | O deslocamento é um período exato do padrão; dito no spec e conferido na revisão |
| ~~Branco puro sobre vermelho vibrar numa faixa de 10px~~ | — | — | **Aconteceu.** Branco ficou lavado contra o accent; as listras passaram a ser `--surface-3`, a cor do segmento pendente, e assim leem como o trilho aparecendo através do preenchimento |
| Animação perpétua custar bateria | Baixa | Baixo | `transform` num pseudo-elemento fica no compositor; e `prefers-reduced-motion` desliga |
| Listras lerem como "carregando, espere" | Baixa | Baixo | É a leitura pretendida — o exercício atual **está** em andamento — e o rótulo acessível continua dizendo a frase inteira |
| Atual-e-concluído ficar indistinguível do atual | Baixa | Médio | São sólido e listrado, lado a lado na mesma altura; cenário próprio no spec |

---

## Archive Information

**Archived:** 2026-09-12
**Duration:** mesmo dia
**Outcome:** Successfully implemented

### Files Modified
- `src/features/session/session.css` — a mudança inteira; o JSX não foi tocado
- `src/features/session/entry-progress.test.ts` (novo) — a aritmética do laço
- `src/features/session/rest-timer.integration.test.tsx` — um flake alheio a
  este change, encontrado pelo gate e consertado aqui

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — 1 requisito MODIFIED

### Learned in Implementation

**Branco não serviu.** Era a primeira escolha e ficou lavado contra o accent. As
faixas passaram a ser `--surface-3` — a cor do segmento *pendente* —, e isso
acabou dizendo mais do que uma cor qualquer diria: elas leem como o trilho vazio
aparecendo através do preenchimento, em vez de um padrão impresso por cima.

**A diagonal cobra uma conta que a vertical não cobrava.** O período de um
gradiente é medido perpendicular às faixas, então um padrão inclinado se repete
numa distância horizontal maior do que a que se repete através de si mesmo — o
período dividido pelo seno do ângulo. Deslizar o período cru, que estava certo
para faixas verticais, deixaria as listras a um terço de período do fim, pulando
a cada volta. O passo virou uma custom property lida nos três lugares que dele
dependem, para que não possam divergir.

**Um teste que lê CSS.** Fora do comum, e a justificativa é estreita: esta é a
única forma de errar aqui que não aparece numa captura de tela nem num teste de
comportamento, porque as listras continuam certas e o sintoma é só uma trepidação
no fim de cada volta. Conferido que morde nas duas versões do erro.
