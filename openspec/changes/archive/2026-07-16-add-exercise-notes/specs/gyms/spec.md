# Delta: gyms

**Change ID:** `add-exercise-notes`
**Affects:** `gyms` (delete cascade); references `exercise-notes`.

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Edit and Delete Gyms

The user MUST be able to rename and delete gyms. Deleting a gym removes its
weight records and its **exercise notes**.

#### Scenario: Delete a gym removes its weights
- GIVEN gym "B" exists with weight records
- WHEN the user deletes gym "B"
- THEN gym "B" and all of its weight records are removed
- AND if "B" was active, another gym becomes active (or none if it was the last)

#### Scenario: Delete a gym removes its notes
- GIVEN gym "B" has exercise notes for several exercises
- WHEN the user deletes gym "B"
- THEN all of gym "B"'s exercise notes are removed
- AND other gyms' notes for the same exercises are unaffected

---

## REMOVED Requirements

(None)
