# Proposal: Aquecimentos vinculados ao exercício

**Change ID:** `add-exercise-warmups`
**Created:** 2026-08-15
**Status:** Implementation Complete
**Completed:** 2026-08-15

---

## Problem Statement

O app sabe **o que** treinar (exercício, peso, dia) e **onde** (academia), mas
não sabe nada sobre **como preparar** o movimento. Aquecimento hoje não existe
como conceito — e ele é justamente a parte que a pessoa mais esquece e mais
precisa consultar:

- **A informação está fora do app.** Quem tem uma rotina de aquecimento para
  ombro guarda em prints no rolo da câmera, num vídeo salvo no YouTube ou na
  cabeça. No meio do treino isso significa sair do app para procurar.
- **É conteúdo compartilhado, e o app só sabe modelar coisa exclusiva.** O
  mesmo aquecimento de manguito rotador serve para supino, desenvolvimento e
  crucifixo. Duplicá-lo em cada exercício seria o mesmo erro que "copiar pesos"
  era antes de o peso virar global: três cópias que divergem no primeiro
  ajuste.
- **A mídia do exercício já está ocupada.** `Exercise.mediaUrl` é **uma** imagem
  e ela demonstra a execução do movimento, não o preparo. Não há onde pendurar
  uma sequência de três alongamentos.

## Proposed Solution

Criar o **Aquecimento** como entidade própria, com **nome** e **uma mídia**, e
ligá-lo a exercícios numa relação **muitos-para-muitos**. No detalhe do
exercício, um botão abre um **visualizador em tela cheia** que percorre os
aquecimentos daquele exercício.

**A entidade.** Um aquecimento é `{ nome, url }` — nada mais. Ele vive no
catálogo, em Configurações, ao lado de Categorias e Exercícios, porque é
conteúdo reutilizável e o app já decidiu que **todo CRUD mora em Configurações**.

**O vínculo é uma lista no exercício.** `Exercise.warmupIds: number[]`, com
índice multiEntry `*warmupIds` — exatamente a forma que `categoryIds` já usa. Um
exercício lista vários aquecimentos; vários exercícios listam o mesmo id. Não há
tabela de junção porque o projeto não tem nenhuma: a lista no registro **é** a
relação, e o índice multiEntry responde "quem usa este aquecimento" sem varrer
nada. A **ordem da lista é a ordem da paginação** — como `Day.exerciseIds` já
define a ordem dos exercícios do dia.

**Três formas de mídia, uma classificação derivada da URL:**

| A URL é | Vira | Como é exibida |
|---|---|---|
| `.mp4` `.webm` | **vídeo** | `<video controls preload="none">`, tocado ali |
| YouTube / Vimeo | **embed** | player do provedor, embutido no visualizador (vertical quando a URL é de Short) |
| qualquer outra http(s) | **imagem** | `<img>`, como a mídia do exercício |

Imagem é o padrão porque muita URL de imagem real não tem extensão (CDN,
`?format=jpg`, recurso assinado), e classificá-las como "outra coisa" tirava o
usuário do app por uma figura que teria aparecido. Quando o palpite erra, o
`<img>` falha e o estado de falha mantém o endereço acessível.

O tipo **não é um campo**: é função pura da URL, calculada na validação e na
renderização pelo mesmo classificador. Guardar o tipo criaria uma segunda fonte
de verdade que pode divergir da URL — e não há motivo de durabilidade aqui
(diferente de `Session.kind`, que é snapshot porque o histórico não pode mudar
retroativamente).

**Embed para quem publica player, link para o resto.** O vídeo de aquecimento
que a pessoa tem à mão quase sempre está no YouTube, e mandá-la para fora do app
a cada consulta custa mais do que o recurso vale — então YouTube e Vimeo tocam
**dentro** do visualizador, pelo endereço de player que eles próprios publicam
(a página de assistir recusa ser enquadrada).

É uma troca consciente: um player de terceiro passa a viver dentro de um app
local-only, e o provedor vê a requisição. O app devolve o que está ao seu
alcance — host `youtube-nocookie.com` onde existe, sem autoplay, carregamento
sob demanda — e não finge que isso o torna privado.

Nenhum outro site é enquadrado: a maioria recusa, e um iframe genérico daria
caixa em branco sem explicação. O que não é vídeo nem provedor conhecido é
tentado como **imagem**, com o estado de falha oferecendo o endereço se não for.

**O visualizador.** Tela cheia, com:

- **fechar no topo**, voltando exatamente para a tela do exercício;
- **`<` e `>` flutuando sobre a mídia**, nas bordas, para a mídia usar a largura
  inteira — e circulando **infinitamente**: depois do último vem o primeiro;
- **posição visível** ("3 de 7"), porque uma pilha sem contador não diz quanto
  falta;
- **teclado**: setas navegam, `Esc` fecha.

**O botão** fica na aba **Execução**, nas **duas** telas de detalhe (catálogo e
sessão) — é durante o treino que se aquece. Ele **não aparece** quando o
exercício não tem aquecimento algum: não ter é o caso normal, e um botão que só
abre um vazio é ruído (mesma decisão da seção "Alternativas").

## Scope

### In Scope

- Entidade `Warmup` (`nome`, `url`) e a tabela `warmups`.
- `Exercise.warmupIds` com índice `*warmupIds`; migração **v11** preenchendo `[]`.
- Classificador de mídia (`imagem` / `vídeo` / `link`) derivado da URL, usado na
  validação e na renderização.
- CRUD de aquecimentos em **Configurações → Aquecimentos**, com a contagem de
  exercícios que usam cada um.
- Excluir um aquecimento **desvincula-o de todos os exercícios** (nunca deixa
  referência órfã).
- Seletor de aquecimentos no formulário do exercício, no padrão do seletor de
  Alternativas (busca + escolhidos sempre visíveis).
- Botão "Aquecimento" na aba Execução do detalhe do exercício **e** do detalhe
  dentro da sessão.
- Visualizador em tela cheia: fechar no topo, `<`/`>` flutuando sobre a mídia em
  carrossel infinito, contador, e teclado (setas + Esc).
- Backup/restore levando os aquecimentos e os vínculos.

### Out of Scope

- **Embed de páginas quaisquer.** Só provedores com endereço de player
  publicado são embutidos; o resto abre fora, porque enquadrar um site que
  recusa dá caixa em branco.
- **Séries, repetições, tempo ou carga do aquecimento.** Um aquecimento aqui é
  material de consulta, não um item a executar e marcar.
- **Aquecimento dentro da sessão como item a concluir** (uma entrada própria no
  runner). Ele é consultado, não registrado.
- **Aquecimento por academia** — é do exercício, como as alternativas, não do
  lugar.
- **Upload de arquivo** (como as fotos fazem, em OPFS). Aqui é URL, como a mídia
  do exercício.
- Reordenar aquecimentos por arrastar; a ordem é a de seleção no formulário.
- Vincular aquecimento a um **dia** ou a uma categoria inteira.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Sim | Versão **v11**: tabela `warmups` (`++id, name`) e `*warmupIds` no índice de `exercises`; o upgrade preenche `warmupIds: []`. Nada é apagado. |
| API (repos) | Sim | `createWarmup`/`updateWarmup`/`deleteWarmup` (com desvínculo), `listWarmups`, `exercisesUsingWarmup`; `createExercise`/`updateExercise` aceitam `warmupIds`; `deleteExercise` não precisa mudar (a lista morre com o registro). |
| State (hooks) | Sim | `useWarmups` e um `useWarmupMap`, no padrão de `useExercises`/`useExerciseMap`. |
| UI | Sim | `WarmupsPage` (nova, em Configurações), `WarmupViewer` (novo), botão na aba Execução de `ExerciseDetailPage` e `SessionEntryPage`, seletor no formulário do exercício, entrada nova na lista de Configurações. |
| Portabilidade | Sim | `warmups` entra no documento e `Exercise.warmupIds` viaja; backup antigo importa com lista vazia. |

## Architecture Considerations

- **A relação é uma lista, não uma tabela.** O projeto resolve
  muitos-para-muitos com array no registro mais índice multiEntry
  (`categoryIds`) ou array simétrico (`alternativeIds`). Uma tabela de junção
  seria o primeiro join do app, e não compraria nada: a ordem, que aqui importa,
  sai de graça no array.
- **Assimétrico de propósito, ao contrário de `alternativeIds`.** "B é
  alternativa de A" implica "A é alternativa de B"; "este aquecimento serve para
  o supino" não implica nada de volta. Por isso a lista vive só no exercício, e
  não há simetria a manter — nem o cuidado que `setAlternatives` exige.
- **O tipo da mídia é derivado, não guardado.** Um campo `kind` no aquecimento
  seria uma segunda fonte de verdade sobre a mesma URL. A regra de durabilidade
  que fez `Session.kind` ser snapshot não se aplica: aqui nada muda
  retroativamente se a classificação evoluir — a URL continua a mesma.
- **O visualizador é uma tela, não um `Sheet`.** O `Sheet` é uma gaveta para
  ações curtas; isto é conteúdo em tela cheia com navegação própria. Ele reusa,
  porém, o que o `Sheet` estabeleceu: `role="dialog"`, `aria-modal`, fechar por
  `Esc`, e o backdrop bloqueando a rolagem de trás.
- **Excluir desvincula, nunca bloqueia.** É a mesma decisão de "excluir
  categoria reatribui" e de "excluir exercício desvincula as alternativas": o
  app nunca impede uma exclusão para proteger uma referência, ele arruma a
  referência.

## Success Criteria

- [x] É possível cadastrar um aquecimento com nome e URL em Configurações.
- [x] Uma URL de imagem, uma de vídeo e uma de página externa são todas aceitas,
      e cada uma é exibida na forma certa.
- [x] O formulário do exercício permite escolher vários aquecimentos, e o mesmo
      aquecimento pode ser escolhido em vários exercícios.
- [x] O detalhe do exercício mostra o botão **apenas** quando há aquecimentos.
- [x] O botão aparece no catálogo **e** dentro da sessão.
- [x] O visualizador abre em tela cheia, com fechar no topo, `<`/`>` sobre a
      mídia circulando infinitamente, e o contador de posição.
- [x] Setas do teclado navegam e `Esc` fecha.
- [x] Fechar volta para a tela do exercício, na mesma aba de onde saiu.
- [x] Excluir um aquecimento o remove de todos os exercícios que o usavam.
- [x] A migração v11 não apaga nada e deixa todo exercício com `warmupIds: []`.
- [x] Backup antigo (sem aquecimentos) importa sem erro.
- [x] `npx tsc -b --noEmit` limpo e `npx vitest run` verde.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mídia remota não carrega offline, num app offline-first | Alta | Médio | É a mesma natureza da mídia do exercício, que já é remota. O visualizador mostra o mesmo placeholder de falha em vez de quebrar, e o nome do aquecimento continua legível. Declarado no spec, não escondido. |
| Vídeo pesado consumir dados móveis sem o usuário pedir | Média | Médio | `preload="none"` e sem autoplay: o vídeo só baixa quando a pessoa toca em tocar. |
| URL de vídeo que o navegador não sabe tocar (codec) | Média | Baixo | O `<video>` cai no mesmo estado de falha das imagens, com a opção de abrir fora do app. |
| Link externo abrir para fora surpreender o usuário | Média | Baixo | O cartão diz o destino antes do toque, e o link abre em nova aba com `rel="noopener noreferrer"`. |
| Alguém esperar que o aquecimento seja marcável como feito | Média | Baixo | Declarado fora de escopo; ele é material de consulta. Se virar item de treino, é mudança própria com entrada no runner. |
| Um aquecimento excluído deixar exercício apontando para o vazio | Baixa | Alto | A exclusão desvincula de todos, na mesma transação, e um teste cobre exatamente isso. |

---

## Archive Information

**Archived:** 2026-08-16
**Duration:** 2 dias (criada em 2026-08-15)
**Outcome:** Implementado com sucesso, com quatro ajustes pedidos pelo usuário
durante a revisão (embed de YouTube/Vimeo, imagem como padrão do classificador,
quadro vertical para Shorts e setas sobre a mídia em carrossel infinito) e um bug
de transbordo do visualizador encontrado e corrigido.

### Files Modified

- `src/db/types.ts` — `Warmup` (com o porquê de o tipo da mídia não ser campo) e
  `Exercise.warmupIds`, com a nota de que a relação é **assimétrica**, ao
  contrário de `alternativeIds`
- `src/db/db.ts` — migração **v11**: tabela `warmups` e índice multiEntry
  `*warmupIds`, preenchendo `[]` em todo exercício
- `src/db/repos.ts` — CRUD de aquecimento, `exercisesUsingWarmup` e o desvínculo
  em massa na exclusão, na mesma transação
- `src/lib/warmupMedia.ts` (novo) — `warmupMediaKind`, `warmupEmbedUrl`,
  `isPortraitEmbed` e `validateWarmupUrl`: um classificador só, usado pela
  validação **e** pela renderização
- `src/lib/warmups.ts` (novo) — `warmupsOf`, resolvendo ids na ordem do array
- `src/lib/hooks.ts` — `useWarmups`, `useWarmupMap`
- `src/data/portability.ts` — `warmups` no `BackupDoc`, vínculos no round-trip,
  documento antigo importando vazio e vínculo órfão descartado
- `src/features/settings/WarmupsPage.tsx` (novo) e a entrada em Configurações
- `src/features/warmup/` (novo) — `WarmupButton` e `WarmupViewer`
- `src/features/settings/ExercisesPage.tsx` — seletor de aquecimentos
- `src/features/exercise/ExerciseDetailPage.tsx` e
  `src/features/session/SessionEntryPage.tsx` — o botão na aba Execução

### Specs Updated

- `openspec/specs/warmups/spec.md` — **capability nova** (4 requisitos)
- `openspec/specs/exercises/spec.md` — *Register an Exercise* ganhou os
  aquecimentos; *Warmup Button on the Exercise Detail* adicionado
- `openspec/specs/workout-sessions/spec.md` — *Session Exercise Detail* ganhou o
  controle na aba Execução
- `openspec/specs/data-portability/spec.md` — *Export Full Backup JSON*
  atualizado; *Backups Carry Warmups and Their Links* adicionado

### Fora do escopo, incluído nesta branch

Sete ajustes de fluxo pedidos nas mesmas sessões, sem relação com aquecimentos e
sem delta próprio — os specs vivos foram atualizados direto. Ver as duas seções
"Fora do escopo desta mudança" em `tasks.md`, incluindo a **reversão** de "Cardio
vai direto ao exercício" e o requisito novo *A Running Session Shows Its
Duration*.
