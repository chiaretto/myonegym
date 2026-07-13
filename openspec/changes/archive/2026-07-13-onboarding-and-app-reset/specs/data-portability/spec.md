# Delta: data-portability

**Change ID:** `onboarding-and-app-reset`
**Affects:** adds a full erase ("reset app") action alongside export/import/generate-example
**Implements:** issue #8

---

## ADDED Requirements

### Requirement: Reset App (Erase All Data)

From Settings, the user MUST be able to **reset the app**, erasing **all
registered data** from the device: gyms, categories, exercises, training
days, weights, weight history, and workout sessions/entries — the same full
set already cleared as the first step of "Importar backup". The action MUST
require an explicit confirmation, and the confirmation MUST clearly state
that the action **cannot be undone** before anything is erased. On confirm,
all local data is erased immediately; declining or dismissing the
confirmation MUST leave all existing data unchanged. After a reset, the app
MUST behave like a fresh install — including re-arming the first-launch
sample-data prompt (see app-foundation) so the user may choose to reload the
sample data again. Device-local **presentation** preferences (e.g. the
font-size setting) are unaffected by a reset.

#### Scenario: Reset requires confirmation and warns it is irreversible
- GIVEN the user has gyms, exercises, days, and weights registered
- WHEN the user taps "Resetar app" in Settings → Backup
- THEN a confirmation is shown stating that all data will be erased and the action cannot be undone

#### Scenario: Confirming erases all registered data
- GIVEN the reset confirmation is shown
- WHEN the user confirms
- THEN all gyms, categories, exercises, days, weights, weight history, and workout sessions are erased
- AND Home and Settings reflect an empty app (equivalent to a fresh install)

#### Scenario: Declining keeps data intact
- GIVEN the reset confirmation is shown
- WHEN the user cancels/dismisses it
- THEN no data is erased and the app is unchanged

#### Scenario: Reset re-arms the first-launch prompt
- GIVEN the user has already been asked about the sample data on this device (see app-foundation)
- WHEN the user resets the app
- THEN the first-launch sample-data prompt is shown again the next time the app loads

#### Scenario: Reset does not affect presentation preferences
- GIVEN the user has set a custom font size
- WHEN the user resets the app
- THEN the font-size preference is unchanged after the reset

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
