# Proposal: Aba de Vídeos no Exercício, e "Observações" Vira "Notas"

**Change ID:** `add-exercise-videos`
**Created:** 2026-08-20
**Status:** Implementation Complete
**Completed:** 2026-08-20

---

## Why

Um exercício tem uma imagem e, quando muito, um GIF. Quem quer conferir a
**execução** — a pegada, o ângulo do banco, a cadência — acaba fora do app, no
YouTube ou no Instagram, procurando de novo o vídeo que já achou uma vez. O
trecho útil costuma ser meio minuto no meio de um vídeo de dez.

Esta mudança dá ao exercício uma lista própria de vídeos, com o **recorte** de
tempo que interessa, e a aba que os apresenta. De quebra, renomeia a aba
"Observações" para **"Notas"** — mais curta, e as abas vão passar de três para
quatro.

## What Changes

- **NOVO** — `Exercise.videos`: uma lista de `{ url, startSec?, endSec?, title? }`
  embutida no próprio exercício. **Sem entidade forte nova** — sem tabela, sem
  id, sem CRUD em Configurações.
- **NOVO** — aba **"Vídeos"** no detalhe do exercício, no **catálogo e na
  sessão**, que **é** o carrossel: abrir a aba já exibe o primeiro vídeo, sem
  listagem, e o vídeo repete sozinho.
- **NOVO** — o visualizador de aquecimentos é generalizado para servir os dois,
  em duas apresentações: **sobreposto** para o aquecimento (como hoje) e
  **na página** para a aba de vídeos.
- **NOVO** — as abas **Vídeos** e **Foto** passam a mostrar quantos itens têm.
- **NOVO** — suporte a **Instagram** (`/reel/`, `/p/`, `/tv/`) como provedor
  embutível, e reel reconhecido como **vertical**.
- **NOVO** — recorte `start`/`end` aplicado no player do **YouTube**.
- **RENOMEADO** — a aba "Observações" passa a se chamar **"Notas"**, nas duas
  telas.
- Backup carrega os vídeos; restaurar um backup antigo trata a ausência como
  lista vazia.

## Problem Statement

### O que se perde hoje

A mídia do exercício é **uma** URL de imagem (`Exercise.mediaUrl`). Não há onde
guardar um vídeo de execução, quanto mais vários — a variação de pegada, o erro
comum, a versão na máquina. E não há onde guardar **qual trecho** importa: o
link cru manda o usuário para o segundo zero de um vídeo longo, toda vez.

Os **aquecimentos** já resolveram metade desse problema — são mídia externa,
vinculada a exercícios, vista em tela cheia. Mas um aquecimento é uma **entidade
forte**: tem tabela, id, tela de cadastro em Configurações, e é **compartilhado**
por vários exercícios. Isso é certo para "Rotação de ombro", que serve a dez
exercícios. É errado para "Supino — pegada fechada, 2:10 a 2:45", que serve a
exatamente um e não tem vida fora dele.

### Quem é afetado

Quem usa o app para **aprender ou corrigir** a execução, e não só para registrar
carga. Hoje essa pessoa mantém a referência fora do app — o que um app
offline-first com catálogo próprio deveria evitar.

### O atrito da aba

Com uma quarta aba, "Observações" é o rótulo mais longo dos quatro e o que menos
paga o próprio comprimento. **"Notas"** diz o mesmo em cinco letras.

## Proposed Solution

### 1. `Exercise.videos` — um valor, não uma entidade

```ts
interface ExerciseVideo {
  url: string
  /** Segundos. Ausente = do começo / até o fim. */
  startSec?: number
  endSec?: number
  /** Rótulo curto, opcional — "pegada fechada", "erro comum". */
  title?: string
}
```

Um array embutido no registro do exercício, como `categoryIds` e `warmupIds`,
mas guardando **objetos** em vez de referências. Dexie persiste isso sem
cerimônia, e a decisão é a que você pediu: **sem entidade forte nova**.

Isso é uma escolha, não uma economia. Um vídeo de execução **pertence** a um
exercício — não é reutilizável como um aquecimento é, não precisa de nome
obrigatório para ser encontrado num seletor, e não tem "onde mais isto é usado".
Dar-lhe tabela própria criaria um CRUD em Configurações que ninguém pediria,
mais uma integridade referencial para manter na exclusão do exercício.

**A ordem do array É a ordem de apresentação**, como em `Day.exerciseIds` e
`Exercise.warmupIds`.

### 2. O visualizador de aquecimentos passa a servir os dois

`WarmupViewer` já é, na prática, um pager genérico sobre mídia externa: tela
cheia, `role="dialog"`, `< >` flutuando **sobre** a mídia (justamente para o
vídeo vertical), circulação infinita, contador "N de M", teclado, estado de
falha com link externo. Nada disso é sobre aquecimento.

Ele é generalizado para um `MediaViewer` que recebe uma lista de
`{ url, name }` mais um índice inicial, e passa a ser chamado pelos dois. O
comportamento do aquecimento **não muda**; ele passa a ser um dos dois clientes.

Generalizar em vez de copiar é o ponto: são duas telas que fazem exatamente a
mesma coisa, e a cópia ia divergir na primeira correção.

### 3. Instagram e o recorte de tempo

`warmupMedia.ts` já classifica a URL e monta o embed. Ele ganha:

- **Instagram** como provedor: `instagram.com/{reel|p|tv}/{code}` →
  `https://www.instagram.com/{tipo}/{code}/embed`;
- **reel do Instagram como vertical**, ao lado do Short do YouTube — hoje
  `isPortraitEmbed` só reconhece `/shorts/`, e um reel sem isso vira uma tira
  fina;
- **`start`/`end`** aplicados ao embed do YouTube (`?start=N&end=M`).

**O Instagram não aceita recorte.** O endpoint `/embed` renderiza o post, mas
não expõe parâmetro algum de início ou fim — não há como pedir um trecho. Então
o formulário só oferece os campos de início/fim quando a URL **é do YouTube**;
numa URL do Instagram eles somem, com uma linha dizendo por quê. Uma tela que
pede um dado que o player vai ignorar mente para quem a preenche.

Um vídeo já cadastrado com recorte que depois vire uma URL do Instagram
**mantém** os números gravados — apenas não os aplica. Apagá-los seria destruir
o que o usuário digitou por causa de uma edição de URL.

### 4. A aba

**"Vídeos"** entra como quarta aba, no detalhe do catálogo **e** no da sessão —
os vídeos são do **exercício**, não da academia, e a spec exige que as duas
telas tenham o mesmo arranjo (*Exercise Note and Photos on the Catalog Detail*).
Durante o treino é quando mais se quer conferir a execução.

A aba **lista** os vídeos (rótulo, provedor, trecho); tocar um abre o
visualizador **naquele** vídeo. Sem vídeo nenhum, um estado vazio que aponta
para a edição do exercício.

### 5. Cadastro dentro do formulário do exercício

Uma seção "Vídeos" no formulário de criação/edição, no mesmo lugar em que hoje
se escolhem aquecimentos e alternativas: adicionar uma URL, opcionalmente rótulo
e trecho, remover, reordenar. Nada em Configurações.

## Scope

### In Scope

- `Exercise.videos` e a migração de schema que a introduz
- Seção "Vídeos" no formulário do exercício: adicionar, editar, remover, reordenar
- Validação de URL, e de que `endSec > startSec` quando ambos existirem
- Aba "Vídeos" nas duas telas de detalhe, com estado vazio
- Visualizador em tela cheia, reusando o dos aquecimentos
- Instagram como provedor embutível; reel como vertical
- `start`/`end` no embed do YouTube
- "Observações" → "Notas" nas duas telas, e nos testes que a nomeiam
- Backup: exportar e importar `videos`; backup antigo → lista vazia

### Out of Scope

- **Upload de vídeo.** O app guarda foto em OPFS porque a foto é do usuário e
  local; vídeo de execução é de terceiro e mora no provedor.
- **Reprodução offline.** O embed exige rede, como o aquecimento já exige.
- **Recorte no Instagram.** Não é uma decisão de escopo, é o que o provedor
  oferece.
- **Miniatura do vídeo na lista.** Buscar a thumbnail do YouTube é uma requisição
  a mais por vídeo, e do Instagram exige token. A lista mostra rótulo, provedor
  e trecho.
- **Vídeo por academia.** Como as alternativas e os aquecimentos, é do exercício.
- **Reaproveitar um vídeo entre exercícios.** É exatamente o que a decisão de
  não criar entidade forte descarta.
- **Autoplay no aquecimento.** Ele continua sem tocar sozinho: é alcançado por
  um botão, e quem tocou o botão pediu para ver, não para gastar dados naquele
  instante. Os **vídeos** passaram a tocar sozinhos — ver "Pedido durante a
  implementação".

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Yes | `Exercise.videos`; nova `version()` no Dexie. Sem tabela nova, sem índice novo — nada consulta por vídeo |
| API | No | App local, sem backend |
| State | Yes | `warmupMedia.ts` ganha Instagram, recorte e vertical; `createExercise`/`updateExercise` aceitam `videos` |
| UI | Yes | Quarta aba nas duas telas; seção no formulário; `WarmupViewer` → `MediaViewer`; rótulo "Notas" |

## Architecture Considerations

**A classificação continua derivada da URL.** `warmupMedia.ts` documenta que
`kind` nunca é gravado — a URL é o fato, a classificação é uma leitura dela.
Instagram entra como mais um caso dessa leitura. O recorte, por outro lado, **é**
dado do usuário e é gravado: ele não está na URL e não pode ser derivado dela.

**O módulo vai precisar de outro nome.** `warmupMedia.ts` passa a servir vídeos
de exercício também. Renomeá-lo (`embedMedia.ts`) é parte da mudança — um módulo
chamado `warmupMedia` que o formulário de exercício importa é uma pista falsa
para quem chegar depois.

**Quatro abas cabem?** As abas hoje são "Detalhe/Execução", "Observações",
"Foto". Com "Notas" no lugar de "Observações", os quatro rótulos ficam em
16 caracteres somados — menos que os 22 de hoje com três. É por isso que o rename
está nesta mudança e não numa própria: ele é o que **paga** a quarta aba.

**Sem índice.** `warmupIds` é `multiEntry` porque "quais exercícios usam este
aquecimento" precisa ser consulta na exclusão. Um vídeo não é compartilhado, não
é excluído de fora, e ninguém pergunta "quem usa este vídeo". Índice aqui seria
custo de escrita sem leitura correspondente.

**Migração sem reescrita.** Uma versão do Dexie que apenas declara o campo; um
exercício sem `videos` lê como `undefined` e todo consumidor trata como vazio —
o mesmo caminho que `warmupIds` seguiu.

## Success Criteria

- [ ] Um exercício aceita **vários** vídeos, cadastrados na sua edição
- [ ] URL do YouTube (watch, youtu.be, shorts) e do Instagram (reel, p, tv) tocam embutidas
- [ ] Um vídeo do YouTube com início e fim começa e termina onde foi pedido
- [ ] Numa URL do Instagram o formulário **não oferece** início/fim, e diz por quê
- [ ] Um reel do Instagram é exibido em **retrato**, como um Short
- [ ] A aba "Vídeos" existe no catálogo **e** na sessão
- [ ] Tocar um vídeo abre a tela cheia **naquele** vídeo, com `< >` sobre a mídia
- [ ] Com um vídeo só, as setas não aparecem
- [ ] O visualizador de **aquecimentos** continua idêntico ao de hoje
- [ ] A aba se chama **"Notas"**, e nenhum "Observações" resta na interface
- [ ] Backup exporta e importa os vídeos; backup antigo restaura sem erro
- [ ] Excluir o exercício leva os vídeos junto, sem órfão
- [ ] `openspec validate --specs --strict` e a suíte, verdes

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| O embed do Instagram quebrar ou recusar enquadramento | Med | Med | O estado de falha do visualizador já existe e oferece abrir fora do app — mesmo caminho de uma imagem inalcançável |
| `end` do YouTube ser ignorado em alguns players | Low | Low | É parâmetro documentado do IFrame API; se falhar, o vídeo só passa do fim, sem quebrar a tela |
| Quarta aba apertar o rótulo em tela estreita | Med | Low | O rename para "Notas" é o que abre o espaço; conferir a 360px na Phase 4 |
| Generalizar o `WarmupViewer` regredir o aquecimento | Med | Med | A suíte de `warmup.integration.test.tsx` roda sem edição — se precisar mudar, o comportamento mudou |
| Renomear a aba quebrar testes que a buscam pelo nome | High | Low | É o efeito desejado: os testes nomeiam a aba e devem ser atualizados junto, num passo só |
| Backup antigo sem `videos` derrubar a restauração | Low | Med | Mesmo tratamento de `warmupIds`: ausente significa vazio, com teste próprio |

---

## Archive Information

**Archived:** 2026-08-20
**Duration:** mesmo dia (proposta, implementação e arquivamento em 2026-08-20)
**Outcome:** Successfully implemented

Quatro pedidos chegaram **depois** da proposta original e estão nas Phases 5
(contagem nas abas, a aba virar o carrossel, autoplay, laço no trecho). Um deles
inverteu uma regra que a proposta havia herdado dos aquecimentos — ver "Pedido
durante a implementação".

### Files Modified

- `src/db/types.ts` — `ExerciseVideo`, `Exercise.videos`
- `src/db/db.ts` — migração v12 (sem `.stores()`: o vídeo não é indexado)
- `src/db/repos.ts` — `requireVideo`/`requireVideos`, validação antes da transação
- `src/lib/embedMedia.ts` — renomeado de `warmupMedia.ts`; Instagram, reel em
  retrato, `supportsTimeRange`, `embedUrlWithRange`
- `src/lib/videoTime.ts` — **novo**, relógio ⇄ segundos
- `src/lib/youtubeLoop.ts` — **novo**, protocolo de laço do trecho por postMessage
- `src/ui/MediaViewer.tsx` — de `features/warmup/WarmupViewer.tsx`; apresentações
  sobreposta e inline
- `src/ui/media-viewer.css` — de `features/warmup/warmup.css`
- `src/ui/Tabs.tsx` — `count` por aba
- `src/features/exercise/VideosTab.tsx` — **novo**, a aba que é o carrossel
- `src/features/exercise/ExerciseDetailPage.tsx`, `src/features/session/SessionEntryPage.tsx`
  — quarta aba, contagens, "Notas"
- `src/features/settings/ExercisesPage.tsx` — seção `VideosField`
- `src/features/warmup/WarmupButton.tsx` — passa a montar o `MediaViewer`
- `src/data/portability.ts` — `normalizeVideos`
- Testes: `videoTime.test.ts`, `youtubeLoop.test.ts`,
  `features/exercise/videos.integration.test.tsx` (novos), mais
  `embedMedia.test.ts`, `repos.test.ts`, `migration.test.ts`,
  `portability.test.ts` e os que nomeavam a aba "Observações"

### Specs Updated

- `openspec/specs/exercise-videos/spec.md` — **capability nova**, 6 requisitos
- `openspec/specs/exercises/spec.md` — *Exercise Note and Photos on the Catalog Detail*
- `openspec/specs/workout-sessions/spec.md` — *Session Exercise Detail*
- `openspec/specs/warmups/spec.md` — *Full-Screen Warmup Viewer*
- `openspec/specs/data-portability/spec.md` — *Backups Carry Exercise Videos*

### Verification

- `npx vitest run` — 953 testes, 76 arquivos (875 antes da change)
- `npx tsc -b --noEmit` — limpo
- `openspec validate --all --strict` — 0 failed
- Conferido na app rodando pelo usuário

**Ressalva sobre a suíte.** Ela não passa de forma confiável numa rodada
completa: de 0 a 3 testes falham por rodada, em arquivos **diferentes** a cada
vez, sempre por timeout de `waitFor`, e **todos passam isolados** — verificado
arquivo a arquivo antes de arquivar. Não vem desta mudança; a suíte cresceu de
862 para 953 testes e a margem de 1s ficou apertada sob paralelismo. Rodar
`--poolOptions.threads.singleThread` não serve de controle: nesse modo o estado
de módulo vaza entre arquivos e falham outros testes. Fica como pendência
própria.
