# ai-assistant Specification

## Purpose

A conversational assistant, in Settings, that reorganizes the catalog —
**categories, exercises and training days** — from a request written in the
user's own words. It asks when it needs more to decide, proposes a complete
updated catalog when it has enough, and writes nothing until the user accepts.

It is the only part of MyOneGym that talks to a network service (the Gemini
API), and it is opt-in: it needs an API key the user supplies. Everything else
in the app remains local-only and offline-capable.

Per-gym and personal training data — gyms, weights, weight history, exercise
notes, photos and workout sessions — is never sent and never edited here.

## Requirements

### Requirement: Store the Gemini API Key on the Device

From Settings, the user MUST be able to enter and save a **Gemini API key**.
The key is a **device preference**, not user data: it MUST be stored locally
(same mechanism as the font-size setting), MUST NOT be part of the exported
backup, and MUST NOT be erased by "Resetar app" — the same treatment
presentation preferences already receive.

The field MUST be **masked** by default, with a way to reveal what was typed,
and the screen MUST offer **removing** the saved key. Because the app has no
backend, the key lives in the browser and is readable by anything running on
the page; the screen MUST state this plainly rather than imply the key is
protected, and MUST recommend a dedicated, spend-limited key.

With no key saved, the assistant MUST explain what is missing and MUST NOT
allow sending a message.

#### Scenario: Save a key
- GIVEN the user opens Configurações → Assistente (IA) with no key saved
- WHEN they paste a key and confirm
- THEN the key is saved on the device and the conversation becomes usable

#### Scenario: The key is masked and removable
- GIVEN a key is saved
- WHEN the user reopens the screen
- THEN the key is shown masked, with a way to reveal it and a way to remove it

#### Scenario: The key is never exported
- GIVEN a key is saved
- WHEN the user exports a backup
- THEN the JSON contains no key

#### Scenario: Reset does not erase the key
- GIVEN a key is saved
- WHEN the user resets the app from Configurações → Backup
- THEN the key is still saved afterwards

#### Scenario: Without a key there is no conversation
- GIVEN no key is saved
- WHEN the user opens the assistant
- THEN the screen explains a key is required and sending is unavailable


### Requirement: Converse With the Assistant About the Catalog

The assistant MUST be a **conversation**, not a one-shot form. The user writes
in their own words; the assistant answers; both turns MUST stay visible as a
thread, in order.

The **current catalog** MUST be given to the assistant as context at the start
of the conversation: **categories**, **exercises** (name, media URL, categories,
alternatives), and **training days** (name, ordered exercises), each carrying
its real identifier. The catalog MUST NOT be re-sent on every turn — it is
established once and stays in context.

The payload MUST NOT include gyms, weights, weight history, exercise notes,
photos, or workout sessions. Those are per-gym or personal training data, are
not what the assistant edits, and MUST NOT leave the device.

Every turn MUST be an explicit send by the user; the app MUST NOT contact the
API on its own — not on opening the screen, not on typing.

The assistant's text MUST appear **as it is produced**, not all at once after
the turn completes.

The conversation MUST survive navigating elsewhere in the app and coming back.
It is not persisted across app restarts: reloading starts a new conversation.

#### Scenario: A conversation, not a form
- GIVEN a token is saved
- WHEN the user sends "quero treinar 4 dias por semana" and the assistant answers
- THEN both messages stay visible in the thread
- AND the user can send another message continuing from there

#### Scenario: The catalog is context from the start
- GIVEN the catalog has categories, exercises and days
- WHEN the user sends the first message
- THEN the assistant receives the current catalog with its real ids

#### Scenario: Training data stays on the device
- GIVEN the user has gyms, weights, notes, photos and completed sessions
- WHEN any message is sent
- THEN the payload carries only categories, exercises and days

#### Scenario: Nothing is sent without an explicit action
- GIVEN a token is saved
- WHEN the user opens the assistant and types without sending
- THEN no request is made to the API

#### Scenario: The answer streams in
- GIVEN a message was sent
- WHEN the assistant answers
- THEN its text appears progressively rather than only when the turn is complete

#### Scenario: Leaving and returning keeps the conversation
- GIVEN a conversation with several messages
- WHEN the user navigates to another Settings screen and comes back
- THEN the thread is still there


### Requirement: The Assistant Asks Only What It Needs, and Confirms Before Generating

When the request does not carry enough to decide well — how many days a week,
how long a session, an injury to work around, what to prioritise — the assistant
MUST **ask** instead of guessing. Questions MUST be limited to what would change
the proposal, MUST be grouped into as few turns as possible, and MUST NOT cover
anything already answerable from the catalog it was given.

When the assistant judges it has enough, and it was the assistant that led there
by asking, it MUST **ask whether it can generate** and MUST NOT propose until
the user agrees.

When the user's own message already asks for generation — "redistribui e já
gera", "pode gerar" — the assistant MUST go straight to a proposal: it MUST NOT
ask clarifying questions it could have skipped, and MUST NOT ask for
confirmation it has already been given.

#### Scenario: Missing information is asked for
- GIVEN a catalog with exercises and days
- WHEN the user sends "monta um treino melhor pra mim"
- THEN the assistant asks what it needs to decide, in as few turns as it can
- AND no proposal is produced yet

#### Scenario: The assistant asks permission before generating
- GIVEN the assistant asked questions and the user answered them
- WHEN the assistant judges it has enough
- THEN it asks whether it can generate
- AND it produces no proposal until the user agrees

#### Scenario: A complete request skips the questions
- GIVEN a catalog with exercises and days
- WHEN the user sends "tenho 4 dias, foco em costas, redistribui os exercícios e já gera"
- THEN the assistant produces a proposal without asking anything first

#### Scenario: Permission already given is not asked for again
- GIVEN the user's message already said to generate
- WHEN the assistant answers
- THEN it does not ask for confirmation before proposing

#### Scenario: What is in the catalog is not asked about
- GIVEN the catalog already has four training days
- WHEN the user asks to rebalance them
- THEN the assistant does not ask how many days there are


### Requirement: A Proposal Arrives as a Reviewable Card in the Thread

A proposal MUST be a **distinct kind of turn**, not prose the app has to
interpret: the assistant either talks, or proposes. At most **one proposal per
turn** MUST be acted on.

A proposal MUST carry the **whole updated catalog** (categories, exercises,
days — not a patch) plus a **summary, in Portuguese, of what was done**, written
for the user rather than for a machine.

Identifiers are the contract between the two sides:

- an entity that already exists MUST come back with **its original id**;
- a **new** entity MUST come back with a null id;
- an entity to be **deleted** MUST simply be absent from the returned catalog.

Alternatives MAY come back asymmetric or with dangling references; the app
repairs them on apply (see "Applying a Proposal Preserves References") — the
model is not required to get them right.

The proposal MUST appear in the thread as a card showing the summary and the
**scale of the change**, broken down by section — **categories**, **exercises**,
**days** — stating for each how many entities are created, changed and removed,
with **removals** called out distinctly, since they are the destructive part.
Because accepting rewrites the catalog, the card MUST suggest exporting a backup
first.

#### Scenario: Talking and proposing are different turns
- GIVEN a conversation in progress
- WHEN the assistant asks a question
- THEN the turn renders as a message, with no accept/reject controls

#### Scenario: The proposal explains itself
- GIVEN the assistant produced a proposal
- WHEN it appears in the thread
- THEN the card states in Portuguese what was done

#### Scenario: The whole catalog comes back
- GIVEN a proposal that only touches the days
- WHEN it arrives
- THEN it still carries the complete catalog, with the untouched entities unchanged and with their original ids

#### Scenario: New entities have no id
- GIVEN a proposal that adds a category
- WHEN it arrives
- THEN the new category comes back with a null id and the existing ones keep theirs

#### Scenario: The scale of the change is visible per section
- GIVEN a proposal that removes two exercises and moves six between days
- WHEN the user reviews the card
- THEN the exercises section states the removal and the days section states the moves
- AND the removal is highlighted as destructive


### Requirement: Accept in Full or in Part, or Reject, Without Leaving the Conversation

A proposal card MUST offer **Aceitar** and **Rejeitar**, and MUST NOT be written
to the database until the user accepts. While a proposal is pending a decision,
the assistant MUST NOT be asked for another turn.

**Aceitar** applies the proposal (see "Applying a Proposal Preserves
References"). The user MUST be able to choose **which sections to apply** —
categories, exercises, days — and **all sections MUST be selected by default**,
so accepting the whole proposal stays a single action.

Sections are not independent: a day references exercises, an exercise references
categories, and nothing references days. The app MUST therefore compute, **for
the proposal at hand**, which sections each selected section actually requires —
a days section that only reorders already-existing exercises requires nothing,
while one that places a newly proposed exercise requires the exercises section.
A section that a still-selected section requires MUST NOT be deselectable on its
own, and the card MUST state why rather than silently deselecting its dependents.

After applying, the assistant MUST be told **what was applied and what was left
out**, and MUST be given the **resulting catalog, including the real ids
assigned to newly created entities** — so a later request in the same
conversation builds on what is actually stored rather than on a stale picture,
and does not assume the skipped sections landed.

**Rejeitar** discards the proposal and **the conversation continues from where
it was**. The assistant MUST be told it was rejected, along with whatever the
user said about why, so a follow-up like "quase isso, mas mantém o dia 1" is
enough — the user MUST NOT have to restate the whole task.

A decided card MUST stay in the thread showing what was decided, including which
sections were left out. The user MUST NOT be able to decide the same proposal
twice, and MUST NOT be able to apply the skipped sections later from that card:
the catalog those sections were computed against has since changed. Applying
them means asking again in the conversation.

#### Scenario: Rejecting leaves the data untouched
- GIVEN a proposal card is in the thread
- WHEN the user taps "Rejeitar"
- THEN no category, exercise or day is changed
- AND the conversation continues, ready for another message

#### Scenario: A follow-up after rejection keeps the context
- GIVEN a proposal was rejected
- WHEN the user sends "isso, mas mantém o dia 1 como está"
- THEN the assistant answers knowing the previous proposal and the rejection
- AND the next proposal respects the rest of what was already agreed

#### Scenario: Accepting everything is one action
- GIVEN a proposal touching all three sections
- WHEN the user taps "Aceitar" without changing the selection
- THEN all three sections are applied and the change is visible on Configurações → Dias and → Exercícios

#### Scenario: Applying only one section
- GIVEN a proposal that renames categories and also rearranges days
- WHEN the user unselects the days section and accepts
- THEN the categories are renamed
- AND the days are exactly as they were before

#### Scenario: A required section cannot be dropped on its own
- GIVEN a proposal whose days place an exercise that the same proposal creates
- WHEN the user keeps the days section and tries to unselect the exercises section
- THEN unselecting is unavailable and the card explains the days depend on it

#### Scenario: Independent sections can be dropped freely
- GIVEN a proposal whose days only reorder exercises that already exist
- WHEN the user unselects the exercises section
- THEN the days section stays selectable and applies on its own

#### Scenario: After accepting, the conversation knows the new state
- GIVEN a proposal that created a new exercise was accepted
- WHEN the user then asks to put that exercise on another day
- THEN the assistant refers to it by the id it actually received on apply

#### Scenario: After a partial accept, the assistant knows what was skipped
- GIVEN a proposal was applied without its days section
- WHEN the user sends another message
- THEN the assistant knows the days were not applied and does not treat them as done

#### Scenario: A pending proposal blocks the next turn
- GIVEN a proposal card is awaiting a decision
- WHEN the user tries to send another message
- THEN sending is unavailable until the proposal is accepted or rejected

#### Scenario: A decided proposal cannot be decided again
- GIVEN a proposal was applied without its days section
- WHEN the user looks at its card in the thread
- THEN it shows what was applied and what was left out
- AND it offers no action to apply the rest


### Requirement: Applying a Proposal Preserves References

Applying MUST be **atomic**: the selected sections are written in a single
transaction, and any failure MUST leave the database exactly as it was — never
half-applied. "Partial" refers only to the user's **section selection**; within
that selection there is no partial write.

A section that was **not** selected MUST be left exactly as it was — the apply
MUST NOT touch it, not even to tidy it up.

Applying MUST keep the rest of the database valid:

- an entity returned with an existing id MUST be **updated in place**, keeping
  that id, so per-gym **weights**, **notes**, **photos**, **weight history** and
  **session entries** keep pointing at it;
- an entity returned with a null id MUST be **created** with a fresh id;
- an entity absent from the returned catalog MUST be **deleted with the same
  cascade the manual delete already performs** — deleting an exercise unlinks it
  from its alternatives' lists and from every day; deleting a category leaves
  its exercises uncategorized (an empty category list), never orphaned;
- **alternatives MUST land symmetric and free of dangling references**, using
  the same repair the backup import performs: drop what cannot resolve, ignore
  self-references, and mirror one-sided links — without closing the relation
  transitively.

The **deletion cascade is integrity, not content**, and MUST run whenever the
deletion itself is applied — regardless of which other sections were selected.
Applying an exercise removal MUST unlink that exercise from the existing days
even when the days section was left out; leaving a day pointing at a deleted id
is never an acceptable outcome of a partial accept.

Before anything is written, the proposal MUST be **validated against the
selection actually being applied** — not against the whole proposal: every
non-null id MUST exist in the current catalog, and every reference (an
exercise's categories, a day's exercises) MUST resolve either within the
selected sections or in the catalog as it already stands. A selection that fails
validation MUST be **refused whole**, with an explanation, and MUST NOT be
partially applied.

#### Scenario: Redistributing days keeps weights and photos
- GIVEN "Rosca Direta" has a weight, a note and a photo in gym "A"
- WHEN a proposal that moves it to another day is accepted
- THEN the weight, the note and the photo are still there

#### Scenario: Removing an exercise cascades
- GIVEN "Supino Máquina" is an alternative of "Supino Reto" and belongs to two days
- WHEN a proposal that removes it is accepted
- THEN it disappears from both days and from the alternatives of "Supino Reto"

#### Scenario: The removal cascade runs even when the days section is skipped
- GIVEN "Supino Máquina" belongs to two days
- WHEN a proposal that removes it is applied with the days section unselected
- THEN it is gone from both days
- AND the days are otherwise exactly as they were

#### Scenario: An unselected section is left completely alone
- GIVEN a proposal that would rename three categories and rearrange the days
- WHEN it is applied with the categories section unselected
- THEN every category keeps its current name

#### Scenario: One-sided alternatives are repaired on apply
- GIVEN a proposal where "Supino Reto" lists "Supino Máquina" but not the reverse
- WHEN it is accepted
- THEN both end up as alternatives of each other

#### Scenario: An unknown id rejects the whole proposal
- GIVEN a proposal referencing an exercise id that is not in the current catalog
- WHEN the user tries to accept it
- THEN the proposal is refused with a clear message and nothing is written

#### Scenario: A failure mid-apply changes nothing
- GIVEN accepting a proposal fails partway through
- WHEN the error surfaces
- THEN the catalog is exactly as it was before


### Requirement: Failures Are Reported Without Touching Data

Every failure MUST be reported in plain Portuguese, **inside the conversation**,
and MUST leave the catalog unchanged. At minimum: **no internet connection**,
**invalid or rejected token**, **usage/rate limit reached**, **conversation too
long for the model's context**, **proposal that fails validation**, and a
**turn cut short** before the proposal was complete. A turn cut short MUST be
treated as a failure — never applied in part.

A failed turn MUST leave the conversation usable: the user can retry or say
something else, without the thread being lost.

While a turn is in flight the screen MUST show that it is working, and MUST NOT
let a second message start on top of it.

#### Scenario: Offline
- GIVEN the device has no internet connection
- WHEN the user sends a message
- THEN the thread shows that the assistant needs a connection
- AND the catalog is unchanged
- AND the conversation is still there to retry

#### Scenario: Invalid token
- GIVEN the saved token is not accepted by the API
- WHEN the user sends a message
- THEN the thread says the token was refused and points at the token field

#### Scenario: A truncated proposal is not applied
- GIVEN the turn was cut off before the catalog was complete
- WHEN the failure surfaces
- THEN the thread says the catalog is too large for one turn
- AND nothing is applied

#### Scenario: One turn at a time
- GIVEN a turn is in flight
- WHEN the user tries to send another message
- THEN sending is unavailable until the first one finishes


### Requirement: The Assistant Is Optional and Does Not Compromise Offline Use

The assistant MUST be a **self-contained, opt-in** screen. The rest of the app
MUST keep working with no connection and no token: Home, sessions, the catalog
CRUD screens and backup MUST NOT gain any dependency on the API.

The API client MUST be loaded **on demand** when the screen opens, so the
initial bundle — the part that has to work offline — does not grow with it.

#### Scenario: The app works with no token and no connection
- GIVEN no token was ever saved and the device is offline
- WHEN the user uses Home, starts a workout, and edits exercises
- THEN everything works as before

#### Scenario: The API client is not in the initial bundle
- GIVEN a production build
- WHEN the initial bundle is inspected
- THEN the Gemini client is in a separate chunk, loaded only by the assistant screen
