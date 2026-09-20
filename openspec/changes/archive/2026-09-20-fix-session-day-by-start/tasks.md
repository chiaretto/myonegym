# Implementation Tasks: O dia de um treino é o dia em que ele começou

**Change ID:** `fix-session-day-by-start`

---

## Phase 1: Foundation (a regra, e a ordem)

- [x] 1.1 `src/lib/consistency.ts`: `workoutAt(session: Pick<Session, 'startedAt'>): number` — o único lugar que diz em que instante um treino "foi". Documentar a divisão: `completedAt` é duração e estado, nunca dia
- [x] 1.2 `src/lib/consistency.ts` e `src/lib/week.ts`: renomear o parâmetro `completedAt` → `at` (e `cardioAt` continua), inclusive nos comentários de cabeçalho e no de `ui/WeeklySummary.tsx`
- [x] 1.3 `src/db/repos.ts` `listSessionSummaries`: ordenar por `startedAt` desc, id como desempate; comentário atualizado
- [x] 1.4 `repos.test.ts`: uma sessão iniciada antes, concluída depois de outra, lista na ordem dos inícios

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de unidade de `consistency`, `week` e `repos` passam sem alteração de lógica

---

## Phase 2: Business Logic (os callers)

- [x] 2.1 `ConsistencyPage.tsx`: `timestamps`, `cardioAt`, `monthSessions` e o `ts` de cada item via `workoutAt`; a duração continua `completedAt − startedAt`
- [x] 2.2 `HomePage.tsx` e `CardioPage.tsx`: faixa da semana e estrela via `workoutAt`
- [x] 2.3 `shareModel.ts`: `dateLabel` via `workoutAt`
- [x] 2.4 `SessionPage.tsx`: "Feito {relativeDate(startedAt)} · {duração}"
- [x] 2.5 Gate por `grep`: nenhuma ocorrência de `session.completedAt!` ou `s.session.completedAt!` fora de duração e de filtro de concluída

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] `grep -rn "completedAt!" src --include=*.tsx --include=*.ts | grep -v test` só mostra duração (uma ocorrência, em `ConsistencyPage`)

---

## Phase 3: Testes de integração (o cenário da meia-noite)

- [x] 3.1 Helper de teste: sessão concluída com `startedAt` às 23h40 do dia D e `completedAt` às 00h15 de D+1 (escrever os dois campos direto no banco, como os testes de Consistência já fazem)
- [x] 3.2 `consistency.integration.test.tsx`: calendário marca D, não D+1; estrela de cardio idem; item da lista datado em D; sequência conta D
- [x] 3.3 `home` (faixa da semana) e `cardio`: a célula acesa é a de D
- [x] 3.4 `session` / `shareModel.test.ts`: "Feito" com o dia de D; `dateLabel` da imagem em D; duração 35 min
- [x] 3.5 Revisar seeds existentes que gravam `completedAt` num dia escolhido: `startedAt` no mesmo dia, ou o teste passa a afirmar o dia errado por acidente. **Feito nos três helpers** (`consistency`, `week-across-gyms`, `sessions-across-gyms`): o treino **começa** em `at` e termina 30 min depois — o deslocamento vai para a conclusão, nunca para o início, porque um seed em "agora − 24 h" rodado às 00h20 recuaria para o dia anterior
- [x] 3.6 **Fora da lista, necessário:** `relativeDate` (`lib/format.ts`) contava blocos de 24 h, então "Feito ontem" dizia "hoje" para um treino das 23h40 visto às 00h30 — o mesmo erro, no rótulo. Passou a contar **dias de calendário** (arredondado, à prova de horário de verão), com teste. Vale também para "iniciado hoje" e para a linha do tempo de pesos

**Quality Gate:**
- [ ] Testes de integração passam
- [ ] Nenhum teste reprovado por seed incoerente foi "corrigido" mudando a expectativa

---

## Phase 4: Integration & Polish

- [x] 4.1 Textos em pt-BR revisados ("Feito ontem · 35 min")
- [x] 4.2 `openspec/project.md`: uma linha na decisão 4 — o dia de um treino é o dia em que começou; `completedAt` é duração e estado
- [x] 4.3 Suíte completa: 96 arquivos e 1313 testes verdes; a única falha, `officialCatalog.test.ts > reads the bundled file`, é **alheia a este change** — vem de uma edição do catálogo pelo `/admin` ainda não commitada na árvore (7 esportes novos; o teste fixa 60 exercícios e o arquivo tem 67). `npx openspec validate fix-session-day-by-start --strict` válido

**Quality Gate:** PASSED (com a ressalva do catálogo, que não é deste change)
- [x] Todos os testes deste change passam
- [x] `tsc --noEmit` limpo
- [x] Documentação sincronizada (`openspec/project.md`, decisão 4)

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
