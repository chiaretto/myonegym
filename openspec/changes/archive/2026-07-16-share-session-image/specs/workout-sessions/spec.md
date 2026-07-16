# Delta: workout-sessions

**Change ID:** `share-session-image`
**Affects:** adds image sharing to the **completed** session detail — two
variants (with and without weights/duration)

---

## ADDED Requirements

### Requirement: Share a Completed Session as an Image

The **completed** session detail MUST offer **two share actions**, each
generating a **PNG image** of the session and handing it to the device's share
mechanism:

- **"Compartilhar"** (detailed) — includes each exercise's **weight** and the
  session's **training duration**.
- **"Compartilhar sem pesos"** (simplified) — includes **neither weights nor
  duration**, so a user can show the workout without revealing how much they
  lift or how long they took.

Both images MUST resemble the session detail screen and MUST contain: the
session's **day name**, its **gym**, the **date**, the **exercise list** (media
thumbnail, name, category, done state) taken from the entry's **name snapshot**,
and the **done count**. The detailed variant additionally shows a **weight badge**
per entry — the exercise's **current per-gym target weight** for the session's
gym, read **live** (consistent with View Session Detail — the session stores no
weight of its own) — and the **duration** (`completedAt − startedAt`).

The image MUST be rendered at a **fixed size**, independent of the user's
**font-scale** setting (see the `app-foundation` typography spec) — a shared
image is a fixed design, not a responsive screen.

The image MUST emphasise **done** entries over **skipped** ones — the opposite of
the runner, which dims and strikes through what is done because crossing an item
off a checklist reads as progress *there*. On a shared image that would invert the
meaning: the work the user did would look cancelled while the exercises they
skipped would look like the highlight.

The date on the image MUST be **absolute** (e.g. "16 jul 2026"), not the
**relative** label the screen uses ("Hoje"), because a shared image outlives the
day it was created.

An entry with **no target weight** MUST render **no weight badge** in the detailed
variant — the screen's **"definir"** hint is a call-to-action for the owner and
MUST NOT appear on a shared image.

Share actions MUST NOT be offered for an **in-progress** session.

#### Scenario: Two share actions on a completed session
- GIVEN a completed session for "Dia 1" is open from history
- WHEN the user views it
- THEN a "Compartilhar" action and a "Compartilhar sem pesos" action are shown

#### Scenario: No sharing while a session is in progress
- GIVEN gym "A" has an in-progress session
- WHEN the user views the runner
- THEN no share action is shown

#### Scenario: Detailed image includes weights and duration
- GIVEN a completed session for "Dia 1" in gym "A" lasting 48 minutes, with "Rosca Direta" (done, current target 22,5 KG) and "Supino" (not done, current target 40 KG)
- WHEN the user taps "Compartilhar"
- THEN a PNG is generated showing "Dia 1", gym "A", the date, both exercises with their names, categories, thumbnails and done states
- AND it shows "22,5 KG" and "40 KG"
- AND it shows the duration "48 min"

#### Scenario: Simplified image omits weights and duration
- GIVEN the same completed session
- WHEN the user taps "Compartilhar sem pesos"
- THEN a PNG is generated showing "Dia 1", gym "A", the date, both exercises with their names, categories, thumbnails and done states
- AND it shows **no** weight for any exercise
- AND it shows **no** training duration

#### Scenario: The image shows the live target weight
- GIVEN a completed session referenced "Rosca Direta" while its target was 20 KG
- WHEN the target is later changed to 25 KG in that gym and the user shares the session with details
- THEN the image shows 25 KG (the card reads the live target, like the recap)

#### Scenario: An entry with no target shows no badge
- GIVEN a completed session entry "Agachamento" with no target weight in the session's gym
- WHEN the user taps "Compartilhar"
- THEN the image shows the "Agachamento" row with **no** weight badge
- AND the word "definir" does **not** appear on the image

#### Scenario: Done exercises are emphasised over skipped ones
- GIVEN a completed session where "Supino" is done and "Agachamento" was skipped
- WHEN the user shares it
- THEN "Supino" is rendered at full strength (not dimmed, not struck through)
- AND "Agachamento" recedes visually

#### Scenario: The image uses an absolute date
- GIVEN a session completed on 16 July 2026
- WHEN the user shares it on that same day
- THEN the image shows an absolute date ("16 jul 2026")
- AND it does **not** show the relative label "Hoje"

#### Scenario: The image ignores the font-scale setting
- GIVEN the user set the Aparência font scale to its maximum
- WHEN the user shares a completed session
- THEN the generated image is identical to the one produced at the default scale

#### Scenario: Image survives source exercise deletion
- GIVEN a completed session referencing "Rosca Direta"
- WHEN "Rosca Direta" is later deleted and the user shares the session
- THEN the image still shows the "Rosca Direta" name (from the entry snapshot)
- AND its thumbnail falls back to a placeholder and no weight badge is drawn

### Requirement: Deliver the Session Image

Generating a session image MUST hand it to the platform's **share sheet** when
the device supports sharing files, so the user can send it to any other app. When
file sharing is **unavailable**, the app MUST fall back to **downloading** the
PNG and confirm with a message — sharing MUST NOT simply fail.

Image generation MUST be **resilient to unreachable exercise media**: an
exercise's media URL is arbitrary and remote, and MUST NOT be able to prevent the
image from being produced. Any media that cannot be loaded (unreachable,
cross-origin-restricted, or missing) MUST fall back to the **placeholder** used
elsewhere for missing media.

**Cancelling** the share sheet MUST be treated as a non-event — no error is
reported. A genuine failure MUST report an error and leave the session unchanged.
Sharing MUST NOT modify any data: the session, its entries, the target weights,
and the weight history are untouched.

#### Scenario: Share via the platform share sheet
- GIVEN a device that supports sharing files
- WHEN the user taps a share action on a completed session
- THEN the platform share sheet opens with the PNG attached, ready to send to another app

#### Scenario: Fall back to a download
- GIVEN a device that does **not** support sharing files
- WHEN the user taps a share action
- THEN the PNG is downloaded to the device
- AND a message confirms the image was saved

#### Scenario: Unreachable media falls back to the placeholder
- GIVEN a completed session whose exercise media URL cannot be loaded (offline, missing, or cross-origin-restricted)
- WHEN the user shares the session
- THEN the image is still produced, with a placeholder in that exercise's thumbnail
- AND no error is reported

#### Scenario: Cancelling the share sheet is silent
- GIVEN the share sheet is open with the generated image
- WHEN the user dismisses it without choosing an app
- THEN no error is reported and the session detail is unchanged

#### Scenario: Sharing changes no data
- GIVEN a completed session in gym "A"
- WHEN the user shares it with details
- THEN the session, its entries, the per-gym target weights, and the weight history are unchanged

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
