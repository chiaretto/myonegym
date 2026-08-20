# Proposal: Cardio Não Reinicia a Rotação, e a Trilha da Semana Marca o Cardio

**Change ID:** `fix-cardio-rotation-and-week-star`
**Created:** 2026-08-19
**Status:** Implementation Complete
**Completed:** 2026-08-19

---

## Why

Concluir um cardio joga o marcador "Próximo treino" de volta para o primeiro dia,
apagando o lugar do usuário na rotação de força. E a trilha de sete dias do card
"Esta semana" não marca cardio, enquanto o calendário da Consistência marca com
uma estrela — dois lugares respondendo à mesma pergunta com vocabulários
diferentes. Os dois defeitos têm a mesma raiz: leituras do histórico que não
foram ensinadas a distinguir o tipo da sessão.

## What Changes

- **BUGFIX** — a rotação do "Próximo treino" passa a olhar a última sessão de
  **força**; um cardio deixa de reiniciá-la para o primeiro dia.
- **BUGFIX** — a trilha de sete dias do card "Esta semana" passa a marcar com
  **estrela** o dia em que houve cardio, o mesmo sinal do calendário da
  Consistência, nas abas **Treinos** e **Cardio**.
- O ponto de canto na trilha **e no calendário** deixa de significar "mais de
  uma sessão" e passa a significar **"houve musculação"**. Com a estrela ao
  lado significando "houve cardio", a célula passa a dizer o tipo do treino:
  ponto, estrela, ou os dois.
- `WeekDayCell` ganha `cardio: boolean` e `buildWeekTrack` um `cardioAt`
  opcional, espelhando `MonthCell.cardio` / `buildMonthGrid`.
- Ambas as células ganham `strength: boolean`, par simétrico de `cardio`,
  derivado de `sessions` menos os cardios do dia. A classe CSS `multi` vira
  `strength` nos dois stylesheets.
- **BUGFIX** — voltar do detalhe de um exercício aberto pela **aba Cardio**
  devolve à aba, e não à Home: a origem passa a viajar no endereço
  (`?from=cardio`), como o `?day=` da Home já fazia.
- Sem migração e sem estado persistido novo: `Session.kind` e `Session.dayId`
  já existem.

## Problem Statement

Dois defeitos, ambos com a mesma raiz: **o cardio entrou no histórico, mas as
leituras desse histórico não foram ensinadas a distinguir o tipo de sessão.**

### 1. Um cardio joga o "Próximo treino" de volta para o Dia 1

`nextWorkoutDayId` avança a rotação a partir do `dayId` da sessão concluída mais
recente, e trata `null` como "não há histórico" — o caso que, por contrato, volta
para o primeiro dia.

Uma sessão de cardio **não tem `dayId`** (`Session.dayId` é opcional e ausente no
cardio — `src/db/types.ts:243`). A Home lê a sessão mais recente sem filtrar por
tipo:

```ts
// src/features/home/HomePage.tsx:83
nextWorkoutDayId(days ?? [], summaries[0]?.session.dayId ?? null)
```

Então, ao concluir um cardio, `summaries[0]` passa a ser essa sessão, seu `dayId`
ausente vira `null`, e a rotação lê isso como "nunca treinou" e volta para o
**Dia 1** — apagando o progresso de quem estava no Dia 3. A cada cardio o
usuário perde o lugar na rotação de força.

O erro é de **leitura**, não de dado: a sessão de força continua no histórico,
logo atrás. Nada foi perdido; só não está sendo consultado.

**Quem é afetado:** todo usuário que intercala cardio e musculação — exatamente
o caso de uso que a aba Cardio existe para atender.

### 2. A trilha da semana não marca cardio; o calendário marca

O calendário da Consistência já resolveu este problema: um dia com cardio ganha
uma **estrela**, um sinal *somado* ao disco, e a legenda explica. Isso está
especificado ("Calendário Mensal de Treinos") e implementado (`MonthCell.cardio`,
`.cal-cell.cardio::before { content: '★' }`).

O card "Esta semana" — o mesmo widget no topo da lista de dias de treino **e** da
aba Cardio — não recebeu esse tratamento. `WeekDayCell` tem `index`, `state` e
`sessions`, e nenhuma noção de tipo; `buildWeekTrack` recebe só uma lista de
timestamps. Resultado: dois lugares do app que respondem à mesma pergunta
("o que aconteceu neste dia?") respondem com vocabulários diferentes, e a estrela
que o usuário aprendeu no calendário não significa nada duas telas antes.

## Proposed Solution

Ensinar as duas leituras a distinguir o tipo — reaproveitando, nos dois casos, a
decisão que o calendário já tomou.

### 1. A rotação olha a última sessão **de força**

`nextWorkoutDayId` passa a ser alimentado pela sessão concluída mais recente
**que tenha um dia** — na prática, `kind === 'strength'`. Um cardio deixa de ter
qualquer efeito sobre o marcador, o que é a leitura correta: a rotação é dos dias
de treino, e o cardio não pertence a nenhum.

O filtro fica em `HomePage` (na origem do argumento), e não dentro de
`nextWorkoutDayId` — a função recebe um `dayId` e não deve precisar saber o que é
uma sessão. Sua semântica atual (`null` → primeiro dia) permanece intacta e
correta: quando **não há** nenhuma sessão de força, o primeiro dia é de fato a
resposta certa.

### 2. `WeekDayCell` ganha `cardio`, espelhando `MonthCell`

- `buildWeekTrack` passa a aceitar um segundo conjunto de timestamps, o dos
  cardios — o **mesmo formato** que `buildMonthGrid` já usa (`cardioAt`, um
  subconjunto de `completedAt`), com o mesmo default `[]`.
- `WeekDayCell` ganha `cardio: boolean`, com a mesma razão de ser de
  `MonthCell.cardio`: um sinal somado, não um quarto estado.
- `WeeklySummary` renderiza a estrela na célula, com o mesmo caractere, a mesma
  posição relativa (canto superior esquerdo, longe do badge de 2+ no inferior
  direito) e a mesma inversão de cor sobre disco preenchido.
- A `aria-label` da célula passa a dizer que houve cardio — hoje a estrela do
  calendário é puramente visual, e a trilha não vai repetir essa lacuna.

Home e Cardio derivam `cardioAt` do mesmo `useSessionSummaries()` que já
consultam; nenhuma consulta nova, nenhum estado persistido novo, nenhuma
migração.

### Por que uma proposta e não um patch direto

O item 1 **contradiz um cenário publicado** ("No history features the first
day" continua válido, mas o contrato precisa dizer *sessão de força*), e o item 2
**estende um requisito publicado** ("Weekly Training Summary") com um sinal novo.
Os dois mexem no contrato, então a spec muda junto.

## Scope

### In Scope

- Filtrar a rotação do "Próximo treino" pela sessão de **força** mais recente.
- `cardio: boolean` em `WeekDayCell`, alimentado por um `cardioAt` opcional em
  `buildWeekTrack`.
- Estrela na célula da trilha semanal, visual e acessível, igual à do calendário.
- A estrela aparece nas **duas** telas que montam o card (Treinos e Cardio) —
  é um componente só.
- Voltar do detalhe de um cardio devolve à aba Cardio (dobrado aqui a pedido do
  usuário, em vez de virar proposta própria).
- Deltas em `home-navigation` (os dois requisitos), `cardio` (a rotação e o
  voltar) e `consistency` (o ponto do calendário).

### Descoberto durante a implementação

O ponto de canto contava **sessões**. Com a estrela no lugar, um dia com um
treino e um cardio exibia os dois sinais — a estrela dizendo "houve cardio" e o
ponto dizendo "treinou duas vezes", que é falso.

A correção não foi estreitar a contagem, e sim **trocar a pergunta**: contar não
tinha mais nada a explicar (o número do card conta **dias**, não sessões, e dois
treinos de musculação no mesmo dia não é um caso que valha desenhar), enquanto
"de que tipo foi este dia" era a pergunta que a célula não respondia. O ponto
passa a significar **houve musculação**, par simétrico da estrela.

Consequência na legenda do calendário: a entrada "treinou", um disco **sem
sinal**, passou a ilustrar um desenho que não ocorre — toda sessão é de um tipo
ou do outro, então todo disco carrega ao menos uma marca. Ela deu lugar a
musculação / cardio / os dois.

Isso alcança a spec `consistency`, então o delta dela entrou junto. O tooltip e a
descrição falada continuam dando o total real de sessões: é o único lugar onde
essa informação ainda aparece.

### Out of Scope

- **Legenda na trilha semanal.** O calendário tem legenda porque tem seis
  sinais numa grade densa; o card da semana tem três células possíveis e não
  ganha uma faixa de legenda para explicar uma. A `aria-label` e o `title`
  cobrem a descoberta.
- **Contagem separada de cardio** ("2 força + 1 cardio"). O card afirma
  deliberadamente que a semana é uma só e o cardio é treino; separar a contagem
  desfaria essa decisão, que é anterior a este bug.
- **Cardio na rotação.** Não se cria um "próximo cardio", nem o cardio entra na
  ordem dos dias.
- **Retroatividade.** Sessões antigas já têm `kind` (o campo é obrigatório desde
  `add-cardio-exercise-type`, com migração); nada a converter.
- Sequência (`currentStreak`), Consistência e card de compartilhamento
  permanecem como estão — todos já tratam cardio como treino, corretamente.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | `Session.kind` e `Session.dayId` já existem; nenhuma migração |
| API | No | App local, sem backend |
| State | Yes | `WeekDayCell.cardio`; `buildWeekTrack` ganha um parâmetro opcional; `HomePage` filtra a origem do `dayId` |
| UI | Yes | `WeeklySummary` renderiza a estrela; CSS novo em `weekly-summary.css` |

## Architecture Considerations

**Espelhar, não inventar.** A pergunta "como marcar cardio num calendário de
dias?" já foi respondida por `buildMonthGrid`/`MonthCell.cardio` e pelo CSS
`.cal-cell.cardio`. Esta mudança copia a **forma** dessa resposta — parâmetro
`cardioAt` opcional com default `[]`, campo booleano somado ao estado, pseudo-
elemento `::before` com `★` no canto oposto ao badge de 2+ — para que os dois
widgets divirjam por acidente o menos possível no futuro.

**O filtro mora em quem sabe o que é uma sessão.** `nextWorkoutDayId` recebe
`(days, lastCompletedDayId)` e não conhece `Session`. Empurrar `kind` para dentro
dela trocaria um argumento primitivo por um acoplamento ao modelo, para resolver
um problema que é de **seleção** e não de rotação. O filtro fica em `HomePage`,
onde `summaries` já vive.

**O CSS da estrela é duplicado, não extraído.** As duas células têm dimensões,
tipografia e contexto diferentes (`.cal-cell` 2.3em com número dentro; `.wd-dot`
1.9em com ícone). Um mixin compartilhado para dois `::before` de sete linhas
custaria mais em indireção do que economiza. O comentário no CSS aponta para o
par.

**Compatibilidade.** `cardioAt` com default `[]` mantém as chamadas e os testes
existentes de `buildWeekTrack` válidos — `cardio` sai `false` e a trilha se
comporta como hoje.

## Success Criteria

- [ ] Concluir um cardio **não** move o marcador "Próximo treino"
- [ ] Concluir um treino de força **continua** avançando a rotação, mesmo com um
      cardio concluído depois
- [ ] Sem nenhuma sessão de força no histórico, o marcador segue no primeiro dia
- [ ] Um dia com cardio mostra a estrela na trilha da semana, nas abas Treinos e Cardio
- [ ] Um dia só de força **não** mostra estrela
- [ ] Um dia com força e cardio mostra o disco, o badge de 2+ e a estrela
- [ ] A estrela é anunciada por leitor de tela na célula
- [ ] Estrela da trilha e estrela do calendário usam o mesmo símbolo e a mesma posição
- [ ] `openspec validate --specs --strict` passa
- [ ] Suíte de testes verde, incluindo os testes atuais de `buildWeekTrack` sem alteração

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Filtrar por `kind === 'strength'` esconder uma sessão de força legítima sem `dayId` | Low | Med | O filtro é por `dayId` presente **e** `kind === 'strength'`; um dia excluído não apaga o `dayId` da sessão, e `nextWorkoutDayId` já trata o dayId órfão |
| A estrela poluir a célula de 1.9em, menor que a do calendário | Med | Low | Dimensionada em `em` sobre `.wd-dot`, ajustada visualmente; canto oposto ao badge de 2+ |
| Novo parâmetro quebrar chamadas de `buildWeekTrack` | Low | Low | Opcional com default `[]`; testes atuais permanecem sem edição, o que é a própria verificação |
| A rotação "pular" ao migrar quem já sofreu o bug | Low | Low | Nada é persistido — a leitura corrigida passa a devolver o dia certo já na primeira renderização |

---

## Archive Information

**Archived:** 2026-08-19
**Duration:** mesmo dia (proposta, implementação e arquivamento em 2026-08-19)
**Outcome:** Successfully implemented

Entregou quatro correções, duas delas levantadas pelo usuário **depois** da
proposta original e dobradas aqui a pedido dele (Phases 5 e 6). O nome da change
descreve as duas primeiras; as quatro estão em "What Changes".

### Files Modified

- `src/lib/week.ts` — `WeekDayCell.strength` / `.cardio`, `buildWeekTrack(…, cardioAt)`,
  helper `weekdayIndices`
- `src/lib/consistency.ts` — `MonthCell.strength`, contagem de cardio por dia
- `src/features/home/HomePage.tsx` — rotação pela última sessão de força; `cardioAt`
- `src/features/cardio/CardioPage.tsx` — `cardioAt`; origem `?from=cardio` no link
- `src/features/exercise/ExerciseDetailPage.tsx` — `backTo` resolve `from=cardio`;
  `originQuery` propagado para as alternativas
- `src/features/consistency/ConsistencyPage.tsx` — ponto por `strength`; legenda
- `src/ui/WeeklySummary.tsx` — sinais e `aria-label`
- `src/ui/weekly-summary.css`, `src/features/consistency/consistency.css` — classe
  `multi` renomeada para `strength`; estrela do cardio
- Testes: `src/lib/week.test.ts`, `src/lib/consistency.test.ts`,
  `src/features/home/next-workout.integration.test.tsx`,
  `src/features/consistency/consistency.integration.test.tsx`,
  `src/ui/week-cardio-star.integration.test.tsx` (novo),
  `src/features/exercise/cardio-back.integration.test.tsx` (novo)

### Specs Updated

- `openspec/specs/home-navigation/spec.md` — *Feature the Next Training Day*,
  *Weekly Training Summary*
- `openspec/specs/cardio/spec.md` — *Cardio Screen*, *Start and Complete a Cardio*
- `openspec/specs/consistency/spec.md` — *Calendário Mensal de Treinos*

### Verification

- `npx vitest run` — 875 passed, 73 files (862 antes da change)
- `npx tsc -b --noEmit` — limpo
- `openspec validate --all --strict` — 0 failed
- Conferido na app rodando pelo usuário
