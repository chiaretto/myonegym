# Implementation Tasks: Peso global do exercício, com exceção por academia

**Change ID:** `global-weights-with-gym-exception`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Declarar `GLOBAL_GYM_ID = 0` em `src/db/types.ts` e documentar no
      comentário de `Weight`/`WeightHistory` que `gymId = 0` significa "todas as
      academias" (ids reais de academia começam em 1).
- [x] 1.2 Migração Dexie **v9** em `src/db/db.ts`: para cada `exerciseId` com
      pesos, escolher a academia mais antiga (`gyms.createdAt`, desempate por
      `id`) que tenha registro para ele e re-chavear seu `weights` e todo o seu
      `weightHistory` para `gymId = 0`. Demais academias ficam intactas (viram
      exceções). Sem exclusões, sem merges; idempotente se reexecutada.
- [x] 1.3 `src/db/repos.ts` — resolução de leitura:
      `getWeight(gymId, exerciseId)` devolve a exceção quando existe, senão a
      linha global; expor também o escopo (`'gym' | 'global'`) via
      `resolveWeight` (valor + escopo) para a UI.
- [x] 1.4 `weightsForGym(gymId)` — mesclar: partir do mapa global
      (`gymId = 0`) e sobrescrever com as exceções da academia.
- [x] 1.5 `saveWeight(gymId, exerciseId, value, unit, scope, d)` — no escopo
      `global` grava/atualiza a linha `gymId = 0` **e** remove a exceção da
      academia ativa, se houver; no escopo `gym` grava/atualiza a exceção. O
      histórico é anexado na mesma chave em que o peso foi gravado.
      *(`scope` entrou como parâmetro posicional obrigatório, para que o
      compilador aponte cada chamada; `clearGymOverride` não foi preciso — a
      remoção da exceção é o que salvar em escopo global já faz.)*
- [x] 1.6 `listHistory(gymId, exerciseId)` — devolver o histórico da exceção
      quando ela existe, senão o histórico global.
- [x] 1.7 `deleteHistoryEntry` — operar na chave do próprio registro (já é o
      caso); garantir que apagar o último registro **global** limpa o peso
      global sem tocar em exceções, e que apagar o último de uma exceção remove
      a exceção (o par volta a resolver para o global).
- [x] 1.8 `createGym` — remover o parâmetro `copyFromGymId` e a duplicação de
      pesos.
- [x] 1.9 `deleteGym` — cascatear apenas `gymId === id`, nunca `gymId = 0`
      (garantir por teste explícito).
- [x] 1.10 `deleteExercise` — continuar apagando pesos e histórico do exercício
      em **todas** as chaves, incluindo a global.
- [x] 1.11 Testes em `src/db/weights.test.ts` e `src/db/migration.test.ts`:
      resolução, save nos dois escopos, desmarcar → volta ao global, migração
      v9 com 1 academia e com 3 academias divergentes, cascatas.

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] `npm test src/db` verde

---

## Phase 2: Business Logic (State/Portability)

- [x] 2.1 `src/lib/hooks.ts` — `useGymWeights` e `useHistory` passam a resolver
      sem mudar de assinatura (a resolução desceu para os repositórios).
      *Nenhum hook novo:* o `WeightEditor` lê valor + escopo por
      `useLiveQuery(resolveWeight)`, como já fazia com `getWeight`.
- [x] 2.2 `src/data/portability.ts` — `parseBackup` aceita explicitamente peso
      e histórico com `gymId` sem academia correspondente (a sentinela global);
      documentar no comentário do `BackupDoc`.
- [x] 2.3 `importBackupReplaceAll` — após repovoar, aplicar a mesma promoção da
      migração v9 quando o documento é anterior a ela, para que um backup antigo
      não reintroduza o modelo só-por-academia. `SCHEMA_VERSION` foi para **6**,
      e é a **versão do documento** (`< GLOBAL_WEIGHTS_VERSION`) que decide —
      não a ausência de linhas globais, que um arquivo novo também pode ter.
- [x] 2.4 `generateExample` — semear os pesos do exemplo como **globais**
      (`gymId = 0`), junto da academia de exemplo.
- [x] 2.5 Testes em `src/data/portability.test.ts`: round-trip com linhas
      globais + exceções, restore de backup pré-v9, exemplo semeado global.

**Quality Gate:** PASSED
- [x] `npm test src/data src/lib` verde
- [x] Transições de escopo cobertas (global → gym → global)

---

## Phase 3: User Interface

- [x] 3.1 `src/features/exercise/WeightEditor.tsx` — checkbox **"Só nessa
      academia"** no modo de edição, com estado inicial = escopo atual
      (desmarcada no global, marcada quando há exceção) e reseed a cada troca de
      academia/exercício. Oculta em `readOnly`.
- [x] 3.2 `onSave` — chamar `saveWeight` com o escopo da flag; toast distinto
      para "Peso salvo." (global) e "Peso salvo só nesta academia." (exceção) e
      para o retorno ao global.
- [x] 3.3 Chip `<Icon name="building" /> {gym.name}` renderizado **apenas** no
      escopo `gym`; sufixo "· nesta academia" no cabeçalho do histórico idem
      (sem rótulo no escopo global).
- [x] 3.4 Estilos da flag em `src/features/exercise/exercise.css`, no padrão
      dos controles existentes (`unit-seg`, `wc-edit`); área de toque adequada
      ao mobile e texto de apoio curto explicando o efeito.
- [x] 3.5 `src/features/settings/GymsPage.tsx` — remover o campo "Copiar pesos
      de (opcional)" e o estado `copyFrom`.
- [x] 3.6 Conferir Home, `SessionPage` e `SessionEntryPage`: badges e card de
      compartilhamento saem corretos com pesos resolvidos (sem mudança de
      forma esperada).
- [x] 3.7 Testes de integração: `WeightEditor` nas duas rotas
      (`/exercise/:id?day=N` e `/session/:id/entry/:entryId`) — flag padrão,
      criar exceção, desmarcar, chip condicional; `GymsPage` sem o campo de
      cópia.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo (o projeto não tem script de lint)
- [x] Testes de integração verdes

---

## Phase 4: Integration & Polish

- [x] 4.1 Textos em pt-BR revisados (flag, textos de apoio, toasts,
      confirmações).
- [x] 4.2 Verificação manual do fluxo completo com 2 academias: definir peso
      global, criar exceção numa delas, conferir Home/sessão nas duas,
      desmarcar e confirmar retorno ao global.
- [x] 4.3 Migração verificada por teste (banco v8 semeado → upgrade v9) e o
      restore pré-global por teste de round-trip; no navegador, os badges da Home
      aparecem já resolvidos, sem flash.
      *Não executado:* upgrade sobre o banco real do usuário — o dispositivo dele
      fará isso na primeira abertura.
- [x] 4.4 Atualizar `openspec/project.md`: peso deixa de ser "por academia" —
      Key Design Decisions 1, 2 e 3 e a lista de entidades precisam refletir o
      peso global com exceção.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo e `npm test` verde (63 arquivos, 585 testes)
- [x] Documentação sincronizada

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
