# Implementation Tasks: Cabeçalho enxuto nas telas de detalhe do exercício

**Change ID:** `trim-exercise-detail-header`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 (N/A) Nenhuma mudança de schema, repositório ou dados

**Quality Gate:** PASSED
- [x] Confirmado: a mudança é puramente de apresentação

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 (N/A) Nenhuma mudança de estado — `?day=` continua lido para navegação

**Quality Gate:** PASSED
- [x] Confirmado: `backTo`, `prevEx`/`nextEx` e `goTo` permanecem intactos

---

## Phase 3: User Interface

- [x] 3.1 `ExerciseDetailPage.tsx`: removidos o `<h2 className="ex-title">`, o chip
      de dias e o `useMemo` de `inDays` (com o import `useMemo`). `fromDay`,
      `backTo` e `prevEx`/`nextEx` intactos. O bloco `.ex-head` agora só renderiza
      quando há categorias, para não deixar um espaço vazio sob a mídia
- [x] 3.2 `SessionEntryPage.tsx`: removidos o `<h2 className="ex-title">` e o chip
      de `session.dayName`; mantidos o chip "Concluído" e os de categoria; o
      `.ex-head` só renderiza quando há algum chip
- [x] 3.3 `exercise.css`: regra `.ex-title` removida (sem uso restante — `DaysPage`
      usa apenas `.hero`/`.ex-chips`); `.ex-head` mantém o `margin-bottom: 16px`
      entre a linha de chips e as abas.
      **Nome longo verificado no CSS:** `.appbar h1` não tem `nowrap` nem
      `ellipsis` e `.appbar` não tem `overflow: hidden` — o nome quebra em duas
      linhas e continua legível por inteiro. Não há truncamento, então o risco
      levantado na proposta não se concretiza
- [x] 3.4 Testes atualizados: as asserções `findByRole('heading', …, { level: 2 })`
      viraram `level: 1` em `day-nav.integration.test.tsx` (7),
      `session.integration.test.tsx` (10) e `stepper-bar.integration.test.tsx` (1)
      — o nome agora só existe como `h1` da barra de topo. O comentário em
      `stepper-bar` que explicava o `h1`+`h2` foi corrigido
- [x] 3.5 Novo `src/features/exercise/detail-header.integration.test.tsx` (5 testes)
      cobrindo o requisito: nome uma única vez nas duas telas, ausência do dia
      (inclusive do "N dias"), categorias preservadas e chip "Concluído" preservado

**Quality Gate:** PASSED
- [x] `npm run typecheck` e `npm run build` sem erros nem imports não usados
- [x] Testes de componente/integração passam

---

## Phase 4: Integration & Polish

- [x] 4.1 i18n: N/A — nenhuma string nova (só remoções)
- [x] 4.2 Verificação das duas rotas: coberta pelos testes de integração, que
      montam o `App` real com o roteador em `/exercise/:id?day=N` e
      `/session/:id/entry/:entryId` e checam nome único, ausência do dia,
      categorias, "Concluído" e Voltar/Avançar (`day-nav` + `detail-header`).
      **Conferência visual no navegador fica com o usuário** — não há automação
      de browser nesta sessão
- [x] 4.3 Settings → Exercícios continua mostrando os dias: `ExercisesPage.tsx`
      não foi tocada e `exercises.integration.test.tsx` /
      `exercises.filters.integration.test.tsx` seguem passando
- [x] 4.4 Deltas em `specs/` escritos na fase de proposta e conferidos contra o
      código final

**Quality Gate:** PASSED
- [x] 36 arquivos de teste / 242 testes passam
- [x] `tsc -b --noEmit` limpo; `vite build` OK
- [x] Documentação/spec sincronizadas

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
