# Implementation Tasks: Aquecimentos vinculados ao exercício

**Change ID:** `add-exercise-warmups`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 `src/db/types.ts` — `interface Warmup { id?, name, url }` e
      `Exercise.warmupIds: number[]`. Documentar no comentário do `Warmup` **por
      que o tipo da mídia não é um campo** (é função pura da URL) e no de
      `warmupIds` que a relação é assimétrica, ao contrário de `alternativeIds`.
- [x] 1.2 `src/lib/warmupMedia.ts` (novo) — `warmupMediaKind(url)` devolvendo
      `'image' | 'video' | 'link'`, mais o `validateWarmupUrl` que a validação
      usa. Um só classificador, usado pela validação **e** pela renderização.
- [x] 1.3 `src/db/db.ts` — migração **v11**: tabela `warmups: '++id, name'` e
      `*warmupIds` no índice de `exercises`; o upgrade preenche
      `warmupIds: []` em todo exercício. Sem exclusões; idempotente.
- [x] 1.4 `src/db/repos.ts` — `listWarmups`, `createWarmup`, `updateWarmup`,
      `deleteWarmup` (desvinculando de **todos** os exercícios na mesma
      transação) e `exercisesUsingWarmup` (pelo índice multiEntry).
- [x] 1.5 `createExercise`/`updateExercise` aceitam `warmupIds` (padrão `[]`),
      preservando a **ordem** informada — ela é a ordem da paginação.
- [x] 1.6 Testes em `src/db/repos.test.ts` e `src/lib/warmupMedia.test.ts`:
      as três classificações de URL (incluindo query string e maiúsculas), o
      CRUD, o desvínculo na exclusão, o vínculo do mesmo aquecimento em vários
      exercícios, e a ordem preservada.
- [x] 1.7 Teste em `src/db/migration.test.ts`: v10 semeada → v11 com
      `warmupIds: []` em todos, sem perder registro, e `*warmupIds`
      consultável.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] `npx vitest run src/db src/lib` verde (127 + 18 testes)
- [x] `warmupIds` entrou como **obrigatório** de propósito: o compilador apontou
      cada construção literal de `Exercise` (5 arquivos de teste e a
      portabilidade) em vez de deixar um default silencioso passar.

---

## Phase 2: Business Logic (State/Portability)

- [x] 2.1 `src/lib/hooks.ts` — `useWarmups` e `useWarmupMap`, no padrão de
      `useExercises`/`useExerciseMap`.
- [x] 2.2 Um `warmupsOf(exercise, warmupMap)` que resolve a lista de ids para
      registros **na ordem do array**, ignorando ids órfãos — no espírito de
      `alternativesOf`.
- [x] 2.3 `src/data/portability.ts` — `warmups` entra no `BackupDoc` e no
      export/import; `Exercise.warmupIds` viaja; documento antigo (sem o campo /
      sem a tabela) importa com lista e tabela vazias.
- [x] 2.4 **Decidido contra.** A recomendação era semear um, mas com o dataset
      em mãos ela não se sustenta: nenhum exercício da amostra é de
      mobilidade/alongamento, então não há URL real para reaproveitar, e
      inventar uma daria 404 (o mesmo motivo que deixou os cardios da amostra
      sem `mediaUrl`). Reaproveitar o gif de um exercício como se fosse
      aquecimento seria semanticamente errado. A amostra fica sem aquecimento.
- [x] 2.5 Testes em `src/data/portability.test.ts`: round-trip com vínculos, e
      backup antigo importando sem erro.

**Quality Gate:** PASSED
- [x] `npx vitest run src/data src/lib` verde (274 testes)
- [x] Backup antigo coberto, e mais um caso que o spec pedia: um vínculo
      apontando para aquecimento ausente do documento é **descartado** em vez de
      restaurado quebrado.

---

## Phase 3: User Interface

- [x] 3.1 `WarmupsPage` (nova) em `/settings/warmups`, com lista, formulário
      (nome + URL) e exclusão confirmada, no padrão de `CategoriesPage`. Cada
      linha mostra a miniatura/ícone conforme o tipo e **quantos exercícios**
      usam aquele aquecimento.
- [x] 3.2 Entrada "Aquecimentos" na lista de Configurações, junto de Categorias
      e Exercícios, com a contagem.
- [x] 3.3 Seletor de aquecimentos no formulário do exercício, no padrão do
      seletor de Alternativas (busca, escolhidos sempre visíveis).
- [x] 3.4 `WarmupViewer` (novo) — tela cheia com: fechar no topo, `<`/`>`
      laterais desabilitados nas pontas, contador "N de M", `role="dialog"` +
      `aria-modal`, teclado (setas e `Esc`) e a rolagem de trás travada.
      Renderiza `<img>`, `<video controls preload="none">` ou o cartão de link
      conforme o classificador.
- [x] 3.5 Botão "Aquecimento" na aba **Execução** do `ExerciseDetailPage` e do
      `SessionEntryPage`, exibido **apenas** quando há aquecimentos, e voltando
      para a mesma aba ao fechar.
- [x] 3.6 Estados de falha: mídia que não carrega mostra o placeholder e o nome,
      não uma tela quebrada.
- [x] 3.7 Testes de integração: cadastrar; vincular a dois exercícios; o botão
      só aparece quando há vínculo; abrir, navegar com `<`/`>` (desabilitados nas
      pontas), fechar voltando à aba certa; excluir desvinculando.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo (o projeto não tem script de lint)
- [x] `npx vitest run src/features` verde (245 testes, 11 deles novos)
- [x] *Ajuste de teste alheio:* `loading-flash` fixa a lista de contadores de
      Configurações; a linha nova de Aquecimentos entrou na expectativa.

---

## Phase 4: Integration & Polish

- [x] 4.1 Textos em pt-BR revisados (rótulo do botão, título do visualizador,
      contador, estado vazio da página, confirmação de exclusão).
- [x] 4.2 Verificado no app rodando (Chromium headless contra o dev server):
      os três tipos cadastrados pelo formulário, com a dica dizendo o que cada
      URL virou antes de salvar; vinculados ao mesmo exercício; botão
      "Aquecimento 3" na aba Execução; visualizador com "1 de 3", `<` desativado
      na primeira, `>` na última; página 2 com `<video preload="none">` e sem
      autoplay; página 3 com **nenhum iframe** e um link `target="_blank"` para
      youtube.com; setas do teclado paginando, `Esc` fechando e devolvendo a
      `/exercise/1?day=1` com a rolagem de trás liberada.
- [x] 4.3 **Achou um bug e foi corrigido.** A 320px com a fonte em 200% o
      visualizador transbordava: o botão fechar saía da tela, o contador ficava
      cortado e a seta `>` caía em cima da imagem.
      *Causa:* `.wu-viewer` é `display: grid` sem `grid-template-columns`, então
      a coluna implícita dimensionava por **max-content** — a imagem no tamanho
      natural — e esticava a sobreposição para além da viewport. Mesma família do
      `min-width: 0` que faltava na barra de abas.
      *E a primeira medição não pegou:* eu media `document.scrollWidth`, que é
      cego para um elemento `position: fixed`. Passou a medir o próprio overlay.
      Corrigido com `grid-template-columns: 100%` + `overflow: hidden` no
      overlay, `min-width: 0` na barra e `object-fit: contain` na mídia.
      Reverificado a 320/390px e 125/200%: nada transborda, nada é cortado, as
      setas ficam ao lado da mídia.
- [x] 4.4 A v11 rodou sobre um **banco real e populado** — o perfil de browser
      da mudança anterior, que estava em v10 com 29 exercícios, 3 sessões e 18
      pesos. Resultado: store `warmups` criada, `warmupIds: []` em todos, e nada
      perdido (nomes e os exercícios de cardio intactos). Evidência mais forte
      que o teste com banco semeado, que também existe.
- [x] 4.5 Atualizar `openspec/project.md`: a lista de entidades ganha o
      Aquecimento, e vale registrar a decisão de mídia derivada da URL.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo e `npx vitest run` verde (809 testes)
- [x] Documentação sincronizada

---

## Ajuste a pedido: embutir YouTube/Vimeo no visualizador

*Reverte a escolha feita na proposta ("arquivo + link externo"), depois de o
usuário ver o resultado.*

- [x] `warmupMediaKind` ganhou um quarto tipo, `embed`, e `warmupEmbedUrl`
      converte a **página de assistir** no **endereço de player** — a distinção
      que faz a diferença: `youtube.com/watch?v=ID` recusa ser enquadrada,
      `youtube.com/embed/ID` não. Cobre watch, youtu.be, shorts, m.youtube e as
      duas formas do Vimeo, preservando o `t=` quando existe.
- [x] O visualizador renderiza `<iframe>` para `embed`; imagem, vídeo local e
      link seguem como estavam.
- [x] **Só provedores com player publicado.** Enquadrar um site qualquer daria
      caixa em branco (`X-Frame-Options`), então o resto continua abrindo fora —
      e isso está no spec, não só no código.
- [x] Mitigações ao alcance do app: host `youtube-nocookie.com`, **sem**
      `allow="autoplay"`, `loading="lazy"` e `referrerpolicy` restritivo. Nada
      disso torna o embed privado, e o spec diz isso com todas as letras.
- [x] 16 testes novos no classificador e um de integração provando que o iframe
      aparece com o src de player e **sem** autoplay, e que o usuário não é mais
      empurrado para fora.
- [x] Spec, `project.md` e a proposta reescritos: eles afirmavam "MUST NOT
      embutir", que virou falso.

---

## Ajuste a pedido: o que não é vídeo é imagem

- [x] O tipo `link` deixou de existir. `warmupMediaKind` passa a devolver
      `video` (extensão), `embed` (provedor com player) ou **`image`** para todo
      o resto — imagem virou o **padrão**, não um quarto caso de "desconhecido".
- [x] *Motivo, que ficou no código e no spec:* muita URL de imagem real não tem
      extensão (caminho de CDN, `?format=jpg`, recurso assinado), e o
      classificador antigo mandava essas para fora do app por uma figura que
      teria aparecido sem problema.
- [x] O cartão de "Abrir fora do app" saiu do fluxo normal. O **estado de
      falha** — que já existia — passou a ser a rede de segurança do palpite
      otimista: se a URL não for imagem, o `<img>` falha e ali continua havendo
      o endereço para abrir fora, com a navegação funcionando.
- [x] Testes ajustados e um novo: uma URL sem extensão renderiza `<img>`, e o
      `onError` leva ao estado de falha com o link e as setas ativas.
- [x] Verificado no app com uma URL de imagem real sem extensão
      (`picsum.photos/600/400`): classificada como imagem, exibida no
      visualizador, `naturalWidth > 0` — o caso exato que antes saía do app.
- [x] Spec, proposta e `project.md` sincronizados.

---

## Ajuste a pedido: Short vertical ocupa a altura da tela

- [x] `isPortraitEmbed(url)` — verdadeiro só para `/shorts/`, e o visualizador
      dá a esse iframe um quadro **9:16 que lidera pela altura**. Os demais
      seguem em 16:9.
- [x] *Por que detectar em vez de deixar tudo vertical:* um vídeo em paisagem
      dentro de um quadro alto vira uma tira com tarja dos dois lados — o mesmo
      defeito, invertido. Detectar custa oito linhas e elimina o lado ruim.
- [x] *Limite honesto, registrado no código e no spec:* um Short compartilhado
      como `youtu.be/ID` é indistinguível de um vídeo comum nesse nível, e vai
      cair no quadro deitado. Saber a proporção real exigiria consultar a API do
      provedor, que este app não faz.
- [x] Medido no app: o Short ficou com **609px** de altura contra **223px** do
      quadro deitado, num palco de 633px — 96% da altura disponível.

---

## Ajuste a pedido: setas sobre a mídia, em carrossel infinito

- [x] As setas passaram a **flutuar sobre a mídia** (translúcidas, com blur, para
      ler tanto sobre foto clara quanto escura), e o palco perdeu os 52px de
      padding lateral que existiam só para acomodá-las — a mídia ganhou a
      largura inteira, o que importa mais para um Short vertical.
- [x] **Circulação infinita**, no toque e no teclado: depois do último vem o
      primeiro. Substitui o "desabilitado nas pontas" que eu tinha adotado por
      analogia ao Voltar/Avançar do exercício — analogia que não valia, porque
      lá "não há próximo" é informação real e aqui a pilha não tem posição numa
      rotina.
- [x] Com **um único** aquecimento as setas não aparecem: um ciclo de um seria
      dois botões que visivelmente não fazem nada.
- [x] Testes reescritos: dá a volta nos dois sentidos, pelo toque e pelo
      teclado; as setas não ficam dentro do palco; e o caso de um item só.
- [x] Medido no app a 390px e 320px: as setas cobrem a mídia em todos os itens,
      com alvo de toque de 44px, e a volta completa retorna a "1 de 5".

---

## Fora do escopo desta mudança: dois ajustes de fluxo pedidos na mesma sessão

*Não têm relação com aquecimentos. Estão nesta branch porque foram pedidos aqui,
e os specs vivos foram atualizados direto — não há delta pendente para eles.*

**Cardio vai direto ao exercício** (`openspec/specs/cardio/spec.md`)

- [x] ~~`startCardioSession` passa a devolver `{ sessionId, entryId }`, e a aba
      Cardio abre o **detalhe do exercício** em vez da visão geral da sessão.~~
      **Revertido depois, a pedido** — ver *Cardio volta a abrir a tela da
      sessão*, abaixo.
- [x] ~~Nesse detalhe, **voltar** devolve à aba Cardio.~~ **Revertido junto.**
- [x] **Sem Voltar/Avançar** quando a sessão tem um exercício só. *(Continua
      valendo — não depende de onde o Iniciar cai.)*
- [x] Recusar o "encerrar o treino?" num cardio deixa de jogar o usuário na
      visão geral: ele fica onde está. *(Continua valendo.)*

**Concluir leva ao resumo** (`openspec/specs/workout-sessions/spec.md`)

- [x] Concluir um treino — força ou cardio, da tela da sessão ou do exercício —
      passa a levar ao **resumo daquela sessão**, onde estão os botões de
      compartilhar a imagem, em vez da lista do histórico. Compartilhar o treino
      recém-terminado é o que a maioria quer em seguida, e a lista enterrava
      isso. O histórico segue a um toque, pelo voltar.
- [x] Verificado no app nos dois caminhos: cardio (`/cardio` → Iniciar →
      Concluir → prompt) e força (Home → Iniciar → marcar → Concluir treino),
      ambos terminando em `/session/:id` com "Compartilhar" e "Compartilhar sem
      pesos" na tela, e sem "Concluir treino" sobrando.

---

## Fora do escopo desta mudança: três pedidos de uma sessão posterior

*Também sem relação com aquecimentos, e também com os specs vivos atualizados
direto, sem delta pendente. Um deles reverte um item da seção acima.*

**Cronômetro de duração da sessão**
(`openspec/specs/workout-sessions/spec.md` — requisito novo *A Running Session
Shows Its Duration*)

- [x] `fmtClock` e o hook `useElapsed` (`src/lib/elapsed.ts`, novo): `HH:MM:SS`
      a cada segundo, contado do `startedAt` já gravado. Nenhum campo novo —
      recarregar, fechar o app ou abrir em outro aparelho não reinicia, e um
      "tempo decorrido" persistido seria uma segunda fonte de verdade que
      divergiria no primeiro fechamento.
- [x] Cada tique relê `Date.now()` em vez de somar 1000, e o retorno ao primeiro
      plano re-sincroniza: num PWA em segundo plano o timer pode ser suspenso, e
      uma hora de treino é uma hora de celular no bolso.
- [x] Exibido na tela da sessão ao lado de "iniciado hoje", e — a pedido — também
      **acima das abas** na tela do exercício de **cardio**, onde a corrida
      inteira é passada. Na de musculação não: o runner, um toque acima, já conta.
- [x] Sessão concluída mantém a duração fixa do resumo, arredondada ao minuto.
- [x] 12 testes novos (`format.test.ts`, `elapsed.test.ts`, integração de sessão
      e de cardio).

**Play bloqueado só explica** (`openspec/specs/home-navigation/spec.md` e
`cardio/spec.md`)

- [x] Com uma sessão aberta, os botões de play que **não** são o "Continuar"
      dela deixam de navegar: só mostram o toast. Antes, a Home levava a um
      cardio em andamento e a aba Cardio avisava **e** navegava assim mesmo —
      duas respostas para um toque, e a segunda ninguém pediu.
- [x] `busySessionMessage(kind)` em `src/lib/format.ts`, uma função só para as
      duas telas: a mensagem nomeia o **tipo** que está rodando, que é o que diz
      em qual aba está o "Continuar".
- [x] *Limite conhecido, herdado e não introduzido aqui:* a sessão em andamento
      só é alcançável pelo card/linha que a possui. Excluir o exercício de um
      cardio em andamento (ou o dia de um treino) deixa a sessão sem "Continuar"
      em lugar nenhum. Fechar isso exigiria a Consistência listar também a sessão
      ativa — hoje `listSessionSummaries` filtra só `completed`.

**Cardio volta a abrir a tela da sessão** (`openspec/specs/cardio/spec.md`)

- [x] **Reverte** o primeiro item da seção anterior, a pedido: Iniciar (e
      Continuar) num cardio abre `/session/:id`, a mesma tela de um treino de
      musculação. Pular para o detalhe poupava um toque numa lista de um item,
      mas deixava a sessão sem nenhuma tela que o usuário tivesse visto.
- [x] `backTo` do detalhe da entrada perdeu o caso especial de cardio: volta
      para a sessão nos dois tipos, refazendo o caminho de entrada.
- [x] `startCardioSession` continua devolvendo `{ sessionId, entryId }`; só o
      `entryId` deixou de ser usado na navegação.
- [x] 5 testes de cardio reescritos e dois helpers novos.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo e `npx vitest run` verde (849 testes)
- [x] `openspec validate --specs --strict`: 8 passaram, 7 falharam — a mesma
      lista de falhas de antes destas edições, todas pré-existentes e em specs
      não tocados aqui. `warmups` (nova) passa.

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
