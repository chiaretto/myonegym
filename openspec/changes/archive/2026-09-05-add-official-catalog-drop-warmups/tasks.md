# Implementation Tasks: Catálogo oficial ao lado do catálogo do usuário, e fim dos aquecimentos

**Change ID:** `add-official-catalog-drop-warmups`

---

## Phase 1: Foundation (a fonte oficial)

- [x] 1.1 Mover `data/myonegym-exercicios-oficial.json` para
      `src/data/officialCatalog.json` (versionado, entra no bundle).
- [x] 1.2 `src/data/officialCatalog.ts`: lê o JSON uma vez, **preservando os ids
      do arquivo**, e devolve `Exercise[]` e `Category[]` congelados. Expõe
      `USER_ID_BASE = 10000`, `isOfficialId(id) = id < USER_ID_BASE`,
      `officialCategories()`, `officialExercises()`, `officialCategory(id)`,
      `officialExercise(id)`.
- [x] 1.3 Normalizar o que o arquivo traz: `kind` ausente vira `strength`;
      `videos` ausente vira `[]`. Ids ficam como estão — nada é remapeado.
- [x] 1.4 Testes do módulo: 52 exercícios e 12 categorias, todo id `≤ 9999`,
      congelamento (uma mutação não vaza para a próxima leitura).
- [x] 1.5 **Teste de contrato dos ids**: uma lista fixa de `(id, nome)` do
      arquivo atual, **incluindo a ausência do id 10**. Acrescentar exercício
      passa; renumerar ou reaproveitar o 10 quebra.

**Quality Gate:** PASSED ✓ 2026-09-04
- [x] `npm run typecheck` limpo
- [x] `officialCatalog.test.ts` — 9 testes verdes

---

## Phase 2: Migração e Business Logic (repos)

- [x] 2.0a Dexie **v13**: esvaziar `exercises` e `categories` no `upgrade`.
      **Nenhuma referência é reescrita** — dias, pesos, histórico, notas, fotos e
      entradas de sessão não são tocados.
- [x] 2.0b `createExercise` e `createCategory` atribuem o id **explicitamente**,
      como `max(USER_ID_BASE, maior id existente) + 1`, dentro da transação de
      escrita — sem depender do `++id`, que `clear()` não zera e que numa
      instalação nova começaria em 1.
- [x] 2.0c Teste de migração: um banco pré-mudança com dias, pesos, histórico,
      notas, fotos e sessões abre na v13 com as duas tabelas vazias, **todas as
      demais linhas idênticas byte a byte**, e os dias/pesos resolvendo contra o
      catálogo oficial.
- [x] 2.1 `listCategories` e `listExercises` concatenam banco + oficial,
      ordenando por `localeCompare('pt-BR')`; `listCardioExercises` idem.
- [x] 2.2 Resolvedor por id (`getExercise`/`getCategory` em `db/repos`) que
      atende as duas fontes; usar em `startSession`, `swapEntryExercise` e onde
      mais o repo faz `d.exercises.get`.
- [x] 2.3 Recusar escrita em oficial: `updateExercise`, `deleteExercise`,
      `renameCategory`, `deleteCategory` e `setAlternatives` (quando o **sujeito**
      é oficial) lançam `ValidationError`.
- [x] 2.4 `setAlternatives`: aceitar id oficial como **peer** (validado pelo
      resolvedor, não por `d.exercises.get`), e espelhar apenas nos peers que
      são do usuário.
- [x] 2.5 `alternativesOf` (lib): unir os vínculos declarados com os exercícios
      do mapa que apontam de volta; sem duplicar, preservando a ordem declarada
      primeiro.
- [x] 2.6 `assertUniqueCategory` passa a considerar também as categorias
      oficiais.
- [x] 2.7 Garantir que `hasAnyData` continue contando **apenas** o banco.
- [x] 2.8 Testes de id: exercício criado num aparelho atualizado e num recém
      instalado recebe id `> 10000`; duas criações concorrentes não colidem.
- [x] 2.9 Testes de repo: listagem unificada e ordenada, recusa de escrita,
      alternativa usuário→oficial ida e volta, `hasAnyData` num app vazio.

**Quality Gate:** PASSED ✓ 2026-09-04
- [x] `npm run typecheck` limpo
- [x] `repos.test.ts` (115) e `migration.test.ts` (16, com 5 novos da v13) verdes

---

## Phase 3: User Interface

- [x] 3.1 Selo "Oficial" na lista de Exercícios, na lista de Categorias, no
      detalhe do exercício **e em todo seletor** (exercícios de um dia,
      alternativas, troca dentro da sessão).
- [x] 3.2 Esconder editar/excluir em item oficial (Exercícios e Categorias);
      tocar na linha abre o detalhe/visualização, não o formulário.
- [x] 3.3 `ExerciseDetailPage` e o formulário de exercício leem pelo resolvedor,
      não por `db.exercises.get`.
- [x] 3.4 Seletores (dia, alternativas, filtro por categoria) já herdam a lista
      unificada — verificar cada um e a aba Cardio.
- [x] 3.5 Vídeos de um exercício oficial aparecem normalmente na aba "Vídeos".
- [x] 3.6 Testes de integração: detalhe de um oficial com peso, observação e
      foto; lista unificada com selo; ausência das ações de edição; selo no
      seletor do dia.
- [x] 3.7 Ajuste pós-revisão: o detalhe (`/exercise/:id`) **não** exibe selo nem
      explicação de origem — ali não há par para desempatar.
- [x] 3.9 Filtro por **tipo** (Todos / Força / Cardio) na lista de Configurações
      → Exercícios, em controle segmentado acima dos seletores de categoria e
      dia; entra no `filterExercises` e no "Limpar filtros".
- [x] 3.10 A aba **"Notas"** exibe `(*)` quando há anotação — no detalhe do
      catálogo e no da entrada de sessão, refletindo o exercício exibido.
- [x] 3.19 **Amostra referencia o catálogo**: `src/data/exampleRoutine.ts`
      (TypeScript, não JSON, para que um id morto quebre no teste) com **4 dias**
      de ids oficiais, a academia e 8 pesos globais. `generateExample` deixa de
      criar categorias e exercícios; `example-data.json` foi removido.
- [x] 3.18 **Imagens do catálogo servidas pelo app**: `npm run exercise-media`
      baixa os masters para `data/assets/exercises/` e escreve
      `public/exercises/<slug-do-exercicio>.webp` (animação preservada, largura
      limitada a 720). O catálogo mantém `mediaUrl` como procedência e ganha
      `mediaFile` — **sem** endereço remoto, com a procedência guardada em
      `data/assets/exercises/sources.json`. Fora do precache, com cache no uso.
      O download foi único: o gerador só converte masters.
- [x] 3.17 **Editar peso vira popup no topo**: `Sheet` ganhou `placement`
      (`bottom`/`centre`/`top`) no lugar do booleano `centred`; sai a
      rolagem-até-o-topo e o `cardRef`; o botão de histórico passa a ser
      renderizado também na linha de título do popup; `Esc` fecha só a folha do
      topo, para não jogar fora um peso meio digitado.
- [x] 3.16 **Cronômetro segura a tela**: `useWakeLock` em `src/lib/wakeLock.ts`,
      ligado só ao cronômetro de descanso (não ao relógio do treino), com
      re-pedido ao voltar ao app e degradação silenciosa onde a API não existe.
- [x] 3.15 **Histórico de peso alcança as outras academias**: pílula na linha do
      título do modal (mesma forma do seletor da Home), lista inline, linha de
      escopo dizendo se o peso é global ou exceção, excluir só na academia ativa,
      e reabrir sempre na ativa. `Sheet` ganhou um slot `action` no cabeçalho.
- [x] 3.14 **Arte de abertura escolhível** em Aparência (Vazio/Homem/Mulher):
      lista governada em `src/state/splashes.ts`, um webp por master no
      `npm run splash`, escolha lida de forma síncrona pelo script inline do
      `index.html` (antes do primeiro quadro), e teste que trava as três listas
      — módulo, gerador e HTML — contra divergência.
- [x] 3.13 Renomear as abas da barra inferior: "Consistência" → **Histórico**
      (título da tela junto, para não ter dois nomes para um lugar) e
      "Configurações" → **Config** (só a aba; o título da tela mantém a palavra
      inteira).
- [x] 3.12 A lista de vídeos da tela de visualização mostra **nome + URL**, com
      botão de **copiar** (e relato de falha), e abre o vídeo tocado **em
      sobreposição** — o que trouxe de volta o modo overlay do `MediaViewer`,
      agora derivado de `onClose` e com `initialIndex`.
- [x] 3.11 Estado vazio da aba **"Vídeos"** reduzido ao título: sem o parágrafo
      explicando o que a aba guarda e como cadastrar.
- [x] 3.8 Tela **somente leitura** `/settings/exercises/:id/view`, alcançada pela
      ação "Ver" nas linhas oficiais: mídia, tipo, categorias, alternativas e
      vídeos. Sem campos, sem "Salvar"/"Excluir", sem texto sobre a origem e sem
      atalho para o detalhe — é para olhar, e só.

**Quality Gate:** PASSED ✓ 2026-09-04
- [x] `npm run typecheck` limpo
- [x] Suíte inteira verde: 83 arquivos, 1035 testes
- [x] `official-catalog.integration.test.tsx` novo, 6 testes

---

## Phase 4: Portabilidade e assistente do catálogo oficial

- [x] 4.1 `normalizeAlternatives`: um id **oficial** é referência resolvível, não
      vínculo pendente — não descartar.
- [x] 4.2 Conferir que nenhuma outra normalização da importação poda referências
      a ids oficiais (dias, pesos, histórico, notas, fotos, entradas de sessão).
- [x] 4.3 Teste de round-trip: exportar com dia, peso, sessão e alternativa
      apontando para oficiais; restaurar num banco limpo e conferir que tudo
      volta — e que o arquivo não contém nenhum registro oficial.
- [x] 4.4 Tolerar id oficial desconhecido (arquivo mudou entre versões): nada é
      apagado, a tela trata como exercício ausente.
- [x] 4.5 **Descartar na importação todo *registro*** de categoria/exercício cujo
      id caia na faixa oficial. Não é caso de borda: **todo backup gerado até
      hoje** carrega o catálogo dentro de si, e restaurá-lo recriaria as linhas
      que a migração acabou de remover. As **referências** a ids oficiais
      continuam preservadas.
- [x] 4.5a Teste com um backup real anterior à mudança: restaura sem recriar o
      catálogo no banco, e dias, pesos, histórico e sessões continuam apontando
      para os mesmos exercícios.
- [x] 4.6 Assistente: `catalogSnapshot` inclui os oficiais marcados como
      somente leitura; o reparo da proposta descarta alteração/exclusão de
      oficial e mantém válido um dia ou uma alternativa que os referencie.
- [x] 4.7 Rodar a suíte inteira: o catálogo oficial fecha aqui, verde, **antes**
      de a remoção dos aquecimentos começar.

**Quality Gate:** PASSED ✓ 2026-09-04
- [x] `npm test` inteiro verde: 84 arquivos, 1055 testes
- [x] `npm run build` sem erro

---

## Phase 5: Remoção dos aquecimentos

Só começa com a Fase 4 verde: são duas mudanças num PR, e o corte tem que ser
revisável separado.

### 5.1 Dados

- [x] 5.1.1 Na **mesma v13** da tarefa 2.0a: remover a tabela `warmups` (`warmups: null`),
      redeclarar `exercises` sem `*warmupIds`, e apagar o campo `warmupIds` de
      todo exercício no `upgrade`.
- [x] 5.1.2 `db/types.ts`: remover a interface `Warmup` e o campo
      `Exercise.warmupIds`.
- [x] 5.1.3 `db/db.ts`: tirar `warmups` de `allTables`.
- [x] 5.1.4 Teste de migração: um banco v12 com aquecimentos abre em v13 sem a
      tabela, sem o campo, e com o resto intacto.

### 5.2 Repositório e hooks

- [x] 5.2.1 Remover `listWarmups`, `createWarmup`, `updateWarmup`,
      `deleteWarmup`, `exercisesUsingWarmup` e `requireWarmupUrl`.
- [x] 5.2.2 Tirar `warmupIds` de `createExercise` e `updateExercise`.
- [x] 5.2.3 Remover `useWarmups` e `useWarmupMap` de `lib/hooks.ts`; apagar
      `lib/warmups.ts` e o seu teste.

### 5.3 Telas

- [x] 5.3.1 Apagar `features/settings/WarmupsPage.tsx` e `features/warmup/`.
- [x] 5.3.2 Remover as rotas `/settings/warmups*` de `App.tsx` e a linha
      "Aquecimentos" de `SettingsPage.tsx`.
- [x] 5.3.3 Remover a seção de aquecimentos do formulário de exercício
      (`ExercisesPage.tsx`) e o `<WarmupButton>` de `ExerciseDetailPage.tsx` e
      `SessionEntryPage.tsx`.
- [x] 5.3.4 `ui/MediaViewer.tsx`: remover o modo **sobreposição** (revertido
      depois em 3.12, quando a tela de visualização virou cliente dele) — o `onClose`,
      o `role="dialog"`/`aria-modal`, a trava de rolagem, os atalhos de teclado e
      o botão de fechar —, deixando só o modo da página. Limpar o CSS que ficar
      sem uso.
- [x] 5.3.5 Apagar `features/warmup/warmup.integration.test.tsx` e limpar as
      menções a aquecimento nos demais testes.

### 5.4 Backup

- [x] 5.4.1 Remover `warmups` do `BackupDoc`, do export e do import; apagar
      `normalizeWarmups`.
- [x] 5.4.2 A importação **ignora** `warmups` e `warmupIds` de um arquivo
      antigo, sem rejeitar — com teste.
- [x] 5.4.3 **Não** incrementar `SCHEMA_VERSION`; registrar o porquê no
      comentário que já explica as versões.
- [x] 5.4.4 Aviso na tela de Backup: aquecimentos de um arquivo antigo não voltam.

### 5.5 Specs e documentação

- [x] 5.5.1 Excluir `openspec/specs/warmups/` — **no arquivamento**.
- [x] 5.5.2 Mover os dois requisitos sobreviventes para `exercise-videos`
      (classificação de mídia pela URL; paginador) — **no arquivamento**; os
      deltas já estão escritos em `specs/exercise-videos/spec.md`.
- [x] 5.5.3 Limpar as menções a `warmups` em `exercises`, `workout-sessions`,
      `exercise-videos` e `data-portability` — **no arquivamento**. (`project.md`
      já foi limpo, em 5.5.4.)
- [x] 5.5.4 Atualizar `openspec/project.md`: sai a decisão 5 (mídia do
      aquecimento), entra a decisão das duas fontes com faixa de id reservada
      (oficial ≤ 9999, usuário ≥ 10001) e a troca de fonte na migração.

**Quality Gate:** PASSED ✓ 2026-09-04
- [x] `grep -ri warmup src/` retorna só a cadeia histórica de versões do Dexie
      (v11/v12 declaram o schema da época) e os testes que exercitam de propósito
      o formato antigo — nenhum código vivo
- [x] `npm test` inteiro verde: 82 arquivos, 1024 testes
- [x] `npm run build` sem erro
- [x] Nenhuma spec referencia a capability `warmups`

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] `openspec/project.md` synced (decisão 5 reescrita; aquecimento removido)
- [x] `openspec/specs/` merge feito no arquivamento
- [x] Ready for `/openspec-archive`
