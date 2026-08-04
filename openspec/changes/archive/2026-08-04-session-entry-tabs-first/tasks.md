# Implementation Tasks: Abas no topo no detalhe do exercício

**Change ID:** `session-entry-tabs-first`

---

## Phase 1: Foundation (Data Layer)

Nenhuma. Esta mudança não toca em dados, repositórios nem persistência — é
reordenação de UI. As fases 1 e 2 do template não se aplicam e ficam vazias de
propósito, em vez de inventar trabalho para preenchê-las.

---

## Phase 2: Business Logic (Domain/State)

Nenhuma. O `useState` da aba ativa, o stepper e a troca por alternativa
continuam exatamente como estão.

---

## Phase 3: User Interface

- [x] 3.1 `SessionEntryPage`: mover `<Tabs>` para logo abaixo dos chips de
      status; mover `.hero` (`<Media>`) para dentro do painel "Execução", acima
      do `WeightEditor`
- [x] 3.2 `SessionEntryPage`: tirar os chips de categoria do `.ex-head` e
      renderizá-los no topo do painel "Observações", acima do `NoteEditor`.
      O `.ex-head` passa a existir só quando há chip de **status** (Concluído /
      Alternativa de X)
- [x] 3.3 `ExerciseDetailPage`: mesma reordenação — abas primeiro, `.hero`
      dentro da aba "Detalhe", categorias no topo de "Observações". Sem chips de
      status aqui (não existe entrada de sessão), então o cabeçalho fica vazio e
      as abas encostam na `BackBar`
- [x] 3.4 CSS: `.ex-head`, `.tabs` e `.hero` já fecham com `margin-bottom: 16px`
      cada, então a nova pilha (status → abas → painel) mantém o mesmo ritmo sem
      ajuste. Só faltava o respiro dos chips de categoria dentro do painel, que
      o cabeçalho fornecia antes: `.ex-chips-tab { margin-bottom: 16px }`
- [x] 3.5 Espaçamento conferido pelo usuário em 2026-08-04 nas três abas × duas
      telas: sem gap duplo, sem colapso de margem, com e sem chips de status,
      com e sem categorias, com e sem mídia

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Ordem e pertencimento verificados por teste nas 3 abas × 2 telas

---

## Phase 4: Integration & Polish

- [x] 4.1 Sem strings novas — os rótulos das abas e dos chips não mudam
- [x] 4.2 Testes afetados: os três mapeados passaram **sem alteração** (não
      dependiam da ordem). Quem quebrou foi
      `detail-header.integration.test.tsx` — "keeps the category labels" virou
      "moves the category labels into Observações"
- [x] 4.3 Novo arquivo `detail-tabs-layout.integration.test.tsx` (7 casos): abas
      antes da mídia e do peso, mídia só na primeira aba, categorias dentro de
      "Observações" e abaixo das abas, "Concluído" acima das abas em todas elas
      — nas duas telas
- [x] 4.4 Verificado pelo usuário em 2026-08-04: as três abas estão na dobra em
      viewport de celular, sem rolagem
- [x] 4.5 Documentação: os specs de `workout-sessions` e `exercises` são
      atualizados pelos deltas desta mudança; `project.md` não precisa mexer

**Quality Gate:** PASSED
- [x] `npx vitest run` — 62 arquivos, 561 testes passando
- [x] `npm run build` limpo
- [x] Documentação sincronizada

---

## Completion Checklist

- [x] Todas as fases aplicáveis completas
- [x] Todos os quality gates passados
- [x] Documentação sincronizada
- [x] Pronto para `/openspec-archive`
