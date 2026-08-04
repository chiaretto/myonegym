# Proposal: Guardar as fotos de exercício no OPFS (metadado no IndexedDB)

**Change ID:** `store-photos-in-opfs`
**Created:** 2026-08-03
**Status:** Implementation Complete
**Completed:** 2026-08-03

---

## Problem Statement

Hoje **todo o binário da foto mora dentro do IndexedDB**: a tabela
`exercisePhotos` guarda `bytes: ArrayBuffer` junto com o metadado
(`gymId`, `exerciseId`, `type`, `width`, `height`, `createdAt`).

> Correção de premissa: o binário **não** é base64 no IndexedDB — já é
> `ArrayBuffer` cru. Base64 só existe no JSON do backup, onde é inevitável.
> A troca proposta continua valendo, só que o ganho é "tirar o binário do
> banco", não "parar de inflar 33%".

Dores concretas disso:

1. **O banco carrega peso morto.** Cada `listPhotos()` traz o `ArrayBuffer`
   inteiro de *todas* as fotos do par `(gymId, exerciseId)`, mesmo para
   desenhar uma grade de miniaturas. Uma tela de 6 fotos materializa alguns
   MB na memória do JS só para gerar 6 object URLs.
2. **Cada leitura é uma cópia.** O IndexedDB faz *structured clone* dos bytes
   na saída; um arquivo no disco é aberto por referência (`Blob`), sem cópia.
3. **Quota mais apertada e mais opaca.** O IndexedDB é onde vivem *todos* os
   dados do app; encher a quota com fotos derruba junto pesos, sessões e
   histórico. O OPFS separa "arquivo grande" de "registro".
4. **A compressão atual gasta mais bytes do que precisa.** Grava-se JPEG
   q0.8 com aresta máxima de 1600px. Reduzir a aresta máxima leva o arquivo
   para a faixa de 200–500 KB sem perda perceptível para o que importa aqui
   (ler a regulagem de um aparelho).

O padrão que resolve isso é **OPFS (Origin Private File System)**: arquivos
gravados de verdade no disco do aparelho, num sandbox da origem — invisíveis
na galeria, sem upload e sem servidor, coerente com o app ser local-only. No
IndexedDB fica só o metadado, apontando para o arquivo.

## Proposed Solution

### 1. Um *photo blob store* com OPFS na frente

Um módulo novo (`src/data/photoStore.ts`) com quatro operações —
`writePhoto(blob)`, `readPhoto(ref)`, `deletePhoto(ref)`, `sweepOrphans(refs)` —
que escondem de todo o resto do app onde o binário está. Os arquivos ficam em
`photos/<id>.<ext>` dentro do diretório da origem
(`navigator.storage.getDirectory()`).

### 2. O registro passa a apontar, não a conter

`ExercisePhoto` ganha `file?: string` (o nome do arquivo no OPFS) e `size:
number`; `bytes?: ArrayBuffer` continua existindo, mas **opcional** — é a
forma legada e o *fallback*. Um registro sempre se descreve: tem `file` → o
binário está no OPFS; tem `bytes` → está no próprio registro.

### 3. Fallback honesto, sem worker

A gravação usa `FileSystemFileHandle.createWritable()` na thread principal.
Se o OPFS não existir (navegador antigo) ou o handle não oferecer
`createWritable` (Safari anterior ao 17, onde escrever exige
`createSyncAccessHandle` dentro de um Worker), o store **grava os bytes no
IndexedDB como hoje**. Nada quebra; o app só não ganha o benefício naquele
aparelho. Um Worker dedicado só para o Safari antigo fica fora de escopo.

### 4. Compressão: segue **JPEG** q0.8, aresta máxima 1280px

`downscalePhoto` mantém `image/jpeg` q0.8 e apenas baixa `MAX_EDGE` de 1600
para **1280**. WebP foi considerado e **descartado**: `toBlob` não falha
quando o navegador não sabe codificar o tipo pedido — devolve PNG em silêncio
(Safari < 16), o que geraria arquivo *maior* que o JPEG de hoje, e cobrir isso
exigiria verificar o tipo produzido e recodificar. JPEG é universal, já está no
código e já entrega a faixa de tamanho desejada na aresta menor.

### 5. Migração dos registros que já existem

Versão 8 do Dexie adiciona os campos. **A migração do binário não acontece
dentro da transação de upgrade** — I/O de OPFS não participa de uma transação
IndexedDB e travá-la nisso arrisca corromper o upgrade. Em vez disso, uma
passada idempotente no start do app (`migrateLegacyPhotos()`) move os `bytes`
de cada registro legado para o OPFS e limpa o campo, uma foto por vez. Se
falhar, o registro fica como está e continua sendo lido pelo caminho legado.

### 6. Exclusão e órfãos

Excluir foto, academia ou exercício passa a apagar também o arquivo — depois
do commit da transação Dexie, best-effort. Como um crash entre o commit e o
`remove()` deixaria um arquivo órfão ocupando disco para sempre, o start do
app roda `sweepOrphans()`: lista o diretório e apaga o que nenhum registro
referencia.

### 7. Backup permanece byte-a-byte compatível

O `exportBackup` passa a ler o binário pelo store (OPFS ou legado) antes do
base64; o `importBackup` decodifica e **grava no OPFS**. O formato do arquivo
`.json` **não muda** — continua `bytes: <base64>` — então backups antigos
importam e backups novos abrem em versões antigas do app. `SCHEMA_VERSION`
fica em 5.

## Scope

### In Scope
- Store de binário com OPFS + fallback IndexedDB (`src/data/photoStore.ts`)
- `ExercisePhoto` com `file`/`size` e `bytes` opcional (Dexie v8)
- Escrita, leitura, exclusão e varredura de órfãos
- Migração dos registros legados no start, idempotente
- Aresta máxima 1280px (JPEG q0.8, formato inalterado)
- `addPhoto`/`listPhotos`/`deletePhoto`/`deleteGym`/`deleteExercise` adaptados
- Export/import lendo e escrevendo pelo store, com o JSON inalterado
- Shim de OPFS em memória no `vitest.setup.ts` (jsdom não tem OPFS)

### Out of Scope
- Worker + `createSyncAccessHandle` para Safari < 17 (usa o fallback)
- Trocar o formato da imagem (WebP/AVIF) — segue JPEG
- Miniaturas separadas (thumbnail derivada gravada à parte)
- Mudar o formato do backup (continua base64 embutido no JSON)
- Exibir uso de disco / gerenciador de armazenamento na tela de Dados
- Re-comprimir fotos que já estão gravadas (a migração move, não recodifica)
- `navigator.storage.persist()` e outras políticas de persistência

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Sim | Dexie v8: `ExercisePhoto` ganha `file?`, `size`; `bytes` vira opcional. Sem índice novo (ninguém consulta por arquivo). |
| Storage | Sim (novo) | OPFS via `navigator.storage.getDirectory()`, diretório `photos/`. |
| API | Não | Nenhuma rede envolvida; o app segue local-only. |
| State | Sim | `usePhotos` inalterado; a leitura do binário vira assíncrona (`usePhotoUrl`). |
| UI | Sim (pequeno) | `PhotoTab`: miniatura e visualizador resolvem a URL de forma assíncrona; estados de erro/carregando. |
| Portability | Sim | Export lê pelo store; import grava pelo store. Formato do JSON inalterado. |
| Tests | Sim | Shim de OPFS; testes de migração, órfãos, fallback e do formato do backup. |

## Architecture Considerations

- **Uma camada, não duas.** Repos (`src/db/repos.ts`) continua a única porta
  do banco; o `photoStore` é chamado de dentro dele, e nenhuma tela conhece
  OPFS.
- **O registro é a fonte da verdade.** O arquivo é derivado dele: a varredura
  de órfãos apaga arquivo sem registro, nunca registro sem arquivo. Um
  registro cujo arquivo sumiu falha na leitura e aparece como foto quebrada —
  preferível a sumir sozinho com o metadado do usuário.
- **Fronteira de transação explícita.** Dexie não pode transacionar OPFS.
  Ordem adotada: grava o arquivo → cria o registro (se o registro falhar,
  apaga o arquivo); apaga o registro → apaga o arquivo (se o arquivo falhar,
  a varredura pega depois). Nunca o inverso.
- **Degradação em vez de detecção global.** Nada de "OPFS suportado?" no boot;
  cada escrita tenta e cai para o IndexedDB se não der. Aparelhos que não
  suportam continuam funcionando exatamente como hoje.

## Success Criteria

- [ ] Uma foto nova de câmera grava um arquivo no OPFS e um registro **sem**
      `bytes` no IndexedDB
- [ ] Uma foto de 3–8 MB fica em algumas centenas de KB gravados (faixa de
      ~200–500 KB), aresta ≤ 1280px, em JPEG
- [ ] Fotos gravadas antes desta mudança continuam aparecendo e migram para o
      OPFS sozinhas, sem ação do usuário
- [ ] Excluir foto/academia/exercício não deixa arquivo órfão (a varredura
      cobre o caso de queda no meio)
- [ ] Backup exportado por esta versão importa em uma versão anterior, e
      backups anteriores importam nesta
- [ ] Onde não há OPFS, tudo continua funcionando pelo caminho legado
- [ ] `npm run lint`, `npm run build` e `npm test` limpos

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Safari < 17 sem `createWritable` no OPFS | Média | Médio | Fallback para bytes no IndexedDB, por escrita, sem worker |
| Migração interrompida no meio | Média | Baixo | Idempotente e por registro; o que não migrou continua legível |
| Arquivo órfão após queda entre commit e `remove()` | Média | Baixo | `sweepOrphans()` no start |
| Registro cujo arquivo sumiu (usuário limpou dados do site) | Baixa | Médio | Falha explícita na miniatura, com mensagem, sem apagar o registro sozinho |
| jsdom não tem OPFS, testes ficam impossíveis | Alta | Alto | Shim em memória no `vitest.setup.ts`, no mesmo espírito do `fake-indexeddb` |
| Quota do OPFS estourar na gravação | Baixa | Médio | `QuotaExceededError` tratado como hoje: mensagem clara e nenhum registro parcial |

---

## Archive Information

**Archived:** 2026-08-03
**Duration:** mesmo dia (proposta → implementação → arquivo)
**Outcome:** Implementado com sucesso

### Files Modified

- `src/data/photoStore.ts` (novo) — OPFS com fallback para bytes no registro
- `src/data/photoStore.test.ts` (novo) — 13 testes do store
- `src/test/memoryOpfs.ts` (novo) — OPFS em memória para os testes
- `src/db/types.ts` — `ExercisePhoto.file/size`, `bytes` opcional
- `src/db/db.ts` — Dexie v8 (no-op documentado)
- `src/db/repos.ts` — escrita/exclusão em duas etapas, cascatas, migração e varredura
- `src/data/portability.ts` — export lê pelo store, import grava nele, reset limpa os arquivos
- `src/features/exercise/photo/{PhotoTab.tsx,downscale.ts,fitDimensions.ts}` — leitura
  assíncrona, estado de imagem ausente, `MAX_EDGE` 1280
- `src/features/settings/DataPage.tsx` — aviso de fotos sem imagem no export
- `src/main.tsx` — `maintainPhotoStorage()` no boot
- `src/styles/global.css` — estado visual da foto ilegível
- `vitest.setup.ts` — instala o shim de OPFS por teste
- testes atualizados: `repos.test.ts`, `migration.test.ts`, `portability.test.ts`,
  `photo.integration.test.tsx`, `backup-restore.integration.test.tsx`,
  `catalogProposal.test.ts`, `fitDimensions.test.ts`

### Specs Updated

- `openspec/specs/exercise-photos/spec.md` — 4 requisitos revisados
  (persistência, downscale, falhas de armazenamento, remoção em cascata) e 3
  novos (migração, órfãos, dispositivos sem OPFS)
- `openspec/specs/data-portability/spec.md` — export, import e reset passam a
  descrever o binário em arquivo; formato do JSON inalterado
- `openspec/project.md` — decisão 9 (OPFS + metadado no IndexedDB)
