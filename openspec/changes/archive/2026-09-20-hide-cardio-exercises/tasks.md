# Implementation Tasks: Ocultar exercícios de cardio da aba Cardio

**Change ID:** `hide-cardio-exercises`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 `src/db/types.ts`: `HiddenCardio { exerciseId: number }`, com o comentário de por que é tabela e não campo do exercício (oficiais não têm linha)
- [x] 1.2 `src/db/db.ts`: `version(14).stores({ hiddenCardio: '&exerciseId' })`, sem `upgrade`; tipar a tabela em `MyOneGymDB`
- [x] 1.3 `src/db/repos.ts`:
  - `listHiddenCardioIds(d)` → `number[]`
  - `setCardioHidden(exerciseId, hidden, d)` — `put`/`delete`, idempotente; aceita id oficial e do usuário
  - `deleteExercise` apaga o registro do exercício na mesma transação
  - `resetAll` limpa a tabela
  - `listCardioExercises` fica como está (devolve todos)
- [x] 1.4 `src/data/portability.ts`: `BackupDoc.hiddenCardio?: number[]` (**`SCHEMA_VERSION` fica em 6** — ver nota abaixo); export lê a tabela; import aceita ausente (= nada oculto), descarta não-inteiros, duplicados e ids que não resolvem em nenhuma das duas fontes; entra na transação de substituição
  - **Desvio da proposta:** a versão do documento **não** foi para 7. O arquivo já registra a regra da casa (aquecimentos, vídeos): não se sobe a versão quando nenhum dos lados lê errado o outro. É o caso — a chave extra é ignorada por um app antigo, e a ausência dela lê aqui como "nada oculto". Além disso, nada no app recusa um backup por versão, então o "7" não protegeria ninguém; só faria arquivo antigo parecer irrestaurável
  - `allTables` ganhou `hiddenCardio`, o que cobre de uma vez o `clear` da restauração e o `resetAll`
  - `catalogProposal.ts`: a transação do Assistente passou a incluir `hiddenCardio` — ela chama `deleteExercise`, cuja cascata agora toca a tabela (dois testes existentes pegaram isso)
- [x] 1.5 Testes: `repos.test.ts` (ocultar/mostrar idempotente, id oficial, cascata no delete, reset), `migration.test.ts` (v13 → v14 preserva dados, tabela vazia), testes de portabilidade (ida e volta, backup v6 sem o campo, ids órfãos descartados)

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de unidade passam

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 `src/lib/hooks.ts`: `useHiddenCardioIds()` (`useCachedLiveQuery`, devolve `Set<number> | undefined`)
- [x] 2.2 Função pura (em `src/lib/`, ao lado dos filtros existentes) `visibleCardio(exercises, hidden, runningExerciseId)` → `{ visible, hiddenCount }`: o exercício dono da sessão em andamento fica visível mesmo oculto, e **continua contando** em `hiddenCount` — ele está oculto, só está sendo mostrado enquanto a sessão durar; `hiddenCount` ignora ids que não são (mais) cardio
- [x] 2.3 Testes de unidade da função: nada oculto, alguns, todos, oculto-mas-em-andamento, id oculto que não é mais cardio

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Os cinco casos cobertos

---

## Phase 3: User Interface

- [x] 3.1 `src/features/settings/CardioSettingsPage.tsx` + rota `/settings/cardio` em `App.tsx`: appbar com voltar para `/settings`; lista de todos os cardios (mídia, nome, categorias) com interruptor "Mostrar na aba Cardio" por linha (`role="switch"`, `aria-checked`, rótulo acessível com o nome do exercício); grava na hora; estado vazio quando não há cardio nenhum, levando ao cadastro; nada afirmado antes das leituras
- [x] 3.2 `SettingsPage.tsx`: `NavRow` "Cardio" no grupo Cadastros, depois de "Dias de treino", sub "Escolha o que aparece na aba Cardio", meta = visíveis
- [x] 3.3 `CardioPage.tsx`: esperar exercícios **e** ocultos; listar `visible`; rodapé "N oculto(s) · Gerenciar" → `/settings/cardio` quando `hiddenCount > 0`; estado vazio "Todos os cardios estão ocultos" (com o mesmo link) distinto do "Nenhum cardio ainda"; o resumo da semana aparece nos dois casos com lista e no de todos-ocultos
- [x] 3.4 CSS: interruptor e rodapé com os tokens existentes (`--fs-*`, `--accent`), legíveis na fonte máxima
- [x] 3.5 Testes de integração: `cardio.integration.test.tsx` (ocultar tira a linha; em andamento permanece com "Continuar"; rodapé; todos ocultos) e `cardio-settings.integration.test.tsx` (alternar persiste, oficial e do usuário, contagem na linha de Configurações)

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de integração passam

---

## Phase 4: Integration & Polish

- [x] 4.1 Conferir no app rodando: ocultar os sete esportes, iniciar um cardio, ocultá-lo em andamento, exportar/importar — conferido pelo usuário no navegador, 2026-09-20
- [x] 4.2 `npm test` inteiro e `npm run build` — 1341 de 1342 passam; build limpo. A única falha é `officialCatalog.test.ts` (espera 67 exercícios, acha 68) e vem da mudança **não commitada** do supino-reto-com-halteres que está na árvore, não desta change: no `HEAD` o arquivo tem 67
- [x] 4.3 Conferir a tela nova na tela mais estreita e na fonte máxima — conferido pelo usuário, 2026-09-20
- [x] 4.4 Revisar comentários `CHANGED:` nos pontos alterados, no padrão do repositório

**Quality Gate:** PASSED
- [x] Todos os testes passam (a exceção de 4.2 é alheia à change e não entra no commit)
- [x] Build limpo
- [x] Deltas conferem com o comportamento final

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
