# Delta: training-days

**Change ID:** `add-cardio-exercise-type`
**Affects:** `src/features/settings/DaysPage.tsx` (formulário de dia),
`src/db/repos.ts` (a saída dos dias na troca de tipo)

---

## MODIFIED

### Requirement: Select Exercises for a Day

*(única mudança: o seletor passa a oferecer apenas exercícios de **Força**;
todo o resto do requisito permanece)*

The user MUST be able to choose which exercises belong to a day. Exercises MAY
repeat across days, and their order within a day SHOULD be preserved. The picker
that lists the not-yet-added exercises MUST be filterable by name and category
(see "Filter the Day Form's Exercise Picker"); filtering is a view concern only
and MUST NOT change which exercises can be added or the order in which added
exercises are kept.

O seletor MUST oferecer **somente exercícios de Força**. Cardio é avulso e é
iniciado a partir da sua própria aba (ver a capability `cardio`), então um
exercício de Cardio nunca é candidato a compor um dia — nem pela busca, nem pelo
filtro de categoria.

Um exercício que **passa a ser Cardio** MUST sair dos dias em que estava, com
confirmação (ver *Changing an Exercise to Cardio Leaves the Days*, em
`exercises`). Nenhum dia MUST NOT ficar apontando para um exercício de Cardio.

#### Scenario: Add exercises to a day
- GIVEN exercises "Rosca Direta" and "Supino" exist
- WHEN the user adds both to "Dia 1"
- THEN "Dia 1" lists both exercises in the chosen order

#### Scenario: Same exercise across multiple days
- GIVEN exercise "Rosca Direta" is already in "Dia 1"
- WHEN the user also adds it to "Dia 3"
- THEN both days include "Rosca Direta" referencing the same exercise record

#### Scenario: Remove an exercise from a day
- GIVEN "Dia 1" includes "Supino"
- WHEN the user removes "Supino" from "Dia 1"
- THEN "Dia 1" no longer lists it
- AND the "Supino" exercise record and its weights are unaffected

#### Scenario: O seletor não oferece cardio
- GIVEN o catálogo tem "Supino" (Força) e "Esteira" (Cardio)
- WHEN o usuário abre "Adicionar exercício" no formulário de um dia
- THEN "Supino" é oferecido
- AND "Esteira" não aparece, nem buscando por nome

#### Scenario: Every strength exercise is reachable through the picker
- GIVEN no filter is active in the day form
- WHEN the user opens the "Adicionar exercício" list
- THEN every **strength** exercise not already in the day is offered

---

## ADDED

(Nenhum.)

## REMOVED

(Nenhum.)
