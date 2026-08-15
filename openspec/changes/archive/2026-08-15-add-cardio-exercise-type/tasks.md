# Implementation Tasks: Tipo de exercício (Força / Cardio) e a aba Cardio

**Change ID:** `add-cardio-exercise-type`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 `src/db/types.ts` — `export type ExerciseKind = 'strength' | 'cardio'`;
      `Exercise.kind: ExerciseKind` e `Session.kind: ExerciseKind`. Documentar
      no comentário de `Session` **por que o tipo é snapshot** (o histórico não
      pode mudar quando um exercício troca de tipo ou é excluído) e no de
      `Exercise` que cardio não tem peso.
- [x] 1.2 `src/db/db.ts` — migração **v10**: acrescentar `kind` ao índice de
      `exercises` e preencher `kind: 'strength'` em **todos** os exercícios e
      **todas** as sessões existentes. Sem exclusões; idempotente.
- [x] 1.3 `src/db/repos.ts` — `createExercise`/`updateExercise` aceitam `kind`
      (padrão `'strength'`).
- [x] 1.4 `updateExercise` — ao mudar de `'strength'` para `'cardio'`, remover o
      exercício de **todos** os dias em que estiver, na mesma transação, e
      devolver quais dias foram afetados para a UI poder confirmar antes.
      Expor também um `daysContaining(exerciseId)` para a confirmação.
- [x] 1.5 `listCardioExercises(d)` — os exercícios `kind === 'cardio'`, em ordem
      de nome, via índice.
- [x] 1.6 `startCardioSession(gymId, exerciseId, d)` — respeita o mesmo
      "uma sessão ativa por academia"; cria `Session { kind: 'cardio',
      dayName: <nome do exercício>, dayId: undefined }` com **uma** entrada.
- [x] 1.7 `completeSession` — para uma sessão de cardio, concluir MUST encerrar
      mesmo com a entrada não marcada (uma entrada só; ver delta).
- [x] 1.8 Testes em `src/db/exercises.test.ts` (ou equivalente) e
      `src/db/migration.test.ts`: `kind` no CRUD, a saída dos dias na troca de
      tipo, `listCardioExercises`, `startCardioSession` (incluindo o bloqueio
      por sessão ativa), e a v10 sobre um banco v9 semeado.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] `npx vitest run src/db` verde (116 testes)
- [x] `kind` entrou como **obrigatório** de propósito: o compilador apontou
      cada construção literal de `Exercise`/`Session` (5 arquivos de teste e a
      portabilidade) em vez de deixar um default silencioso passar.

---

## Phase 2: Business Logic (State/Portability)

- [x] 2.1 `src/lib/hooks.ts` — hook para a lista de cardio (`useCardioExercises`).
- [x] 2.2 Filtros do formulário de dia — o seletor de exercícios passa a
      considerar apenas `kind === 'strength'`, inclusive na busca e nos filtros
      por categoria.
- [x] 2.3 `src/data/portability.ts` — `kind` viaja no backup de exercícios e de
      sessões; `normalizeKinds` aceita documento **sem** o campo e o assume
      `'strength'`, ao lado dos back-compats que já existiam.
      `SCHEMA_VERSION` **não** subiu: o campo é aditivo e um backup novo
      importa numa versão antiga sem quebrar (ela simplesmente o ignora).
- [x] 2.4 `generateExample` — a amostra ganhou **Esteira** e **Bicicleta
      Ergométrica**, fora de qualquer dia e sem peso.
      *Decisão:* o "HIIT (Esteira ou Bike)" que já existia **continua Força** —
      ele está dentro do "Dia 2 - Core e HIIT", e marcá-lo cardio esvaziaria
      metade do nome do dia. Sem `mediaUrl` nos novos: inventar uma URL de
      imagem daria 404, e o app já cai no placeholder.
- [x] 2.5 Testes em `src/data/portability.test.ts`: round-trip com os dois
      tipos, e backup antigo (sem `kind`) importando como Força.

**Quality Gate:** PASSED
- [x] `npx vitest run src/data src/lib` verde (245 testes)
- [x] Backup antigo coberto: um export com o campo removido importa com tudo
      como Força, sem rejeição

---

## Phase 3: User Interface

- [x] 3.1 `ExerciseFormPage` — seletor **Tipo** (segmentado Força / Cardio, no
      padrão do `unit-seg`), Força por padrão.
- [x] 3.2 Confirmação ao passar para Cardio um exercício que está em dias,
      **nomeando os dias**; recusar deixa tudo como estava.
- [x] 3.3 Lista do catálogo (`ExercisesPage`) — chip **Cardio** ao lado do nome.
      *Só o cardio é marcado:* Força é o padrão e a maioria esmagadora, então um
      chip em toda linha seria ruído. A linha de cardio também deixa de mostrar
      "Nenhum dia", que para ele não é uma pendência.
- [x] 3.4 `ExerciseDetailPage` e `SessionEntryPage` — esconder o cartão de peso
      e o histórico quando o exercício é cardio; Observações e Foto continuam.
- [x] 3.5 `TabBar` — quarta aba **Cardio**, ao lado de Treinos, rota `/cardio`;
      `active` ganha o valor `'cardio'`.
- [x] 3.6 `CardioPage` (nova) — lista dos exercícios de cardio, cada linha com
      mídia, nome, categorias e **Iniciar**; estado vazio próprio; o Iniciar
      `aria-disabled` (não `disabled`) enquanto há sessão ativa, como na Home.
      *Achado durante os testes:* o botão "Concluir treino" da `SessionPage`
      era desabilitado com `done === 0`, então uma sessão de cardio não podia
      ser concluída pela UI mesmo com o repositório permitindo. O portão passou
      a valer só para musculação.
- [x] 3.7 `ConsistencyPage` — **estrela** na célula do dia que teve cardio,
      somada aos estados existentes, mais a entrada na legenda.
- [x] 3.8 Testes de integração: cadastrar um cardio; o peso some no catálogo e
      na sessão; o formulário de dia não o oferece; a troca de tipo tira dos
      dias; a aba abre `/cardio`; iniciar e concluir um cardio; a estrela
      aparece no calendário do dia certo.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo (o projeto não tem script de lint)
- [x] Testes novos verdes em **cinco execuções seguidas** (153 testes entre
      `src/features/cardio`, `exercise-kind`, `src/db` e `consistency`)

---

## Phase 4: Integration & Polish

- [x] 4.1 Textos em pt-BR revisados (rótulo do tipo, aba, estado vazio da aba,
      confirmação da troca de tipo, legenda da estrela).
- [x] 4.2 Layout das quatro abas medido a 320/360/390/430px e de 125% a 200%.
      **Achado:** `.tabbar a` tinha `flex: 1` sem `min-width: 0`, então os links
      se recusavam a encolher abaixo do rótulo e a barra **estourava na
      horizontal** — com quatro abas a partir de 150%, e com três já a partir de
      175% (defeito que existia antes desta mudança). Corrigido com
      `min-width: 0` + quebra de linha: 0 de estouro em todas as larguras e
      escalas medidas.
      **Custo assumido:** no tamanho padrão (125%), "Configurações" precisa de
      102px e a quarta aba recebe 80–98px em telas de 320–390px, então essa
      palavra passa a ocupar duas linhas (as outras três cabem em uma; tudo cabe
      em uma a partir de 430px). Nenhum rótulo foi encurtado — trocar
      "Configurações" por "Ajustes" resolveria, mas é decisão de produto.
- [x] 4.3 Fluxo verificado no app rodando (Chromium headless contra o dev
      server): aba Cardio com as duas amostras e um Iniciar por linha, sessão
      "Esteira" com uma entrada, "Concluir treino" habilitado sem marcar nada, e
      o calendário com o dia em `done multi cardio` (title "2 sessões · cardio")
      depois de um cardio **e** um treino de musculação no mesmo dia.
      **Dois furos que só o browser pegou**, ambos corrigidos e cobertos por
      teste: (1) a linha da sessão de cardio ainda mostrava o badge "definir" —
      eu havia escondido o cartão de peso no *detalhe*, não na *lista*; (2) o
      texto "Marque ao menos um exercício para concluir" continuava sob um botão
      já habilitado. O badge da Home também ganhou a guarda, por consistência.
- [x] 4.4 A v10 é verificada por **teste** sobre um banco v9 semeado (nada
      apagado, `kind` preenchido, índice novo consultável, cardio não revertido
      numa reabertura).
      *Não executado:* o upgrade sobre o banco real do usuário — o dispositivo
      dele fará isso na primeira abertura.
- [x] 4.5 Atualizar `openspec/project.md`: a lista de entidades e as decisões de
      design precisam registrar o tipo do exercício e que cardio não tem peso
      nem dia.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Testes desta mudança verdes em **cinco execuções seguidas** (153 testes)
- [x] Suíte completa: 758 testes, com 1–3 falhas por execução concentradas em
      `App.onboarding`, `session.integration` e `notes.integration` — todas
      passam isoladamente. **Medido em `main`, sem nada desta mudança:** 5, 3, 2
      e 1 falha em quatro execuções, nos mesmos arquivos. É instabilidade
      pré-existente sob carga paralela nesta máquina, não regressão daqui.
- [x] Documentação sincronizada

---

## Correção pós-implementação: cardio em andamento inalcançável

**Reportado pelo usuário:** "não consigo iniciar nenhum exercício pois diz que
já existe um treino em andamento, mas não consigo vê-lo."

**Causa.** Antes desta mudança, toda sessão ativa pertencia a um **dia**, e a
Home sempre tinha o card daquele dia oferecendo "Continuar". Uma sessão de
cardio não tem `dayId` — então, com ela em andamento:

- na Home os 6 dias ficavam bloqueados e **nenhum** oferecia "Continuar";
- na aba Cardio todos os "Iniciar" ficavam apenas *bloqueados*, sem dizer qual
  exercício estava rodando;
- a Consistência só lista sessões **concluídas**.

A sessão ficava sem nenhuma affordance visível. Reproduzido no browser antes de
corrigir.

**Correção.**
- [x] `CardioPage` — a linha do exercício em andamento vira **"Continuar"**
      (disponível, destacada), e as demais seguem indisponíveis. O exercício é
      identificado pela única entrada da sessão.
- [x] `HomePage` — tocar Iniciar com uma sessão **sem dia** em andamento passa a
      **levar até ela** em vez de recusar. A recusa existia para não desviar
      quem tocou no "Dia 3" para o treino do "Dia 1"; esse argumento não vale
      quando não existe card algum para retomar.
- [x] Dois testes de regressão em `cardio.integration.test.tsx` (a linha oferece
      Continuar e abre a sessão; a Home leva até ela em vez de recusar).
- [x] Regra registrada nos deltas `cardio` e `workout-sessions`: nenhuma tela
      pode recusar o início sem levar o usuário à sessão que bloqueia.

---

## Ajuste a pedido: resumo da semana na aba Cardio

- [x] `WeeklySummary` (e o seu `weekCellLabel`) saiu de dentro de `HomePage.tsx`
      para `src/ui/WeeklySummary.tsx`, e as regras `.week-*` / `.wd*` sairam de
      `home.css` para `src/ui/weekly-summary.css`. Duas telas desenhando o mesmo
      quadro a partir de uma folha so — nao uma copia que diverge.
- [x] `CardioPage` renderiza o quadro acima da lista (nao no estado vazio).
- [x] Ele conta **as mesmas sessoes** que na Home. A semana e a mesma; um numero
      so-de-cardio seria o unico lugar do app discordando dos outros agregados,
      onde cardio ja conta como treino.
- [x] Teste cobrindo que o quadro esta la e reflete um treino de musculacao.
- [x] *Corrigido no caminho:* a guarda de "sem badge para cardio" na lista da
      sessao dependia do `exMap`, que chega vazio no primeiro render — entao
      "definir" piscava antes de o exercicio ser conhecido. Passou a esperar a
      lista de exercicios, como a linha logo acima ja fazia com os pesos.

---

## Ajuste a pedido: cardio sem tag de academia

- [x] O chip com o nome da academia sai do cabecalho de uma sessao de **cardio**
      (`SessionPage`). Onde a pessoa correu nao e propriedade da corrida, e era a
      unica coisa naquela tela sugerindo que o exercicio pertencia a um lugar.
- [x] Sessao de **musculacao** mantem o chip — coberto por teste, para a remocao
      nao vazar para o outro tipo.
- [x] A sessao continua **armazenada por academia**; muda so o que a tela afirma.
      A lista da Consistencia continua identificando a academia de cada treino,
      inclusive cardio: la a informacao distingue itens de academias diferentes,
      em vez de decorar um.
- [x] Regra registrada no delta `workout-sessions`.

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
