# Delta: Training Day Management

**Change ID:** `bootstrap-myonegym`
**Affects:** Data layer (days), Settings UI, Home accordion

## ADDED Requirements

### Requirement: Register a Training Day

The user MUST be able to create a training day with a name (e.g. "Dia 1") and an
**optional category**.

#### Scenario: Create a training day
- GIVEN the training-days screen is open
- WHEN the user creates a day named "Dia 1" (optionally with category "Peito")
- THEN the day is persisted and appears on the Home accordion

#### Scenario: Category is optional
- GIVEN the day form is open
- WHEN the user creates "Dia 2" without a category
- THEN the day is created successfully with no category

### Requirement: Select Exercises for a Day

The user MUST be able to choose which exercises belong to a day. Exercises MAY
repeat across days, and their order within a day SHOULD be preserved.

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

### Requirement: Edit and Delete Training Days

The user MUST be able to rename a day, change its category and exercise
selection, and delete the day.

#### Scenario: Delete a day
- GIVEN "Dia 1" exists with selected exercises
- WHEN the user deletes "Dia 1"
- THEN the day is removed from the Home accordion
- AND the referenced exercises and their weights are unaffected
