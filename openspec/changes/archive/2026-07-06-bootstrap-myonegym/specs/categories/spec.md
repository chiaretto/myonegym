# Delta: Category Management

**Change ID:** `bootstrap-myonegym`
**Affects:** Data layer (categories), Settings UI, Exercise/Day references

## ADDED Requirements

### Requirement: Manage Muscle Categories

The user MUST be able to create, **edit (rename)**, and delete categories (e.g.
Peito, Tríceps, Costas, Bíceps). Categories are used to classify exercises and,
optionally, training days.

#### Scenario: Create a category
- GIVEN the categories screen is open
- WHEN the user creates a category "Peito"
- THEN "Peito" is persisted and available for selection when creating exercises

#### Scenario: Edit (rename) a category
- GIVEN category "Peito" exists and is used by exercise "Supino"
- WHEN the user renames it to "Peitoral"
- THEN the category is renamed
- AND exercise "Supino" reflects the new category name (reference preserved)

#### Scenario: Reject duplicate or empty category name
- GIVEN category "Peito" exists
- WHEN the user tries to create another "Peito" or an empty name
- THEN creation is blocked with a validation message

### Requirement: Handle Category Deletion Safely

Deleting a category MUST NOT leave exercises pointing at a missing category.
Affected exercises are reassigned to a reserved **"Sem categoria"** category.

#### Scenario: Delete a category that is in use
- GIVEN category "Bíceps" is assigned to exercise "Rosca Direta"
- WHEN the user deletes "Bíceps"
- THEN "Bíceps" is removed
- AND "Rosca Direta" is reassigned to "Sem categoria"
- AND no exercise is left referencing a non-existent category

#### Scenario: "Sem categoria" always exists
- GIVEN an exercise is reassigned on category deletion
- WHEN there is no "Sem categoria" category yet
- THEN a reserved "Sem categoria" category is created automatically
- AND it cannot itself be deleted (only exercises may be moved out of it)
