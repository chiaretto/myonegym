# gyms Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Register a Gym

The user MUST be able to create a gym with a name. The first gym created becomes
the active gym.

#### Scenario: Create the first gym
- GIVEN no gyms exist
- WHEN the user creates a gym named "Academia Central"
- THEN the gym is persisted locally
- AND it becomes the active gym

#### Scenario: Reject empty gym name
- GIVEN the gym form is open
- WHEN the user submits an empty name
- THEN creation is blocked and a validation message is shown

### Requirement: Select the Active Gym

O usuário MUST poder escolher a academia ativa. A academia ativa determina onde
o treino acontece, quais **exceções** de peso se aplicam e quais notas e fotos
são exibidas — mas **não** altera o peso de um exercício que não tenha exceção.

#### Scenario: Switch active gym with no exceptions
- GIVEN as academias "A" e "B" existem, "A" é a ativa, e nenhum exercício tem exceção
- WHEN o usuário seleciona "B"
- THEN "B" passa a ser a academia ativa
- AND os pesos exibidos continuam os mesmos (são globais)

#### Scenario: Switch active gym with an exception
- GIVEN "Supino" tem peso global 40 KG e exceção de 30 KG na academia "B"
- WHEN o usuário troca a academia ativa para "B"
- THEN "Supino" passa a mostrar 30 KG, com o rótulo da academia "B"

### Requirement: A New Gym Inherits the Global Weights

Uma academia recém-criada MUST valer-se imediatamente dos **pesos globais** de
todos os exercícios, sem nenhuma cópia de registros. Ela começa **sem exceção
alguma**; exceções só passam a existir quando o usuário marca "Só nessa
academia" ao salvar um peso.

#### Scenario: New gym shows the existing weights right away
- GIVEN "Rosca Direta" tem peso global 20 KG e "Supino" 40 KG
- WHEN o usuário cria a academia "C" e a torna ativa
- THEN "Rosca Direta" mostra 20 KG e "Supino" 40 KG em "C"
- AND nenhum registro de peso foi criado para "C"

#### Scenario: Editing from a new gym changes the global weight
- GIVEN a academia "C" acabou de ser criada e não tem exceções
- WHEN o usuário salva "Supino" com 45 KG e a flag desmarcada
- THEN o peso global de "Supino" passa a 45 KG, valendo também em "A" e "B"

### Requirement: Edit and Delete Gyms

O usuário MUST poder renomear e excluir academias. Excluir uma academia remove
suas **exceções** de peso (e o histórico delas), suas **notas** e suas **fotos**
de exercício — nunca os pesos globais.

#### Scenario: Delete a gym removes its exceptions
- GIVEN a academia "B" existe com exceções de peso
- WHEN o usuário exclui a academia "B"
- THEN "B" e todas as suas exceções são removidas
- AND se "B" era a ativa, outra academia passa a ser ativa (ou nenhuma, se era a última)

#### Scenario: Delete a gym removes its notes
- GIVEN a academia "B" tem notas de exercício
- WHEN o usuário exclui a academia "B"
- THEN todas as notas de "B" são removidas
- AND as notas de outras academias para os mesmos exercícios não são afetadas

### Requirement: Deleting a Gym Preserves the Global Weights

Excluir uma academia MUST remover apenas o que é dela — suas **exceções** de
peso e o histórico dessas exceções, além de notas e fotos — e MUST NOT tocar nos
pesos e no histórico **globais**.

#### Scenario: Deleting a gym drops only its exceptions
- GIVEN a academia "B" tem exceções para 3 exercícios e o app tem 12 pesos globais
- WHEN o usuário exclui a academia "B"
- THEN as 3 exceções e seus históricos são removidos
- AND os 12 pesos globais e seus históricos permanecem intactos

#### Scenario: Deleting the last gym keeps the global weights
- GIVEN existe uma única academia, com pesos globais registrados
- WHEN o usuário a exclui
- THEN os pesos globais permanecem
- AND ao criar uma nova academia eles voltam a ser exibidos

## Deprecated

### Copy Weights When Creating a Gym (Removed: 2026-08-15)

O formulário de criação de academia deixou de oferecer "Copiar pesos de
(opcional)", e `createGym` deixou de aceitar uma academia de origem.

**Motivo:** com o peso global, uma academia nova já nasce com todos os pesos do
usuário. Copiar registros passaria a criar **exceções** para cada exercício —
exatamente o oposto do que a opção pretendia — e deixaria a nova academia
divergindo em silêncio do peso global a cada salvamento.

Removido pela mudança `global-weights-with-gym-exception`.
</content>
