# Delta: data-portability

**Change ID:** `example-data-from-backup`
**Affects:** the "Generate Example Data" action uses a richer bundled dataset
**Implements:** issue #4

---

## MODIFIED Requirements

### Requirement: Generate Example Data

From Settings, the user MUST be able to **generate a realistic sample routine**
to explore the app quickly. The sample is a **bundled dataset** (a predefined
gym, muscle **categories**, **exercises** with media, several named **training
days**, and per-gym **weights**). Generation MUST be **additive and safe** —
inserted with **remapped ids** so existing data is never overwritten and
references (exercise→category, day→exercises, weight→gym+exercise) stay intact.
Day categories are **derived from the day's exercises** (the dataset's per-day
category is ignored). The example **gym and its weights** MUST be seeded **only
when no gym exists yet**; the categories/exercises/days are always added.

#### Scenario: Generate the sample routine
- GIVEN the app has little or no data
- WHEN the user taps "Gerar exemplo"
- THEN the bundled categories, exercises (with media), and named training days are created and visible

#### Scenario: Fresh app also gets a gym and weights
- GIVEN no gym exists yet
- WHEN the user taps "Gerar exemplo"
- THEN the example gym is created with per-gym weights for the sample exercises
- AND the exercises' current weights are visible on Home

#### Scenario: Days show derived categories
- GIVEN the sample was generated
- WHEN the user views Home
- THEN each day shows the categories derived from its exercises (not a stored day category)

#### Scenario: Additive and safe with existing data
- GIVEN the user already has some categories and a gym
- WHEN the user taps "Gerar exemplo"
- THEN the sample content is added without overwriting existing data
- AND references remain valid (no id collisions)

---

## ADDED Requirements

(None)

---

## REMOVED Requirements

(None)
