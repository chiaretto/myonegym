# Proposal: Telas não piscam o estado vazio enquanto carregam

**Change ID:** `no-empty-state-flash`
**Created:** 2026-07-26
**Status:** Implementation Complete (código) — conferência em navegador pendente
**Completed:** 2026-07-26

---

## Problem Statement

Ao navegar entre a Home e as outras telas, o usuário vê por uma fração de
segundo o estado vazio da Home — "Nenhum dia de treino ainda", com o convite de
ir para Configurações — antes de o conteúdo real aparecer. Parece um flash de
tela errada, e sugere que os dados foram perdidos.

Não é lentidão: é o app **afirmando que não há dados antes de ter perguntado**.

Os hooks de leitura passam um terceiro argumento a `useLiveQuery` — o
`defaultResult`:

```ts
// src/lib/hooks.ts:43
export function useDays() {
  return useLiveQuery(() => listDays(db), [], [])   // <- default: []
}
```

`useLiveQuery` só resolve a consulta ao IndexedDB de forma assíncrona, então a
**primeira renderização de cada montagem** devolve esse `[]`. E `[]` não quer
dizer "ainda não sei": quer dizer "consultei e não existe nenhum dia". A Home lê
exatamente assim:

```tsx
// src/features/home/HomePage.tsx:185
{days && days.length === 0 && ( ...estado vazio... )}
```

Como o `<Routes>` desmonta a Home ao sair dela (`src/App.tsx:77-100`), **toda
volta para a Home refaz o ciclo**: monta → `[]` → pinta o estado vazio → a
consulta resolve → pinta os dias. Daí o flash a cada navegação, e não só no
primeiro carregamento.

O mesmo defeito está espalhado por todas as telas de lista, porque todas as
listas nascem de hooks com `defaultResult` `[]` (`useGyms`, `useCategories`,
`useExercises`, `useDays`, `useSessionSummaries` — `src/lib/hooks.ts:20-53,104`):

| Tela | O que pisca |
|------|-------------|
| Home (`HomePage.tsx:185`) | "Nenhum dia de treino ainda" |
| Sessões (`SessionsPage.tsx:53`) | "Nenhuma sessão ainda" |
| Academias (`GymsPage.tsx:38`) | "Nenhuma academia" |
| Categorias (`CategoriesPage.tsx:39`) | "Nenhuma categoria" |
| Exercícios (`ExercisesPage.tsx:56,104`) | "Nenhum exercício" |
| Dias de treino (`DaysPage.tsx:60`) | "Nenhum dia de treino" |
| Seletor de academia (`GymSelector.tsx:25`) | pílula "Sem academia" |
| Configurações (`SettingsPage.tsx:56-59`) | contadores em `0` |

A lista de sessões é a pior das duas pontas: `listSessionSummaries` cruza
sessões, entradas e academias, então demora mais que as outras a resolver — e a
Home depende dela para o resumo da semana, que por um instante mostra
"0 / 7 treinos" mesmo para quem treinou.

Há uma evidência de que o `defaultResult` foi um acidente e não uma decisão: o
`GymSelector` já tenta tratar o carregamento (`if (!gyms) return null`,
`GymSelector.tsx:16`), guarda que **nunca dispara** porque o valor inicial é
`[]` e não `undefined`. O código foi escrito para a semântica certa e o
`defaultResult` a desfez.

## Proposed Solution

### A. Os hooks passam a distinguir "carregando" de "vazio"

Remover o `defaultResult` dos hooks de coleção, para que devolvam
`T[] | undefined`: `undefined` enquanto a consulta não resolveu, o array
(possivelmente vazio) depois. Essa é a única informação que falta às telas, e o
`useLiveQuery` já a fornece de graça — o app é que a estava descartando.

Os hooks de item único (`useNote`, `useSession`, `useSessionEntry`) já funcionam
assim; a mudança alinha as coleções ao padrão que o próprio arquivo documenta
("`undefined` while loading").

### B. Todo estado vazio passa a exigir uma resposta antes de afirmar o vazio

Cada tela da tabela acima passa a só renderizar o estado vazio quando os dados
**chegaram** e vieram vazios. Enquanto carrega, a tela não afirma nada: mostra o
seu cabeçalho e nada de conteúdo.

Não entram spinners nem skeletons. Os dados são locais (IndexedDB), a espera é
de um punhado de milissegundos, e um spinner que aparece e some nesse tempo é
outro flash — trocaríamos um piscar por outro.

### C. A volta para uma tela já visitada pinta o conteúdo de imediato

Só o item B já elimina a mensagem errada, mas sobra um quadro em branco a cada
navegação — conteúdo que aparece de repente ainda é piscar. Como a causa é a
remontagem, e não a lentidão do banco, o app guarda em memória **o último
resultado conhecido de cada consulta** e o entrega na primeira renderização da
próxima montagem.

Assim, voltar para a Home pinta os dias no mesmo quadro em que a tela aparece;
a consulta resolve logo em seguida e sobrescreve o valor. O cache vive no
módulo (morre com a aba), nunca é a fonte da verdade, e não substitui a
reatividade do Dexie: qualquer escrita continua propagando pela consulta viva.

### D. Um teste que trave o comportamento

Um teste de integração que monte a Home com dias já gravados e verifique que a
mensagem "Nenhum dia de treino ainda" **nunca** aparece — nem no primeiro
quadro. Sem ele, o próximo hook criado por conveniência com `defaultResult: []`
traz o defeito de volta sem barulho.

## Scope

### In Scope
- `src/lib/hooks.ts`: coleções devolvem `T[] | undefined`; cache do último valor
  resolvido por consulta.
- Ajuste das telas que hoje leem essas coleções, para separar "carregando" de
  "vazio" (Home, Sessões, Academias, Categorias, Exercícios, Dias, Seletor de
  academia, Configurações).
- Teste de regressão do flash na Home, e nas telas de lista onde couber.

### Out of Scope
- Spinners, skeletons ou qualquer indicador visual de carregamento.
- Animações ou transições entre rotas.
- Manter telas montadas entre navegações (keep-alive de rotas).
- Cache persistente de dados, pré-carregamento ou mudanças no schema/consultas
  do Dexie.
- A splash de boot (`index.html`), que trata de outro momento — o arranque a
  frio.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhuma mudança de schema, dados ou consultas |
| API (repos) | No | `src/db/repos.ts` permanece intacto |
| State | Yes | `src/lib/hooks.ts`: tipos de retorno e cache do último valor |
| UI | Yes | Guardas de estado vazio em 8 telas/componentes |

## Architecture Considerations

- Mantém o padrão já existente no projeto: `undefined` = carregando, valor =
  resolvido. Os hooks de item único já são assim; isto estende a regra às
  coleções em vez de introduzir um conceito novo.
- Os hooks derivados `useExerciseMap` e `useCategoryMap` continuam devolvendo um
  `Map` sempre (já fazem `?? []`), então quem só faz consultas neles não muda.
- O cache do item C é um detalhe interno de `lib/hooks.ts` — nenhuma tela sabe
  que ele existe, e removê-lo depois não quebraria nada além de reintroduzir o
  quadro em branco.
- TypeScript é o mecanismo de migração: ao tirar o `defaultResult`, o tipo vira
  `T[] | undefined` e o compilador aponta cada ponto de uso que precisa decidir
  o que fazer enquanto carrega. Nenhuma tela pode ficar para trás em silêncio.

## Success Criteria

- [ ] Navegar entre Home e as demais telas, ida e volta, não exibe em nenhum
      momento "Nenhum dia de treino ainda" quando há dias cadastrados
- [ ] O mesmo vale para as telas de Sessões, Academias, Categorias, Exercícios e
      Dias de treino, e para a pílula "Sem academia"
- [ ] O resumo da semana não pisca "0 / 7 treinos" antes do número real
- [ ] Com o banco realmente vazio, cada estado vazio continua aparecendo — só
      que depois da resposta, e uma vez só
- [ ] Existe teste automatizado que falha se o estado vazio voltar a ser
      renderizado antes dos dados
- [ ] `npm run build` (typecheck) e `npm test` passam

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Uma tela deixa de renderizar o estado vazio de vez (guarda invertida) | Med | Med | Testes cobrem os dois lados: com dados não pisca, sem dados aparece |
| O cache do último valor mostra dado obsoleto | Low | Low | Só vale como primeiro quadro, dentro da mesma aba, e é sobrescrito assim que a consulta viva resolve — que é sempre |
| Testes existentes esperam `[]` e passam a receber `undefined` | Med | Low | O typecheck aponta todos os usos; os testes de UI usam `findBy*`, que já esperam pela resolução |
| Restar algum quadro em branco na primeira visita de cada tela | Med | Low | Aceito e explícito: na primeira visita não existe verdade anterior para pintar, e um quadro sem conteúdo é honesto — ao contrário de afirmar que não há dados |

---

## Notas de implementação (2026-07-26)

**`useActiveSession` entrou no mesmo saco.** Não estava na lista original, mas
seu `defaultResult` era `null` — "não há treino em andamento" —, e a Home
transforma isso num botão "Iniciar" e no selo "Próximo treino". A cada visita o
selo aparecia num card e pulava para outro. Mesmo defeito, mesma correção.

**A maior parte das telas não precisou de edição.** Metade dos estados vazios já
estava escrita como `{dados && dados.length === 0 && …}`, e a guarda
`if (!gyms) return null` do `GymSelector` já existia — todas escritas para a
semântica certa, e todas neutralizadas pelo `defaultResult`. Tirar o default
bastou para passarem a valer. O typecheck apontou o resto, um por um.

**O primeiro quadro pode ficar um tique atrasado logo depois de uma escrita.**
O cache entrega o último valor conhecido; se o usuário escreve e navega no mesmo
instante, a consulta viva ainda não atualizou o cache e a tela nova pinta o
valor anterior por um quadro antes de se corrigir. É o preço de pintar algo em
vez de nada, e é pequeno: escrever e navegar leva centenas de milissegundos,
enquanto a atualização leva poucos.

Um teste existente vivia exatamente nessa janela:
`days.integration.test.tsx` reordenava dias e remontava a Home em
milissegundos, e lia o primeiro quadro que casasse. Passou a esperar pela ordem
estabilizada — a asserção continua sendo "a Home reflete a nova ordem", que é o
que o teste sempre quis dizer.

**Verificação do valor dos testes novos.** Restaurando o comportamento antigo
(`defaultResult: []`, sem cache), 5 dos 9 testes novos falham — incluindo os dois
que reproduzem o relato original. Eles medem o defeito, não apenas a
implementação.

---

## Archive Information

**Archived:** 2026-07-26
**Duration:** mesmo dia (proposta, implementação e arquivamento em 2026-07-26)
**Outcome:** Implementado. A conferência em navegador (tasks 4.3 e 4.4) ficou
com o usuário — esta sessão não tinha ambiente de navegador para dirigi-la.

### Files Modified
- `src/lib/hooks.ts` — coleções passam a devolver `T | undefined`; cache do
  último valor resolvido por consulta (`useCachedLiveQuery`, `clearQueryCache`)
- `src/features/home/HomePage.tsx` — resumo da semana, "Próximo treino" e selo
  de peso esperam pela resposta
- `src/features/session/SessionsPage.tsx`, `SessionPage.tsx`,
  `SessionEntryPage.tsx` — estado vazio, barra de progresso, stepper e card de
  compartilhamento esperam pelos dados
- `src/features/settings/ExercisesPage.tsx` — os dois estados vazios exigem o
  catálogo resolvido
- `src/features/exercise/WeightEditor.tsx`,
  `src/features/exercise/photo/PhotoTab.tsx` — histórico e fotos idem
- `src/lib/hooks.test.tsx` (novo) — contrato do hook e do cache
- `src/features/home/loading-flash.integration.test.tsx` (novo) — 8 testes que
  assertam sobre o **primeiro quadro**
- `src/features/settings/days.integration.test.tsx` — espera a ordem
  estabilizada em vez do primeiro quadro
- `vitest.setup.ts` — limpa o cache entre testes

Não precisaram de edição, e passaram a se comportar corretamente só com a
mudança nos hooks: `GymsPage`, `CategoriesPage`, `DaysPage`, `SettingsPage`,
`GymSelector`, `ExerciseDetailPage`.

### Specs Updated
- `openspec/specs/app-foundation/spec.md` — nova requirement "Estados Vazios Só
  Depois da Resposta"
- `openspec/specs/home-navigation/spec.md` — "Home Accordion of Training Days" e
  "Weekly Training Summary" passam a exigir resposta antes de afirmar vazio/zero
