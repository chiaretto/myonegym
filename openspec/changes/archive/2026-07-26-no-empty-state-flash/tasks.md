# Implementation Tasks: Telas não piscam o estado vazio enquanto carregam

**Change ID:** `no-empty-state-flash`

---

## Phase 1: Foundation (camada de leitura)

- [x] 1.1 Remover o `defaultResult` dos hooks de coleção em `src/lib/hooks.ts`
      (`useGyms`, `useCategories`, `useExercises`, `useDays`,
      `useSessionSummaries`, `useGymWeights`, `useHistory`, `usePhotos`,
      `useSessionEntries`), passando a devolver `T | undefined`
      ✓ 2026-07-26 — `useActiveSession` entrou junto: seu default `null`
      afirmava "não há treino em andamento", que a Home vira botão e selo
- [x] 1.2 Documentar no topo do arquivo a regra: `undefined` = carregando,
      valor = resolvido — inclusive quando vazio ✓ 2026-07-26
- [x] 1.3 Guardar em memória o último valor resolvido por consulta (chave =
      nome da consulta + deps) e devolvê-lo na primeira renderização de uma
      nova montagem ✓ 2026-07-26 — `useCachedLiveQuery` em `lib/hooks.ts`
- [x] 1.4 Manter `useExerciseMap` / `useCategoryMap` devolvendo `Map` sempre
      ✓ 2026-07-26 — inalterados
- [x] 1.5 Teste de unidade do cache ✓ 2026-07-26 — `src/lib/hooks.test.tsx`
      (undefined antes da resposta; `[]` quando vazio de verdade; segunda
      montagem já pinta o valor anterior)
- [x] 1.6 `clearQueryCache()` exportado e chamado em `vitest.setup.ts`: o cache
      é estado de módulo e sobrevive ao `table.clear()` do teardown dos testes
      ✓ 2026-07-26

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` apontou exatamente os pontos de uso a ajustar
- [x] Testes de unidade passam

---

## Phase 2: Telas (separar "carregando" de "vazio")

- [x] 2.1 `HomePage.tsx` ✓ 2026-07-26 — resumo da semana só depois de
      `summaries` (nada de "0 / 7"), "Próximo treino" só depois do histórico e
      da sessão ativa, e o selo de peso só depois de `weights` (nada de
      "definir" antes da resposta)
- [x] 2.2 `SessionsPage.tsx` ✓ 2026-07-26 — estado vazio e contador exigem
      `summaries` resolvido
- [x] 2.3 `GymsPage.tsx`, `CategoriesPage.tsx`, `DaysPage.tsx` ✓ 2026-07-26 —
      já usavam a forma `x && x.length === 0`, que passou a ser verdadeira
      apenas com dados resolvidos; nenhuma edição necessária
- [x] 2.4 `ExercisesPage.tsx` ✓ 2026-07-26 — os dois estados vazios agora
      exigem `exs` resolvido
- [x] 2.5 `GymSelector.tsx` ✓ 2026-07-26 — a guarda `if (!gyms) return null`,
      que nunca disparava, voltou a valer sem precisar de edição
- [x] 2.6 `SettingsPage.tsx` ✓ 2026-07-26 — `meta={gyms?.length}` vira
      `undefined` e a linha já esconde o contador; nenhuma edição necessária
- [x] 2.7 Demais consumidores apontados pelo typecheck ✓ 2026-07-26 —
      `SessionPage` e `SessionEntryPage` esperam por `entries` (a barra de
      progresso e o stepper contam-nos); `SessionPage` não gera card de
      compartilhamento antes dos pesos; `WeightEditor` e `PhotoTab` esperam por
      histórico e fotos; `ExerciseDetailPage` e `DayForm` já usavam `?? []`

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Nenhuma tela afirma "vazio" sem dado resolvido

---

## Phase 3: Testes de regressão

- [x] 3.1 Home com dias cadastrados: "Nenhum dia de treino ainda" nunca é
      renderizado, inclusive no primeiro quadro ✓ 2026-07-26
- [x] 3.2 Home com banco vazio: o estado vazio aparece normalmente ✓ 2026-07-26
- [x] 3.3 Ida e volta Home → Configurações → Home ✓ 2026-07-26
- [x] 3.4 Mesma cobertura para a tela de Sessões, mais o resumo da semana
      ✓ 2026-07-26 — tudo em
      `src/features/home/loading-flash.integration.test.tsx`
- [x] 3.5 Ajustar `days.integration.test.tsx` ✓ 2026-07-26 — o teste de
      reordenação remonta a Home milissegundos depois da escrita e lia o
      primeiro quadro; passou a esperar a ordem estabilizada (ver nota no
      próprio teste e "Notas de implementação" na proposta)
- [x] 3.6 Cobrir também a pílula "Sem academia" e os contadores das
      Configurações ✓ 2026-07-26 — eram os dois pontos que a Phase 2 dava por
      corrigidos sem que nenhum teste os prendesse

**Quality Gate:** PASSED
- [x] Os testes novos falham contra o comportamento antigo (verificado
      simulando o `defaultResult: []` sem cache: 5 dos 11 falham, incluindo os
      dois novos)
- [x] Suíte completa passa — 346 testes

---

## Phase 4: Integração e verificação

- [x] 4.1 `npm run build` e `npx tsc -b --noEmit` limpos ✓ 2026-07-26
- [x] 4.2 Suíte completa executada várias vezes ✓ 2026-07-26
- [ ] 4.3 **Pendente (usuário):** navegar no navegador entre Home, Sessões,
      Configurações e detalhe de exercício, ida e volta, com dados reais — sem
      flash; repetir com throttling de CPU (DevTools 4×/6×), onde o defeito era
      mais visível. O servidor de desenvolvimento do checkout (porta 5173) já
      serve este branch — não há ambiente de navegador nesta sessão para dirigir
      a conferência
- [ ] 4.4 **Pendente (usuário):** conferir o caso de banco vazio (primeiro uso)
      de ponta a ponta no navegador

**Quality Gate:**
- [x] Todos os testes passam
- [x] Build limpo
- [ ] Comportamento conferido no navegador

---

## Completion Checklist

- [x] Código e testes completos
- [x] Quality gates automatizados passaram
- [ ] Conferência em navegador (4.3, 4.4)
- [ ] Ready for `/openspec-archive`
