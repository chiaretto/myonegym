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

The user MUST be able to choose which gym is active. Weights shown across the app
reflect the active gym.

#### Scenario: Switch active gym
- GIVEN two gyms "A" and "B" exist and "A" is active
- WHEN the user selects "B"
- THEN "B" becomes the active gym
- AND exercise detail screens now show weights recorded for "B"

### Requirement: Copy Weights When Creating a Gym

When creating a new gym, the user MUST be able to optionally select an existing
gym whose weight records are duplicated into the new gym.

#### Scenario: Create gym copying weights from another
- GIVEN gym "A" has weights for exercises "Rosca Direta" (20 KG) and "Supino" (40 KG)
- WHEN the user creates gym "B" and chooses to copy weights from "A"
- THEN gym "B" has independent weight records: "Rosca Direta" 20 KG and "Supino" 40 KG
- AND later editing "B"'s weights does NOT change "A"'s weights

#### Scenario: Create gym without copying
- GIVEN gym "A" has weights
- WHEN the user creates gym "B" without selecting a source gym
- THEN gym "B" starts with no weight records

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

