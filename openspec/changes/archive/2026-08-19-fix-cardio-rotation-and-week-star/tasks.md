# Implementation Tasks: Cardio Não Reinicia a Rotação, e a Trilha da Semana Marca o Cardio

**Change ID:** `fix-cardio-rotation-and-week-star`

---

## Phase 1: Foundation (Data Layer)

Nada a fazer. `Session.kind` e `Session.dayId` já existem e já são gravados
(`add-cardio-exercise-type`); este bug é de leitura, não de dado.

- [x] 1.1 Confirmar, com uma leitura do `db/repos.ts`, que a sessão de cardio é
      de fato gravada sem `dayId` e com `kind: 'cardio'` — se não for, a causa
      raiz é outra e a proposta muda
      → confirmado: `startCardioSession` (repos.ts:932) grava `kind: 'cardio'`
      sem `dayId`. Causa raiz como descrita na proposta.
- [x] 1.2 Confirmar que `useSessionSummaries()` devolve `session.kind` (e não só
      um projetado sem o campo)
      → confirmado: `listSessionSummaries` devolve o objeto `Session` inteiro.

**Quality Gate:** PASSED
- [x] Nenhuma migração introduzida
- [x] `npx tsc --noEmit` limpo

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 `src/lib/week.ts`: `WeekDayCell` ganha `cardio: boolean`, com um
      comentário que aponta para `MonthCell.cardio` como o par que ele espelha
- [x] 2.2 `src/lib/week.ts`: `buildWeekTrack(completedAt, now, cardioAt = [])`
      — mesma assinatura-irmã de `buildMonthGrid`; `cardioAt` é subconjunto de
      `completedAt`, e as mesmas guardas de semana (fora da semana, skew) valem
- [x] 2.3 `src/features/home/HomePage.tsx`: o argumento de `nextWorkoutDayId`
      passa a vir da sessão concluída mais recente **de força** —
      `summaries.find((s) => s.session.kind === 'strength' && s.session.dayId != null)`
      — mantendo o `?? null` para o caso de não haver nenhuma
- [x] 2.4 `HomePage` e `CardioPage`: derivar `cardioAt` das mesmas `summaries` e
      passá-lo a `buildWeekTrack`
- [x] 2.5 Testes de `src/lib/week.test.ts`: célula com cardio, célula só de
      força, célula com os dois, `cardioAt` omitido (compatibilidade)
- [x] 2.6 Testes de `src/lib/days.test.ts`: nenhum — `nextWorkoutDayId` não muda.
      Confirmar que o arquivo segue passando sem edição
      → confirmado: 16 testes passam sem edição.

**Quality Gate:** PASSED
- [x] Os testes existentes de `buildWeekTrack` passam **sem serem editados**
- [x] `npx tsc --noEmit` limpo

---

## Phase 3: User Interface

- [x] 3.1 `src/ui/WeeklySummary.tsx`: classe `cardio` na `li` da célula, ao lado
      de `multi` — somada ao estado, nunca no lugar dele
- [x] 3.2 `src/ui/weekly-summary.css`: `.wd.cardio .wd-dot::before` com `★`,
      canto superior esquerdo (o badge de 2+ ocupa o inferior direito), tamanho
      em `em`, e a inversão para `--on-accent` sobre `.wd.done`; comentário
      apontando para `.cal-cell.cardio` como o par
- [x] 3.3 `weekCellLabel`: a `aria-label` menciona o cardio, combinando com o
      "N treinos" quando houver mais de uma sessão no dia
- [x] 3.4 Verificar a estrela sobre os quatro estados possíveis da célula
      (`done` é o único que a acompanha na prática, mas o CSS não deve quebrar
      nos outros)

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] A estrela da trilha e a do calendário, lado a lado, são reconhecíveis
      como o mesmo sinal

---

## Phase 4: Integration & Polish

- [x] 4.1 i18n: não se aplica (strings em pt-BR no código, como o resto do app)
- [x] 4.2 Teste de integração em `src/features/home/next-workout.integration.test.tsx`:
      concluir força no Dia 1, depois um cardio → o marcador continua no Dia 2
- [x] 4.3 Teste de integração: cardio como única sessão do histórico → o marcador
      fica no Dia 1 (o zero state segue valendo)
- [x] 4.4 Teste de integração em Home e em Cardio: um cardio na semana marca a
      estrela na célula do dia, nas duas abas
- [x] 4.5 Rodar a suíte inteira e o `openspec validate --specs --strict`
- [x] 4.6 Conferir na app rodando (Home e Cardio) — é um bug visual e de
      marcador, e o teste não substitui olhar
      → verificado pelo usuário em 2026-08-19, depois das Phases 5 e 6.

**Quality Gate:** PASSED
- [x] `npx vitest run` verde
- [x] `openspec validate --specs --strict` — 0 failed
- [x] Verificado na app rodando

---

## Phase 5: Follow-up — o ponto passa a significar "houve musculação"

Levantado pelo usuário depois da Phase 4: com a estrela no lugar, um dia com
força + cardio exibia os dois sinais, e o ponto afirmava dois treinos. Decidido
com o usuário que contar não tem valor aqui — dois treinos de força no mesmo dia
não é um caso real — e que o ponto passa a marcar o **tipo**, par da estrela.

- [x] 5.1 `WeekDayCell` e `MonthCell` ganham `strength: boolean`, par simétrico
      de `cardio`, derivado de `sessions` menos os cardios do dia
- [x] 5.2 `WeeklySummary` e `ConsistencyPage` decidem o ponto por `strength`;
      classe CSS `multi` renomeada para `strength` nos dois stylesheets
- [x] 5.3 Tooltip do calendário e `aria-label` da trilha passam a nomear os
      tipos, e seguem dando o total real de sessões — é o único lugar onde
      esse número ainda aparece
- [x] 5.4 Legenda do calendário: "treinou" / "2+ sessões" / "cardio" →
      "musculação" / "cardio" / "os dois". A entrada do disco sem sinal saiu:
      ilustrava um desenho que não ocorre
- [x] 5.5 Testes unitários nos dois builders: só força, só cardio, os dois,
      repetição do mesmo tipo, e a invariante "todo dia treinado tem sinal"
- [x] 5.6 Testes de integração na trilha e no calendário
- [x] 5.7 Deltas: `home-navigation` e `consistency` reescritos

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] Suíte verde
- [x] `openspec validate --strict` limpo

---

## Phase 6: Follow-up — Voltar do detalhe de um cardio

Levantado pelo usuário: abrir `/exercise/:id` pela aba Cardio e tocar voltar
caía na Home. A Home linka com `?day=`, a aba Cardio linkava pelado, e
`backTo` degradava para `'/'`.

- [x] 6.1 `CardioPage`: a linha linka com `?from=cardio` — a origem viaja no
      endereço, como o `?day=` já fazia
- [x] 6.2 `ExerciseDetailPage`: `backTo` resolve `from=cardio` → `/cardio`, com
      o `day` vencendo quando ambos estiverem presentes
- [x] 6.3 `altHref` propaga a origem, senão abrir uma alternativa perde o
      caminho de volta uma tela adiante
- [x] 6.4 `cardio-back.integration.test.tsx`: volta para a aba, volta de uma
      alternativa, o dia vence, e o fallback para a Home sem marcador
- [x] 6.5 Teste confirmado falhando contra o link pelado
- [x] 6.6 Delta: requisito *Cardio Screen* passa a descrever o voltar

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] Suíte verde
- [x] `openspec validate --strict` limpo

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
