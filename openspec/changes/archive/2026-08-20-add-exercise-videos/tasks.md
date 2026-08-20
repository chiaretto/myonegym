# Implementation Tasks: Aba de Vídeos no Exercício, e "Observações" Vira "Notas"

**Change ID:** `add-exercise-videos`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 `src/db/types.ts`: `ExerciseVideo { url, startSec?, endSec?, title? }`
      e `Exercise.videos?: ExerciseVideo[]`, documentando por que é um valor
      embutido e não uma entidade — e por que não é indexado
- [x] 1.2 `src/db/db.ts`: nova `version()` declarando o campo. Sem tabela nova,
      sem índice novo, sem reescrita de registros
- [x] 1.3 `src/db/repos.ts`: `createExercise`/`updateExercise` aceitam `videos`;
      normalizar para `[]` na leitura, como `warmupIds` faz
- [x] 1.4 Validação no repositório: URL http(s); `endSec > startSec` quando
      ambos existirem; segundos não-negativos
- [x] 1.5 Testes de `repos.test.ts` e `migration.test.ts`: gravar/ler vídeos,
      exercício antigo sem o campo lê como vazio, exclusão leva os vídeos junto

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] `npx vitest run src/db` verde

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 Renomear `src/lib/warmupMedia.ts` → `src/lib/embedMedia.ts` (e o teste
      junto), atualizando os importadores. O módulo deixa de ser só de
      aquecimento; o nome antigo viraria pista falsa
      → antecipado para a Phase 1: `requireVideo` já precisava de
      `isValidEmbedUrl`. Símbolos renomeados junto (`warmupMediaKind` →
      `embedMediaKind`, `warmupEmbedUrl` → `embedUrl`, `warmupLinkLabel` →
      `embedLinkLabel`, `isValidWarmupUrl` → `isValidEmbedUrl`).
- [x] 2.2 Instagram como provedor embutível: `instagram.com/{reel|p|tv}/{code}`
      → `/embed`. O reconhecimento de YouTube não muda
- [x] 2.3 `isPortraitEmbed` passa a reconhecer o **reel** do Instagram, ao lado
      do Short do YouTube
- [x] 2.4 `start`/`end` aplicados ao embed do YouTube. O `start` já lido da URL
      original continua valendo quando o vídeo não traz recorte próprio
- [x] 2.5 `supportsTimeRange(url)`: a função única que o formulário e o player
      consultam, para os dois nunca discordarem sobre onde o recorte vale
- [x] 2.6 Testes de `embedMedia.test.ts`: cada forma de URL do Instagram, reel
      como retrato, recorte no YouTube, recorte ignorado no Instagram, e os
      casos de aquecimento existentes passando **sem edição**
      → **uma** asserção antiga mudou: `embedUrl('instagram.com/p/abc')` era
      `null` e agora devolve o embed. É exatamente o que a mudança faz.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Testes de aquecimento passam sem serem editados

---

## Phase 3: User Interface

- [x] 3.1 `WarmupViewer` → `MediaViewer` (`src/ui/`), recebendo
      `items: { url, name }[]`, `startIndex` e `onClose`. Nenhuma mudança de
      comportamento
      → `warmup.integration.test.tsx` (16 testes) passa **sem edição**.
- [x] 3.2 `WarmupButton` passa a montar o `MediaViewer`; `warmup.css` vira o CSS
      do visualizador, com o nome acompanhando
- [x] 3.3 Seção "Vídeos" no formulário do exercício (`ExercisesPage`):
      adicionar, editar, remover, reordenar
- [x] 3.4 No formulário, início/fim **só** quando a URL aceita recorte
      (`supportsTimeRange`), com uma linha explicando a ausência
- [x] 3.5 Aba "Vídeos" no `ExerciseDetailPage`: lista com rótulo, provedor e
      trecho; tocar abre o `MediaViewer` naquele índice; estado vazio apontando
      para a edição
- [x] 3.6 Mesma aba no `SessionEntryPage`, com o mesmo conteúdo
- [x] 3.7 "Observações" → **"Notas"** nas duas telas, e nos `aria-label` do
      `NoteEditor`
- [x] 3.8 Conferir os quatro rótulos a 360px
      → verificado junto com a 4.8.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Nenhum "Observações" resta em `src/` (fora um comentário que explica o rename)

---

## Phase 4: Integration & Polish

- [x] 4.1 i18n: não se aplica (strings em pt-BR no código, como o resto do app)
- [x] 4.2 `src/data/portability.ts`: exportar `videos`; importar tratando
      ausência como `[]`, no mesmo lugar em que `warmupIds` é normalizado
- [x] 4.3 Testes de `portability.test.ts`: ida e volta com vídeos, e restauração
      de um backup anterior ao campo
- [x] 4.4 Testes de integração: cadastrar dois vídeos, ver a aba nas duas telas,
      abrir a tela cheia no segundo, percorrer, fechar
- [x] 4.5 Teste de integração: a aba se chama "Notas" e continua salvando a nota
- [x] 4.6 Atualizar os testes que buscam a aba por "Observações"
      (`cardio`, `stepper-bar`, `detail-header`, `detail-tabs-layout`)
- [x] 4.7 Suíte completa, `tsc`, e `openspec validate --specs --strict`
- [x] 4.8 Conferir na app rodando: um vídeo do YouTube com recorte e um reel do
      Instagram, os dois em tela cheia. Embed é a parte que o jsdom não prova
      → verificado pelo usuário em 2026-08-20, depois da Phase 5 — carrossel
      inline, autoplay, e o laço voltando ao início do trecho.

**Quality Gate:** PASSED
- [x] `npx vitest run` verde
- [x] `openspec validate --all --strict` — 0 failed
- [x] Verificado na app rodando

---

## Phase 5: Follow-up — contagem nas abas, e a aba É o carrossel

Pedidos pelo usuário depois da Phase 4.

- [x] 5.1 `Tabs` aceita `count` por aba, formatado num lugar só para as duas
      telas não divergirem. Zero e "ainda não sei" não desenham nada
- [x] 5.2 `ExerciseDetailPage` e `SessionEntryPage` passam as contagens de
      vídeos e de fotos; `usePhotos` sobe para o topo do componente da sessão —
      **hook não pode ficar atrás de early return**, e ficou na primeira tentativa
- [x] 5.3 `MediaViewer` ganha a apresentação `inline`: sem diálogo, sem fechar,
      sem travar rolagem, sem capturar as setas do teclado
- [x] 5.4 `VideosTab` deixa de listar e passa a renderizar o carrossel direto
- [x] 5.5 `MediaItem.loop`, e `embedUrlWithRange` monta `loop=1&playlist=<id>`
      no YouTube — `loop=1` sozinho é ignorado pelo player
- [x] 5.6 `startIndex` removido: com a aba abrindo direto, ninguém mais o usa
- [x] 5.7 Seletores de aba nos testes afrouxados para `/^Foto/` e `/^Vídeos/` —
      a contagem entra no nome acessível de propósito
- [x] 5.8 Testes: contagens, carrossel direto, ausência de diálogo, laço no
      YouTube, e o aquecimento seguindo em sobreposição
- [x] 5.9 `MediaItem.autoplay`: `autoplay=1&mute=1` no YouTube, `autoPlay muted`
      no `<video>`, e `allow="…; autoplay"` no iframe — sem a permissão o frame
      recusa o pedido do próprio player
- [x] 5.10 Teste guardando que o **aquecimento** segue sem autoplay
- [x] 5.11 Deltas de `exercise-videos` e `warmups` reescritos, incluindo a
      inversão da regra "nada toca sozinho" para os vídeos
- [x] 5.12 **Bug reportado**: a repetição voltava ao início do vídeo, não do
      trecho. `loop=1&playlist=<id>` repete o *vídeo* e descarta o recorte, que
      só vale na primeira passagem. Trocado por `enablejsapi=1` mais
      `lib/youtubeLoop.ts`: o player reporta "ended" e é mandado de volta ao
      início do trecho. Sem carregar o `iframe_api` de terceiro

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] Suíte verde
- [x] `openspec validate --strict` limpo

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
