# Proposal: O dia de um treino é o dia em que ele começou

**Change ID:** `fix-session-day-by-start`
**Created:** 2026-09-20
**Status:** Implementation Complete
**Completed:** 2026-09-20

---

## Problem Statement

Um treino que começa às 23h40 e termina às 00h15 é registrado **no dia
seguinte**. Para quem treinou, foi o treino de terça; para o app, foi o de
quarta: a estrela cai na quarta no calendário, a faixa "Esta semana" acende a
quarta, a sequência de dias pode quebrar (a terça fica sem treino) ou inflar
(a quarta ganha um treino que não houve), e a lista do histórico data o item
com o dia errado. O compartilhamento da imagem sai com a data errada também.

A causa é uma só: **todo lugar que responde "em que dia foi este treino" lê
`completedAt`**, o instante em que o usuário tocou em concluir. Isso é o
instante certo para a *duração* (`completedAt − startedAt`), mas o dia de um
treino é o dia em que a pessoa foi treinar — o dia em que ele **começou**.

**Afetados:** quem treina à noite. É um caso menos raro do que parece: a
academia que fecha à meia-noite, o cardio depois do jantar, o treino que
atrasou. E o erro é do tipo que corrói a confiança na tela de Consistência,
que existe justamente para dizer a verdade sobre a rotina.

**Onde hoje se lê `completedAt` para decidir o dia** (`src/`):

| Lugar | O que decide |
|-------|--------------|
| `features/consistency/ConsistencyPage.tsx` | calendário, estrela de cardio, sequências, treinos do mês, 12 semanas, 12 meses, lista do mês e a data de cada item |
| `features/home/HomePage.tsx` | faixa "Esta semana" e estrela |
| `features/cardio/CardioPage.tsx` | a mesma faixa |
| `features/session/share/shareModel.ts` | a data da imagem compartilhada |
| `features/session/SessionPage.tsx` | "Concluído ontem · 35 min" |
| `db/repos.ts` (`listSessionSummaries`) | a ordem do histórico |

## Proposed Solution

**Uma regra, num lugar só:** o instante que situa um treino no tempo é
`startedAt`. Fica exposto por um helper — `workoutAt(session)` em
`src/lib/consistency.ts`, o módulo que já é dono de "o que a história diz" — e
**todo** caller que hoje escreve `session.completedAt!` para obter um dia passa
a chamá-lo. Não é uma troca de campo em oito lugares; é a extinção de oito
decisões locais em favor de uma.

O que **continua** lendo `completedAt`:

- a **duração** (`completedAt − startedAt`), que é o único motivo de esse
  instante existir;
- o filtro "é uma sessão concluída?" (`completedAt != null` / `status`), que
  é sobre estado, não sobre dia.

Os agregados puros em `lib/consistency.ts` e `lib/week.ts` recebem uma lista de
instantes e não sabem de onde ela veio — não mudam de lógica. O parâmetro que
eles chamam de `completedAt` passa a se chamar `at`: um nome que dizia "hora de
conclusão" sobre uma lista de horas de início seria uma mentira deixada no
código de propósito.

A **ordem** do histórico passa a ser por `startedAt` decrescente — o mesmo
instante que data cada item. Ordenar por um instante e datar por outro poderia
pôr o treino "de terça" acima do "de quarta" e o rótulo dizer o contrário.

A linha da sessão concluída ("Concluído ontem · 35 min") passa a dizer o dia do
treino: "**Feito ontem** · 35 min" — mesmo dia que o calendário e a lista.
"Concluído hoje" seria verdade e, ainda assim, contradiria a estrela de ontem.

**Sem migração:** `startedAt` sempre existiu e é obrigatório em toda sessão.
Nenhum dado muda; só a leitura. Um histórico antigo se corrige sozinho na
próxima abertura da tela.

## Scope

### In Scope
- `workoutAt(session)` em `lib/consistency.ts`, e a substituição de cada
  `session.completedAt!` usado como dia pelos callers da tabela acima.
- Renomear o parâmetro `completedAt` → `at` em `lib/consistency.ts` e
  `lib/week.ts` (e no comentário de `ui/WeeklySummary.tsx`).
- `listSessionSummaries` ordena por `startedAt`.
- SessionPage: "Feito {dia} · duração".
- Testes: um cenário "começa 23h40, termina 00h15" no calendário, na faixa da
  semana (Home e Cardio), na sequência, na lista do histórico, na ordem e na
  imagem compartilhada.
- Specs: regra nova em `consistency`; *Session History Across Gyms* em
  `workout-sessions` passa a dizer que ordena e data pelo início.

### Out of Scope
- Um treino que **atravessa** a meia-noite continuar contando para os dois
  dias, ou o usuário escolher a data. O dia é o do início, ponto.
- Fuso horário: os dias já são os do relógio local, e continuam.
- Sessões **em andamento** abandonadas de um dia para o outro: continuam fora
  de todo agregado até serem concluídas, como hoje.
- Migrar ou reescrever `completedAt` de sessões antigas. Nada nos dados está
  errado; a leitura estava.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Sem migração; `startedAt` já é obrigatório |
| API | No | Sem backend |
| State | Yes | `lib/consistency.ts` (helper + renome), `lib/week.ts` (renome), `db/repos.ts` (ordem) |
| UI | Yes | Consistência, Home, Cardio, SessionPage, shareModel — troca do instante lido |
| Backup | No | O documento carrega os dois instantes; nada muda |

## Architecture Considerations

- **Um helper, não um campo novo.** `SessionSummary` poderia carregar um
  `happenedAt` pronto, mas isso reintroduziria a mesma decisão em dois lugares
  (o summary e quem lê `Session` direto, como a share). Um helper puro sobre
  `Session` serve a todos.
- **Duração e dia são perguntas diferentes** e continuam com instantes
  diferentes. A regra a respeitar daqui em diante: `completedAt` responde
  "quanto durou" e "está concluída?"; nunca "quando foi".
- **Os agregados puros não mudam.** `dayStreak`, `buildMonthGrid`,
  `buildWeekTrack` e companhia recebem números. A correção está inteira em
  *quais* números os callers passam — e os testes de unidade deles seguem
  válidos sem tocar em uma linha.
- **`relativeDate(startedAt)` para "Feito ontem".** Mesmo helper de sempre,
  sobre o outro instante.

## Success Criteria

- [ ] Um treino iniciado às 23h40 de terça e concluído às 00h15 de quarta
      aparece na **terça**: estrela/marca no calendário, célula da faixa
      "Esta semana" na Home e no Cardio, data na lista do histórico, data na
      imagem compartilhada, "Feito ontem" na sessão aberta na quarta.
- [ ] A sequência de dias conta a terça, e não a quarta, nesse caso.
- [ ] A duração continua sendo 35 min.
- [ ] O histórico lista os treinos na ordem dos seus inícios.
- [ ] Nenhuma leitura de `completedAt` sobra fora de duração e de "concluída?"
      (`grep` como gate).
- [ ] Suíte verde, `tsc --noEmit` limpo, sem migração.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Um caller esquecido continua lendo `completedAt` como dia | Med | Med | `grep -n "completedAt!"` como gate de qualidade; o helper é a única forma aprovada |
| Ordem do histórico muda para sessões antigas (por início em vez de fim) | High | Low | É a correção pedida; só reordena pares que atravessaram a meia-noite ou se sobrepuseram, e passa a bater com as datas exibidas |
| Testes existentes que semeiam `completedAt` sem `startedAt` coerente | Med | Low | Revisar os seeds: `startSession` já grava `startedAt = now`; onde o teste força `completedAt` num dia, forçar `startedAt` no mesmo dia |

---

## Archive Information

**Archived:** 2026-09-20
**Duration:** mesmo dia (proposta, implementação e arquivamento em 2026-09-20)
**Outcome:** Implementado. Sem migração: só a leitura mudou.

**Um acréscimo ao escopo, necessário:** `relativeDate` contava blocos de 24 h,
então "Feito ontem" dizia "hoje" para um treino das 23h40 visto às 00h30 — o
mesmo erro, no rótulo. Passou a contar dias de calendário. O caso apareceu
porque a implementação foi feita logo depois da meia-noite, que é exatamente a
condição que o change existe para tratar.

### Files Modified
- `src/lib/consistency.ts` — `workoutAt`; parâmetro `completedAt` → `at`
- `src/lib/week.ts` — parâmetro `completedAt` → `at`
- `src/lib/format.ts` — `relativeDate` por dia de calendário
- `src/db/repos.ts` — histórico ordenado por `startedAt`
- `src/features/consistency/ConsistencyPage.tsx`, `src/features/home/HomePage.tsx`,
  `src/features/cardio/CardioPage.tsx`, `src/features/session/share/shareModel.ts`,
  `src/features/session/SessionPage.tsx` — o dia via `workoutAt`; "Feito ontem"
- `src/ui/WeeklySummary.tsx` — comentário
- Testes: `lib/format.test.ts` (+1), `db/repos.test.ts` (ordem por início),
  `consistency.integration.test.tsx` (+4, seeds coerentes),
  `home/week-across-gyms.integration.test.tsx` (+1, seeds coerentes),
  `session/sessions-across-gyms.integration.test.tsx` (seeds coerentes),
  `session/share/share.test.ts` (+1)
- `openspec/project.md` — decisão 4: o dia de um treino é o dia em que começou

### Specs Updated
- `openspec/specs/consistency/spec.md` — +1 requisito (*O Dia de um Treino É o
  Dia em que Ele Começou*)
- `openspec/specs/workout-sessions/spec.md` — *Session History Across Gyms*
  modificado (ordena e data pelo início)

### Verificação
- `npm test` — 96 arquivos, 1313 testes passando. A única falha,
  `officialCatalog.test.ts > reads the bundled file`, é **alheia a este change**:
  uma edição do catálogo pelo `/admin` pendente na árvore (7 esportes novos; o
  teste fixa 60 e o arquivo tem 67), deixada fora destes commits
- `npm run typecheck` — limpo
- `npx openspec validate --specs --strict` — 17/18; a falha em `exercises` é
  anterior (arquivo idêntico ao de `origin/main`)
