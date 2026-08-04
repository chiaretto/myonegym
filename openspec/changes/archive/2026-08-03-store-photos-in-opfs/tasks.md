# Implementation Tasks: Guardar as fotos de exercício no OPFS

**Change ID:** `store-photos-in-opfs`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Criar `src/data/photoStore.ts`: `writeImage(blob)` → `{ file, size }`
      ou `{ bytes, size }` no fallback; `readImage(photo)` → `Blob`;
      `removeImage(photo)`; `sweepOrphans(keep)`; `clearImages()`; diretório
      `photos/` via `navigator.storage.getDirectory()`
- [x] 1.2 Gravação tolerante: usa `createWritable()`; se ausente/erro, cai para
      bytes no IndexedDB. `QuotaExceededError` propaga (não vira fallback
      silencioso — o disco está cheio dos dois lados)
- [x] 1.3 `ExercisePhoto` em `src/db/types.ts`: `file?: string`, `size?: number`,
      `bytes?: ArrayBuffer` (opcional), com o comentário explicando a fronteira
      registro/arquivo
- [x] 1.4 Dexie v8 em `src/db/db.ts` — **no-op documentado**: nem move binário
      (OPFS não entra em transação IndexedDB) nem faz backfill de `size` (seria
      reescrever toda foto no disco para calcular um número que só interessa
      quando a foto é tocada). Quem preenche `size` é a migração
- [x] 1.5 `migrateLegacyPhotos()`: move `bytes` → OPFS por registro,
      idempotente, tolerante a falha parcial
- [x] 1.6 Shim de OPFS em memória (`src/test/memoryOpfs.ts`), instalado no
      `vitest.setup.ts`, com `withoutOpfs()` para o caminho de fallback
- [x] 1.7 Testes de `photoStore` (13): escreve/lê/apaga, sem OPFS, sem
      `createWritable`, quota, órfãos, arquivo ausente, `clearImages`

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Testes de store e migração passam

---

## Phase 2: Business Logic (Repos + Compressão)

- [x] 2.1 `addPhoto` grava o arquivo antes do registro e apaga o arquivo se o
      registro falhar
- [x] 2.2 `deletePhoto` apaga o registro e depois o arquivo (best-effort)
- [x] 2.3 `deleteGym` e `deleteExercise` coletam os arquivos das fotos afetadas
      antes da transação e apagam depois do commit (`photoFilesWhere`)
- [x] 2.4 `readPhotoBlob(photo)` exportado de repos, servindo OPFS e legado
- [x] 2.5 `MAX_EDGE` 1600 → 1280 em `fitDimensions.ts` (formato segue JPEG
      q0.8); `downscalePhoto` passa a devolver `{ blob, width, height }`;
      `fitDimensions.test.ts` atualizado
- [x] 2.6 `maintainPhotoStorage()` (migrar → varrer) chamado em `main.tsx` sem
      `await`, fora do caminho da primeira tela
- [x] 2.7 Testes de repos: registro sem `bytes`, os dois formatos lado a lado,
      exclusão em cascata sem órfão, varredura, migração idempotente e
      interrompida

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Cascatas (academia/exercício) verificadas sem arquivo remanescente

---

## Phase 3: User Interface

- [x] 3.1 `usePhotoUrl` assíncrono: resolve o `Blob` pelo store, cria o object
      URL, revoga na troca/desmontagem e ignora resposta obsoleta
- [x] 3.2 Miniatura (`aria-label="Foto indisponível"` + ícone) e visualizador
      ("A imagem desta foto não está mais no dispositivo.") tratam a falha de
      leitura sem apagar o registro
- [x] 3.3 `PhotoTab` mantém o tratamento de quota e de arquivo não-imagem
- [x] 3.4 Testes de integração: anexa → grava arquivo e registro sem bytes;
      imagem ausente → estado visível e registro preservado

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] `photo.integration.test.tsx` passa (8 testes)

---

## Phase 4: Integration & Polish

- [x] 4.1 `exportBackup` lê o binário pelo store antes do base64 (pulando o que
      não abre); `importBackupReplaceAll` grava pelo store e só então apaga os
      arquivos do dispositivo substituído — **JSON inalterado**, `SCHEMA_VERSION`
      segue 5
- [x] 4.2 `resetAll` chama `clearImages()`; a confirmação passa a citar fotos
- [x] 4.3 Testes de ida e volta: importado vive em arquivo, backup sem `size`
      importa, import sem OPFS fica no registro, reset apaga os arquivos
- [x] 4.4 Tamanho verificado pela aritmética pura (`fitDimensions`): aresta
      ≤ 1280px. O peso final em KB depende do encoder do navegador e sai junto
      da verificação manual (4.5)
- [x] 4.5 Verificação manual em navegador real — validada pelo usuário em
      2026-08-03 (arquivo em DevTools → Application → Storage, ausência na
      galeria, tamanho real de uma foto de câmera)
- [x] 4.6 `openspec/project.md`: decisão 9 registra OPFS + as duas consequências
      (ordem de escrita/exclusão e leitura sempre pelo store)

**Quality Gate:** PASSED
- [x] `npx vitest run` — 61 arquivos, 552 testes passando
- [x] `npm run build` limpo
- [x] Documentação sincronizada

---

## Completion Checklist

- [x] Todas as fases completas
- [x] Todos os quality gates aprovados
- [x] Documentação sincronizada
- [x] Pronto para `/openspec-archive`
