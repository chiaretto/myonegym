# Delta: workout-sessions

**Change ID:** `session-exercise-detail`
**Affects:** the session runner entry list + a new session exercise detail screen
**Builds on:** `add-workout-session-log`

---

## MODIFIED Requirements

### Requirement: Run a Session

While a session is in progress, the user MUST be able to **mark each entry as
done** (and toggle it back). Each entry MUST be presented as a **Home-style row**
— a **media thumbnail**, the exercise **name** and **category**, a **done
checkbox**, and a compact **read-only used-weight badge** (or a "definir" hint
when unset). Tapping the row (outside the checkbox) MUST open that entry's
**detail** (see Session Exercise Detail). Marking an entry done MUST be possible
from the list checkbox **or** from the detail, and the session's progress MUST
reflect either. **Setting the weight actually used** for an entry (value + unit)
happens on the detail screen and updates only that session entry; the exercise's
target weight for the gym is never changed. Changes to entries persist
immediately and are local.

#### Scenario: Entry rows look like Home rows
- GIVEN an in-progress session for a day with "Rosca Direta" (Bíceps, used 20 KG)
- WHEN the user views the runner
- THEN the "Rosca Direta" row shows a media thumbnail, its name and category, a done checkbox, and a "20 KG" badge

#### Scenario: Mark an exercise done from the list
- GIVEN an in-progress session with entry "Rosca Direta" not done
- WHEN the user taps its done checkbox in the list
- THEN the entry is recorded as done
- AND the session progress count reflects it

#### Scenario: Tapping a row opens the detail
- GIVEN an in-progress session listing "Rosca Direta"
- WHEN the user taps the row (not the checkbox)
- THEN the session exercise detail for "Rosca Direta" opens

#### Scenario: Un-mark a done exercise
- GIVEN entry "Supino" is marked done
- WHEN the user toggles it off (from the list or the detail)
- THEN the entry is no longer marked done

---

## ADDED Requirements

### Requirement: Session Exercise Detail

Each session entry MUST have a **detail screen** (reached by tapping its row in
the runner or the completed-session recap). The detail MUST render the exercise's
**media** (static image or animated GIF, played animated), the exercise name and
its category/day context, the entry's **used weight** for this session, and the
exercise's per-gym **weight-history timeline** (scoped to the **session's gym**,
read-only) with the same presentation as the exercise detail elsewhere in the
app. While the session is in progress, the detail MUST let the user **edit and
save the used weight** (value + unit KG/LB/#) — affecting **only this entry**,
never the target weight — and **mark the entry done or not done**. When the
parent session is **completed**, the detail MUST be **read-only** (no weight
editing, done toggle disabled). The detail MUST render from the entry's snapshot
where live data is missing, so it still works if the source exercise was deleted.

#### Scenario: Open the detail and see media + weight + history
- GIVEN an in-progress session in gym "A" listing "Rosca Direta" with a media URL and per-gym weight history
- WHEN the user opens the "Rosca Direta" entry detail
- THEN the exercise media is rendered
- AND the entry's used weight is shown
- AND the per-gym weight-history timeline for gym "A" is shown

#### Scenario: Mark done from the detail
- GIVEN the "Rosca Direta" entry detail is open and the entry is not done
- WHEN the user taps "Marcar como concluído"
- THEN the entry is recorded as done
- AND returning to the runner shows it done with the updated progress count

#### Scenario: Edit the used weight from the detail
- GIVEN the "Rosca Direta" entry detail shows used 20 KG
- WHEN the user edits the used weight to 22.5 KG and saves
- THEN the entry stores used 22.5 KG for this session only
- AND the exercise's target weight for gym "A" is unchanged

#### Scenario: History is the exercise's target history, read-only
- GIVEN "Rosca Direta" has target-weight history 20 KG → 22.5 KG in gym "A"
- WHEN the user opens the entry detail during a session in gym "A"
- THEN the timeline shows that history as read-only reference (no delete affordance)

#### Scenario: Read-only for a completed session
- GIVEN a completed session's recap
- WHEN the user opens an entry's detail
- THEN the media, used weight, done state, and history are shown
- AND the used weight cannot be edited and the done state cannot be changed

#### Scenario: Detail survives source exercise deletion
- GIVEN a session entry whose source exercise "Rosca Direta" was later deleted
- WHEN the user opens that entry's detail
- THEN the entry's snapshot name and used weight still render
- AND the media falls back to a placeholder and the live history is empty

---

## REMOVED Requirements

(None)
