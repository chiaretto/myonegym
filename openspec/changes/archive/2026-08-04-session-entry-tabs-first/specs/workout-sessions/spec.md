# Delta: workout-sessions

**Change ID:** `session-entry-tabs-first`
**Affects:** a ordem do detalhe do exercício na sessão — abas no topo, mídia
dentro de "Execução", categorias dentro de "Observações"

---

## MODIFIED Requirements

### Requirement: Session Exercise Detail

Each session entry MUST have a **detail screen** (reached by tapping its row in
the runner or the completed-session recap), showing the exercise's **media**
(static image or animated GIF, played animated), the exercise **name — once, in
the screen's top bar** — its **category** context, and — for the weight — the
**same "Peso alvo" editor used on the catalog exercise detail** (see the
`weights` capability), scoped to the **session's gym**: the per-gym **target
weight** (edit → save, value + unit KG/LB/#) together with the per-gym
**weight-history timeline** (with per-entry delete). Saving the weight MUST
update the exercise's **per-gym target weight** and append a **history** entry —
the session stores no independent weight.

The detail MUST present its content in **tabs**, and the tabs MUST be the
**first control below the top bar** — before the media, before the weight,
before anything else the screen shows. They are how the user moves around this
screen mid-workout, so reaching them MUST NOT require scrolling. Only the
entry's **status labels** (below) MAY precede them.

Each tab MUST carry what belongs to it, and nothing else:

- **"Execução"** — the exercise's **media**, the **Peso alvo** editor with its
  **history**, and the **Alternativas** section described below, in that order.
  The media lives **here**, not above the tabs: it illustrates how the movement
  is executed, which is a question the other two tabs do not ask, and it is tall
  enough to push their content off the fold if it sat outside them.
- **"Observações"** — the exercise's **categories**, shown as labels, and the
  **per-gym exercise note** for `(session.gymId, entry.exerciseId)` (see the
  `exercise-notes` capability), with an editable text field and an explicit
  save. Categories and the note are both **descriptions of the exercise**, and
  neither is acted upon between sets.
- **"Foto"** — the **per-gym exercise photos** for the same pair (see the
  `exercise-photos` capability): the pair's photos, attaching one (camera or
  gallery), and deleting one.

The media MUST NOT be rendered outside the "Execução" tab, and the categories
MUST NOT be rendered outside "Observações" — repeating either above the tabs
would give back exactly the vertical space this arrangement buys.

The entry's **status** labels — the **"Concluído"** indicator and, while
previewing an alternative, the **"Alternativa de X"** label — MUST sit **above
the tabs**, visible on every tab. They describe the **entry**, not a section of
it, exactly like the fixed stepper bar at the bottom.

Both the note and the photos are **durable and per `(gym, exercise)`**, so they
are shared with the catalog exercise detail and with future sessions of the same
exercise in the same gym. Enquanto uma **alternativa** está sendo vista, as três
abas MUST refletir o exercício **exibido**, não o da entrada — é a nota e a foto
daquele aparelho que ajudam a decidir. When the entry has no linked exercise
(`exerciseId` absent because the source exercise was deleted), the Observações
**and Foto** tabs MUST show an empty/disabled state (nothing can be attached to
a missing exercise).

Quando o exercício da entrada tem **alternativas**, o detalhe MUST apresentar a
seção **"Alternativas"** descrita na capability `exercises`, no corpo da aba
"Execução", abaixo do peso alvo. Tocar uma alternativa abre o detalhe dela
**dentro da sessão** — ver *Do an Alternative Instead*. Enquanto uma alternativa
está sendo vista, o detalhe MUST NOT oferecer uma nova seção "Alternativas" a
partir dela: o usuário está escolhendo o que fazer nesta linha, não navegando o
catálogo.

The detail MUST NOT repeat the exercise name in the body, and MUST NOT show the
session's **training-day** name — see the `exercises` capability's *Single
Exercise Title on Detail Views*, which governs the header of both detail views.

While the session is **in progress** the Peso alvo editor and its history delete
MUST be **editable**. When the parent session is **completed**, the weight card
MUST be **read-only** — it shows the gym's **current** target for reference (no
edit, no history delete).

Unlike the Peso alvo editor, the Observações and Foto tabs MUST remain
**editable even when the parent session is completed** — a note and a photo
describe the exercise in that gym, not that session, so there is nothing to
freeze.

The stepper's controls (the done call-to-action and Voltar/Avançar, described
below) MUST be presented as a **floating bar fixed to the bottom of the screen**,
**visible on every tab** — not as content inside the "Execução" panel. Mid-set the
user reaches for these first, so they must not require scrolling, and a bar that
vanished when switching to Observações or Foto would not read as fixed chrome.

The bar MUST NOT cover any content: the screen's content MUST reserve room equal
to the bar's **actual height**, at **any font-size setting** (see the
`app-foundation` typography spec — the bar scales with it, so a fixed reservation
would hide content at large scales). Transient messages MUST NOT render
underneath the bar either.

Enquanto uma **alternativa** está sendo vista, essa mesma barra MUST carregar a
única decisão que cabe ali — **"Fiz este no lugar"** — e **nenhum**
Voltar/Avançar: percorrer os exercícios pertence à lista da sessão, e esta tela
está ao lado dela.

The detail MUST act as a **guided stepper** over the session's exercises:

- The **done control** MUST **visually reflect whether the current entry is
  already done**, so stepping between exercises makes each one's status obvious:
  - **Not done** → a prominent **call-to-action** (e.g., "Concluir") that
    **marks the entry done and advances** to the next exercise's detail. On the
    **last** exercise, it either **prompts to finish the workout** (when all
    entries are now done — see below) or returns to the session overview / runner.
  - **Already done** → a **distinct completed state** (e.g., "Concluído" with a
    check and a calmer/confirmed styling), clearly different from the pending
    call-to-action; activating it still advances (and, on the last exercise, runs
    the same finish check).
  - The detail SHOULD also show a **"Concluído" indicator** (e.g., a chip above
    the tabs) when the entry is done, reinforcing the status at a glance.
- **Voltar** and **Avançar** controls MUST navigate to the **previous / next**
  exercise **without changing the done state**, and MUST be disabled at the
  first / last exercise respectively.

When the user completes the **last exercise in the list** via the done
call-to-action and, as a result, **all** of the session's entries are done, the
detail MUST **prompt** the user that all exercises are complete and ask whether to
**finish the workout**. **Confirming** MUST complete the session (see Complete a
Session) and leave for the session history. **Declining or dismissing** MUST
return to the **runner** (the session's exercise list) with the session still in
progress. If completing the last exercise leaves **any entry not done** (skipped
via Avançar), the detail MUST NOT prompt and MUST return to the runner.

Un-marking an entry is done from the runner list (not the detail). When the
parent session is **completed**, the detail MUST be **read-only** (no weight
editing, no history delete, no marking, no swapping) and MUST show the static
done state;
Voltar/Avançar MAY still be used to browse. The detail MUST render from the
entry's name snapshot where the source exercise was deleted (media falls back to
a placeholder and the live target/history are empty).

#### Scenario: The tabs come before everything else
- GIVEN the user opens an entry's detail during a session
- WHEN the detail renders
- THEN the "Execução", "Observações" and "Foto" tabs appear directly below the
  top bar, above the exercise's media and the Peso alvo editor
- AND reaching them requires no scrolling

#### Scenario: The media belongs to "Execução"
- GIVEN an entry whose exercise has a media URL
- WHEN the user opens the detail
- THEN the media is shown inside the "Execução" panel, above the Peso alvo editor
- AND switching to "Observações" or "Foto" shows no media

#### Scenario: Categories live in "Observações"
- GIVEN "Supino Reto" carries the categories "Peito" and "Tríceps"
- WHEN the user opens the entry's detail
- THEN no category label is shown above the tabs
- AND switching to "Observações" shows "Peito" and "Tríceps" above the note field

#### Scenario: Status stays visible on every tab
- GIVEN an entry that is already done
- WHEN the user switches between "Execução", "Observações" and "Foto"
- THEN the "Concluído" indicator remains visible above the tabs on all three
- AND the fixed bottom bar remains visible as well

#### Scenario: Previewing an alternative keeps its label above the tabs
- GIVEN the user is previewing an alternative of the entry's exercise
- WHEN the user switches to "Foto"
- THEN the "Alternativa de X" label is still shown above the tabs
- AND the photos shown are the previewed exercise's

#### Scenario: The stepper is fixed to the bottom on every tab
- GIVEN an entry's detail on an in-progress session
- WHEN the user switches between "Execução", "Observações" and "Foto"
- THEN the done call-to-action and Voltar/Avançar stay fixed at the bottom of the
  screen on all three tabs

---

## ADDED

(None)

## REMOVED

(None)
