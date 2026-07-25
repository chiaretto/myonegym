# Proposal: O cabeçalho inteiro do card de dia abre e fecha o treino, com o chevron junto do nome

**Change ID:** `home-day-card-tap-target`
**Created:** 2026-07-25
**Status:** Implementation Complete (código) — conferência visual pendente
**Completed:** 2026-07-25

---

## Problem Statement

No card de dia da Home, só duas regiões respondem ao toque para expandir: o
**nome do dia** e o **chevron**. Tudo o mais no cabeçalho é área morta.

Olhando o card como ele é hoje (`src/features/home/HomePage.tsx:209-251`):

```
┌──────────────────────────────┐
│ ▓ Dia 1                      │  ← .day-head-main (button) — clica
│ ▓ (◕) Peito · Tríceps  ▶  ⌄  │  ← .day-meta — morto, exceto ▶ e ⌄
└──────────────────────────────┘
```

- `.day-head-main` é um `<button>`, mas o CSS lhe dá `display: block` sem altura
  própria: ele ocupa a primeira linha e nada mais.
- A segunda linha inteira — `.day-meta` — é `<span>`: o avatar, as categorias e o
  espaço vazio entre elas e os botões não fazem nada.
- O padding do cabeçalho (`14px 12px 14px 20px`) também não faz nada.

O resultado é um card que **parece** um alvo único e não é. Num dedo, a diferença
entre acertar o nome e acertar 3px abaixo dele é invisível; o toque simplesmente
não responde, e a leitura natural é que o app travou. O problema piora exatamente
onde o app mais se esforça: com `--font-scale` alto as categorias ganham duas
linhas e a área morta cresce junto.

A segunda linha ainda concentra a informação que o usuário usa para escolher o
dia (avatar e categorias), então é justamente onde o olho pousa — e onde o toque
não funciona.

Isso também destoa do resto do app: nas listas de exercícios, academias e
categorias a linha inteira é o alvo (`.exercise` é um `<Link>` que ocupa a linha
toda). O card de dia é a exceção.

## Proposed Solution

**Todo o cabeçalho do card vira o alvo de expandir/recolher** — as duas linhas,
incluindo avatar, categorias e o padding ao redor. A lista de exercícios
expandida fica de fora: ela já tem links próprios, e recolher o dia num toque
perdido ali seria hostil.

O obstáculo é que dentro do cabeçalho existe **outro** controle, o botão
Iniciar/Continuar. Um `<button>` não pode conter outro: é HTML inválido e
quebraria tanto o alvo externo quanto o interno. As saídas:

| Abordagem | Por que não / por que sim |
|---|---|
| Envolver o cabeçalho num `<button>` | Aninha o Iniciar dentro dele — inválido |
| `role="button"` na `<div>` | Aninha as semânticas de controle na árvore de acessibilidade, e cria um segundo controle que diz o mesmo que o primeiro |
| Estender o alcance do botão por um pseudo-elemento | *Stretched link*: só CSS, sem aninhamento, sem propagação |
| **`onClick` na `<div>`, sem `role`, com o botão preservado dentro** | O `.day-head-main` segue sendo o único controle de expandir, com nome e `aria-expanded`; a `<div>` não ganha `role` nem `tabindex`, então não entra na árvore de acessibilidade — é área de toque, não controle |

**A quarta foi a implementada, e a proposta original apontava para a terceira.**
O motivo da troca apareceu ao escrever os testes: o alcance por pseudo-elemento
existe **só em CSS**, e o jsdom não faz layout nem *hit testing*. Um clique nas
categorias não alcançaria o botão por baixo — não há caminho no DOM entre os dois
—, então os testes que esta mudança mais precisa ter (tocar no avatar, nas
categorias, no padding) seriam impossíveis de escrever. O entregável central
ficaria sem nenhuma cobertura automatizada, num projeto que cobre o resto.

Com o manipulador na `<div>`, o clique **sobe pelo DOM** e é verificável. O custo
declarado é o `stopPropagation` no Iniciar — o alvo passa a depender de o clique
não ter escapado —, e é exatamente isso que um teste fixa (Success Criteria 2).

A árvore de acessibilidade fica igual à da terceira opção: a `<div>` sem `role`
não é exposta, e o `.day-head-main` continua sendo o botão nomeado com
`aria-expanded`. Ele deliberadamente **não** tem `onClick` próprio — ponteiro e
teclado produzem um clique que sobe até a `<div>`, e um segundo manipulador
alternaria duas vezes e se cancelaria.

### O chevron sobe para a linha do nome

Hoje o chevron fica na segunda linha, colado no botão Iniciar/Continuar — dois
símbolos lado a lado com pesos muito diferentes: um inicia o treino, o outro só
abre uma gaveta. Ele passa para a **primeira linha**, alinhado à direita do nome
do dia.

```
hoje                              depois
┌────────────────────────────┐    ┌────────────────────────────┐
│ ▓ Dia 1                    │    │ ▓ Dia 1                 ⌄  │
│ ▓ (◕) Peito · Tríceps ▶ ⌄  │    │ ▓ (◕) Peito · Tríceps    ▶ │
└────────────────────────────┘    └────────────────────────────┘
```

Isso emparelha o indicador com aquilo que ele descreve: é o **dia** que expande,
não a ação de iniciar. E devolve largura para as categorias, que são o aperto
crônico dessa linha — o próprio `home.css` registra a conta em `:149-161`, onde
as ações somam 163px a 430px/150% e espremem `.day-sub` até o piso de 11ch.
Tirar o chevron dali devolve o glifo (~14px), seu padding (2px de cada lado) e o
gap de 4px: cerca de 22px que passam a ser das categorias.

**Isto contradiz a spec vigente**, que hoje exige que o nome ocupe a primeira
linha *sozinho* e que as quatro affordances fiquem juntas na segunda
(`home-navigation`, "Training Day Card"). O delta modifica esse requisito de
propósito — não é um detalhe de implementação.

### O chevron deixa de ser um botão

Com o cabeçalho inteiro clicável, o `.chev-btn` vira um segundo controle que faz
o mesmo que o primeiro, no mesmo card. Ele continua visível e continua girando ao
abrir — e tocá-lo continua expandindo, porque ele fica **dentro** da área
estendida —, mas deixa de ser um `<button>` próprio.

O ganho é na navegação por teclado e leitor de tela, onde hoje cada dia gasta
três paradas e duas dizem a mesma coisa:

```
hoje                        depois
1. "Dia 1, expandir"        1. "Dia 1, expandir"   ← agora o cabeçalho todo
2. "Iniciar"                2. "Iniciar"
3. "Expandir"  ← duplicado
```

Numa Home com cinco dias, são cinco paradas a menos, todas redundantes.

Deixando de ser controle, ele pode morar **dentro** do próprio
`.day-head-main` — a primeira linha vira uma linha de dois itens, nome à
esquerda e indicador à direita. O glifo continua fora da árvore de
acessibilidade, então o nome acessível do botão segue sendo só o nome do dia.

## Scope

### In Scope
- O cabeçalho do card (`.day-head`, as duas linhas e seu padding) passa a ser
  inteiro o alvo de expandir/recolher.
- O botão Iniciar/Continuar continua sendo um alvo próprio, acima desse alcance.
- O chevron **muda de linha**: sai de junto do Iniciar e vai para a direita do
  nome do dia, na primeira linha.
- O chevron deixa de ser `<button>` e passa a ser indicador visual, mantendo o
  giro ao abrir e continuando a expandir quando tocado.
- Estado de foco visível para o alvo estendido — hoje o foco desenha só em volta
  do nome, e passaria a mentir sobre o que está focado.
- Testes cobrindo o toque nas regiões que hoje são mortas.

### Out of Scope
- A **lista de exercícios expandida** não vira alvo de recolher.
- **Aproveitar a largura que o chevron libera** na segunda linha. O piso de 11ch
  de `.day-sub` foi medido com o chevron ali (`home.css:149-161`) e passa a ter
  folga; recalcular esse piso é uma mudança de tipografia com sua própria
  medição, e não entra aqui. As categorias ganham o espaço na prática, o piso
  segue como está.
- Qualquer outra mudança visual no card: mesma altura de cabeçalho, mesmo
  espaçamento, mesmas cores. Fora a posição do chevron, só o alcance do toque
  muda.
- Os demais cards e listas do app — o padrão já é o da linha inteira; esta
  mudança alinha o card de dia a ele, não redefine o padrão.
- Gesto de arrastar, deslizar para recolher, ou qualquer coisa além do toque.
- O comportamento do botão Iniciar/Continuar.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhuma mudança de dados |
| API | No | App local-only, sem servidor |
| State | No | `toggleDay` e o dia no endereço continuam iguais |
| UI | Yes | `HomePage.tsx` (chevron deixa de ser botão e muda de linha) e `home.css` (primeira linha vira duas colunas, alcance estendido, foco). O pill Iniciar é estilizado em `session.css:129-169`, não em `home.css` — a segunda linha perde um item e isso precisa ser conferido lá também |

## Architecture Considerations

- **O alvo tem de ser o botão que já existe, não um novo.** O `.day-head-main`
  já carrega `aria-expanded` e o nome acessível do dia. Estender o alcance dele
  preserva as duas coisas de graça; qualquer alternativa teria de reconstruí-las.
- **O manipulador vai no cabeçalho, não no card.** O `.day` contém também a lista
  de exercícios expandida; alternar dali recolheria o dia num toque perdido entre
  os próprios links da lista. Como o `.day-head` é irmão da lista e não seu
  ancestral, o alcance para naturalmente onde deve.
- **Nada de empilhamento novo.** Sem camada sobreposta, a faixa vermelha
  (`.day::before`, `z-index: 1`, num card com `overflow: hidden`) e o Iniciar
  ficam exatamente como estavam — um risco que a abordagem por pseudo-elemento
  teria criado e esta não cria.
- **A primeira linha deixa de ser uma linha de um item só.** Hoje
  `.day-head-main` é `display: block` com o título dentro (`home.css:185-188`);
  passa a precisar acomodar título e indicador em lados opostos. O título já é
  `display: block` com `line-height: 1.25`, então o alinhamento vertical entre os
  dois tem de ser deliberado — um chevron centrado na caixa do título fica alto
  demais num nome de duas linhas.
- **A regra de quebra da segunda linha muda de sujeito.** A spec exige que, sem
  largura legível para as categorias, "as affordances de iniciar e expandir"
  quebrem para a própria linha. Com o chevron fora dali, quem quebra é só o
  Iniciar — o requisito precisa ser reescrito, não reinterpretado.
- **Seleção de texto preservada.** A abordagem por camada impediria selecionar o
  nome do dia arrastando; esta não impede.
- **Os testes atuais continuam válidos.** Eles clicam no dia por `getByText('Dia
  1')` (`day-url.integration.test.tsx`), que é o nome dentro do botão. Esta
  mudança amplia o alvo; não move o que já funcionava. Se algum teste passar a
  falhar, é sinal de regressão real, não de teste desatualizado.

## Success Criteria

- [ ] Tocar no avatar, nas categorias ou no espaço vazio do cabeçalho expande e
      recolhe o dia.
- [ ] Tocar em Iniciar/Continuar inicia o treino e **não** expande o dia.
- [ ] O chevron aparece na primeira linha, alinhado à direita do nome do dia, e
      não mais ao lado do Iniciar/Continuar.
- [ ] Tocar no chevron continua expandindo e recolhendo.
- [ ] Num dia de nome longo, que ocupa duas linhas, o chevron continua alinhado
      de forma legível com o nome e não desloca a segunda linha.
- [ ] Cada dia expõe exatamente dois controles à navegação por teclado e leitor
      de tela — o cabeçalho e o Iniciar — e o do cabeçalho anuncia o nome do dia
      e seu estado de expandido.
- [ ] O foco de teclado desenha em volta do cabeçalho inteiro, não só do nome.
- [ ] Fora a posição do chevron, o card não muda de aparência: altura do
      cabeçalho, espaçamento e cores idênticos.
- [ ] `npm run build`, `npm run typecheck` e `npx vitest run` passam.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| O toque em Iniciar escapa para o cabeçalho e também expande o dia | Med | High | `stopPropagation` no Iniciar, fixado por teste — o risco central desta abordagem |
| ~~A camada conflita com a faixa vermelha~~ | — | — | Não se aplica: sem camada sobreposta, o empilhamento não muda |
| O alcance vaza para a lista de exercícios e recolhe o dia ao tocar num deles | Low | High | O manipulador fica no `.day-head`, que é irmão da lista; teste que toca num exercício de um dia aberto |
| Perder o alvo do chevron ao deixar de ser botão | Low | Med | Ele fica dentro da área estendida, e um teste toca especificamente nele |
| O chevron na primeira linha rouba largura do nome e faz nomes longos quebrarem antes | Med | Low | O glifo tem ~14px de largura (`home.css:198-206`) contra os 163px que as ações ocupam hoje na segunda linha; conferir com o nome mais longo dos dados reais a 200% de `--font-scale` |
| O chevron desalinhado num nome de duas linhas — centrado na caixa do título, fica flutuando | Med | Low | Decidir o alinhamento de propósito (topo, junto à primeira linha do nome) e verificar com nome curto e longo |
| O foco de teclado ficar invisível ou desalinhado no alvo maior | Med | Low | Estado de foco explícito sobre o cabeçalho, verificado por teclado |
