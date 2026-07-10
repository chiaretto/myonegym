# Delta: exercises

**Change ID:** `exercise-list-show-days`
**Affects:** the exercises management list shows each exercise's training days

---

## ADDED Requirements

### Requirement: Show Training Days on the Exercises List

The exercises list (Settings → Exercícios) MUST show, for **each exercise**, the
**training days it is registered in** — the names of the days whose exercise
selection includes it, in the days' **display order**. When an exercise is in
**no** day, the list MUST show a neutral hint (e.g., "Nenhum dia"). The
information MUST update automatically as exercises are added to or removed from
days.

#### Scenario: Exercise used in multiple days
- GIVEN "Rosca Direta" is in "Dia 2" and "Dia 5"
- WHEN the user views the Exercícios list
- THEN the "Rosca Direta" item shows both day names ("Dia 2 · Dia 5"), in the days' display order

#### Scenario: Exercise used in no day
- GIVEN "Alongamento" is not in any training day
- WHEN the user views the Exercícios list
- THEN the "Alongamento" item shows a neutral hint (e.g., "Nenhum dia")

#### Scenario: Updates when membership changes
- GIVEN "Rosca Direta" shows "Dia 2" on the Exercícios list
- WHEN the user removes "Rosca Direta" from "Dia 2"
- THEN the list no longer shows "Dia 2" for it (updates live)

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
