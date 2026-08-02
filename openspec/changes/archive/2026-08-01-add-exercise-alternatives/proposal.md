# Proposal: Exercícios Alternativos (um conta pelo outro)

**Change ID:** `add-exercise-alternatives`
**Created:** 2026-08-01
**Status:** Implementation Complete
**Completed:** 2026-08-01

---

## Problem Statement

Um mesmo estímulo muscular costuma ter mais de um exercício possível: supino
reto com barra **ou** supino na máquina, rosca direta com barra **ou** com
halteres. Hoje o app só sabe listar exercícios individuais, então o usuário
tem duas saídas ruins:

1. **Cadastrar só um deles** no dia — e ficar sem alternativa quando o
   aparelho está ocupado, ou quando a academia da vez não tem aquele
   equipamento (o app é multi-academia por natureza: pesos são por academia).
2. **Cadastrar os dois** no dia — e aí o dia mente sobre o próprio tamanho:
   "Dia 1" com 8 exercícios na verdade tem 7 a fazer, o progresso do treino
   (`X de Y concluídos`) nunca fecha em 100%, o card compartilhado mostra um
   exercício "pulado" que nunca foi para ser feito, e a tela de Consistência
   herda contagens infladas.

Falta ao modelo a ideia de que **dois exercícios são a mesma linha do treino**:
um substitui o outro, contam como um só, e fazer um significa que aquela linha
está cumprida.

## Proposed Solution

Um exercício passa a declarar **n outros exercícios** como suas **alternativas**,
guardadas em `Exercise.alternativeIds`. A relação é **simétrica** (declarada uma
vez, de qualquer um dos lados) e **deliberadamente não transitiva**: A pode
listar B e C sem que B e C virem alternativas entre si. É isso que deixa um
mesmo exercício encabeçar **vários tipos de variação** — o supino reto troca
pela máquina (mesmo movimento) e pelo crucifixo (mesmo músculo), sem que máquina
e crucifixo se tornem intercambiáveis por associação.

Alternativas são um **caminho a percorrer**, não uma mudança na composição do
treino. Três consequências, e o que **não** muda importa tanto quanto o que muda:

1. **O dia continua sendo o que o usuário montou.** Adicionar um exercício a um
   dia adiciona só ele. A Home lista uma linha por exercício, a contagem do dia
   não muda, a sessão tem uma entrada por exercício e Voltar/Avançar não ganham
   paradas novas. Nenhum agrupamento, nenhum colapso, nenhuma dedução.

2. **Seção "Alternativas" no detalhe.** Todo detalhe de exercício — o do
   catálogo e o de uma entrada de sessão — ganha uma seção listando as
   alternativas com miniatura e nome, cada uma tocável para abrir o detalhe
   correspondente, com o **peso alvo, as observações e as fotos dela** naquela
   academia. A seção não aparece quando não há alternativas.

3. **"Fiz este no lugar", durante o treino.** Abrir uma alternativa a partir de
   uma sessão em andamento mostra o detalhe dela **dentro da sessão**, com uma
   ação que substitui o exercício daquela linha. A troca reescreve o exercício e
   o snapshot do nome, **preserva o concluído** (ela diz *qual* foi feito, não
   desfaz o que foi feito) e **não cria nem remove entradas** — o treino continua
   com as linhas que o dia tinha.

**O peso alvo continua por exercício** (`Weight` não muda): barra livre e máquina
não carregam a mesma coisa, e cada alternativa mantém seu valor e seu histórico
por academia.

As alternativas são definidas no **formulário de exercício** (Configurações →
Exercícios), num seletor múltiplo com busca — mesma forma do seletor de
categorias que já existe ali.

## Scope

### In Scope

- **Dados:** `Exercise.alternativeIds: number[]` + migração Dexie **v7**
  (aditiva, `[]` para todos os exercícios existentes). Nada muda em `Day` nem em
  `SessionEntry`.
- **Repositório:** `setAlternatives(exerciseId, ids)` mantendo a simetria;
  `swapEntryExercise(entryId, exerciseId)`; `deleteExercise` desfazendo os
  vínculos; `createExercise`/`updateExercise` aceitando a lista.
- **Formulário de exercício:** seletor "Alternativas" com busca, avisando que
  elas não entram nos dias de treino junto com o exercício.
- **Lista de exercícios** (Configurações): indicador de alternativas por item.
- **Seção "Alternativas"** compartilhada pelo detalhe do catálogo e pelo detalhe
  da entrada de sessão.
- **Sessão:** pré-visualização da alternativa dentro da sessão (endereçada por
  `?alt=`) e a ação "Fiz este no lugar".
- **Portabilidade:** `alternativeIds` no backup; import normaliza ausência, ids
  pendentes, auto-referência e vínculos de um lado só — **sem** fechar
  transitivamente.

### Out of Scope

- **Agrupar alternativas numa linha só** nas listas do dia e da sessão. Foi a
  primeira leitura do pedido e está descartada: o dia lista o que o usuário
  colocou nele.
- **Grupos nomeados** ("Supino" como entidade). Sem entidade nova.
- **Peso, observação ou foto compartilhados** entre alternativas.
- **Alternativas por academia** ("aqui só existe a máquina"). O vínculo é global.
- **Escolha padrão configurável** por academia ou por dia.
- **Sessões já gravadas:** nada é reescrito retroativamente.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Sim | `Exercise.alternativeIds` + migração Dexie **v7** aditiva (`src/db/db.ts`). `Day` e `SessionEntry` não mudam de forma. Sem índice novo: a relação é simétrica, então "quem aponta para mim" é lido do próprio registro. |
| API (repos) | Sim | `setAlternatives`, `swapEntryExercise`; `createExercise`/`updateExercise`/`deleteExercise` alterados (`src/db/repos.ts`). `startSession` **não** muda. |
| State | Não | Nenhum store novo; os hooks existentes (`useExerciseMap`, `useSessionEntry`) já entregam o necessário. |
| UI | Sim | `ExercisesPage` (form + lista), nova `AlternativesSection` compartilhada, `ExerciseDetailPage` (seção), `SessionEntryPage` (seção + preview `?alt=` + "Fiz este no lugar"). `HomePage`, `SessionPage` e `DaysPage` ficam como estão. |
| Portabilidade | Sim | `alternativeIds` viaja dentro de `Exercise`; `parseBackup` normaliza (`src/data/portability.ts`). |

## Architecture Considerations

**Por que a relação mora no exercício e não numa tabela de grupos.** O app já
resolve "muitos por registro" com array de ids no próprio registro
(`Exercise.categoryIds`, `Day.exerciseIds`). Uma tabela de grupos traria uma
tela de CRUD nova para um conceito que o usuário nunca precisa nomear. O custo
é o invariante de simetria, que fica **inteiramente** dentro de
`setAlternatives` e `deleteExercise` — nenhuma tela lê ou escreve o campo
diretamente.

**Por que NÃO fechar transitivamente.** Fechar transformaria cada conjunto numa
panelinha e daria a cada exercício **um único** saco de alternativas, todas
mutuamente intercambiáveis. Foi exatamente o que impediu o caso real: o supino
reto troca pela máquina *e* pelo crucifixo, mas máquina e crucifixo não trocam
entre si. Sem o fechamento, cada exercício encabeça quantos tipos de variação
quiser, e uma edição de A nunca reescreve o que B declarou por conta própria.

**Por que nada é agrupado nas listas.** Um dia é uma decisão do usuário sobre o
que ele vai fazer. Deduzir que dois exercícios do dia "na verdade são um" tornava
a Home e a sessão diferentes do que foi cadastrado, exigia uma regra de desempate
quando um exercício pertencia a dois conjuntos, e mudava a contagem do dia. Manter
a lista literal deixa `HomePage`, `SessionPage`, `startSession`, `daySubtitle`, o
card compartilhado e a Consistência **sem alteração nenhuma**.

**Durabilidade.** `SessionEntry.exerciseName` continua sendo um snapshot: a troca
o reescreve para o exercício efetivamente feito, e apagar um exercício depois não
muda o que a sessão registra.

**Regra de edição.** Salvar o exercício A com a lista `L` faz `L` ser a lista de
A e escreve **apenas o vínculo de volta para A** nos outros. As alternativas que
cada um deles já tinha não são assunto dessa edição — uma frase, sem casos
especiais.

**Onde a troca acontece.** A pré-visualização da alternativa vive na própria rota
da entrada (`?alt=`), não numa rota nova nem no detalhe do catálogo: a ação "Fiz
este no lugar" precisa de uma sessão sobre a qual agir, e sair da sessão para
decidir e voltar seria um caminho mais longo do que o problema merece.

## Success Criteria

- [x] Um exercício pode declarar **n alternativas**, e duas delas **não** viram
      alternativas entre si.
- [x] Adicionar um exercício a um dia adiciona **só ele**; a Home, a contagem do
      dia, a sessão e o stepper ficam idênticos ao que eram.
- [x] O detalhe (catálogo e sessão) mostra uma seção "Alternativas" tocável, e
      não mostra seção nenhuma quando não há alternativas.
- [x] Durante o treino, abrir uma alternativa mostra o peso alvo, a observação e
      a foto dela, e "Fiz este no lugar" substitui o exercício da linha
      **preservando o concluído** e sem mudar o número de linhas.
- [x] Cada alternativa mantém peso alvo e histórico próprios por academia.
- [x] Apagar um exercício não deixa vínculo pendente em nenhum par.
- [x] Exportar e reimportar preserva os tipos de variação separados; um backup
      antigo (sem o campo) importa sem alternativas.
- [x] `npm run build`, `npm run typecheck` e a suíte de testes (415) passam.

## Implementation Notes

**Esta proposta foi reespecificada depois de uma primeira implementação.** A
primeira leitura do pedido original ("os dois contam como um só e são agrupados
nas listas") produziu um mecanismo de **colapso**: alternativas presentes no
mesmo dia viravam uma linha na Home, uma entrada na sessão e uma parada do
stepper, e o vínculo era fechado transitivamente para que o colapso fosse uma
função pura da lista.

Esse fechamento é justamente o que impedia **mais de um tipo de variação** por
exercício, que era o que o usuário queria. Com a relação aberta, o colapso
deixaria de ser determinístico (um exercício em dois conjuntos não tem uma linha
óbvia), e o próprio agrupamento deixou de ser desejado: o dia deve listar o que
foi cadastrado nele. Todo o mecanismo de colapso foi removido —
`collapseAlternatives`, `SessionEntry.alternativeIds`, o indicador `+N`, o
agrupamento em `startSession`, a contagem por linhas em `daySubtitle` e o
marcador no formulário de dia.

Sobrou o que o usuário descreveu: vínculo simétrico e aberto, seção
"Alternativas" no detalhe, e a troca durante o treino.

**Nota sobre a suíte de testes.** A suíte tem testes de integração sensíveis a
carga: em `main`, 10 execuções completas produziram 6 falhas intermitentes
(`App.onboarding`, `session.share`, `forms-as-pages`), todas por `waitFor`
estourando o padrão de 1s enquanto os arquivos competem por CPU. Não é corrida de
dados — cada arquivo roda em processo próprio com IndexedDB próprio (verificado).
Neste branch, 10 execuções completas passaram sem falha. O flake é anterior a esta
mudança e continua lá; `--no-file-parallelism` o elimina ao custo de 19s → 48s.

---

## Archive Information

**Archived:** 2026-08-01
**Duration:** mesmo dia (proposta, implementação, reespecificação e arquivamento)
**Outcome:** Successfully implemented

### Files Modified

- `src/db/types.ts` — `Exercise.alternativeIds` (simétrico, não transitivo)
- `src/db/db.ts` — migração v7 aditiva
- `src/db/repos.ts` — `setAlternatives`, `swapEntryExercise`,
  `createExercise`/`updateExercise`/`deleteExercise`
- `src/lib/alternatives.ts` *(novo)* — `alternativesOf`
- `src/features/exercise/AlternativesSection.tsx` *(novo)* — a seção
  "Alternativas", compartilhada pelos dois detalhes
- `src/features/exercise/ExerciseDetailPage.tsx` — seção + barra oculta fora do dia
- `src/features/session/SessionEntryPage.tsx` — seção, preview `?alt=`,
  "Fiz este no lugar"
- `src/features/settings/ExercisesPage.tsx` — seletor e indicador na lista
- `src/data/portability.ts` — `normalizeAlternatives`, `SCHEMA_VERSION` 5
- `src/styles/global.css` — estilos da seção
- Testes: `src/lib/alternatives.test.ts`,
  `src/features/session/alternatives.integration.test.tsx`,
  `src/features/settings/alternatives.integration.test.tsx`, mais
  `repos.test.ts`, `migration.test.ts` e `portability.test.ts`

`HomePage.tsx`, `SessionPage.tsx`, `DaysPage.tsx`, `lib/days.ts` e
`startSession` terminaram com **diff zero** — a prova de que alternativas são
navegação, e não uma mudança na composição do treino.

### Specs Updated

- `openspec/specs/exercises/spec.md` — 5 requisitos novos (relação, não-entrada
  nos dias, seletor, indicador na lista, seção no detalhe) + 2 modificados
- `openspec/specs/workout-sessions/spec.md` — *Do an Alternative Instead* novo;
  *Session Exercise Detail* modificado
- `openspec/specs/home-navigation/spec.md` — *Open Exercise Detail* modificado
- `openspec/specs/data-portability/spec.md` — export e import modificados
