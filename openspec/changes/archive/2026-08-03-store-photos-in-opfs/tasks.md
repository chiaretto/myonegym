# Implementation Tasks: Guardar as fotos de exercício no OPFS

**Change ID:** `store-photos-in-opfs`

---

## Phase 1: Foundation (Data Layer)

- [ ] 1.1 Criar `src/data/photoStore.ts`: `writePhoto(blob)` → `{ file, size }`
      ou `{ bytes, size }` no fallback; `readPhoto(photo)` → `Blob`;
      `removePhoto(photo)`; `sweepOrphans(files)`; diretório `photos/` via
      `navigator.storage.getDirectory()`
- [ ] 1.2 Gravação tolerante: usa `createWritable()`; se ausente/erro, cai para
      bytes no IndexedDB. `QuotaExceededError` propaga (não vira fallback
      silencioso — o disco está cheio dos dois lados)
- [ ] 1.3 `ExercisePhoto` em `src/db/types.ts`: `file?: string`, `size: number`,
      `bytes?: ArrayBuffer` (opcional), com o comentário explicando a fronteira
      registro/arquivo
- [ ] 1.4 Dexie v8 em `src/db/db.ts`: versão aditiva, sem índice novo; comentar
      por que a migração do binário **não** vive no `upgrade()`
- [ ] 1.5 `migrateLegacyPhotos()`: move `bytes` → OPFS por registro,
      idempotente, tolerante a falha parcial
- [ ] 1.6 Shim de OPFS em memória no `vitest.setup.ts` (jsdom não tem OPFS)
- [ ] 1.7 Testes de `photoStore`: escreve/lê/apaga, fallback sem OPFS, órfãos,
      arquivo ausente

**Quality Gate:**
- [ ] `npm run lint` e `npx tsc --noEmit` limpos
- [ ] Testes de store e migração passam

---

## Phase 2: Business Logic (Repos + Compressão)

- [ ] 2.1 `addPhoto` grava o arquivo antes do registro e apaga o arquivo se o
      registro falhar
- [ ] 2.2 `deletePhoto` apaga o registro e depois o arquivo (best-effort)
- [ ] 2.3 `deleteGym` e `deleteExercise` coletam os arquivos das fotos afetadas
      antes da transação e apagam depois do commit
- [ ] 2.4 `readPhotoBlob(photo)` exportado de repos, servindo OPFS e legado
- [ ] 2.5 `MAX_EDGE` 1600 → 1280 em `fitDimensions.ts` (formato segue JPEG
      q0.8 — `downscale.ts` não muda de tipo); ajustar os casos de
      `fitDimensions.test.ts` que citam o limite
- [ ] 2.6 Chamar `migrateLegacyPhotos()` e `sweepOrphans()` no boot, fora do
      caminho crítico de render e sem bloquear a primeira tela
- [ ] 2.7 Testes de repos: registro sem `bytes`, exclusão em cascata sem
      órfão, leitura de registro legado

**Quality Gate:**
- [ ] `npm run lint` limpo
- [ ] Cascatas (academia/exercício) verificadas sem arquivo remanescente

---

## Phase 3: User Interface

- [ ] 3.1 `usePhotoUrl` assíncrono: resolve o `Blob` pelo store, cria o object
      URL, revoga na troca/desmontagem e ignora resposta obsoleta
- [ ] 3.2 Miniatura e visualizador tratam falha de leitura (arquivo ausente)
      com estado visível, sem tela em branco
- [ ] 3.3 `PhotoTab` mantém o tratamento de quota e de arquivo não-imagem
- [ ] 3.4 Testes de integração: anexar → miniatura aparece; abrir → foto
      cheia; excluir → some (com o store em memória)

**Quality Gate:**
- [ ] `npm run lint` limpo
- [ ] `photo.integration.test.tsx` passa

---

## Phase 4: Integration & Polish

- [ ] 4.1 `exportBackup` lê o binário pelo store antes do base64; `importBackup`
      grava pelo store — **formato do JSON inalterado**, `SCHEMA_VERSION` = 5
- [ ] 4.2 `allTables`/reset limpam também o diretório `photos/`
- [ ] 4.3 Teste de ida e volta: exportar → importar → foto idêntica; backup
      antigo (bytes base64, sem `file`) importa e passa a viver no OPFS
- [ ] 4.4 Verificação de tamanho: foto grande entra com 3–8 MB e é gravada em
      algumas centenas de KB, aresta ≤ 1280px, em JPEG
- [ ] 4.5 Verificação manual em navegador real (Chrome Android e desktop):
      arquivo visível em DevTools → Application → Storage, invisível na galeria
- [ ] 4.6 Atualizar `openspec/project.md` se alguma decisão de armazenamento
      merecer registro

**Quality Gate:**
- [ ] `npm test` inteiro passa
- [ ] `npm run build` limpo
- [ ] Documentação sincronizada

---

## Completion Checklist

- [ ] Todas as fases completas
- [ ] Todos os quality gates aprovados
- [ ] Documentação sincronizada
- [ ] Pronto para `/openspec-archive`
