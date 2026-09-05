# Delta: categories

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** tela de Categorias, seletor de categorias do formulário de
exercício, filtro por categoria

---

## ADDED Requirements

### Requirement: Official Categories Come With the App

A lista de categorias MUST ser composta pelas **duas fontes**: as categorias
**oficiais**, que vêm no arquivo do catálogo, e as do **usuário**. Toda
apresentação de categorias — a tela de Categorias, o seletor do formulário de
exercício e o filtro da lista de exercícios — MUST mostrar as duas juntas,
ordenadas por nome.

Uma categoria oficial MUST ser identificada pela mesma faixa reservada do
exercício oficial — `id ≤ 9999`, com exatamente o id do arquivo — e MUST NOT
existir no banco de dados. Uma categoria criada pelo usuário MUST receber id
`≥ 10001`, atribuído explicitamente pelo repositório (ver a capability
`exercises`).

A atualização para esta versão MUST **esvaziar** a tabela de categorias, sem
reescrever nenhuma referência: os `categoryIds` dos exercícios que sobrevivem
continuam apontando para os mesmos números, agora servidos pelo arquivo.

Uma categoria oficial MUST NOT poder ser renomeada nem excluída: a tela MUST NOT
oferecer essas ações para ela, e o repositório MUST recusá-las com erro de
validação.

Um exercício **do usuário** MUST poder ser classificado em categorias oficiais,
em categorias dele, ou nas duas ao mesmo tempo — a lista `categoryIds` aceita
ids das duas fontes sem distinção.

#### Scenario: Atualizar troca a fonte das categorias
- GIVEN um aparelho em uso, com exercícios classificados nas categorias que ele tem
- WHEN o app é atualizado para esta versão
- THEN a tabela de categorias fica vazia
- AND as categorias continuam aparecendo, agora vindas do arquivo oficial
- AND a classificação dos exercícios continua a mesma

#### Scenario: Uma categoria nova nasce acima da faixa oficial
- GIVEN um aparelho atualizado
- WHEN o usuário cria a categoria "Antebraço"
- THEN ela recebe um id maior que 10000

#### Scenario: As duas fontes numa lista só
- GIVEN o usuário criou a categoria "Antebraço"
- WHEN ele abre a tela de Categorias
- THEN "Antebraço" aparece junto das categorias oficiais, em ordem de nome
- AND as oficiais exibem o selo "Oficial"

#### Scenario: Uma categoria oficial não pode ser alterada
- GIVEN a categoria oficial "Peito"
- WHEN o usuário procura renomear ou excluir
- THEN as ações não são oferecidas
- AND a operação solicitada ao repositório é recusada com uma mensagem

#### Scenario: Classificar um exercício meu numa categoria oficial
- GIVEN o usuário cadastra "Rosca Martelo Cabo"
- WHEN ele escolhe a categoria oficial "Bíceps" e uma categoria sua
- THEN o exercício é salvo com as duas
- AND o filtro por "Bíceps" passa a encontrá-lo

---

## MODIFIED Requirements

### Requirement: Manage Muscle Categories

The user MUST be able to create, **edit (rename)**, and delete categories (e.g.
Peito, Tríceps, Costas, Bíceps) — **as suas**. As categorias **oficiais** são
somente leitura (ver *Official Categories Come With the App*). Categories are
used to classify exercises and, optionally, training days.

O nome de uma categoria nova MUST ser único **entre as duas fontes**: criar uma
"Peito" quando já existe a oficial "Peito" MUST ser bloqueado. Duas categorias
de mesmo nome na mesma lista seriam indistinguíveis no seletor, e o usuário não
teria como saber em qual das duas classificou o exercício.

#### Scenario: Create a category
- GIVEN the categories screen is open
- WHEN the user creates a category "Antebraço"
- THEN "Antebraço" is persisted and available for selection when creating exercises

#### Scenario: Edit (rename) a category
- GIVEN category "Antebraço" exists and is used by exercise "Rosca Inversa"
- WHEN the user renames it to "Antebraços"
- THEN the category is renamed
- AND exercise "Rosca Inversa" reflects the new category name (reference preserved)

#### Scenario: Reject duplicate or empty category name
- GIVEN category "Antebraço" exists
- WHEN the user tries to create another "Antebraço" or an empty name
- THEN creation is blocked with a validation message

#### Scenario: Reject a name that an official category already has
- GIVEN a categoria oficial "Peito"
- WHEN o usuário tenta criar uma categoria "Peito"
- THEN a criação é bloqueada com uma mensagem de validação

### Requirement: Handle Category Deletion Safely

Deleting a category MUST NOT leave any exercise referencing a category that no
longer exists. On deletion, the category MUST be **removed from every exercise's
category list**. An exercise left with **no categories** becomes **uncategorized**
(shown as "Sem categoria") — there is **no reserved category** and no
reassignment. Qualquer categoria **do usuário** MAY ser excluída; as **oficiais**
não são excluíveis.

A remoção MUST alcançar apenas os exercícios **do usuário**: um exercício
oficial não referencia categoria do usuário — as suas vêm do arquivo e nenhuma
delas é excluível.

#### Scenario: Delete a category removes it from exercises
- GIVEN "Antebraço" é uma das categorias de "Rosca Inversa" (também "Bíceps")
- WHEN the user deletes "Antebraço"
- THEN "Antebraço" is removed
- AND "Rosca Inversa" keeps "Bíceps" and no longer references "Antebraço"
- AND no exercise references a non-existent category

#### Scenario: Deleting the last category of an exercise leaves it uncategorized
- GIVEN "Antebraço" é a única categoria de "Rosca Inversa"
- WHEN the user deletes "Antebraço"
- THEN "Rosca Inversa" has no categories and is shown as "Sem categoria"

#### Scenario: There is no reserved category to protect
- GIVEN the categories list
- THEN it contains only official categories and user-created ones (no reserved
  "Sem categoria" entry)
- AND every user-created category can be deleted

---

## REMOVED

(None)
