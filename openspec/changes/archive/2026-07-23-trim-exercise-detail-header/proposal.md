# Proposal: Cabeçalho enxuto nas telas de detalhe do exercício

**Change ID:** `trim-exercise-detail-header`
**Created:** 2026-07-23
**Status:** Implementation Complete
**Completed:** 2026-07-23

---

## Problem Statement

As duas telas de detalhe de exercício mostram o **nome do exercício duas vezes**:

| Tela | Rota | Ocorrência 1 | Ocorrência 2 |
|------|------|--------------|--------------|
| Detalhe do exercício (catálogo) | `/exercise/:id?day=N` | `BackBar title` no topo | `<h2 class="ex-title">` abaixo da mídia |
| Detalhe do exercício na sessão | `/session/:id/entry/:entryId` | `BackBar title` no topo | `<h2 class="ex-title">` abaixo da mídia |

Além do nome duplicado, ambas exibem um chip com o **dia de treino**
(`Dia 2` / `3 dias` no catálogo; `session.dayName` na sessão). Numa tela usada
**no meio do treino**, esse chip ocupa altura vertical sem responder a nenhuma
pergunta do usuário: quem chegou ali veio de um dia específico e já sabe qual é.

Consequências: a dobra útil (mídia + abas + peso alvo) desce na tela, o usuário
rola mais para chegar ao editor de peso, e a repetição do título faz o
cabeçalho parecer um erro de layout.

Afetados: todo usuário do app — são as duas telas mais visitadas durante um
treino.

## Proposed Solution

Manter **um único título**, o do topo (a barra de voltar, que é fixa e sempre
visível), e remover do corpo:

1. o `<h2 class="ex-title">` das duas telas;
2. o chip de **dia de treino** das duas telas.

O que **permanece** no corpo: a mídia do exercício, os chips de **categoria** e,
na tela de sessão, o chip **"Concluído"** (status da entrada, não contexto de
navegação).

Com o `h2` fora, o bloco `.ex-head` passa a conter só a linha de chips; o CSS é
ajustado para o espaçamento continuar correto (sem "buraco" onde o título
estava) e `.ex-title` é removido se ficar sem uso.

Nenhuma mudança de dados, de rota ou de navegação: o parâmetro `?day=` continua
existindo e continua governando Voltar/Avançar e o retorno para a Home com o dia
expandido — ele só deixa de ser **exibido**.

## Scope

### In Scope
- Remover o `<h2 class="ex-title">` de `ExerciseDetailPage` e `SessionEntryPage`.
- Remover o chip de dia de treino (`inDays` / `session.dayName`) das duas telas.
- Ajustar `exercise.css` (`.ex-head`, `.ex-title`) para o novo cabeçalho.
- Limpar código que ficar morto (ex.: o `useMemo` de `inDays`, imports).
- Atualizar testes que dependiam do título duplicado ou do chip de dia.

### Out of Scope
- A lista de exercícios (Settings → Exercícios), que **deve continuar** mostrando
  os dias de cada exercício — ali a informação é o próprio conteúdo da lista.
- Qualquer mudança na barra flutuante (StepperBar), nas abas, no editor de peso,
  em observações ou fotos.
- Mudança no roteamento ou no parâmetro `?day=`.
- Redesenho da barra de topo (fonte, truncamento de nomes longos).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhuma mudança de schema ou de dados |
| API | No | App local, sem backend |
| State | No | `?day=` continua sendo lido para navegação |
| UI | Yes | `ExerciseDetailPage.tsx`, `SessionEntryPage.tsx`, `exercise.css` |

## Architecture Considerations

- As duas telas já compartilham `exercise.css` e o padrão `hero` + `ex-head` +
  `Tabs`. A mudança preserva essa simetria: as duas telas continuam com o mesmo
  cabeçalho, agora mais curto.
- O nome do exercício continua disponível em um único lugar previsível
  (`BackBar`), que já é o padrão das demais telas do app.
- Nomes longos: a `BackBar` passa a ser o **único** lugar onde o nome aparece;
  se ela truncar, o nome completo deixa de estar visível. A tarefa 3.3 verifica
  esse caso com um nome longo antes de considerar a mudança pronta.

## Success Criteria

- [ ] Em `/exercise/7?day=2` o nome do exercício aparece **uma única vez**, na barra do topo
- [ ] Em `/session/7/entry/31` o nome do exercício aparece **uma única vez**, na barra do topo
- [ ] Nenhuma das duas telas exibe o dia de treino
- [ ] Categorias continuam visíveis; "Concluído" continua visível na tela de sessão
- [ ] Voltar/Avançar e o retorno à Home com o dia expandido continuam funcionando
- [ ] Suíte de testes e a análise estática passam

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ~~Nome longo truncado na barra do topo, sem outro lugar para lê-lo~~ **Não se concretizou:** `.appbar h1` não tem `nowrap`/`ellipsis` e `.appbar` não tem `overflow: hidden` — o nome quebra em linha e continua inteiro | Med | Low | Verificado na tarefa 3.3 |
| Testes que buscavam o nome por `getByText` passam a encontrar 1 nó em vez de 2 (ou vice-versa) | High | Low | Ajustar as asserções na fase 3 |
| Perda percebida de contexto do dia durante a sessão | Low | Low | O dia é escolhido imediatamente antes, na Home/runner; a barra de topo e o Voltar preservam o caminho |
| CSS órfão (`.ex-title`) deixado para trás | Med | Low | Remover a regra na mesma mudança |

---

## Archive Information

**Archived:** 2026-07-23
**Duration:** same day (proposal → apply → archive)
**Outcome:** Successfully implemented

### Files Modified
- `src/features/exercise/ExerciseDetailPage.tsx` — removidos o `<h2 class="ex-title">`,
  o chip de dias e o `useMemo` de `inDays` (e o import `useMemo`)
- `src/features/session/SessionEntryPage.tsx` — removidos o `<h2 class="ex-title">`
  e o chip de `session.dayName`
- `src/features/exercise/exercise.css` — regra `.ex-title` removida
- `src/features/exercise/detail-header.integration.test.tsx` — **novo** (5 testes)
- `src/features/exercise/day-nav.integration.test.tsx`,
  `src/features/session/session.integration.test.tsx`,
  `src/features/session/stepper-bar.integration.test.tsx` — asserções de heading
  de `level: 2` para `level: 1`

### Specs Updated
- `openspec/specs/exercises/spec.md` — ADDED *Single Exercise Title on Detail Views*
- `openspec/specs/workout-sessions/spec.md` — MODIFIED *Session Exercise Detail*

### Verification
- `npm test` (242/242), `npm run typecheck`, `npm run build` — all pass
- Os 5 testes novos montam o `App` real com o roteador nas duas rotas e fixam:
  nome uma única vez (`getAllByRole('heading', …)` com length 1), ausência do dia
  (inclusive do agregado "N dias"), categorias preservadas e chip "Concluído"
  preservado
- **Conferência visual no navegador não foi feita nesta sessão** (sem automação de
  browser); o dev server foi deixado no ar para o usuário olhar

### Worth carrying forward
- **O nome do exercício mora só na `BackBar`.** Testes que procuram o nome numa
  tela de detalhe devem usar `findByRole('heading', { name, level: 1 })` — o
  `level: 2` existia só para desempatar da duplicata, que não existe mais.
- **`.appbar h1` não trunca** (sem `nowrap`/`ellipsis`, sem `overflow: hidden` no
  `.appbar`): nomes longos quebram em linha e continuam legíveis. Se algum dia a
  barra passar a truncar, este requisito perde a rede de segurança — o nome não
  estaria em mais nenhum lugar da tela.
- **`.ex-head` só renderiza quando há chips**, senão sobraria um `margin-bottom`
  vazio sob a mídia num exercício sem categoria.
