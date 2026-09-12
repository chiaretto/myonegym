# Proposal: O segmento atual vira uma barra de progresso listrada

**Change ID:** `stripe-the-current-exercise-segment`
**Created:** 2026-09-12
**Status:** Draft

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
e distingui-lo deles pelo **movimento**: faixas verticais brancas correndo na
horizontal, como uma barra de carregamento.

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
| **Atual, não concluído** | 10px, vermelho a 16% | **10px, vermelho cheio com listras brancas andando** |
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

**O laço tem de fechar sem costura.** As listras são um `repeating-linear-gradient`
e o deslocamento por ciclo MUST ser exatamente **um período** do padrão; qualquer
outro valor faz o padrão "pular" a cada volta. É a única aritmética deste
change, e é a única forma de errar que não aparece numa captura de tela.

**`prefers-reduced-motion` não é opcional aqui.** Isto é um movimento perpétuo
no campo de visão, numa tela que o usuário encara entre séries por uma hora.
Quem pediu para reduzir movimento MUST ficar com as listras **paradas** — que
ainda distinguem atual de concluído, porque a diferença é de textura e não só de
animação. O app já tem esse precedente em `update.css`, com o mesmo raciocínio:
o efeito sai, a informação fica.

## Success Criteria

- [ ] O segmento atual usa a mesma cor cheia dos concluídos
- [ ] Ele carrega listras verticais brancas correndo na horizontal
- [ ] Atual-e-concluído é sólido, sem listras, e continua mais alto
- [ ] Com `prefers-reduced-motion: reduce`, as listras ficam paradas
- [ ] A animação não repinta a cada quadro
- [ ] Nada da geometria, do rótulo acessível ou do comportamento da barra muda

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| As listras "pularem" a cada volta do laço | Média | Baixo | O deslocamento é um período exato do padrão; dito no spec e conferido na revisão |
| Branco puro sobre vermelho vibrar numa faixa de 10px | Média | Baixo | Começar com branco a alta opacidade e não puro; é um valor, ajustável ao olho |
| Animação perpétua custar bateria | Baixa | Baixo | `transform` num pseudo-elemento fica no compositor; e `prefers-reduced-motion` desliga |
| Listras lerem como "carregando, espere" | Baixa | Baixo | É a leitura pretendida — o exercício atual **está** em andamento — e o rótulo acessível continua dizendo a frase inteira |
| Atual-e-concluído ficar indistinguível do atual | Baixa | Médio | São sólido e listrado, lado a lado na mesma altura; cenário próprio no spec |
