# Implementation Tasks: Exercícios Alternativos

**Change ID:** `add-exercise-alternatives`

> **Reespecificado após a primeira implementação.** A primeira versão agrupava
> alternativas numa linha só nas listas do dia e da sessão; o fechamento
> transitivo que isso exigia impedia um exercício de ter mais de um tipo de
> variação. Todo o mecanismo de colapso foi removido — ver *Implementation
> Notes* na proposta. As tarefas abaixo descrevem o que ficou de pé.

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 `src/db/types.ts`: `Exercise.alternativeIds: number[]` — simétrico e
      **não** transitivo, documentando por que a ausência de fechamento é o que
      permite vários tipos de variação. `SessionEntry` fica como estava.
- [x] 1.2 `src/db/db.ts`: migração **v7** aditiva — `alternativeIds = []` em
      todo exercício existente. Sem índice novo (a relação é simétrica, o
      próprio registro responde "quem aponta para mim").
- [x] 1.3 `src/db/repos.ts`: `setAlternatives(exerciseId, ids, d)` — grava `ids`
      como a lista do exercício e escreve **apenas o vínculo de volta** nos
      pares; as alternativas que cada par já tinha ficam intactas.
- [x] 1.4 `src/db/repos.ts`: `createExercise`/`updateExercise` aceitam
      `alternativeIds` e delegam a `setAlternatives`. `undefined` = "este
      chamador não está editando alternativas"; só `[]` limpa a lista.
- [x] 1.5 `src/db/repos.ts`: `deleteExercise` remove o id da lista de cada par.
- [x] 1.6 `src/lib/alternatives.ts`: `alternativesOf(exercise, exMap)` — as
      alternativas que ainda existem, na ordem declarada.
- [x] 1.7 `src/db/repos.ts`: `swapEntryExercise(entryId, exerciseId, d)` —
      valida contra as alternativas **vivas** do exercício atual da entrada e
      que a sessão está em andamento; reescreve `exerciseId` + `exerciseName`;
      **não** toca em `done` nem no número de entradas.
- [x] 1.8 `startSession` **não muda**: uma entrada por exercício do dia.
- [x] 1.9 Testes de dados (`src/db/repos.test.ts`, `src/db/migration.test.ts`):
      simetria, n tipos de variação sem contágio, remoção de um vínculo sem
      afetar os outros, exclusão desvinculando, troca preservando `done`,
      migração v6→v7.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes unitários passam

---

## Phase 2: Portabilidade

- [x] 2.1 `src/data/portability.ts`: `alternativeIds` viaja dentro de
      `Exercise`; `normalizeAlternatives` no `parseBackup` trata ausência →
      `[]`, descarta ids apontando para fora do backup, ignora auto-referência e
      re-simetriza vínculos de um lado só — **sem** fechar transitivamente, o
      que inventaria variações que o usuário nunca declarou.
      `SCHEMA_VERSION` = 5.
- [x] 2.2 Testes (`src/data/portability.test.ts`): round-trip preservando os
      tipos separados e a troca gravada na sessão; backup antigo sem o campo;
      vínculo pendente, assimétrico e auto-referente.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Portabilidade coberta por teste

---

## Phase 3: User Interface

- [x] 3.1 `src/features/settings/ExercisesPage.tsx` (formulário): seletor
      múltiplo **"Alternativas"** com busca; os já selecionados permanecem
      visíveis fora da busca; texto de apoio dizendo que elas **não** entram nos
      dias de treino junto com o exercício.
- [x] 3.2 `src/features/settings/ExercisesPage.tsx` (lista): indicador de
      alternativas por item, ao lado dos chips de dia; nada quando não há.
- [x] 3.3 `src/features/exercise/AlternativesSection.tsx` (novo): a seção
      "Alternativas", com `hrefFor` injetado — os dois chamadores querem
      destinos diferentes. Não renderiza nada quando a lista é vazia.
- [x] 3.4 `src/features/exercise/ExerciseDetailPage.tsx`: a seção na aba
      "Detalhe", abaixo do peso alvo; o link carrega o `?day=` adiante; a barra
      Voltar/Avançar não é exibida quando o exercício não está no dia do
      endereço (duas setas mortas informam menos que barra nenhuma).
- [x] 3.5 `src/features/session/SessionEntryPage.tsx`: a mesma seção na aba
      "Execução"; pré-visualização da alternativa endereçada por `?alt=`, com
      mídia/peso/observações/fotos dela; barra inferior trocada por **"Fiz este
      no lugar"**; "Concluído" não aparece sobre a alternativa; Voltar retorna à
      entrada.
- [x] 3.6 CSS da seção em `src/styles/global.css`.
- [x] 3.7 Testes de integração:
      `src/features/session/alternatives.integration.test.tsx` (Home e dia
      intactos, seção lista e abre, tipos não se misturam, stepping ignora
      alternativas, troca preservando done, sem troca em sessão concluída) e
      `src/features/settings/alternatives.integration.test.tsx` (n tipos sem
      contágio, simetria, remoção seletiva).

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de integração passam

---

## Phase 4: Reversão do mecanismo de colapso

- [x] 4.1 Removidos `collapseAlternatives`, `lineIndexOf`, `WorkoutLine` e
      `alternativesPulledIn` de `src/lib/alternatives.ts`.
- [x] 4.2 `SessionEntry.alternativeIds` removido; `startSession` de volta a uma
      entrada por exercício.
- [x] 4.3 `HomePage`, `SessionPage`, `DaysPage` e `daySubtitle` revertidos ao
      comportamento original; indicador `+N`, marcador "Alternativa" no
      formulário de dia e `AlternativeSwitcher` removidos.
- [x] 4.4 Testes e fixtures do modelo antigo removidos ou reescritos.

**Quality Gate:** PASSED
- [x] Nenhum resto do colapso no diff (`git diff` de `HomePage`, `SessionPage`,
      `DaysPage` e `lib/days.ts` está vazio)

---

## Phase 5: Integração & Verificação

- [x] 5.1 Textos em português revisados ("Alternativas", "Fiz este no lugar",
      "Alternativa de X", texto de apoio do seletor).
- [x] 5.2 Confirmado pelo diff que `startSession`, `share/shareModel.ts`,
      `listSessionSummaries` e `ConsistencyPage.tsx` **não** foram tocados.
- [x] 5.3 `npm run build` limpo; 415 testes passam.
- [x] 5.4 Suíte estressada 10× completa: 0 falhas neste branch. (Em `main`, as
      mesmas 10 execuções produzem 6 falhas intermitentes pré-existentes — ver
      a nota na proposta.)

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
