# Proposal: Tipo de exercício (Força / Cardio) e a aba Cardio

**Change ID:** `add-cardio-exercise-type`
**Created:** 2026-08-15
**Status:** Implementation Complete
**Completed:** 2026-08-15

---

## Problem Statement

O app modela **um** tipo de treino: musculação. Todo exercício tem peso alvo,
todo exercício vive dentro de um dia de treino, e todo treino começa a partir
de um dia. Cardio não cabe em lugar nenhum disso:

- **O peso não faz sentido.** Uma esteira não tem carga alvo. Hoje o cartão
  "Peso alvo" aparece em todo exercício, então cadastrar "Esteira" produz um
  campo que nunca vai ser preenchido — e um badge "definir" na Home cobrando
  para sempre um número que não existe.
- **Cardio não tem dia.** Musculação é organizada em rotina (Dia 1 peito,
  Dia 2 costas). Cardio é avulso: você faz 30 min de esteira hoje porque deu
  vontade, não porque era "o dia da esteira". Forçar cardio dentro de um dia
  inventa uma estrutura que a pessoa não tem.
- **O esforço fica invisível.** Um dia só de cardio hoje é um dia **sem
  treino** no calendário da Consistência — um buraco na sequência, exatamente
  o oposto do que aconteceu.

Quem treina hoje ou registra cardio como se fosse musculação (e convive com o
peso vazio), ou não registra e vê a própria consistência subnotificada.

## Proposed Solution

Introduzir um **tipo** no exercício — **Força** ou **Cardio** — e dar ao cardio
o caminho curto que ele precisa: uma aba própria, sem dias, com um botão por
exercício.

**O tipo é do exercício.** `Exercise.kind` (`'strength' | 'cardio'`), escolhido
no formulário do exercício, **Força** por padrão. Todo exercício existente é
Força — a migração preenche o campo, ninguém precisa revisar catálogo.

**Cardio não tem peso.** Para um exercício de cardio, o cartão "Peso alvo" e o
histórico **não são exibidos** — nem no catálogo, nem dentro da sessão. Restam
**observação** e **fotos**, que continuam por academia e continuam úteis (o
ajuste da bike, a tela da esteira). Os badges de peso somem junto: cardio não
aparece em dia de treino, e portanto não aparece na Home.

**Cardio não entra em dia de treino.** O seletor de exercícios do formulário de
dia passa a oferecer **apenas Força**. Trocar um exercício de Força para Cardio
enquanto ele está em dias **avisa e o remove desses dias** — o app não deixa uma
linha de dia apontando para algo que a aba Cardio considera avulso.

**A aba Cardio.** Uma quarta aba na barra inferior, **ao lado de Treinos**, na
rota `/cardio`. Ela mostra a **lista dos exercícios de cardio** e nada mais —
sem acordeão, sem dias — e **cada linha tem seu próprio "Iniciar"**. Uma sessão
de cardio é **um** exercício: tocar Iniciar na Esteira abre a sessão daquela
esteira, e "Concluir" a encerra. É o análogo direto do card de dia na Home, com
o dia trocado pelo exercício.

**Conta como treino, e ganha uma estrela.** A sessão de cardio concluída entra
no histórico como qualquer outra: alimenta a sequência, o "treinos no mês", os
blocos de 12 semanas e as barras de 12 meses. No **calendário**, um dia que teve
cardio recebe uma **estrela** além do disco — a estrela diz *que tipo* de treino
houve, não *se* houve. Um dia com musculação e cardio mostra os dois sinais.

**Como o tipo do dia é sabido depois.** A sessão guarda o próprio
`kind`, snapshot no início, como já faz com `dayName` e `exerciseName`. Derivar
"foi cardio?" dos exercícios da sessão quebraria assim que um exercício mudasse
de tipo ou fosse excluído — e o histórico é justamente o que não pode mudar
retroativamente.

## Scope

### In Scope

- `Exercise.kind` (`'strength' | 'cardio'`) com índice, e `Session.kind`;
  migração **v10** preenchendo `'strength'` em ambos.
- Seletor de tipo no formulário do exercício (segmentado, Força por padrão) e o
  tipo visível na lista do catálogo.
- Regra de troca de tipo: virar Cardio remove o exercício dos dias, com aviso.
- Ocultar peso e histórico de peso para cardio, no catálogo e na sessão.
- Formulário de dia oferecendo somente exercícios de Força.
- Aba **Cardio** (4ª aba, ao lado de Treinos) na rota `/cardio`: lista dos
  exercícios de cardio, um **Iniciar** por linha, estado vazio próprio.
- `startCardioSession(gymId, exerciseId)` — sessão de uma entrada; concluir
  encerra.
- Consistência: sessões de cardio contam em todos os agregados; **estrela** no
  dia do calendário que teve cardio, com legenda.
- Backup/restore e "Gerar exemplo" cientes do tipo (documento antigo → Força).

### Out of Scope

- **Duração, distância, ritmo, calorias, zona de FC.** O cardio registrado aqui
  é "fiz", não "fiz quanto" — nenhuma métrica nova é capturada. É a extensão
  natural desta mudança, e é uma mudança inteira por si só.
- **Cardio dentro de um dia de treino** (esteira no fim do treino de pernas) —
  decidido contra; a aba é o caminho.
- **Peso/carga em cardio** (a inclinação da esteira, a resistência da bike).
- **Um terceiro tipo** (mobilidade, alongamento). O campo aceitaria, mas nada
  aqui é construído para N tipos.
- Filtro por tipo na lista do catálogo (o tipo fica **visível**; filtrar por ele
  é outra mudança).
- Compartilhar um cardio como imagem.
- Alternativas entre exercícios de tipos diferentes.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Sim | Versão **v10**: `Exercise.kind` (indexado) e `Session.kind`, ambos preenchidos com `'strength'` no upgrade. Nenhum registro é apagado. |
| API (repos) | Sim | `createExercise`/`updateExercise` aceitam `kind` e cuidam da saída dos dias; novo `startCardioSession`; `listCardioExercises`; os filtros do formulário de dia passam a excluir cardio. |
| State (hooks) | Sim | Um hook para a lista de cardio; `useExerciseMap` inalterado (o `kind` viaja no próprio registro). |
| UI | Sim | `TabBar` ganha a 4ª aba; nova `CardioPage`; `ExerciseFormPage` ganha o seletor de tipo; `ExerciseDetailPage` e `SessionEntryPage` escondem o peso para cardio; `DayFormPage` filtra; `ConsistencyPage` desenha a estrela. |
| Portabilidade | Sim | `kind` viaja no backup dos exercícios e das sessões; documento sem o campo importa como Força. |

## Architecture Considerations

- **O tipo é um campo, não uma tabela.** Dois valores fechados, sem atributos
  próprios: uma tabela `exerciseTypes` daria join e tela de CRUD para
  administrar duas linhas que nunca mudam.
- **A sessão continua sendo a mesma entidade.** Cardio reusa `Session` +
  `SessionEntry`, ganhando só o `kind`. Uma tabela separada de "sessões de
  cardio" duplicaria histórico, consistência, exclusão e backup — e a
  Consistência teria de somar duas fontes em todo agregado.
- **Uma sessão ativa por academia continua valendo, para os dois tipos.**
  Começar um cardio com um treino de musculação em andamento é bloqueado, como
  hoje é bloqueado começar um segundo dia. É o invariante que já existe e que a
  Home já comunica (ver `disable-start-during-session`); inventar sessões
  paralelas só para o cardio significaria rever o runner, o bloqueio da Home e o
  histórico. Registrado como decisão consciente: se na prática incomodar
  (cardio no intervalo da musculação), é uma mudança própria.
- **`kind` é a palavra que o projeto já usa** para "de que espécie é este
  registro" (`WeightHistory.kind`). `type` colidiria com `ExercisePhoto.type`,
  que é mime type.
- **A estrela é um sinal a mais, não um estado a mais.** A célula do calendário
  continua com seus estados (treinou / 2+ / hoje / passado sem treino); a
  estrela se soma a eles. Assim um dia com musculação e cardio não precisa de um
  quarto estado combinatório.
- **Quarta aba: um cuidado de layout e um de identidade.** As três abas atuais
  usam PNGs da arte de marca, que cobre ~16 conceitos e **não tem** um glifo de
  cardio. A proposta usa um glifo Tabler para a nova aba, assumindo a mistura —
  a alternativa seria encomendar arte, o que não cabe aqui. E quatro abas com
  rótulo precisam caber em 320px sem quebrar linha; isso entra como verificação
  explícita.

## Success Criteria

- [x] O formulário do exercício oferece **Força** (padrão) e **Cardio**, e a
      lista do catálogo mostra o tipo.
- [x] Um exercício de cardio **não** exibe peso nem histórico de peso, no
      catálogo nem dentro da sessão; observação e fotos continuam.
- [x] O seletor do formulário de dia não oferece exercícios de cardio.
- [x] Trocar um exercício para Cardio avisa e o remove dos dias em que estava.
- [x] A barra inferior tem **quatro** abas, com **Cardio** ao lado de Treinos, e
      cabe em 320px.
- [x] `/cardio` lista os exercícios de cardio, cada um com seu **Iniciar**, e
      tem estado vazio próprio.
- [x] Iniciar abre a sessão daquele cardio; concluir a encerra e leva ao
      histórico.
- [x] Uma sessão de cardio conta na sequência, no "treinos no mês", nos blocos
      de 12 semanas e nas barras de 12 meses.
- [x] O dia com cardio mostra uma **estrela** no calendário, com legenda, e um
      dia com os dois tipos mostra os dois sinais.
- [x] A migração v10 marca todo exercício e toda sessão existentes como Força,
      sem apagar nada.
- [x] Backup antigo (sem `kind`) importa com tudo como Força.
- [x] `npx tsc -b --noEmit` limpo e `npx vitest run` verde.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Quatro abas não caberem em telas estreitas | Média | Médio | Verificação explícita a 320px e no maior tamanho de fonte (200%); rótulos curtos, ícone acima do texto como hoje. |
| Ícone da aba Cardio destoar dos três PNGs de marca | Alta | Baixo | Assumido e documentado; um glifo Tabler entre três PNGs é visível de perto, e trocar por arte de marca depois é um arquivo. |
| Exercício em dias virar Cardio e sumir do dia sem o usuário entender | Média | Médio | Confirmação nomeando **quais** dias perderão o exercício; a ação só acontece depois do aceite. |
| Peso já registrado de um exercício que virou Cardio | Média | Baixo | Os registros **permanecem** (apenas deixam de ser exibidos) e voltam se ele virar Força de novo — mesma decisão da exceção por academia: uma troca de campo não destrói histórico em silêncio. |
| Bloquear cardio durante um treino de musculação incomodar na prática | Média | Baixo | É o invariante atual, comunicado pela UI; se incomodar, vira mudança própria com o runner revisto. |
| A estrela poluir o calendário quando quase todo dia tem cardio | Baixa | Baixo | Marca discreta no canto da célula, não um segundo disco; legenda explica. |

---

## Archive Information

**Archived:** 2026-08-15
**Duration:** mesmo dia (proposta → implementação → arquivo)
**Outcome:** Implementado com sucesso, com três ajustes e um bug corrigidos
durante a revisão do usuário

### Files Modified

- `src/db/types.ts` — `ExerciseKind`, `Exercise.kind`, `Session.kind` (com o
  porquê de o tipo da sessão ser snapshot)
- `src/db/db.ts` — migração **v10**: `kind` no índice de `exercises` e
  preenchimento de `'strength'` em exercícios e sessões
- `src/db/repos.ts` — `kind` em `createExercise`/`updateExercise` (que devolve os
  dias abandonados), `daysContaining`, `listCardioExercises`,
  `startCardioSession`, `completeSession` ciente de cardio
- `src/features/cardio/CardioPage.tsx` + `cardio.css` (novos) — a aba
- `src/ui/WeeklySummary.tsx` + `weekly-summary.css` (novos) — o resumo da semana,
  extraído do `HomePage` para ser compartilhado com a aba Cardio
- `src/ui/Chrome.tsx` — a quarta aba; `src/App.tsx` — a rota `/cardio`
- `src/features/settings/ExercisesPage.tsx` — seletor de tipo, confirmação
  nomeando os dias, chip de Cardio na lista
- `src/features/settings/DaysPage.tsx` — o seletor do dia só oferece Força
- `src/features/exercise/ExerciseDetailPage.tsx`,
  `src/features/session/SessionEntryPage.tsx` — sem cartão de peso em cardio
- `src/features/session/SessionPage.tsx` — sem badge de peso, sem chip de
  academia e sem o aviso de "marque ao menos um" numa sessão de cardio
- `src/features/home/HomePage.tsx` — sem badge para cardio; o toque leva à sessão
  em andamento quando ela não tem dia
- `src/features/consistency/ConsistencyPage.tsx` + `consistency.css`,
  `src/lib/consistency.ts` — a estrela do calendário
- `src/lib/hooks.ts` — `useCardioExercises`; `src/styles/global.css` — a barra de
  abas passa a quebrar linha em vez de transbordar
- `src/data/portability.ts` + `example-data.json` — `kind` no backup, com
  back-compat, e duas amostras de cardio
- Testes: `cardio.integration.test.tsx` e `exercise-kind.integration.test.tsx`
  (novos), mais `repos.test.ts`, `migration.test.ts`, `portability.test.ts`,
  `consistency.test.ts` e as fixtures que o campo obrigatório apontou
- `openspec/project.md` — nova decisão 4

### Specs Updated

- `openspec/specs/cardio/spec.md` (**nova capability**) — *Cardio Tab*,
  *Cardio Screen*, *Start and Complete a Cardio*
- `openspec/specs/exercises/spec.md` — adicionados *Exercise Kind — Força or
  Cardio* e *Changing an Exercise to Cardio Leaves the Days*; *Register an
  Exercise* ganhou o campo tipo
- `openspec/specs/training-days/spec.md` — *Select Exercises for a Day* passa a
  oferecer apenas Força
- `openspec/specs/weights/spec.md` — *Track a Global Target Weight* e *Weight
  Badges Resolve Global Plus Exceptions*: o peso é de exercício de Força
- `openspec/specs/workout-sessions/spec.md` — adicionado *A Cardio Session
  Carries No Gym Tag*; *Single Active Session Per Gym* (vale entre os tipos, e
  nenhuma tela recusa sem oferecer caminho), *Session History Across Gyms* e
  *Session Exercise Detail* atualizados
- `openspec/specs/consistency/spec.md` — a **estrela** no calendário e os
  agregados contando cardio
- `openspec/specs/data-portability/spec.md` — adicionado *Backups Carry the
  Exercise Kind*; *Generate Example Data* semeia cardio

### Correções durante a revisão

1. **Bug reportado pelo usuário:** um cardio em andamento ficava inalcançável —
   ele não tem `dayId`, então a Home não tinha card para retomar e todos os
   Iniciar apenas bloqueavam. A linha do exercício passou a oferecer
   **"Continuar"**, e a Home leva à sessão em vez de recusar.
2. **"definir" em cardio**, apontado pelo usuário e encontrado em paralelo no
   browser: o badge saiu da lista da sessão e da Home. A guarda passou a esperar
   os exercícios carregarem — antes o `exMap` vazio do primeiro render fazia o
   rótulo piscar.
3. **Resumo da semana na aba Cardio**, a pedido: o componente saiu do `HomePage`
   para `src/ui/`, contando as mesmas sessões que na Home.
4. **Sem tag de academia em cardio**, a pedido: o chip sai do cabeçalho da sessão
   de cardio e permanece na de musculação.

### Nota sobre a suíte

Durante a implementação, execuções completas apresentaram 1–5 falhas
intermitentes em `App.onboarding`, `session.integration` e `notes.integration`.
Medido em `main`, com esta mudança guardada no stash: 5, 3, 2 e 1 falha em quatro
execuções, nos mesmos arquivos. É instabilidade pré-existente sob carga paralela,
não regressão desta mudança. A execução final do arquivo saiu **762/762**.
