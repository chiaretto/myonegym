# Delta: categories

**Change ID:** `exercise-multi-category`
**Affects:** the reserved "Sem categoria" bucket is retired; deleting a category
removes it from exercises' category lists

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Handle Category Deletion Safely

Deleting a category MUST NOT leave any exercise referencing a category that no
longer exists. On deletion, the category MUST be **removed from every exercise's
category list**. An exercise left with **no categories** becomes **uncategorized**
(shown as "Sem categoria") — there is **no reserved category** and no
reassignment. Any category MAY be deleted (nothing is protected).

#### Scenario: Delete a category removes it from exercises
- GIVEN "Bíceps" is one of the categories of "Rosca Direta" (also "Antebraço")
- WHEN the user deletes "Bíceps"
- THEN "Bíceps" is removed
- AND "Rosca Direta" keeps "Antebraço" and no longer references "Bíceps"
- AND no exercise references a non-existent category

#### Scenario: Deleting the last category of an exercise leaves it uncategorized
- GIVEN "Bíceps" is the only category of "Rosca Direta"
- WHEN the user deletes "Bíceps"
- THEN "Rosca Direta" has no categories and is shown as "Sem categoria"

#### Scenario: There is no reserved category to protect
- GIVEN the categories list
- THEN it contains only user-created categories (no reserved "Sem categoria" entry)
- AND every category can be deleted

---

## REMOVED Requirements

(None — the reserved-bucket behaviour is folded into the modified deletion
requirement above; "uncategorized" is now an empty category list, not a record.)
