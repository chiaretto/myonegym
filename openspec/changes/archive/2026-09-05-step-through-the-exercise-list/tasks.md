# Implementation Tasks: Percorrer a lista de exercícios sem voltar a ela

**Change ID:** `step-through-the-exercise-list`

---

## Phase 1: Os filtros viajam na URL

- [x] 1.1 Em `src/lib/exerciseFilters.ts`, `filtersToParams(filters)` e
      `filtersFromParams(params)`. Um valor "todas"/"todos" **não** é escrito, e
      um parâmetro ausente lê como "sem filtro" — é isso que mantém a rota nua
      funcionando.
- [x] 1.2 Teste de **ida e volta**: cada combinação (busca, categoria por id,
      "sem categoria", dia por id, "sem dia", tipo) volta igual. É a única peça
      que pode discordar de si mesma.
- [x] 1.3 Teste dos casos degenerados: parâmetro ausente, valor inválido
      (`cat=abc`), e uma URL sem query alguma.

**Quality Gate:** PASSED ✓ 2026-09-05
- [x] `npm run typecheck` limpo
- [x] `exerciseFilters.test.ts` — 29 testes

---

## Phase 2: A lista monta o endereço

- [x] 2.1 `ExercisesPage`: a ação "Ver" leva os filtros ativos no endereço.
- [x] 2.2 Teste: filtrar por tipo e acionar "Ver" produz uma URL com o tipo.

**Quality Gate:** PASSED ✓ 2026-09-05
- [x] `npm run typecheck` limpo

---

## Phase 3: A tela percorre

- [x] 3.1 `ExerciseViewPage` lê os filtros da URL e aplica o **mesmo**
      `filterExercises` que a lista aplica, sobre `useExercises`/`useDays`.
- [x] 3.2 `StepperBar` com Voltar/Avançar, desabilitados nas pontas.
- [x] 3.3 Barra **ausente** quando o exercício aberto não está na lista
      percorrida (link com outros filtros, alternativa, busca que deixou de
      casar).
- [x] 3.4 Navegar mantém o endereço: avançar, voltar e abrir uma alternativa
      preservam os mesmos filtros.
- [x] 3.5 Testes de integração: percorrer da primeira à última posição; com
      filtro ativo o percurso não sai do conjunto; pontas desabilitadas; sem
      lugar na lista, sem barra; recarregar mantém o percurso.

**Quality Gate:** PASSED ✓ 2026-09-05
- [x] `npm run typecheck` limpo
- [x] 8 testes de integração do percurso, verdes

---

## Phase 3.5: Peso de cada academia no seletor do histórico

Pedido durante a execução. Toca `weights`, não `exercises` — está aqui em vez de
numa proposta própria porque é uma linha de leitura numa lista que já existe.

- [x] 3.5.1 `weightByGym(exerciseId)` em `db/repos`: o peso em vigor por
      academia, numa leitura indexada só — o espelho de `weightsForGym`.
- [x] 3.5.2 `useWeightByGym` e o valor na linha de cada academia do seletor;
      ausência marcada, nunca zero.
- [x] 3.5.3 Testes: exceção e global lado a lado, ausência sem zero, e trocar
      ainda leva ao histórico daquela academia.

**Quality Gate:** PASSED ✓ 2026-09-05
- [x] `npm run typecheck` limpo
- [x] `weight-history-modal.integration.test.tsx` — 20 testes

---

## Phase 4: Fechamento

- [x] 4.1 Teste que compara **o que a lista mostra** com **o que a tela
      percorre** para o mesmo conjunto de filtros — a garantia de que as duas
      não divergem.
- [x] 4.2 Rodar a suíte inteira e o build.
- [x] 4.3 Conferir que nada em `openspec/specs/` ficou desatualizado além dos
      deltas desta mudança.

**Quality Gate:** PASSED ✓ 2026-09-05
- [x] `npm test` inteiro verde: 85 arquivos, 1110 testes
- [x] `npm run build` sem erro

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
