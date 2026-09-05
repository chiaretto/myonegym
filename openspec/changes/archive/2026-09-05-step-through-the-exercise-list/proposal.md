# Proposal: Percorrer a lista de exercícios sem voltar a ela

**Change ID:** `step-through-the-exercise-list`
**Created:** 2026-09-05
**Status:** Implementation Complete
**Completed:** 2026-09-05

---

## Problem Statement

A tela de visualização (`/settings/exercises/:id/view`) é um beco. Para ver o
próximo exercício é preciso voltar para a lista, procurar onde se estava e
tocar de novo — três gestos para andar uma posição.

E a lista é longa: o catálogo oficial sozinho traz 52 exercícios. Quem está
conferindo o que veio com o app — que categorias, que alternativas, que vídeos —
está justamente percorrendo, e é essa a operação que não existe.

Voltar também **perde os filtros**. Quem filtrou por "Cardio" ou buscou "rosca"
e abriu um resultado volta para a lista inteira e refaz o filtro. Então o custo
real de andar uma posição não são três gestos: são três gestos mais refazer a
busca.

**Afetados:** quem usa Configurações → Exercícios para revisar o catálogo, que é
onde a lista longa está. O detalhe de acompanhamento (`/exercise/:id`) já tem
**Voltar/Avançar** dentro de um dia de treino desde sempre — a tela de
visualização é a que ficou sem.

## Proposed Solution

Um **Voltar/Avançar** na tela de visualização, no mesmo `StepperBar` que o
detalhe do exercício já usa. Mesma barra flutuante, mesmos nomes acessíveis,
mesmo lugar na tela — o gesto já é conhecido, muda o que ele percorre.

### 1. Percorre a lista **de onde se veio**, filtros incluídos

Quem filtrou por Cardio e avançou não pode cair num exercício de força que
acabou de filtrar fora. A lista percorrida MUST ser a que estava na tela.

Os filtros são estado de componente da `ExercisesPage` — a tela de visualização
não tem como enxergá-los. Então eles viajam na **URL**, como o `?day=` e o
`?from=` do detalhe já viajam:

```
/settings/exercises/9/view?q=rosca&cat=10001&day=none&kind=cardio
```

A tela lê os quatro, aplica o **mesmo** `filterExercises` que a lista aplica, e
os vizinhos saem daí. É isso que faz o Avançar sobreviver a um reload e a um
link compartilhado — a mesma razão pela qual o dia do detalhe está no endereço
em vez de no histórico de navegação.

Parâmetro ausente é **sem filtro**: uma URL nua continua abrindo a tela, com o
percurso valendo para o catálogo inteiro.

### 2. Para nas pontas

No primeiro, Voltar fica desabilitado; no último, Avançar. É o que o detalhe já
faz ao percorrer um dia, e pela mesma razão: "não há próximo exercício" é
informação real. (O paginador de vídeos dá a volta, mas ali a justificativa é
que uma pilha de vídeos não tem posição numa rotina — uma lista alfabética tem.)

### 3. Sem lugar na lista, sem stepper

O exercício aberto pode não estar na lista filtrada: um link compartilhado com
outros filtros, uma alternativa alcançada de dentro da própria tela, um exercício
que deixou de casar com a busca. Nesses casos não existe "próximo", e a barra
MUST estar **ausente** em vez de presente com os dois lados mortos — a mesma
decisão que o detalhe já toma quando o exercício não está no dia (`inDay`).

## Scope

### In Scope

- `StepperBar` na tela de visualização, com Voltar/Avançar.
- Filtros (busca, categoria, dia, tipo) carregados na URL da tela.
- A lista constrói esse endereço ao acionar "Ver".
- As alternativas dentro da tela preservam o mesmo endereço ao navegar.
- Barra ausente quando o exercício não está na lista percorrida.

### Acrescentado durante a execução

- **O peso de cada academia no seletor do histórico de peso.** Pedido em
  andamento; toca `weights`, não `exercises`. Entrou aqui em vez de virar
  proposta própria porque é uma linha de leitura numa lista que já existia — e
  porque a lista existia para ser comparada, o que ela não permitia sem um toque
  por academia.

### Out of Scope

- **Restaurar os filtros ao voltar para a lista.** Hoje a lista perde os filtros
  em qualquer ida e volta (inclusive para o formulário de edição), e consertar
  isso é tornar a **lista** dirigida pela URL — escrever a cada tecla digitada,
  decidir entre poluir o histórico e usar `replaceState`. É uma mudança de outra
  natureza e merece a sua própria.
- **Contador de posição** ("3 de 12") na barra. O stepper do detalhe não tem, e
  acrescentá-lo aqui é decidir por ele também.
- **Qualquer coisa sobre imagens.** O pedido mencionava "melhorias de imagens";
  ficou para uma proposta própria, quando houver o que especificar.
- Voltar/Avançar no **formulário de edição** (`/edit`). Editar é uma tarefa que
  se conclui, não um percurso.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | Nada é persistido; o percurso é derivado da lista já carregada. |
| State | Não | Sem estado novo: os filtros vêm da URL, a lista dos hooks que a tela já usa. |
| UI | Sim | `ExerciseViewPage` ganha `StepperBar`; a lista e as alternativas passam a montar o endereço com os filtros. |
| Rotas | Não | Mesma rota, com query string opcional. |
| `lib/exerciseFilters` | Talvez | Ler/escrever os quatro parâmetros é lógica pura e cabe aqui, ao lado de `filterExercises`, em vez de duplicada nas duas telas. |

## Architecture Considerations

**O endereço carrega o contexto — precedente direto.** O detalhe do exercício já
guarda no endereço de onde a visita veio (`?day=`, `?from=`), e a razão está
escrita lá: Voltar tem de sobreviver a um reload e a um link compartilhado, e
`nav(-1)` não sobrevive a nenhum dos dois. Um percurso é a mesma classe de
contexto, e a mesma solução se aplica.

**Um só `filterExercises`.** A tela percorre exatamente o que a lista mostra
porque chama a mesma função com os mesmos argumentos. Reimplementar o filtro
aqui seria criar duas respostas para "quais exercícios são esses", livres para
divergir na primeira mudança de filtro — e a próxima mudança de filtro já
aconteceu uma vez nesta base (o filtro por tipo, recém-adicionado).

**A serialização é a única peça nova.** Quatro parâmetros, três deles com um
valor "todos" que simplesmente não é escrito. Vale morar em `lib/exerciseFilters`
com um teste de ida e volta: é a única parte que pode discordar de si mesma.

## Success Criteria

- [x] Da tela de visualização é possível andar para o exercício seguinte e para
      o anterior, sem passar pela lista.
- [x] Com um filtro ativo, o percurso fica dentro do conjunto filtrado.
- [x] No primeiro e no último, o controle correspondente está desabilitado.
- [x] Um exercício fora da lista percorrida abre sem barra alguma.
- [x] Uma URL sem filtros abre a tela e percorre o catálogo inteiro.
- [x] Recarregar a página mantém o percurso.
- [x] O seletor de academias do histórico mostra o peso de cada uma.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| O percurso da tela diverge do que a lista mostrou | Média | Médio | Uma função de filtro só, chamada pelas duas, com os mesmos argumentos; teste que compara as duas listas. |
| A serialização e a leitura dos filtros discordam | Média | Baixo | Teste de ida e volta em `lib/exerciseFilters`, incluindo os valores "todos"/"nenhum". |
| A barra aparece com os dois lados mortos | Baixa | Baixo | Ausente quando o exercício não está na lista — cenário explícito na spec. |
| Uma URL antiga (sem filtros) quebra | Baixa | Médio | Parâmetro ausente é "sem filtro"; a rota nua continua sendo o caso normal. |

---

## Archive Information

**Archived:** 2026-09-05
**Duration:** mesmo dia
**Outcome:** Implementada, com um pedido absorvido durante a execução

### Specs Updated

| Capability | O que mudou |
|---|---|
| `exercises` | +3 requisitos (percorrer a lista, seguir a lista de origem, parar nas pontas); *A Read-Only View* modificado |
| `weights` | *The History Modal Reaches the Other Gyms* modificado: cada academia do seletor mostra o peso que vale nela |

### Files Modified

- `src/lib/exerciseFilters.ts` — `filtersToParams` / `filtersFromParams`
- `src/features/settings/ExercisesPage.tsx` — a lista monta o endereço; a tela lê, percorre e o preserva
- `src/db/repos.ts` — `weightByGym`
- `src/lib/hooks.ts` — `useWeightByGym`
- `src/features/exercise/WeightEditor.tsx` — peso na linha de cada academia
- `src/features/exercise/exercise.css`
- Testes: `exerciseFilters.test.ts`, `official-catalog.integration.test.tsx`, `weight-history-modal.integration.test.tsx`

### Verification

- `npm run typecheck` limpo
- `npm test` — 85 arquivos, 1110 testes
- `npm run build` sem erro
